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

  test("resolves every authored scenario image and enables the RisuAI asset prompt", () => {
    const scenarioRoot = path.join(primary.sourceDir, "presentation", "scenarios");
    const scenarioBodies = fs.readdirSync(scenarioRoot).flatMap((scenario) =>
      fs
        .readdirSync(path.join(scenarioRoot, scenario))
        .filter((file) => file.endsWith(".md"))
        .map((file) => path.join(scenarioRoot, scenario, file)),
    );
    const exampleMessages = path.join(primary.sourceDir, "world", "example-messages.md");
    const imagePattern = /\{\{image::([^}]+)\}\}/g;
    const references = [...scenarioBodies, exampleMessages].flatMap((file) =>
      [...fs.readFileSync(file, "utf8").matchAll(imagePattern)]
        .map((match) => match[1])
        .filter((reference): reference is string => Boolean(reference)),
    );
    for (const file of scenarioBodies) {
      expect([...fs.readFileSync(file, "utf8").matchAll(imagePattern)].length).toBeGreaterThan(0);
    }

    const built = compileAuthoringSources(primary, false);
    const assetNames = new Set(built.ir.assets.map((asset) => asset.name));
    expect(references.length).toBeGreaterThan(scenarioBodies.length);
    expect(references.filter((reference) => !assetNames.has(reference))).toEqual([]);
    expect(built.card.data.extensions.risuai.prebuiltAssetCommand).toBe(true);
    expect(built.card.data.extensions.risuai.prebuiltAssetStyle).toBe("dynamic");
  });

  test("emits one start-panel first message with per-language scenario blocks", () => {
    const built = compileAuthoringSources(primary, false);
    const panel = built.ir.startPanel;
    const firstMessage = String(built.card.data.first_mes);
    expect(built.card.data.alternate_greetings).toEqual([]);
    expect(built.card.data.group_only_greetings).toEqual([]);
    expect(firstMessage.startsWith(panel.panel.sentinel)).toBe(true);
    for (const scenario of panel.scenarios) {
      expect(firstMessage).toContain(`{{#when::{{getvar::sv_scene}}::is::${scenario.id}}}`);
      for (const language of panel.panel.languages)
        expect(scenario.bodyText[language.id]?.length).toBeGreaterThan(0);
    }

    const regex = built.moduleWrapper.module.regex;
    const triggers = built.moduleWrapper.module.trigger;
    expect(regex).toHaveLength(1);
    expect(regex[0]?.type).toBe("editdisplay");
    expect(new RegExp(String(regex[0]?.in)).test(firstMessage)).toBe(true);
    expect(triggers).toHaveLength(1);
    expect(triggers[0]?.type).toBe("start");

    const effects = (triggers[0]?.effect ?? []) as { code?: string }[];
    const lua = String(effects[0]?.code ?? "");
    const payloads = [
      ...new Set(
        [...String(regex[0]?.out).matchAll(/::(sv_(?:lang|group|scene)_[a-z0-9_]+)\}\}/g)].map(
          (match) => match[1] as string,
        ),
      ),
    ];
    expect(payloads.length).toBeGreaterThan(panel.scenarios.length);
    for (const payload of payloads) expect(lua).toContain(`function ${payload}(triggerId)`);
    expect(built.card.data.extensions.risuai.defaultVariables).toContain("sv_scene=");
    expect(built.card.data.extensions.risuai.backgroundHTML).toContain(".sv-start-panel");
  });

  test("keeps the panel and scene tags on single lines so Markdown cannot break them", () => {
    const built = compileAuthoringSources(primary, false);
    const panelMarkup = String(built.moduleWrapper.module.regex[0]?.out);
    expect(panelMarkup.includes("\n")).toBe(false);
    for (const group of built.ir.startPanel.panel.groups) {
      const scenarios = built.ir.startPanel.scenarios.filter((scenario) => scenario.group === group.id);
      if (!scenarios.length) continue;
      expect(panelMarkup).toContain(
        `class="sv-start-panel__cards{{#when::{{getvar::sv_group}}::is::${group.id}}} is-visible{{/when}}"`,
      );
    }
    expect(built.card.data.extensions.risuai.backgroundHTML).toContain(".sv-start-panel__cards.is-visible");

    const firstMessage = String(built.card.data.first_mes);
    for (const line of firstMessage.split("\n").filter((entry) => entry.includes("sv-scene-tags")))
      expect(line.trimEnd().endsWith("</div>")).toBe(true);
    for (const scenario of built.ir.startPanel.scenarios)
      for (const language of built.ir.startPanel.panel.languages)
        expect((scenario.tags?.[language.id] ?? []).length).toBeGreaterThan(0);
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
