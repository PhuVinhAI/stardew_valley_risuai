import fs from "node:fs";
import path from "node:path";

/**
 * Archives the current `## Appearance` section of every character entry into
 * `redraw/appearance/<id>.md`.
 *
 * The redraw tag files quote this prose to justify each tag, and
 * `redraw-verify-quotes.ts` checks those quotes verbatim. Once the card-side
 * section is condensed, the archive becomes the provenance record those quotes
 * are verified against, so the audit trail survives the reduction. Nothing here
 * is compiled into the card: `redraw/` sits outside `source/`.
 *
 * Run once, before condensing. It refuses to overwrite an existing archive so a
 * second run cannot replace the original prose with the condensed version.
 */

const workspace = process.cwd();
const charDir = path.join(workspace, "projects/stardew-valley/source/characters");
const outDir = path.join(workspace, "projects/stardew-valley/redraw/appearance");

fs.mkdirSync(outDir, { recursive: true });

let written = 0;
let skipped = 0;

for (const id of fs.readdirSync(charDir).sort()) {
  const file = path.join(charDir, id, "content.md");
  if (!fs.existsSync(file)) continue;

  const section = /## Appearance\n([\s\S]*?)(?=\n## |$)/.exec(fs.readFileSync(file, "utf8"));
  if (!section) {
    console.log(`  no ## Appearance section: ${id}`);
    continue;
  }

  const target = path.join(outDir, `${id}.md`);
  if (fs.existsSync(target)) {
    skipped += 1;
    continue;
  }

  const body = [
    `# ${id} — original appearance prose`,
    "",
    "Archived verbatim from `source/characters/" +
      id +
      "/content.md` before the card-side section was condensed. This is the source the",
    "tag comments quote and `redraw-verify-quotes.ts` verifies against. Do not reword it.",
    "",
    "## Appearance",
    "",
    section[1].trim(),
    "",
  ].join("\n");

  fs.writeFileSync(target, body, "utf8");
  written += 1;
}

console.log(`archived: ${written}   already present (left alone): ${skipped}`);
console.log(`-> projects/stardew-valley/redraw/appearance/`);
