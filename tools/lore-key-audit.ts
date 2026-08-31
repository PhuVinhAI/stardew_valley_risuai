/**
 * lore-key-audit.ts
 *
 * Reproduces RisuAI's client-side lorebook key matching exactly and reports
 * keys that fire on text which does not actually mention the entry.
 *
 * RisuAI (src/ts/process/lorebook.svelte.ts, searchMatch) with
 * fullWordMatching: false does:
 *
 *     mText = message.toLocaleLowerCase().replace(/ /g, '')
 *     realKey = key.toLocaleLowerCase().replace(/ /g, '')
 *     if (mText.includes(realKey)) -> activate
 *
 * Because BOTH sides have every space deleted, a key matches when its letters
 * appear anywhere in the message, including:
 *   - inside a longer Vietnamese syllable  ("ga" inside "ngay", "hay" inside "khay")
 *   - straddling a word boundary           ("nhagi" across "... nha | gi ...")
 *
 * The audit corpus is the shipped Vietnamese + English narration (the greeting
 * scenarios), which is the text most likely to be in scan range on turn one.
 * A key that misfires there costs the whole entry's tokens on every request
 * where that text is still within scanDepth.
 *
 * Usage:
 *   bun run tools/lore-key-audit.ts --project stardew-valley
 *   bun run tools/lore-key-audit.ts --project stardew-valley --keys-only
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join, resolve } from "node:path";

// tiktoken is a dependency of @charx/core, not of the repo root, so resolve it
// from that package rather than importing it as a bare specifier.
const requireFromCore = createRequire(resolve("packages", "charx-core", "package.json"));
const { get_encoding } = requireFromCore("tiktoken") as {
  get_encoding: (name: "cl100k_base") => {
    encode: (text: string) => unknown[];
    free: () => void;
  };
};

type Encoding = ReturnType<typeof get_encoding>;

interface Entity {
  id: string;
  keywords?: string[];
  secondaryKeywords?: string[];
  alwaysActive?: boolean;
  sourceFile: string;
}

interface Ir {
  entities: Entity[];
}

/** One misfire: key K matched span S, but S is not a real mention. */
interface Misfire {
  entityId: string;
  key: string;
  /** The original-text slice the stripped match maps back to. */
  span: string;
  /** Wider original-text context around the span. */
  context: string;
  kind: "inside-word" | "crosses-words";
}

const RISU_STRIP = / /g;

function risuNormalise(text: string): string {
  return text.toLocaleLowerCase().replace(RISU_STRIP, "");
}

/**
 * Build the stripped string plus, for every stripped index, the index it came
 * from in the original. Lets a stripped match be mapped back to real text.
 */
function buildStrippedIndex(original: string): {
  stripped: string;
  map: number[];
} {
  const lower = original.toLocaleLowerCase();
  const chars: string[] = [];
  const map: number[] = [];
  for (let i = 0; i < lower.length; i++) {
    if (lower[i] === " ") continue;
    chars.push(lower[i]);
    map.push(i);
  }
  return { stripped: chars.join(""), map };
}

/** Letters that can be part of a Vietnamese or English word. */
const WORD_CHAR = /[\p{L}\p{N}]/u;

function classifyMatch(
  original: string,
  map: number[],
  strippedStart: number,
  strippedEnd: number,
): { kind: Misfire["kind"] | "clean"; span: string } {
  const from = map[strippedStart];
  const to = map[strippedEnd - 1];
  const span = original.slice(from, to + 1);

  // A match that swallowed a space in the original spans several words.
  // That is only legitimate for multi-word keys, handled by the caller.
  const crosses = span.includes(" ");

  const before = from > 0 ? original[from - 1] : "";
  const after = to + 1 < original.length ? original[to + 1] : "";
  const glued = (before !== "" && WORD_CHAR.test(before)) || (after !== "" && WORD_CHAR.test(after));

  if (glued) return { kind: "inside-word", span };
  if (crosses) return { kind: "crosses-words", span };
  return { kind: "clean", span };
}

function scanKey(
  entityId: string,
  key: string,
  original: string,
  stripped: string,
  map: number[],
): Misfire[] {
  const realKey = risuNormalise(key);
  if (realKey.length === 0) return [];

  const keyIsMultiWord = key.trim().includes(" ");
  const out: Misfire[] = [];
  let at = 0;
  while (true) {
    const found = stripped.indexOf(realKey, at);
    if (found === -1) break;
    at = found + 1;

    const { kind, span } = classifyMatch(original, map, found, found + realKey.length);
    if (kind === "clean") continue;
    // A multi-word key is expected to cross word boundaries.
    if (kind === "crosses-words" && keyIsMultiWord) continue;

    const ctxFrom = Math.max(0, map[found] - 40);
    const ctxTo = Math.min(original.length, map[found + realKey.length - 1] + 40);
    out.push({
      entityId,
      key,
      span,
      context: original.slice(ctxFrom, ctxTo).replace(/\s+/g, " ").trim(),
      kind,
    });
  }
  return out;
}

function readCorpus(projectDir: string): { label: string; text: string }[] {
  const scenarioDir = join(projectDir, "source", "presentation", "scenarios");
  const docs: { label: string; text: string }[] = [];
  if (!existsSync(scenarioDir)) return docs;
  for (const entry of readdirSync(scenarioDir)) {
    const dir = join(scenarioDir, entry);
    for (const lang of ["vi", "en"]) {
      const file = join(dir, `${entry}.${lang}.md`);
      if (existsSync(file)) {
        docs.push({
          label: `${entry}.${lang}`,
          text: readFileSync(file, "utf8"),
        });
      }
    }
  }
  return docs;
}

function entryTokens(projectDir: string, entity: Entity, enc: Encoding): number {
  const md = join(projectDir, dirname(entity.sourceFile), "content.md");
  if (!existsSync(md)) return 0;
  return enc.encode(readFileSync(md, "utf8")).length;
}

function main(): void {
  const argv = process.argv.slice(2);
  const projectIndex = argv.indexOf("--project");
  if (projectIndex === -1 || !argv[projectIndex + 1]) {
    console.error("usage: lore-key-audit.ts --project <project-id>");
    process.exit(2);
  }
  const projectId = argv[projectIndex + 1];
  const keysOnly = argv.includes("--keys-only");
  const projectDir = join("projects", projectId);
  const irPath = join(projectDir, "generated", "world-ir.json");
  if (!existsSync(irPath)) {
    console.error(`missing ${irPath} — run: bun run charx check --project ${projectId}`);
    process.exit(2);
  }

  const ir: Ir = JSON.parse(readFileSync(irPath, "utf8"));
  const corpus = readCorpus(projectDir);
  const enc = get_encoding("cl100k_base");

  const perKey = new Map<string, Misfire[]>();
  const perEntity = new Map<string, Set<string>>();

  for (const entity of ir.entities) {
    if (entity.alwaysActive) continue;
    // secondaryKeywords are dropped at compile for non-selective entries,
    // so only primary keys can actually fire.
    for (const key of entity.keywords ?? []) {
      const hits: Misfire[] = [];
      for (const doc of corpus) {
        const { stripped, map } = buildStrippedIndex(doc.text);
        hits.push(...scanKey(entity.id, key, doc.text, stripped, map));
      }
      if (hits.length === 0) continue;
      perKey.set(`${entity.id}\u0000${key}`, hits);
      const set = perEntity.get(entity.id) ?? new Set<string>();
      set.add(key);
      perEntity.set(entity.id, set);
    }
  }

  const ordered = [...perKey.entries()].sort((a, b) => b[1].length - a[1].length);

  console.log(
    `corpus: ${corpus.length} narration files (${corpus.map((d) => basename(d.label)).length} docs)`,
  );
  console.log(
    `keys audited: ${ir.entities.reduce((n, e) => n + (e.alwaysActive ? 0 : (e.keywords ?? []).length), 0)}`,
  );
  console.log(`MISFIRING KEYS (${ordered.length})`);
  console.log("");

  for (const [composite, hits] of ordered) {
    const [entityId, key] = composite.split("\u0000");
    const kinds = [...new Set(hits.map((h) => h.kind))].join("+");
    console.log(
      `${String(hits.length).padStart(4)}x  ${entityId.padEnd(28)}  ${JSON.stringify(key).padEnd(24)}  ${kinds}`,
    );
    if (keysOnly) continue;
    const shown = new Set<string>();
    for (const hit of hits) {
      if (shown.has(hit.span)) continue;
      shown.add(hit.span);
      if (shown.size > 3) break;
      console.log(`        ${JSON.stringify(hit.span)} in "...${hit.context}..."`);
    }
  }

  console.log("");
  console.log(`ENTITIES REACHABLE BY A MISFIRING KEY (${perEntity.size})`);
  let wasted = 0;
  const rows = [...perEntity.entries()]
    .map(([id, keys]) => {
      const entity = ir.entities.find((e) => e.id === id);
      const tokens = entity ? entryTokens(projectDir, entity, enc) : 0;
      return { id, keys: [...keys], tokens };
    })
    .sort((a, b) => b.tokens - a.tokens);
  for (const row of rows) {
    wasted += row.tokens;
    console.log(
      `${String(row.tokens).padStart(6)}t  ${row.id.padEnd(28)}  via ${row.keys.map((k) => JSON.stringify(k)).join(", ")}`,
    );
  }
  console.log("");
  console.log(`worst case if every misfiring key fires at once: ${wasted} tokens`);

  enc.free();
}

main();
