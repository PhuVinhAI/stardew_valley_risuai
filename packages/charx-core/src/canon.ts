import fs from "node:fs";
import path from "node:path";
import { unpackToXnbData } from "xnb";
import type { ProjectContext } from "./types.ts";
import { ensureDir, listFiles, sha256, slugify, writeJson, writeText } from "./utils.ts";

interface CanonSource {
  file: string;
  sha256: string;
  mode: "full" | "matched";
  entries: unknown;
  entryCount: number;
}

export interface CharacterCanonReport {
  schema: "stardew-canon-research/v1";
  character: string;
  characterId: string;
  gameVersion: string;
  gameRoot: string;
  outputRoot: string;
  generatedAt: string;
  sources: CanonSource[];
  unreadable: { file: string; reason: string }[];
  summary: {
    scanned: number;
    sources: number;
    entries: number;
    unreadable: number;
  };
}

const localizedXnb = /\.[a-z]{2}-[A-Z]{2}\.xnb$/;

export function isEnglishXnb(file: string): boolean {
  return file.toLowerCase().endsWith(".xnb") && !localizedXnb.test(path.basename(file));
}

export function extractGameVersion(data: Uint8Array): string {
  const buffer = Buffer.from(data);
  const values = [buffer.toString("latin1"), buffer.toString("utf16le")]
    .flatMap((text) => text.match(/\b1\.\d+\.\d+(?:\.\d+)?\b/g) ?? [])
    .sort((left, right) => right.length - left.length || right.localeCompare(left, "en"));
  return values[0] ?? "unknown";
}

function containsCharacter(value: unknown, character: string): boolean {
  return JSON.stringify(value).toLowerCase().includes(character.toLowerCase());
}

export function filterCharacterMatches(value: unknown, character: string): unknown | undefined {
  if (Array.isArray(value)) {
    const matches = value.filter((entry) => containsCharacter(entry, character));
    return matches.length ? matches : undefined;
  }
  if (value && typeof value === "object") {
    const matches = Object.entries(value as Record<string, unknown>).filter(
      ([key, entry]) =>
        key.toLowerCase().includes(character.toLowerCase()) || containsCharacter(entry, character),
    );
    return matches.length ? Object.fromEntries(matches) : undefined;
  }
  return containsCharacter(value, character) ? value : undefined;
}

function countEntries(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value).length;
  return value === undefined ? 0 : 1;
}

async function readXnb(file: string): Promise<unknown> {
  const log = console.log;
  console.log = () => {};
  try {
    return (await unpackToXnbData(fs.readFileSync(file))).content;
  } finally {
    console.log = log;
  }
}

function canonicalCandidates(contentRoot: string): string[] {
  return ["Characters/Dialogue", "Characters/schedules", "Data", "Strings"]
    .flatMap((relative) => listFiles(path.join(contentRoot, relative), "**/*.xnb"))
    .filter(isEnglishXnb);
}

function fullCharacterFiles(character: string): Set<string> {
  return new Set(
    [
      `Characters/Dialogue/${character}.xnb`,
      `Characters/Dialogue/MarriageDialogue${character}.xnb`,
      `Characters/schedules/${character}.xnb`,
      `Strings/schedules/${character}.xnb`,
    ].map((value) => value.toLowerCase()),
  );
}

export async function extractCharacterCanon(
  context: ProjectContext,
  gameRoot: string,
  character: string,
): Promise<CharacterCanonReport> {
  if (context.config.structure !== "authoring")
    throw new Error("Canon extraction requires an authoring project");
  const resolvedGameRoot = path.resolve(gameRoot);
  const contentRoot = path.join(resolvedGameRoot, "Content");
  const gameDll = path.join(resolvedGameRoot, "Stardew Valley.dll");
  if (!fs.existsSync(contentRoot)) throw new Error(`Stardew Content directory not found: ${contentRoot}`);
  if (!fs.existsSync(gameDll)) throw new Error(`Stardew Valley.dll not found: ${gameDll}`);
  const normalizedCharacter = character.trim();
  if (!normalizedCharacter) throw new Error("Character name cannot be empty");
  const characterId = slugify(normalizedCharacter, "character");
  const outputRoot = path.join(context.projectRoot, ".research", "canon", characterId);
  const researchRoot = path.resolve(context.projectRoot, ".research");
  const resolvedOutput = path.resolve(outputRoot);
  if (!resolvedOutput.startsWith(`${researchRoot}${path.sep}`))
    throw new Error(`Unsafe research output: ${resolvedOutput}`);
  if (fs.existsSync(outputRoot)) fs.rmSync(outputRoot, { recursive: true, force: true });
  ensureDir(path.join(outputRoot, "sources"));

  const candidates = canonicalCandidates(contentRoot);
  const fullFiles = fullCharacterFiles(normalizedCharacter);
  const sources: CanonSource[] = [];
  const unreadable: { file: string; reason: string }[] = [];
  for (const file of candidates) {
    const relative = path.relative(contentRoot, file).replaceAll("\\", "/");
    try {
      const content = await readXnb(file);
      const full = fullFiles.has(relative.toLowerCase());
      const entries = full ? content : filterCharacterMatches(content, normalizedCharacter);
      if (entries === undefined) continue;
      const source: CanonSource = {
        file: relative,
        sha256: sha256(fs.readFileSync(file)),
        mode: full ? "full" : "matched",
        entries,
        entryCount: countEntries(entries),
      };
      sources.push(source);
      writeJson(
        path.join(
          outputRoot,
          "sources",
          `${String(sources.length).padStart(3, "0")}-${slugify(relative, "source")}.json`,
        ),
        source,
      );
    } catch (error) {
      unreadable.push({
        file: relative,
        reason: error instanceof Error ? (error.message.split("\n")[0] ?? error.message) : String(error),
      });
    }
  }

  const report: CharacterCanonReport = {
    schema: "stardew-canon-research/v1",
    character: normalizedCharacter,
    characterId,
    gameVersion: extractGameVersion(fs.readFileSync(gameDll)),
    gameRoot: resolvedGameRoot,
    outputRoot,
    generatedAt: new Date().toISOString(),
    sources,
    unreadable,
    summary: {
      scanned: candidates.length,
      sources: sources.length,
      entries: sources.reduce((sum, source) => sum + source.entryCount, 0),
      unreadable: unreadable.length,
    },
  };
  writeJson(path.join(outputRoot, "index.json"), report);
  writeJson(path.join(outputRoot, "unreadable.json"), unreadable);
  writeText(
    path.join(outputRoot, "README.md"),
    [
      `# ${normalizedCharacter} canon research corpus`,
      "",
      `- Game version: ${report.gameVersion}`,
      `- English XNB files scanned: ${report.summary.scanned}`,
      `- Matching sources: ${report.summary.sources}`,
      `- Extracted top-level entries: ${report.summary.entries}`,
      `- Unreadable structured/binary sources: ${report.summary.unreadable}`,
      "",
      "This directory is local-only research input. It must not be copied verbatim into CharX or Git.",
      "Character authoring should synthesize original prose and distinguish explicit canon from inference.",
      "",
    ].join("\n"),
  );
  return report;
}
