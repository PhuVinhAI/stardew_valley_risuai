import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { stringify as stringifyYaml } from "yaml";
import type { ProjectContext } from "./types.ts";
import { ensureDir, listFiles, sha256, slugify, writeJson, writeText } from "./utils.ts";

interface CharacterSpec {
  id: string;
  name: string;
  tileHeight: number;
  volume: 1 | 2;
}

interface OutfitCatalog {
  id: string;
  source: string;
  overlay?: string;
  duplicateOf?: string;
  frameWidth: number;
  frameHeight: number;
  expressions: number;
  assets: string[];
}

interface CharacterCatalog {
  id: string;
  name: string;
  volume: 1 | 2;
  note?: string;
  outfits: OutfitCatalog[];
}

export interface MudPortraitImportReport {
  outputRoot: string;
  characters: CharacterCatalog[];
  summary: {
    characters: number;
    outfitVariants: number;
    expressionImages: number;
    bytes: number;
  };
}

interface OoOutfitCatalog {
  id: string;
  source: string;
  duplicateOf?: string;
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  expressions: number;
  originalFiles: string[];
  assets: string[];
}

interface OoCharacterCatalog {
  id: string;
  name: string;
  outfits: OoOutfitCatalog[];
}

export interface OoPortraitImportReport {
  outputRoot: string;
  preferredVariant: "upscaled-2x";
  characters: OoCharacterCatalog[];
  summary: {
    characters: number;
    outfitVariants: number;
    expressionImages: number;
    originalBytes: number;
    upscaledBytes: number;
  };
}

const characters: CharacterSpec[] = [
  { id: "abigail", name: "Abigail", tileHeight: 1000, volume: 1 },
  { id: "emily", name: "Emily", tileHeight: 1000, volume: 1 },
  { id: "haley", name: "Haley", tileHeight: 1000, volume: 1 },
  { id: "leah", name: "Leah", tileHeight: 1000, volume: 1 },
  { id: "maru", name: "Maru", tileHeight: 1000, volume: 1 },
  { id: "penny", name: "Penny", tileHeight: 1000, volume: 1 },
  { id: "alex", name: "Alex", tileHeight: 1000, volume: 2 },
  { id: "elliott", name: "Elliott", tileHeight: 1000, volume: 2 },
  { id: "harvey", name: "Harvey", tileHeight: 1000, volume: 2 },
  { id: "sam", name: "Sam", tileHeight: 1800, volume: 2 },
  { id: "sebastian", name: "Sebastian", tileHeight: 1000, volume: 2 },
  { id: "shane", name: "Shane", tileHeight: 1000, volume: 2 },
];

const excludedSuffixes = ["Shop", "GlassesOverlay", "Hospital_GlassesOverlay", "Light"];

const ooCharacters = [
  "Caroline",
  "Clint",
  "Demetrius",
  "Evelyn",
  "George",
  "Gunther",
  "Gus",
  "Jodi",
  "Kent",
  "Lewis",
  "Linus",
  "Marlon",
  "Marnie",
  "Morris",
  "Pam",
  "Pierre",
  "Robin",
  "Sandy",
  "Willy",
  "Wizard",
] as const;

function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function findPortraitDirectory(inputRoot: string): string {
  const resolved = path.resolve(inputRoot);
  if (!fs.existsSync(resolved)) throw new Error(`Portrait pack not found: ${resolved}`);
  const candidates = listFiles(resolved, "**/assets/Portraits/*.png").filter((file) => {
    const relative = path.relative(resolved, file).replaceAll("\\", "/");
    return /(?:^|\/)assets\/Portraits\/[^/]+\.png$/i.test(relative);
  });
  if (!candidates.length) throw new Error(`No direct assets/Portraits PNG files found beneath ${resolved}`);
  return path.dirname(candidates[0] ?? "");
}

function outfitId(characterName: string, file: string): string {
  const base = path.basename(file, path.extname(file));
  const suffix = base.slice(characterName.length).replace(/^_/, "");
  const aliases: Record<string, string> = {
    "": "default",
    Beach: "beach",
    Garter: "garter",
    Hospital: "hospital",
    JojaMart: "joja-uniform",
    Naked: "nude",
    Swims: "swimsuit",
    SwimsEX: "swimsuit-ex",
    Winter: "winter",
  };
  return aliases[suffix] ?? slugify(suffix, "variant");
}

function coreSheets(directory: string, character: CharacterSpec): string[] {
  return listFiles(directory, `${character.name}*.png`).filter((file) => {
    const base = path.basename(file, ".png");
    return !excludedSuffixes.some((suffix) => base.endsWith(suffix));
  });
}

async function frameBuffer(
  source: string,
  overlay: string | undefined,
  left: number,
  top: number,
  width: number,
  height: number,
): Promise<Buffer> {
  const base = await sharp(source).extract({ left, top, width, height }).png().toBuffer();
  if (!overlay) return base;
  const layer = await sharp(overlay).extract({ left, top, width, height }).png().toBuffer();
  return sharp(base)
    .composite([{ input: layer, blend: "over" }])
    .png()
    .toBuffer();
}

async function processOutfit(
  context: ProjectContext,
  outputRoot: string,
  character: CharacterSpec,
  outfit: string,
  source: string,
  overlay?: string,
): Promise<{ catalog: OutfitCatalog; manifestAssets: Record<string, string>[]; bytes: number }> {
  const metadata = await sharp(source).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Cannot read dimensions: ${source}`);
  const columns = 2;
  if (metadata.width % columns !== 0 || metadata.height % character.tileHeight !== 0) {
    throw new Error(
      `${path.basename(source)} does not match a 2-column x ${character.tileHeight}px-row portrait sheet`,
    );
  }
  if (overlay) {
    const overlayMetadata = await sharp(overlay).metadata();
    if (overlayMetadata.width !== metadata.width || overlayMetadata.height !== metadata.height) {
      throw new Error(`Overlay dimensions differ: ${path.basename(overlay)} -> ${path.basename(source)}`);
    }
  }
  const tileWidth = metadata.width / columns;
  const rows = metadata.height / character.tileHeight;
  const assets: string[] = [];
  const manifestAssets: Record<string, string>[] = [];
  let bytes = 0;
  for (let index = 0; index < columns * rows; index += 1) {
    const left = (index % columns) * tileWidth;
    const top = Math.floor(index / columns) * character.tileHeight;
    const buffer = await frameBuffer(source, overlay, left, top, tileWidth, character.tileHeight);
    const stats = await sharp(buffer).stats();
    const alpha = stats.channels[3];
    if (alpha && alpha.max === 0) continue;
    const expression = `expression-${String(index).padStart(2, "0")}`;
    const assetId = `portrait-${character.id}-${outfit}-${expression}`;
    const output = path.join(outputRoot, character.id, outfit, `${expression}.webp`);
    ensureDir(path.dirname(output));
    await sharp(buffer).webp({ lossless: true, effort: 6 }).toFile(output);
    bytes += fs.statSync(output).size;
    assets.push(assetId);
    manifestAssets.push({
      id: assetId,
      file: path.relative(context.sourceDir, output).replaceAll("\\", "/"),
      name: `${character.name} / ${outfit} / ${expression}`,
      type: "x-risu-asset",
    });
  }
  return {
    catalog: {
      id: outfit,
      source: source.replaceAll("\\", "/"),
      ...(overlay ? { overlay: overlay.replaceAll("\\", "/") } : {}),
      frameWidth: tileWidth,
      frameHeight: character.tileHeight,
      expressions: assets.length,
      assets,
    },
    manifestAssets,
    bytes,
  };
}

function sourceFile(directory: string, name: string): string {
  const file = path.join(directory, name);
  if (!fs.existsSync(file)) throw new Error(`Missing source portrait: ${file}`);
  return file;
}

function ooOutfitId(characterName: string, file: string): string {
  const base = path.basename(file, path.extname(file));
  const suffix = base.slice(characterName.length).replace(/^_/, "").toLowerCase();
  const aliases: Record<string, string> = {
    "": "default",
    beach: "beach",
    swims: "swimsuit",
    winter: "winter",
  };
  return aliases[suffix] ?? slugify(suffix, "variant");
}

function ooSheets(directory: string, characterName: string): string[] {
  return listFiles(directory, `${characterName}*.png`)
    .filter((file) => {
      const base = path.basename(file, ".png");
      if (base === "GuntherSilvian") return false;
      if (base.endsWith("_Shop")) return false;
      return base === characterName || base.startsWith(`${characterName}_`);
    })
    .sort((left, right) => {
      const leftOutfit = ooOutfitId(characterName, left);
      const rightOutfit = ooOutfitId(characterName, right);
      if (leftOutfit === "default") return -1;
      if (rightOutfit === "default") return 1;
      return leftOutfit.localeCompare(rightOutfit, "en");
    });
}

async function processOoOutfit(
  context: ProjectContext,
  outputRoot: string,
  character: { id: string; name: string },
  outfit: string,
  source: string,
): Promise<{
  catalog: OoOutfitCatalog;
  manifestAssets: Record<string, string>[];
  originalBytes: number;
  upscaledBytes: number;
}> {
  const metadata = await sharp(source).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Cannot read dimensions: ${source}`);
  const frameSize = 600;
  if (metadata.width % frameSize !== 0 || metadata.height % frameSize !== 0) {
    throw new Error(`${path.basename(source)} is not aligned to ${frameSize}x${frameSize} portrait frames`);
  }
  const columns = metadata.width / frameSize;
  const rows = metadata.height / frameSize;
  const originalFiles: string[] = [];
  const assets: string[] = [];
  const manifestAssets: Record<string, string>[] = [];
  let originalBytes = 0;
  let upscaledBytes = 0;

  for (let index = 0; index < columns * rows; index += 1) {
    const left = (index % columns) * frameSize;
    const top = Math.floor(index / columns) * frameSize;
    const frame = await sharp(source)
      .extract({ left, top, width: frameSize, height: frameSize })
      .png()
      .toBuffer();
    const stats = await sharp(frame).stats();
    const alpha = stats.channels[3];
    if (alpha && alpha.max === 0) continue;

    const expression = `expression-${String(index).padStart(2, "0")}`;
    const directory = path.join(outputRoot, character.id, outfit);
    const original = path.join(directory, "original", `${expression}.webp`);
    const upscaled = path.join(directory, "upscaled-2x", `${expression}.webp`);
    ensureDir(path.dirname(original));
    ensureDir(path.dirname(upscaled));
    await sharp(frame).webp({ lossless: true, effort: 6 }).toFile(original);
    await sharp(frame)
      .resize(frameSize * 2, frameSize * 2, { kernel: sharp.kernel.lanczos3 })
      .sharpen({ sigma: 0.8, m1: 0.5, m2: 1.2 })
      .webp({ lossless: true, effort: 6 })
      .toFile(upscaled);
    originalBytes += fs.statSync(original).size;
    upscaledBytes += fs.statSync(upscaled).size;

    const assetId = `portrait-oo-${character.id}-${outfit}-${expression}`;
    originalFiles.push(path.relative(context.sourceDir, original).replaceAll("\\", "/"));
    assets.push(assetId);
    manifestAssets.push({
      id: assetId,
      file: path.relative(context.sourceDir, upscaled).replaceAll("\\", "/"),
      name: `${character.name} / ${outfit} / ${expression} / upscaled 2x`,
      type: "x-risu-asset",
    });
  }

  return {
    catalog: {
      id: outfit,
      source: source.replaceAll("\\", "/"),
      columns,
      rows,
      frameWidth: frameSize,
      frameHeight: frameSize,
      expressions: assets.length,
      originalFiles,
      assets,
    },
    manifestAssets,
    originalBytes,
    upscaledBytes,
  };
}

export async function importOoPortraits(
  context: ProjectContext,
  packRoot: string,
): Promise<OoPortraitImportReport> {
  if (context.config.structure !== "authoring") throw new Error("OO portraits require an authoring project");
  const portraitDirectory = findPortraitDirectory(packRoot);
  const outputRoot = path.join(context.sourceDir, "assets", "imported", "oo-anime-portraits");
  const sourceRoot = path.resolve(context.sourceDir);
  if (!isInside(sourceRoot, outputRoot)) throw new Error(`Unsafe portrait output: ${outputRoot}`);
  if (fs.existsSync(outputRoot)) fs.rmSync(outputRoot, { recursive: true, force: true });
  ensureDir(outputRoot);

  const characterCatalogs: OoCharacterCatalog[] = [];
  let totalOriginalBytes = 0;
  let totalUpscaledBytes = 0;
  for (const characterName of ooCharacters) {
    const character = { id: slugify(characterName, "character"), name: characterName };
    const sheets = ooSheets(portraitDirectory, characterName);
    if (!sheets.length) throw new Error(`No OO portrait sheets found for ${characterName}`);
    const catalog: OoCharacterCatalog = { ...character, outfits: [] };
    const manifestAssets: Record<string, string>[] = [];
    const visualHashes = new Map<string, string>();
    for (const sheet of sheets) {
      const outfit = ooOutfitId(characterName, sheet);
      const result = await processOoOutfit(context, outputRoot, character, outfit, sheet);
      const hash = sha256(fs.readFileSync(sheet));
      const duplicateOf = visualHashes.get(hash);
      if (duplicateOf) result.catalog.duplicateOf = duplicateOf;
      else visualHashes.set(hash, outfit);
      catalog.outfits.push(result.catalog);
      manifestAssets.push(...result.manifestAssets);
      totalOriginalBytes += result.originalBytes;
      totalUpscaledBytes += result.upscaledBytes;
    }
    catalog.outfits.sort((left, right) => left.id.localeCompare(right.id, "en"));
    writeText(
      path.join(outputRoot, character.id, "manifest.yaml"),
      stringifyYaml({ schema: "risuai-assets/v1", assets: manifestAssets }),
    );
    writeJson(path.join(outputRoot, character.id, "catalog.json"), catalog);
    characterCatalogs.push(catalog);
  }

  const report: OoPortraitImportReport = {
    outputRoot,
    preferredVariant: "upscaled-2x",
    characters: characterCatalogs,
    summary: {
      characters: characterCatalogs.length,
      outfitVariants: characterCatalogs.reduce((sum, character) => sum + character.outfits.length, 0),
      expressionImages: characterCatalogs.reduce(
        (sum, character) =>
          sum + character.outfits.reduce((outfitSum, outfit) => outfitSum + outfit.expressions, 0),
        0,
      ),
      originalBytes: totalOriginalBytes,
      upscaledBytes: totalUpscaledBytes,
    },
  };
  writeJson(path.join(outputRoot, "catalog.json"), report);
  writeText(
    path.join(outputRoot, "README.md"),
    [
      "# OO anime portrait local import",
      "",
      `- Characters: ${report.summary.characters}`,
      `- Outfit variants: ${report.summary.outfitVariants}`,
      `- Standalone expressions: ${report.summary.expressionImages}`,
      `- Original 600px lossless WebP bytes: ${report.summary.originalBytes}`,
      `- Upscaled 1200px lossless WebP bytes: ${report.summary.upscaledBytes}`,
      "- Preferred RisuAI variant: upscaled-2x",
      "",
      "Original frames are preserved beside non-destructive 2x derivatives.",
      "The 2x derivative uses Lanczos3 plus light sharpening and does not invent new visual details.",
      "64x64 shop icons and optional compatibility/shop packs are intentionally kept outside the portrait catalog.",
      "These third-party files remain local-only until redistribution permission is confirmed.",
      "",
    ].join("\n"),
  );
  return report;
}

export async function importMudPortraits(
  context: ProjectContext,
  volume1Root: string,
  volume2Root: string,
): Promise<MudPortraitImportReport> {
  if (context.config.structure !== "authoring") throw new Error("Mud portraits require an authoring project");
  const portraitDirectories = {
    1: findPortraitDirectory(volume1Root),
    2: findPortraitDirectory(volume2Root),
  } as const;
  const outputRoot = path.join(context.sourceDir, "assets", "imported", "mud-portraits");
  const sourceRoot = path.resolve(context.sourceDir);
  if (!isInside(sourceRoot, outputRoot)) throw new Error(`Unsafe portrait output: ${outputRoot}`);
  if (fs.existsSync(outputRoot)) fs.rmSync(outputRoot, { recursive: true, force: true });
  ensureDir(outputRoot);

  const characterCatalogs: CharacterCatalog[] = [];
  let totalBytes = 0;
  for (const character of characters) {
    const portraitDirectory = portraitDirectories[character.volume];
    const catalog: CharacterCatalog = {
      id: character.id,
      name: character.name,
      volume: character.volume,
      ...(character.volume === 2 ? { note: "Volume 2 depicts a genderswapped interpretation." } : {}),
      outfits: [],
    };
    const manifestAssets: Record<string, string>[] = [];
    const visualHashes = new Map<string, string>();
    for (const sheet of coreSheets(portraitDirectory, character)) {
      const outfit = outfitId(character.name, sheet);
      const result = await processOutfit(context, outputRoot, character, outfit, sheet);
      const hash = sha256(fs.readFileSync(sheet));
      const duplicateOf = visualHashes.get(hash);
      if (duplicateOf) result.catalog.duplicateOf = duplicateOf;
      else visualHashes.set(hash, outfit);
      catalog.outfits.push(result.catalog);
      manifestAssets.push(...result.manifestAssets);
      totalBytes += result.bytes;
    }

    if (character.id === "maru") {
      const glasses = sourceFile(portraitDirectory, "Maru_GlassesOverlay.png");
      const hospitalGlasses = sourceFile(portraitDirectory, "Maru_Hospital_GlassesOverlay.png");
      for (const [outfit, base, overlay] of [
        ["default-glasses", "Maru.png", glasses],
        ["winter-glasses", "Maru_Winter.png", glasses],
        ["hospital-glasses", "Maru_Hospital.png", hospitalGlasses],
      ] as const) {
        const result = await processOutfit(
          context,
          outputRoot,
          character,
          outfit,
          sourceFile(portraitDirectory, base),
          overlay,
        );
        catalog.outfits.push(result.catalog);
        manifestAssets.push(...result.manifestAssets);
        totalBytes += result.bytes;
      }
    }

    if (character.id === "shane") {
      const light = sourceFile(portraitDirectory, "ShaneLight.png");
      for (const [outfit, base] of [
        ["default-post-event", "Shane.png"],
        ["joja-uniform-post-event", "Shane_JojaMart.png"],
        ["beach-post-event", "Shane_Beach.png"],
        ["swimsuit-post-event", "Shane_Swims.png"],
        ["winter-post-event", "Shane_Winter.png"],
      ] as const) {
        const result = await processOutfit(
          context,
          outputRoot,
          character,
          outfit,
          sourceFile(portraitDirectory, base),
          light,
        );
        catalog.outfits.push(result.catalog);
        manifestAssets.push(...result.manifestAssets);
        totalBytes += result.bytes;
      }
    }

    catalog.outfits.sort((left, right) => left.id.localeCompare(right.id, "en"));
    writeText(
      path.join(outputRoot, character.id, "manifest.yaml"),
      stringifyYaml({ schema: "risuai-assets/v1", assets: manifestAssets }),
    );
    writeJson(path.join(outputRoot, character.id, "catalog.json"), catalog);
    characterCatalogs.push(catalog);
  }

  const report: MudPortraitImportReport = {
    outputRoot,
    characters: characterCatalogs,
    summary: {
      characters: characterCatalogs.length,
      outfitVariants: characterCatalogs.reduce((sum, character) => sum + character.outfits.length, 0),
      expressionImages: characterCatalogs.reduce(
        (sum, character) =>
          sum + character.outfits.reduce((outfitSum, outfit) => outfitSum + outfit.expressions, 0),
        0,
      ),
      bytes: totalBytes,
    },
  };
  writeJson(path.join(outputRoot, "catalog.json"), report);
  writeText(
    path.join(outputRoot, "README.md"),
    [
      "# Mud portrait local import",
      "",
      `- Characters: ${report.summary.characters}`,
      `- Outfit variants: ${report.summary.outfitVariants}`,
      `- Standalone expression images: ${report.summary.expressionImages}`,
      `- Lossless WebP bytes: ${report.summary.bytes}`,
      "",
      "Expression numbers preserve the source sheet's row-major Stardew portrait index.",
      "Volume 2 contains genderswapped interpretations of the six bachelors.",
      "These third-party files remain local-only until redistribution permission is confirmed.",
      "",
    ].join("\n"),
  );
  return report;
}
