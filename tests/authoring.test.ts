import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { compileAuthoringSources, countBuiltSourceTokens, loadWorldIR, resolveProject } from "@charx/core";

const workspaceRoot = process.cwd();
const primary = resolveProject(workspaceRoot, "stardew-valley");
const fixtureRoot = path.join(workspaceRoot, "tests", "fixtures", "minimal-world");
const context = {
  ...primary,
  projectId: "minimal-world",
  projectRoot: fixtureRoot,
  sourceDir: path.join(fixtureRoot, "source"),
  generatedDir: path.join(fixtureRoot, "generated"),
};

describe("agent authoring source", () => {
  test("loads stable ids into canonical WorldIR", () => {
    const ir = loadWorldIR(context);
    expect(ir.id).toBe("minimal-world");
    expect(ir.entities.map((entity) => [entity.id, entity.kind])).toEqual([["example-person", "character"]]);
  });

  test("compiles CCv3/RisuM and counts OpenAI tokens", () => {
    const built = compileAuthoringSources(context, false);
    expect(built.card.spec).toBe("chara_card_v3");
    expect(built.card.data.character_book.entries).toHaveLength(1);
    expect(built.moduleWrapper.module.lorebook).toHaveLength(1);
    const report = countBuiltSourceTokens(built, built.ir.tokenCheck);
    expect(report.total).toBeGreaterThan(0);
    expect(report.status).toBe("ok");
  });

  test("resolves every authored greeting image and enables the RisuAI asset prompt", () => {
    const greetingDirectories = [
      path.join(primary.sourceDir, "presentation", "greetings", "alternate"),
      path.join(primary.sourceDir, "presentation", "greetings", "group-only"),
    ];
    const greetingFiles = [
      path.join(primary.sourceDir, "world", "first-message.md"),
      ...greetingDirectories.flatMap((directory) =>
        fs
          .readdirSync(directory)
          .filter((file) => file.endsWith(".md"))
          .map((file) => path.join(directory, file)),
      ),
    ];
    const exampleMessages = path.join(primary.sourceDir, "world", "example-messages.md");
    const imagePattern = /\{\{image::([^}]+)\}\}/g;
    const references = [...greetingFiles, exampleMessages].flatMap((file) =>
      [...fs.readFileSync(file, "utf8").matchAll(imagePattern)]
        .map((match) => match[1])
        .filter((reference): reference is string => Boolean(reference)),
    );
    for (const file of greetingFiles) {
      expect([...fs.readFileSync(file, "utf8").matchAll(imagePattern)].length).toBeGreaterThan(0);
    }

    const built = compileAuthoringSources(primary, false);
    const assetNames = new Set(built.ir.assets.map((asset) => asset.name));
    expect(references.length).toBeGreaterThan(greetingFiles.length);
    expect(references.filter((reference) => !assetNames.has(reference))).toEqual([]);
    expect(built.card.data.extensions.risuai.prebuiltAssetCommand).toBe(true);
    expect(built.card.data.extensions.risuai.prebuiltAssetStyle).toBe("dynamic");
  });

  test("keeps per-outfit frame counts independent and permits missing local-only assets", () => {
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "charx-curation-"));
    try {
      fs.cpSync(fixtureRoot, temporaryRoot, { recursive: true });
      const source = path.join(temporaryRoot, "source");
      fs.mkdirSync(path.join(source, "assets", "curation"), { recursive: true });
      for (const file of ["default/frame-a.webp", "beach/frame-a.webp", "beach/frame-b.webp"]) {
        const target = path.join(source, "assets", "imported", "test-person", file);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, "fixture");
      }
      fs.writeFileSync(
        path.join(source, "assets", "curation", "test-person.yaml"),
        [
          "schema: risuai-portrait-curation/v1",
          "character: test-person",
          "sourcePack: Test",
          "sourceRoot: assets/imported/test-person",
          "icon: default/frame-a",
          "outfits:",
          "  default:",
          "    context: everyday",
          "    frames: { frame-a: neutral }",
          "  beach:",
          "    context: beach",
          "    frames: { frame-a: neutral, frame-b: happy }",
          "  nude:",
          "    context: adult-private-consensual-only",
          "    defaultEnabled: false",
          "    frames: { frame-a: unclassified-01 }",
          "",
        ].join("\n"),
      );
      fs.writeFileSync(
        path.join(source, "characters", "example-person", "character.yaml"),
        [
          "schema: risuai-character/v1",
          "id: example-person",
          "name: Example Person",
          "content: content.md",
          "keywords: [example-person]",
          "alwaysActive: true",
          "assets:",
          "  - icon-test-person",
          "  - portrait-test-person-default-frame-a",
          "  - portrait-test-person-beach-frame-a",
          "  - portrait-test-person-beach-frame-b",
          "  - portrait-test-person-nude-frame-a",
          "",
        ].join("\n"),
      );
      const ir = loadWorldIR({
        ...context,
        projectRoot: temporaryRoot,
        sourceDir: source,
        generatedDir: path.join(temporaryRoot, "generated"),
      });
      expect(ir.assets.map((asset) => asset.id)).toEqual([
        "icon-test-person",
        "portrait-test-person-default-frame-a",
        "portrait-test-person-beach-frame-a",
        "portrait-test-person-beach-frame-b",
      ]);
      expect(ir.assets[0]).toMatchObject({
        name: "test-person.icon.webp",
        type: "icon",
        archivePath: "assets/icon/image/icon-test-person.webp",
      });
      expect(ir.assets[1]).toMatchObject({
        name: "test-person.default.neutral.webp",
        type: "x-risu-asset",
      });
    } finally {
      fs.rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });
});
