import fs from "node:fs";
import path from "node:path";

/**
 * Guards the condensed `## Appearance` sections against the two ways a rewrite
 * can go wrong: dropping a fact, or inventing one.
 *
 * Ground truth is `redraw/appearance/<id>.md`, the verbatim archive of the
 * original prose. Every check compares the card-side section against it.
 *
 *   FABRICATION  a content word in the new prose that appears nowhere in the
 *                archive or in the rest of that character's entry.
 *   LOST FACT    a measurement, cup size, colour, or anatomy noun the archive
 *                states and the new prose no longer does.
 *   LABEL        an outfit label the card ships portraits for that the new prose
 *                never names, so the model cannot tell what it shows.
 *   EXPRESSION   an expression catalogue left behind; the model picks
 *                expressions from the keyword list, so prose must not enumerate
 *                them.
 */

const workspace = process.cwd();
const project = path.join(workspace, "projects/stardew-valley");
const charDir = path.join(project, "source/characters");
const archiveDir = path.join(project, "redraw/appearance");
const irPath = path.join(project, "generated/world-ir.json");

const normalise = (text: string): string =>
  text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2014\u2013]/g, "-")
    .toLowerCase();

const section = (markdown: string, heading: string): string =>
  new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`).exec(markdown)?.[1]?.trim() ?? "";

/** Outfit labels the card actually ships, taken from the assets, never hand-listed. */
function outfitLabels(): Map<string, Set<string>> {
  const labels = new Map<string, Set<string>>();
  const ir = JSON.parse(fs.readFileSync(irPath, "utf8")) as { assets: { id: string }[] };
  for (const asset of ir.assets) {
    const match = /^portrait-([a-z]+)-(.+)-expression-\d+$/.exec(asset.id);
    if (!match) continue;
    if (!labels.has(match[1])) labels.set(match[1], new Set());
    labels.get(match[1])?.add(match[2]);
  }
  return labels;
}

/** Expression labels, so the check can tell prose is still enumerating faces. */
function expressionLabels(): Map<string, Set<string>> {
  const labels = new Map<string, Set<string>>();
  const ir = JSON.parse(fs.readFileSync(irPath, "utf8")) as {
    assets: { id: string; path?: string; name?: string }[];
  };
  for (const asset of ir.assets) {
    const source = asset.path ?? asset.name ?? "";
    const match = /^([a-z]+)\.([a-z0-9-]+)\.([a-z0-9-]+)\.webp$/.exec(path.basename(source));
    if (!match) continue;
    if (!labels.has(match[1])) labels.set(match[1], new Set());
    labels.get(match[1])?.add(match[3]);
  }
  return labels;
}

const stopwords = new Set(
  "about above across after against almost alone along already also always among another around aside away because before behind being below beneath beside besides between beyond both bottom clearly closed complete completely could does doing done down during each either else enough even ever every everything except explicit first from front full given gives going gone half hangs have having here hers herself high hold holds holding however impossible inside instead into itself just keep keeps kept least leave leaves left less like little live lives long look looking looks made make makes making mean means might more most much must near nearly neither never next nobody none nothing notice now often once only onto open other others otherwise over overall part parts past perhaps place places plus quite rather really right runs same says seen sets several shall shape share should show shows side sides simply since sits somebody someone something sometimes somewhat soon sort still such take takes than that their them then there these they thing things this those though through throughout thus together toward towards under undone unless until upon used uses using very want wants well went were what when where whether which while whole whom whose will with within without would year years yet"
    .split(/\s+/)
    .filter(Boolean),
);

/**
 * Scaffolding the condensed form introduces on purpose: it names outfit labels and
 * says how one outfit differs from another. These words describe the card's own
 * structure rather than the character, so they are exempt from the fabrication
 * test. Every other word must trace back to the archive.
 */
for (const word of "outfit outfits label labels portrait portraits swimsuit swimsuit-ex post-event glasses joja-uniform hospital garter default winter beach nude version versions swap swaps identical unchanged listed reads adds added addition otherwise".split(
  " ",
))
  stopwords.add(word);

const colours =
  /\b(black|blue|brown|crimson|golden|gold|green|grey|gray|magenta|orange|pink|purple|red|silver|tan|teal|violet|white|yellow|blonde|blond|auburn|ginger|lavender|olive|cream|ivory|amber|hazel|copper|maroon|navy|turquoise)\b/g;
const anatomy =
  /\b(penis|testicles|nipples?|areolae?|vulva|pussy|clitoris|barcode|freckles?|scar|tattoo|birthmark|piercing|navel|cleavage|underboob|sideboob)\b/g;
const cup = /\b([a-k])-cup\b/g;
const measurements = /\b\d{2,3}-\d{2,3}-\d{2,3}\b|\b\d{3} cm\b|\b1\d{2} cm\b/g;

const faceWords =
  /\b(expression|expressions|half-lidded|closed-eyed|open-eyed|wide-eyed|downturned|open-mouthed|eyes screwed|smiling properly|a delighted|a startled|a sheepish|a bashful|a wry|a glum|a weary|a flat stare|a triumphant)\b/g;

const outfits = outfitLabels();
const expressions = expressionLabels();

type Problem = { kind: string; detail: string };
const report = new Map<string, Problem[]>();
let newTotal = 0;
let oldTotal = 0;

for (const id of fs.readdirSync(charDir).sort()) {
  const entryPath = path.join(charDir, id, "content.md");
  const archivePath = path.join(archiveDir, `${id}.md`);
  if (!fs.existsSync(entryPath) || !fs.existsSync(archivePath)) continue;

  const entry = fs.readFileSync(entryPath, "utf8");
  const current = normalise(section(entry, "Appearance"));
  const archive = normalise(section(fs.readFileSync(archivePath, "utf8"), "Appearance"));
  const rest = normalise(entry.replace(/## Appearance\n[\s\S]*?(?=\n## |$)/, ""));

  newTotal += Math.round(current.length / 4);
  oldTotal += Math.round(archive.length / 4);

  const problems: Problem[] = [];

  // Unchanged sections are not yet condensed; skip them silently.
  const condensed = current !== archive;

  /**
   * Every archive ends with a paragraph cataloguing the expression sheet, opening
   * on the character's face or her range. That catalogue is dropped on purpose, so
   * a detail stated only inside it is not a lost fact — the model gets expressions
   * from the injected keyword list instead. Facts in every other paragraph must
   * survive.
   */
  const factSource = archive
    .split(/\n{2,}/)
    .filter((para) => !/\b(her face|her expressions|one expression|one face|widest range)\b/i.test(para))
    .join("\n\n");

  /**
   * Inflection is not fabrication: `bares` for `bare`, `framing` for `frame`, and
   * `carrying` for `carries` introduce no new fact. Each word expands to every
   * plausible stem rather than one, and two words are the same if any stem is
   * shared. A genuine vocabulary change shares none and is still reported, which
   * is the point: the condensed prose must reuse the original's words rather than
   * paraphrase them into something the tag files no longer match.
   */
  const forms = (word: string): string[] => {
    const out = new Set<string>([word.replace(/'s$/, "")]);
    for (const base of [...out])
      for (const suffix of ["ing", "est", "ed", "es", "ly", "er", "s"])
        if (base.endsWith(suffix) && base.length - suffix.length >= 3) {
          const cut = base.slice(0, -suffix.length);
          out.add(cut);
          // `framing` -> `frame`, `bares` -> `bare`
          out.add(`${cut}e`);
          // `carries` -> `carry`
          out.add(cut.replace(/i$/, "y"));
          // `sitting` -> `sit`
          out.add(cut.replace(/([^aeiou])\1$/, "$1"));
        }
    return [...out];
  };

  // Hyphenated compounds are indexed whole and in parts, so `leaf-shaped` in the
  // archive covers a later `leaf`.
  const words = (text: string): string[] =>
    (text.match(/[a-z][a-z'-]{2,}/g) ?? []).flatMap((word) => [word, ...word.split("-")]);

  const known = new Set<string>();
  for (const word of words(`${archive} ${rest}`)) for (const form of forms(word)) known.add(form);
  // A label this character actually ships portraits for is card structure, not a
  // claim about her body. LABEL enforces that each one is named; naming it must
  // not then count as invention. Only this character's own labels are exempt.
  for (const label of outfits.get(id) ?? []) for (const word of words(label)) known.add(word);

  for (const word of new Set(words(current)))
    if (word.length >= 4 && !stopwords.has(word) && !forms(word).some((form) => known.has(form)))
      problems.push({
        kind: "FABRICATION",
        detail: `'${word}' appears in neither the archive nor the entry`,
      });

  for (const [label, pattern] of [
    ["measurement", measurements],
    ["cup size", cup],
    ["colour", colours],
    ["anatomy", anatomy],
  ] as const)
    for (const fact of new Set(factSource.match(pattern) ?? []))
      if (!current.includes(fact)) problems.push({ kind: "LOST FACT", detail: `${label} '${fact}' dropped` });

  if (condensed) {
    // The condensed form names each outfit label explicitly, so the model can map
    // the label in a portrait filename to what the portrait shows. The original
    // prose described outfits without naming them, so this only applies once
    // rewritten.
    for (const label of outfits.get(id) ?? [])
      if (!current.includes(label))
        problems.push({ kind: "LABEL", detail: `outfit '${label}' is never named` });

    const faces = new Set(current.match(faceWords) ?? []);
    if (faces.size >= 2)
      problems.push({ kind: "EXPRESSION", detail: `still enumerates faces: ${[...faces].join(", ")}` });
    // Only compound labels are diagnostic. A single word such as `composed` or
    // `bright` is also ordinary English the body description legitimately uses,
    // so matching it would flag prose the archive itself contains.
    for (const label of expressions.get(id) ?? [])
      if (label.includes("-") && current.includes(label.replace(/-/g, " ")))
        problems.push({ kind: "EXPRESSION", detail: `names expression '${label}'` });
  }

  if (problems.length) report.set(id, problems);
}

const condensedCount = fs.readdirSync(charDir).filter((id) => {
  const entryPath = path.join(charDir, id, "content.md");
  const archivePath = path.join(archiveDir, `${id}.md`);
  if (!fs.existsSync(entryPath) || !fs.existsSync(archivePath)) return false;
  return (
    normalise(section(fs.readFileSync(entryPath, "utf8"), "Appearance")) !==
    normalise(section(fs.readFileSync(archivePath, "utf8"), "Appearance"))
  );
}).length;

console.log(`condensed: ${condensedCount}/32   appearance tokens ${oldTotal} -> ${newTotal}`);
console.log("");
let problemCount = 0;
for (const [id, problems] of report) {
  console.log(`${id}`);
  for (const problem of problems) {
    problemCount += 1;
    console.log(`  ${problem.kind.padEnd(11)} ${problem.detail}`);
  }
}
console.log("");
console.log(`PROBLEMS (${problemCount})`);
