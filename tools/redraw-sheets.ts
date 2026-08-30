import fs from "node:fs";
import path from "node:path";

type Asset = { name: string; sourceFile: string };

const workspace = process.cwd();
const ir = JSON.parse(
  fs.readFileSync(path.join(workspace, "projects/stardew-valley/generated/world-ir.json"), "utf8"),
) as { assets: Asset[] };

const portraits = ir.assets
  .filter((asset) => asset.name.split(".").length === 4)
  .map((asset) => {
    const [character, outfit, expression] = asset.name.split(".");
    return { character, outfit, expression, name: asset.name, source: asset.sourceFile };
  });

const byCharacter = new Map<string, typeof portraits>();
for (const row of portraits) {
  if (!byCharacter.has(row.character)) byCharacter.set(row.character, []);
  byCharacter.get(row.character)?.push(row);
}

const outDir = path.join(workspace, "projects/stardew-valley/redraw/sheets");
fs.mkdirSync(outDir, { recursive: true });

const absolute = (source: string): string =>
  path.join(workspace, "projects/stardew-valley", source).split(path.sep).join("\\");

const index: string[] = [
  "# Portrait sheets",
  "",
  "Which portraits exist per character, with the outfits each one needs a tag block",
  "for. Regenerate with `bun tools/redraw-sheets.ts`.",
  "",
  "| character | portraits | outfits | sheet |",
  "| --- | --- | --- | --- |",
];

for (const [character, rows] of [...byCharacter].sort()) {
  const byOutfit = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!byOutfit.has(row.outfit)) byOutfit.set(row.outfit, []);
    byOutfit.get(row.outfit)?.push(row);
  }

  const lines: string[] = [
    `# ${character} — ${rows.length} portraits across ${byOutfit.size} outfits`,
    "",
    `Reference list for \`redraw/tags/${character}.yaml\`. The tags themselves come from`,
    `\`source/characters/${character}/content.md\` — see \`redraw/README.md\`. Paths are here`,
    "for spot-checking a render against the portrait it replaces.",
    "",
  ];

  for (const [outfit, group] of [...byOutfit].sort()) {
    lines.push(`## ${outfit} (${group.length})`, "");
    for (const row of group) {
      lines.push(`- \`${row.expression}\` — \`${absolute(row.source)}\``);
    }
    lines.push("");
  }

  const sheet = path.join(outDir, `${character}.md`);
  fs.writeFileSync(sheet, `${lines.join("\n").trimEnd()}\n`, "utf8");
  index.push(
    `| ${character} | ${rows.length} | ${[...byOutfit.keys()].sort().join(", ")} | \`sheets/${character}.md\` |`,
  );
}

fs.writeFileSync(path.join(outDir, "..", "SHEETS.md"), `${index.join("\n")}\n`, "utf8");
console.log(`wrote ${byCharacter.size} sheets for ${portraits.length} portraits`);
