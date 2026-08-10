import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";

export function ensureDir(directory: string): void {
  fs.mkdirSync(directory, { recursive: true });
}

export function readJson<T = unknown>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

export function writeJson(file: string, value: unknown): void {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function writeText(file: string, value: string): void {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, value, "utf8");
}

export function sha256(data: Uint8Array): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function normalizeArchivePath(value: string): string {
  const normalized = value.replaceAll("\\", "/");
  if (
    normalized.startsWith("/") ||
    normalized.includes("../") ||
    normalized === ".." ||
    /^[A-Za-z]:/.test(normalized)
  ) {
    throw new Error(`Unsafe archive path: ${value}`);
  }
  return normalized;
}

export function slugify(value: unknown, fallback: string): string {
  const slug = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return slug || fallback;
}

export function listFiles(directory: string, pattern = "**/*"): string[] {
  if (!fs.existsSync(directory)) return [];
  return fg
    .sync(pattern, { cwd: directory, absolute: true, onlyFiles: true, dot: true })
    .sort((a, b) => a.localeCompare(b, "en"));
}

export function sourceFingerprint(directory: string): string {
  const hash = crypto.createHash("sha256");
  for (const file of listFiles(directory)) {
    const relative = path.relative(directory, file).replaceAll("\\", "/");
    hash.update(relative);
    hash.update("\0");
    hash.update(fs.readFileSync(file));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function loadRpackMap(stateDir: string): Buffer {
  const file = path.join(stateDir, "rpack-map.base64");
  if (!fs.existsSync(file)) throw new Error("Missing RPack map; import or scaffold the project first.");
  const map = Buffer.from(fs.readFileSync(file, "utf8").trim(), "base64");
  if (map.length !== 512) throw new Error(`Invalid RPack map length: ${map.length}`);
  return map;
}

export function copyRpackMap(risuaiRoot: string, stateDir: string): void {
  const source = path.join(risuaiRoot, "src", "ts", "rpack", "rpack_map.bin");
  if (!fs.existsSync(source)) throw new Error(`RPack map not found: ${source}`);
  const map = fs.readFileSync(source);
  if (map.length !== 512) throw new Error(`Unexpected RPack map length: ${map.length}`);
  writeText(path.join(stateDir, "rpack-map.base64"), map.toString("base64"));
}
