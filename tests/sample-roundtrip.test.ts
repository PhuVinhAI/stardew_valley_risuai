import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { buildSources, checkProject, resolveProject } from "@charx/core";
import { unzipSync } from "fflate";

const workspaceRoot = process.cwd();
const context = resolveProject(workspaceRoot, "danganronpa-her");
const reference = path.join(context.projectRoot, context.config.referenceCharx ?? "");

describe("Danganronpa HER example", () => {
  test("decomposed source recreates card.json and module.risum exactly", () => {
    if (!fs.existsSync(reference)) return;
    const files = unzipSync(fs.readFileSync(reference));
    const built = buildSources(context);
    expect(built.cardData).toEqual(Buffer.from(files["card.json"] ?? []));
    expect(built.moduleData).toEqual(Buffer.from(files["module.risum"] ?? []));
  });

  test("passes project validation with the expected world scale", () => {
    if (!fs.existsSync(reference)) return;
    const report = checkProject(context);
    expect(report.errors).toEqual([]);
    expect(report.stats).toMatchObject({
      characters: 18,
      loreEntries: 48,
      assets: 568,
      regexScripts: 16,
      triggers: 1,
    });
  });
});
