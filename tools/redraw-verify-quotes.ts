import fs from "node:fs";
import path from "node:path";

const workspace = process.cwd();
const redrawDir = path.join(workspace, "projects/stardew-valley/redraw");
const tagDir = path.join(redrawDir, "tags");
const charDir = path.join(workspace, "projects/stardew-valley/source/characters");
/**
 * Appearance prose on the card was condensed; `redraw/appearance/<id>.md` holds the
 * verbatim original the tag comments were written against. Both are searched, so a
 * quote is valid whether it came from the archived appearance section or from a
 * still-current part of the entry such as Personality.
 */
const archiveDir = path.join(redrawDir, "appearance");

/** Collapse whitespace and normalise quote/dash glyphs so a wrapped comment compares. */
const normalise = (text: string): string =>
  text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2014\u2013]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/**
 * Join the `#` comment lines of a tag file into one string. A prose quote wrapped
 * across lines may break inside a hyphenated word (`chin-in-` / `hands`), so a
 * line ending in a hyphen joins without a space.
 */
function commentText(file: string): string {
  const lines = fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trimStart().startsWith("#"))
    .map((line) => line.replace(/^\s*#\s?/, "").trimEnd());
  let joined = "";
  for (const line of lines) joined = joined.endsWith("-") ? joined + line : `${joined} ${line}`;
  return joined;
}

/**
 * Quoted spans, split on `"` so pairs cannot misalign: odd indices are inside
 * quotes. A span may itself join several prose fragments with an ellipsis, and
 * each fragment is verified separately.
 */
function quotedSpans(text: string): string[] {
  const spans: string[] = [];
  const parts = normalise(text).split('"');
  for (let index = 1; index < parts.length; index += 2)
    for (const fragment of parts[index].split(/\s*\.\.\.\s*|\s*…\s*/)) {
      const span = fragment.replace(/^[\s,;:.]+|[\s,;:.]+$/g, "").trim();
      if (span.length >= 12) spans.push(span);
    }
  return spans;
}

// A tag file may also quote the pipeline's own README rule rather than prose.
const readme = normalise(fs.readFileSync(path.join(redrawDir, "README.md"), "utf8"));

let checked = 0;
const missing: { character: string; span: string }[] = [];

for (const file of fs.readdirSync(tagDir).filter((name) => name.endsWith(".yaml"))) {
  const character = file.replace(/\.yaml$/, "");
  const entry = normalise(fs.readFileSync(path.join(charDir, character, "content.md"), "utf8"));
  const archivePath = path.join(archiveDir, `${character}.md`);
  const archive = fs.existsSync(archivePath) ? normalise(fs.readFileSync(archivePath, "utf8")) : "";
  for (const span of quotedSpans(commentText(path.join(tagDir, file)))) {
    checked += 1;
    if (!entry.includes(span) && !archive.includes(span) && !readme.includes(span))
      missing.push({ character, span });
  }
}

console.log(`quoted prose spans checked: ${checked}`);
console.log(`NOT FOUND in the entry, the appearance archive, or the README: ${missing.length}`);
console.log("");
for (const entry of missing) console.log(`  ${entry.character}: "${entry.span}"`);
