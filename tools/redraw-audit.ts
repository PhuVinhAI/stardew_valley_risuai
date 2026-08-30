import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";

type TagFile = {
  character: string;
  futanari: boolean;
  identity: string[];
  outfits: Record<string, string[]>;
  expressions: Record<string, string[]>;
  overrides?: Record<string, { drop?: string[]; add?: string[] }>;
};

type Asset = { name: string };

const workspace = process.cwd();
const tagDir = path.join(workspace, "projects/stardew-valley/redraw/tags");

const ir = JSON.parse(
  fs.readFileSync(path.join(workspace, "projects/stardew-valley/generated/world-ir.json"), "utf8"),
) as { assets: Asset[] };

const portraits = ir.assets
  .filter((asset) => asset.name.split(".").length === 4)
  .map((asset) => {
    const [character, outfit, expression] = asset.name.split(".");
    return { character, outfit, expression, name: asset.name };
  });

const registry = fs.readFileSync(
  path.join(workspace, "projects/stardew-valley/source/lore/cast-registry/content.md"),
  "utf8",
);

/** The roster lives in two labelled lists in the always-active cast registry. */
function roster(heading: string): Set<string> {
  const line = registry.split("\n").find((row) => row.includes(heading));
  if (!line) throw new Error(`cast-registry has no '${heading}' line`);
  const [names] = line.replace(/^.*?:\s*/, "").split(". ");
  return new Set(
    names
      .split(/,|\band\b/)
      .map((name) => name.trim().replace(/^the /i, "").replace(/\.$/, "").toLowerCase())
      .filter(Boolean),
  );
}

const futanariRoster = roster("Futanari");
const plainRoster = roster("Not futanari");

// Identity must describe the person, never the shot or the moment.
const framingTags = [
  "upper body",
  "full body",
  "portrait",
  "close-up",
  "cowboy shot",
  "from behind",
  "from above",
  "from side",
  "looking at viewer",
  "looking away",
];
const moodTags = [
  "smile",
  "frown",
  "grin",
  "smirk",
  "happy",
  "sad",
  "angry",
  "annoyed",
  "surprised",
  "open mouth",
  "closed eyes",
  "closed mouth",
  "half-closed eyes",
  "crying",
  "tears",
];

// Anything that covers the torso. Used to catch "nude, ..., wearing a coat".
const garmentWords =
  /\b(bikini|swimsuit|leotard|dress|skirt|coat|labcoat|jacket|shirt|vest|bandeau|bra|panties|thong|briefs|shorts|trousers|pants|pantyhose|thighhighs|stockings|scarf|shawl|sarong|apron|pinafore|uniform|sweater|hoodie|robe|lingerie|garter belt|legwarmers|overalls|kimono|cardigan|blouse|necktie|bowtie|tank ?top|camisole|one-piece|tube top)\b/;
const garmentExempt = new Set([
  // Worn on the head, hands, feet, or neck: compatible with an otherwise nude body.
  "straw hat",
  "sun hat",
  "hat flower",
  "hair ribbon",
  "headband",
  "choker",
  "collar",
  "necklace",
  "earrings",
  "gloves",
  "boots",
  "shoes",
  "glasses",
  "sunglasses",
  "eyewear",
  "red-framed eyewear",
  "cowbell",
  "ear tag",
  "bandaged arm",
  "arm wrap",
  "hair clip",
  "gold hair clip",
]);

const censorTags = [
  "censored",
  "mosaic censoring",
  "bar censor",
  "convenient censoring",
  "steam censor",
  "light censor",
  "heart censor",
];
const hedgeTags = ["implied nudity", "suggestive", "tasteful", "modest", "sfw", "no nipples"];
const forbiddenTags = [
  "1boy",
  "2boys",
  "male",
  "man",
  "boy",
  "child",
  "loli",
  "shota",
  "teenage",
  "young girl",
];
const anatomyNouns = ["futanari", "penis", "testicles"];

const findings: { severity: "ERROR" | "WARN"; where: string; what: string }[] = [];
const add = (severity: "ERROR" | "WARN", where: string, what: string) =>
  findings.push({ severity, where, what });

const files = fs.readdirSync(tagDir).filter((name) => name.endsWith(".yaml"));
const loaded = new Map<string, TagFile>();

for (const file of files) {
  const raw = fs.readFileSync(path.join(tagDir, file), "utf8");
  const tags = parse(raw) as TagFile;
  loaded.set(tags.character, tags);

  const id = tags.character;

  if (`${id}.yaml` !== file) add("ERROR", id, `character field '${id}' does not match filename ${file}`);
  if (raw.includes("\r")) add("ERROR", id, "contains CR bytes");
  if (raw.charCodeAt(0) === 0xfeff) add("ERROR", id, "has a BOM");
  if (!raw.endsWith("\n") || raw.endsWith("\n\n")) add("ERROR", id, "not exactly one trailing newline");
  if (/[ \t]+\n/.test(raw)) add("ERROR", id, "has trailing whitespace");
  if (/\bTODO\b|\bFIXME\b|placeholder/i.test(raw)) add("ERROR", id, "contains a TODO/placeholder");

  const identity = tags.identity.map((tag) => tag.toLowerCase());
  const inFutanariRoster = futanariRoster.has(id);
  const inPlainRoster = plainRoster.has(id);

  if (!inFutanariRoster && !inPlainRoster) add("ERROR", id, "not named in cast-registry");
  if (inFutanariRoster !== tags.futanari)
    add("ERROR", id, `futanari: ${tags.futanari} disagrees with cast-registry`);

  // Anatomy nouns belong in identity, so every render of that character carries them.
  if (tags.futanari)
    for (const noun of anatomyNouns)
      if (!identity.includes(noun)) add("ERROR", id, `futanari but identity lacks '${noun}'`);

  const everyTag = [
    ...identity,
    ...Object.values(tags.outfits).flat(),
    ...Object.values(tags.expressions).flat(),
  ].map((tag) => tag.toLowerCase());

  if (!tags.futanari)
    for (const noun of ["futanari", "penis", "testicles", "bulge"])
      if (everyTag.includes(noun)) add("ERROR", id, `NOT futanari but carries '${noun}'`);

  if (!identity.includes("1girl")) add("ERROR", id, "identity lacks 1girl");

  for (const tag of everyTag) {
    if (forbiddenTags.includes(tag)) add("ERROR", id, `forbidden tag '${tag}'`);
    if (censorTags.includes(tag)) add("ERROR", id, `censoring tag '${tag}'`);
    if (hedgeTags.includes(tag)) add("ERROR", id, `hedge tag '${tag}'`);
  }

  for (const tag of identity) {
    if (framingTags.includes(tag)) add("WARN", `${id}.identity`, `framing tag '${tag}' in identity`);
    if (moodTags.includes(tag)) add("WARN", `${id}.identity`, `mood tag '${tag}' in identity`);
  }

  // Within one block a repeated tag is pure noise.
  const blocks: [string, string[]][] = [
    ["identity", tags.identity],
    ...Object.entries(tags.outfits).map(([key, value]): [string, string[]] => [`outfits.${key}`, value]),
    ...Object.entries(tags.expressions).map(([key, value]): [string, string[]] => [
      `expressions.${key}`,
      value,
    ]),
  ];
  for (const [label, block] of blocks) {
    const seen = new Set<string>();
    for (const tag of block.map((entry) => entry.toLowerCase())) {
      if (seen.has(tag)) add("ERROR", `${id}.${label}`, `duplicate tag '${tag}' inside the block`);
      seen.add(tag);
    }
  }
}

// Assembled-prompt checks: this is what a checkpoint actually receives.
for (const row of portraits) {
  const tags = loaded.get(row.character);
  if (!tags) {
    add("ERROR", row.character, "no tag file");
    continue;
  }
  const outfit = tags.outfits[row.outfit];
  const expression = tags.expressions[row.expression];
  if (!outfit) {
    add("ERROR", row.name, `no outfit block '${row.outfit}'`);
    continue;
  }
  if (!expression) {
    add("ERROR", row.name, `no expression block '${row.expression}'`);
    continue;
  }
  const override = tags.overrides?.[`${row.outfit}.${row.expression}`];
  const drop = new Set((override?.drop ?? []).map((tag) => tag.toLowerCase()));
  const assembled = [...tags.identity, ...outfit, ...expression, ...(override?.add ?? [])]
    .map((tag) => tag.toLowerCase())
    .filter((tag) => !drop.has(tag));

  const counts = new Map<string, number>();
  for (const tag of assembled) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  for (const [tag, count] of counts)
    if (count > 1) add("WARN", row.name, `tag '${tag}' repeated ${count}x across blocks`);

  const isNude = assembled.includes("nude") || assembled.includes("completely nude");
  if (isNude) {
    for (const tag of assembled)
      if (garmentWords.test(tag) && !garmentExempt.has(tag))
        add("ERROR", row.name, `nude prompt carries garment '${tag}'`);
    if (assembled.some((tag) => /clothes (aside|lift|pull)/.test(tag)))
      add("ERROR", row.name, "nude prompt carries a clothes-displacement tag");
  }

  if (assembled.includes("topless"))
    for (const tag of assembled)
      if (/\b(bikini top|bandeau|bra|tube top|camisole)\b/.test(tag))
        add("ERROR", row.name, `topless prompt carries chest garment '${tag}'`);
}

// Which -alt / -portrait labels genuinely have a base label on the same character.
const variantReport: string[] = [];
for (const [character, tags] of loaded)
  for (const label of Object.keys(tags.expressions)) {
    const base = label.replace(/-(alt|portrait)$/, "");
    if (base === label) continue;
    variantReport.push(
      `${character}.${label} -> base '${base}' ${base in tags.expressions ? "EXISTS" : "ABSENT"}`,
    );
  }

const errors = findings.filter((entry) => entry.severity === "ERROR");
const warns = findings.filter((entry) => entry.severity === "WARN");

console.log(`tag files: ${files.length}   portraits: ${portraits.length}`);
console.log("");
console.log(`ERRORS (${errors.length})`);
for (const entry of errors) console.log(`  ${entry.where}: ${entry.what}`);
console.log("");
console.log(`WARNINGS (${warns.length}) grouped — a cross-block duplicate is deduped by redraw-prompts.ts,`);
console.log("so these describe redundancy in the tag source, not a defect in the emitted prompt.");
const grouped = new Map<string, number>();
for (const entry of warns) grouped.set(entry.what, (grouped.get(entry.what) ?? 0) + 1);
for (const [what, count] of [...grouped].sort((left, right) => right[1] - left[1]).slice(0, 40))
  console.log(`  x${count}  ${what}`);
console.log("");
console.log("VARIANT LABELS");
for (const line of variantReport.sort()) console.log(`  ${line}`);
