import { afterAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { importOoPortraits, loadWorldIR, resolveProject } from "@charx/core";

const workspaceRoot = process.cwd();
const primary = resolveProject(workspaceRoot, "stardew-valley");
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "charx-oo-portraits-"));
const projectRoot = path.join(temporaryRoot, "minimal-world");
const sourceDir = path.join(projectRoot, "source");
const packRoot = path.join(temporaryRoot, "pack");
const portraitDirectory = path.join(packRoot, "assets", "Portraits");
fs.cpSync(path.join(workspaceRoot, "tests", "fixtures", "minimal-world"), projectRoot, {
  recursive: true,
});
fs.mkdirSync(portraitDirectory, { recursive: true });

const characterNames = [
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
];
const oneVisibleFrame = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600"><rect width="600" height="600" fill="#ff3366"/></svg>`;
for (const name of characterNames)
  fs.writeFileSync(path.join(portraitDirectory, `${name}.png`), oneVisibleFrame, "utf8");
fs.writeFileSync(path.join(portraitDirectory, "Caroline_Beach.png"), oneVisibleFrame, "utf8");
fs.writeFileSync(
  path.join(portraitDirectory, "Sandy_Shop.png"),
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"/>`,
  "utf8",
);

const context = {
  ...primary,
  projectId: "minimal-world",
  projectRoot,
  sourceDir,
  generatedDir: path.join(projectRoot, "generated"),
};

afterAll(() => {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
});

describe("portrait asset import", () => {
  test("keeps OO originals and exposes only non-destructive 2x derivatives to RisuAI", async () => {
    const report = await importOoPortraits(context, packRoot);
    expect(report.preferredVariant).toBe("upscaled-2x");
    expect(report.summary).toMatchObject({
      characters: 20,
      outfitVariants: 21,
      expressionImages: 21,
    });
    const caroline = report.characters.find((character) => character.id === "caroline");
    const beach = caroline?.outfits.find((outfit) => outfit.id === "beach");
    expect(beach?.duplicateOf).toBe("default");
    expect(beach?.originalFiles[0]).toContain("/original/expression-00.webp");
    expect(fs.existsSync(path.join(sourceDir, beach?.originalFiles[0] ?? "missing"))).toBe(true);

    const ir = loadWorldIR(context);
    expect(ir.assets).toHaveLength(21);
    expect(ir.assets.every((asset) => asset.sourceFile.includes(`${path.sep}upscaled-2x${path.sep}`))).toBe(
      true,
    );
  }, 30_000);
});
