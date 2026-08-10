import fs from "node:fs";
import { unzipSync, Zip, ZipDeflate } from "fflate";
import type { ArchiveComparison } from "./types.ts";
import { sha256 } from "./utils.ts";

export interface WritableArchiveEntry {
  name: string;
  level: number;
  data: Uint8Array;
}

export function createZip(entries: WritableArchiveEntry[], mtime: Date): Buffer {
  const chunks: Buffer[] = [];
  let finalized = false;
  const zip = new Zip((error, chunk, final) => {
    if (error) throw error;
    if (chunk?.length) chunks.push(Buffer.from(chunk));
    if (final) finalized = true;
  });
  for (const entry of entries) {
    const file = new ZipDeflate(entry.name, { level: entry.level as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 });
    file.mtime = mtime;
    zip.add(file);
    file.push(entry.data, true);
  }
  zip.end();
  if (!finalized) throw new Error("ZIP writer did not finalize");
  return Buffer.concat(chunks);
}

export function compareArchives(leftPath: string, rightPath: string): ArchiveComparison {
  const leftBuffer = fs.readFileSync(leftPath);
  const rightBuffer = fs.readFileSync(rightPath);
  const left = unzipSync(leftBuffer);
  const right = unzipSync(rightBuffer);
  const leftNames = Object.keys(left);
  const rightNames = Object.keys(right);
  const differences: string[] = [];
  if (JSON.stringify(leftNames) !== JSON.stringify(rightNames)) differences.push("entry name/order differs");
  for (const name of new Set([...leftNames, ...rightNames])) {
    if (!left[name]) differences.push(`missing from left: ${name}`);
    else if (!right[name]) differences.push(`missing from right: ${name}`);
    else if (sha256(left[name]) !== sha256(right[name])) differences.push(`content differs: ${name}`);
  }
  return {
    byteIdentical: leftBuffer.equals(rightBuffer),
    entryIdentical: differences.length === 0,
    leftSha256: sha256(leftBuffer),
    rightSha256: sha256(rightBuffer),
    differences,
  };
}

export function zipMtime(buffer: Buffer): Date {
  if (buffer.readUInt32LE(0) !== 0x04034b50) throw new Error("Not a ZIP local header");
  const time = buffer.readUInt16LE(10);
  const date = buffer.readUInt16LE(12);
  const second = (time & 0x1f) * 2;
  const minute = (time >> 5) & 0x3f;
  const hour = (time >> 11) & 0x1f;
  const day = date & 0x1f;
  const month = (date >> 5) & 0x0f;
  const year = ((date >> 9) & 0x7f) + 1980;
  return new Date(year, month - 1, day, hour, minute, second);
}

export function inspectCharx(file: string): Record<string, unknown> {
  const buffer = fs.readFileSync(file);
  const files = unzipSync(buffer);
  const names = Object.keys(files);
  const cardData = files["card.json"];
  const card = cardData ? JSON.parse(new TextDecoder().decode(cardData)) : null;
  const extensions: Record<string, number> = {};
  let uncompressedBytes = 0;
  for (const [name, data] of Object.entries(files)) {
    const extension = name.includes(".") ? `.${name.split(".").at(-1)?.toLowerCase()}` : "(none)";
    extensions[extension] = (extensions[extension] ?? 0) + 1;
    uncompressedBytes += data.length;
  }
  return {
    file,
    sha256: sha256(buffer),
    bytes: buffer.length,
    entries: names.length,
    uncompressedBytes,
    topLevel: names.reduce<Record<string, number>>((result, name) => {
      const key = name.includes("/") ? (name.split("/")[0] ?? "(root)") : "(root)";
      result[key] = (result[key] ?? 0) + 1;
      return result;
    }, {}),
    extensions,
    card: card
      ? {
          spec: card.spec,
          specVersion: card.spec_version,
          name: card.data?.name,
          assets: card.data?.assets?.length ?? 0,
          loreEntries: card.data?.character_book?.entries?.length ?? 0,
          alternateGreetings: card.data?.alternate_greetings?.length ?? 0,
        }
      : null,
  };
}
