import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";

type Override = { drop?: string[]; add?: string[] };

type TagFile = {
  character: string;
  futanari: boolean;
  identity: string[];
  outfits: Record<string, string[]>;
  expressions: Record<string, string[]>;
  /**
   * Optional per-portrait repairs, keyed `<outfit>.<expression>`. Needed because a
   * few expression blocks change what the outfit covers — a topless pose inside a
   * clothed outfit, an explicit pose inside `nude` — and plain concatenation would
   * otherwise emit a prompt that contradicts itself.
   */
  overrides?: Record<string, Override>;
};

type Asset = { name: string };

const workspace = process.cwd();
const ir = JSON.parse(
  fs.readFileSync(path.join(workspace, "projects/stardew-valley/generated/world-ir.json"), "utf8"),
) as { assets: Asset[] };

const portraits = ir.assets
  .filter((asset) => asset.name.split(".").length === 4)
  .map((asset) => {
    const [character, outfit, expression] = asset.name.split(".");
    return { character, outfit, expression, name: asset.name };
  });

const tagDir = path.join(workspace, "projects/stardew-valley/redraw/tags");
const only = process.argv[2];
const files = fs
  .readdirSync(tagDir)
  .filter((file) => file.endsWith(".yaml"))
  .filter((file) => !only || file === `${only}.yaml`);

let missing = 0;
let unusedOverrides = 0;
const prompts: { name: string; prompt: string }[] = [];

for (const file of files) {
  const tags = parse(fs.readFileSync(path.join(tagDir, file), "utf8")) as TagFile;
  const rows = portraits.filter((row) => row.character === tags.character);
  if (!rows.length) {
    console.log(`${tags.character}: no portraits in the card`);
    continue;
  }
  const overrides = tags.overrides ?? {};
  const usedOverrides = new Set<string>();

  for (const row of rows) {
    const outfit = tags.outfits[row.outfit];
    const expression = tags.expressions[row.expression];
    if (!outfit) {
      missing += 1;
      console.log(`MISSING outfit '${row.outfit}' for ${row.name}`);
      continue;
    }
    if (!expression) {
      missing += 1;
      console.log(`MISSING expression '${row.expression}' for ${row.name}`);
      continue;
    }

    const key = `${row.outfit}.${row.expression}`;
    const override = overrides[key];
    if (override) usedOverrides.add(key);
    const drop = new Set((override?.drop ?? []).map((tag) => tag.toLowerCase()));
    const dropped = new Set<string>();

    // Dedupe case-insensitively, keeping first appearance so identity leads.
    const seen = new Set<string>();
    const assembled: string[] = [];
    for (const tag of [...tags.identity, ...outfit, ...expression, ...(override?.add ?? [])]) {
      const lower = tag.toLowerCase();
      if (drop.has(lower)) {
        dropped.add(lower);
        continue;
      }
      if (seen.has(lower)) continue;
      seen.add(lower);
      assembled.push(tag);
    }

    // A drop that matched nothing means the tag was renamed or the key is stale.
    for (const tag of drop)
      if (!dropped.has(tag)) console.log(`OVERRIDE drop '${tag}' matched nothing for ${row.name}`);

    prompts.push({ name: row.name, prompt: assembled.join(", ") });
  }

  // Every outfit and expression block should be used by at least one portrait.
  for (const key of Object.keys(tags.outfits))
    if (!rows.some((row) => row.outfit === key)) console.log(`UNUSED outfit '${key}' in ${file}`);
  for (const key of Object.keys(tags.expressions))
    if (!rows.some((row) => row.expression === key)) console.log(`UNUSED expression '${key}' in ${file}`);
  for (const key of Object.keys(overrides))
    if (!usedOverrides.has(key)) {
      unusedOverrides += 1;
      console.log(`UNUSED override '${key}' in ${file}`);
    }
}

const outFile = path.join(workspace, "projects/stardew-valley/redraw/prompts.jsonl");
fs.writeFileSync(outFile, `${prompts.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");

console.log("");
console.log(`tag files: ${files.length}`);
console.log(`prompts written: ${prompts.length}   gaps: ${missing}   unused overrides: ${unusedOverrides}`);
console.log(`-> ${path.relative(workspace, outFile).split(path.sep).join("/")}`);
