import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const repo = path.resolve(import.meta.dir, "../../..");
const importedRoot = path.join(repo, "projects/stardew-valley/source/assets/imported");
const outRoot = path.join(repo, "projects/stardew-valley/.research/montage");

interface Outfit {
  id: string;
  source: string;
  frameWidth: number;
  frameHeight: number;
  expressions: number;
}
interface Character {
  id: string;
  name: string;
  outfits: Outfit[];
}

const TILE = 300;
const WRAP = 6;
const LABEL = 26;
const MAX_ROWS_PER_IMAGE = 4;

async function tiles(o: Outfit): Promise<Buffer[]> {
  const meta = await sharp(o.source).metadata();
  const cols = Math.max(1, Math.floor((meta.width ?? o.frameWidth) / o.frameWidth));
  const out: Buffer[] = [];
  for (let i = 0; i < o.expressions; i += 1) {
    out.push(
      await sharp(o.source)
        .extract({
          left: (i % cols) * o.frameWidth,
          top: Math.floor(i / cols) * o.frameHeight,
          width: o.frameWidth,
          height: o.frameHeight,
        })
        .resize(TILE, TILE, { fit: "contain", background: "#ffffff" })
        .flatten({ background: "#ffffff" })
        .png()
        .toBuffer(),
    );
  }
  return out;
}

function label(text: string, width: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${LABEL}"><rect width="100%" height="100%" fill="#e8e8e8"/><text x="6" y="19" font-family="monospace" font-size="16" fill="#111">${text}</text></svg>`,
  );
}

interface Block {
  label: string;
  tiles: Buffer[];
  rows: number;
}

async function emit(pack: string, id: string, part: number, blocks: Block[]): Promise<void> {
  const width = Math.max(700, Math.min(WRAP, Math.max(...blocks.map((b) => b.tiles.length))) * TILE);
  let height = 0;
  for (const b of blocks) height += LABEL + b.rows * TILE;
  const layers: { input: Buffer; top: number; left: number }[] = [];
  let y = 0;
  for (const b of blocks) {
    layers.push({ input: label(b.label, width), top: y, left: 0 });
    y += LABEL;
    for (const [index, tile] of b.tiles.entries()) {
      layers.push({ input: tile, top: y + Math.floor(index / WRAP) * TILE, left: (index % WRAP) * TILE });
    }
    y += b.rows * TILE;
  }
  const suffix = part > 0 ? `-${String(part + 1)}` : "";
  const file = path.join(outRoot, pack, `${id}${suffix}.png`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp({ create: { width, height, channels: 3, background: "#ffffff" } })
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toFile(file);
  console.log(
    `${pack}/${id}${suffix}.png  ${width}x${height}  ${Math.round(fs.statSync(file).size / 1024)}KB`,
  );
}

const only = process.argv.slice(2);
for (const pack of ["mud-portraits", "oo-anime-portraits"]) {
  const catalog = JSON.parse(fs.readFileSync(path.join(importedRoot, pack, "catalog.json"), "utf8")) as {
    characters: Character[];
  };
  for (const character of catalog.characters) {
    if (only.length && !only.includes(character.id)) continue;
    let pending: Block[] = [];
    let rows = 0;
    let part = 0;
    for (const outfit of character.outfits) {
      const frames = await tiles(outfit);
      const blockRows = Math.ceil(frames.length / WRAP);
      if (rows > 0 && rows + blockRows > MAX_ROWS_PER_IMAGE) {
        await emit(pack, character.id, part, pending);
        part += 1;
        pending = [];
        rows = 0;
      }
      pending.push({
        label: `${character.id} / ${outfit.id} / ${outfit.expressions} frames (00..${String(outfit.expressions - 1).padStart(2, "0")})`,
        tiles: frames,
        rows: blockRows,
      });
      rows += blockRows;
    }
    if (pending.length) await emit(pack, character.id, part, pending);
  }
}
