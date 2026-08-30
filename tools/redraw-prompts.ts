import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";

type TagFile = {
  character: string;
  futanari: boolean;
  identity: string[];
  outfits: Record<string, string[]>;
  expressions: Record<string, string[]>;
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
const prompts: { name: string; prompt: string }[] = [];

for (const file of files) {
  const tags = parse(fs.readFileSync(path.join(tagDir, file), "utf8")) as TagFile;
  const rows = portraits.filter((row) => row.character === tags.character);
  if (!rows.length) {
    console.log(`${tags.character}: no portraits in the card`);
    continue;
  }
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
    prompts.push({
      name: row.name,
      prompt: [...tags.identity, ...outfit, ...expression].join(", "),
    });
  }
  // Every outfit and expression block should be used by at least one portrait.
  for (const key of Object.keys(tags.outfits))
    if (!rows.some((row) => row.outfit === key)) console.log(`UNUSED outfit '${key}' in ${file}`);
  for (const key of Object.keys(tags.expressions))
    if (!rows.some((row) => row.expression === key)) console.log(`UNUSED expression '${key}' in ${file}`);
}

const outFile = path.join(workspace, "projects/stardew-valley/redraw/prompts.jsonl");
fs.writeFileSync(outFile, `${prompts.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");

console.log("");
console.log(`tag files: ${files.length}`);
console.log(`prompts written: ${prompts.length}   gaps: ${missing}`);
console.log(`-> ${path.relative(workspace, outFile).split(path.sep).join("/")}`);
if (prompts[0]) {
  console.log("");
  console.log(`${prompts[0].name}`);
  console.log(prompts[0].prompt);
}
