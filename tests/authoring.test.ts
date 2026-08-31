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
      // An open scenario may ship no prose; it then opens on its scene header alone.
      const hasBody = Object.keys(scenario.bodyText).length > 0;
      for (const language of panel.panel.languages) {
        if (hasBody) expect(scenario.bodyText[language.id]?.length).toBeGreaterThan(0);
        else expect(scenario.tags?.[language.id]?.length ?? 0).toBeGreaterThan(0);
      }
    }

    const regex = built.moduleWrapper.module.regex;
    const triggers = built.moduleWrapper.module.trigger;
    expect(regex).toHaveLength(3);
    expect(regex[0]?.type).toBe("editdisplay");
    expect(new RegExp(String(regex[0]?.in)).test(firstMessage)).toBe(true);
    expect(regex[1]?.comment).toBe("Scene header");
    expect(new RegExp(String(regex[1]?.in)).test(firstMessage)).toBe(true);
    expect(regex[2]?.comment).toBe("Bag line");
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
    const sceneRegex = built.moduleWrapper.module.regex[1];
    expect(String(sceneRegex?.out).includes("\n")).toBe(false);
    for (const scenario of built.ir.startPanel.scenarios)
      for (const language of built.ir.startPanel.panel.languages) {
        const tags = scenario.tags?.[language.id] ?? [];
        expect(tags.length).toBeGreaterThan(0);
        const header = `[Scene: ${tags.join(" | ")}]`;
        expect(firstMessage).toContain(header);
        expect(new RegExp(String(sceneRegex?.in)).test(header)).toBe(true);
      }
  });

  /**
   * The header is the card's only clock, so a scenario that opens with written
   * prose must fill every field: the model copies the opening header's shape for
   * the rest of the chat, and one scenario that omits the time teaches it that the
   * time is optional. Free Start writes no prose and establishes nothing, so it is
   * the one scenario allowed a short header.
   */
  test("gives every written opening a full six-field scene header", () => {
    const built = compileAuthoringSources(primary, false);
    const seasons: Record<string, string[]> = {
      en: ["Spring", "Summer", "Autumn", "Winter"],
      vi: ["Xuân", "Hè", "Thu", "Đông"],
    };
    let checked = 0;
    for (const scenario of built.ir.startPanel.scenarios) {
      if (!Object.keys(scenario.bodyText).length) continue;
      for (const language of built.ir.startPanel.panel.languages) {
        const tags = scenario.tags?.[language.id] ?? [];
        expect(tags).toHaveLength(6);
        expect(seasons[language.id]).toContain(String(tags[0]));
        expect(String(tags[1])).toMatch(/\d/);
        expect(String(tags[2])).toMatch(/^\d{1,2}:\d{2}$/);
        // Weather and place are the two fields a reader could swap, so neither may
        // hold the other's vocabulary.
        expect(String(tags[3])).not.toMatch(/saloon|store|forest|beach|mountain/i);
        expect(String(tags[4]).length).toBeGreaterThan(0);
        expect(String(tags[5]).length).toBeGreaterThan(0);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(20);
  });

  /**
   * The bag line is written by the model, not by a trigger, so the only thing the
   * build can guarantee is that the format is defined once and demonstrated in the
   * example messages. If the examples stop showing it, the model stops writing it.
   */
  test("defines the bag line and demonstrates it in the example messages", () => {
    const built = compileAuthoringSources(primary, false);
    const bagRegex = built.moduleWrapper.module.regex[2];
    expect(bagRegex?.type).toBe("editdisplay");
    expect(String(bagRegex?.out).includes("\n")).toBe(false);
    expect(built.card.data.extensions.risuai.backgroundHTML).toContain(".sv-bag__item.is-money");

    const examples = String(built.card.data.mes_example);
    const bagLines = [...examples.matchAll(/^\[Bag:[^\n]*\]$/gm)].map((match) => match[0]);
    expect(bagLines.length).toBeGreaterThanOrEqual(4);
    for (const line of bagLines) {
      expect(new RegExp(String(bagRegex?.in)).test(line)).toBe(true);
      // Money is the one field that is always present and always first.
      expect(line).toMatch(/^\[Bag: [\d,]+g \|/);
    }

    // Every scene header in the examples has to match the format the instructions
    // describe, or the examples are teaching an older shape.
    const sceneRegex = built.moduleWrapper.module.regex[1];
    const sceneLines = [...examples.matchAll(/^\[Scene:[^\n]*\]$/gm)].map((match) => match[0]);
    expect(sceneLines.length).toBeGreaterThanOrEqual(4);
    for (const line of sceneLines) {
      expect(new RegExp(String(sceneRegex?.in)).test(line)).toBe(true);
      expect(line.split("|")).toHaveLength(6);
      expect(line).toMatch(/\| Day \d+ \| \d{1,2}:\d{2} \|/);
    }
  });

  test("groups the lorebook into RisuAI folders and keeps the scan bounded", () => {
    const built = compileAuthoringSources(primary, false);
    const lore = built.internalLorebook;
    const folders = lore.filter((entry) => entry.mode === "folder");
    expect(folders.length).toBe(built.ir.lorebook.folders.length);
    // Depth is bounded on purpose. The scene header names who is present, so a
    // resident in the room re-activates from the latest message alone; depth only
    // buys memory of someone who has left. Activation saturates around 20, so a
    // deeper scan spends tokens for nothing this book needs.
    expect(built.ir.lorebook.scanDepth).toBeGreaterThanOrEqual(5);
    expect(built.ir.lorebook.scanDepth).toBeLessThanOrEqual(20);
    expect(built.ir.lorebook.tokenBudget).toBeGreaterThanOrEqual(20_000);
    expect(built.card.data.character_book.scan_depth).toBe(built.ir.lorebook.scanDepth);
    expect(built.card.data.character_book.token_budget).toBe(built.ir.lorebook.tokenBudget);
    // Vietnamese keys only match as substrings, so full-word matching must stay off.
    expect(built.card.data.character_book.extensions.risu_fullWordMatching).toBe(false);
    // Nothing tells the model which keys exist, so the always-active entries are
    // the only vocabulary it has for naming a resident, place, or festival — and
    // naming one is what activates that entry's own lore on the next turn. The
    // birthday calendar is always active for the opposite reason: a date is needed
    // on turns where its owner was never named.
    const alwaysActive = built.card.data.character_book.entries.filter(
      (entry: { constant?: boolean }) => entry.constant,
    );
    expect(alwaysActive.length).toBeGreaterThanOrEqual(3);
    const indexText = alwaysActive.map((entry: { content: string }) => entry.content).join("\n");
    for (const name of ["Stardrop Saloon", "Cindersap Forest", "Spirit's Eve", "Marnie"])
      expect(indexText).toContain(name);
    // No character entry may carry a birthday date: the calendar is the one place
    // a date lives, precisely so it is readable when its owner is absent.
    const characters = built.card.data.character_book.entries.filter(
      (entry: { extensions?: Record<string, unknown> }) =>
        String(entry.extensions?.risu_authoring_kind ?? "") === "character",
    );
    expect(characters.length).toBe(32);
    for (const entry of characters)
      expect(String(entry.content)).not.toMatch(
        /birthday (?:is|falls on) the \w+(?:-\w+)? of (?:spring|summer|fall|autumn|winter)/i,
      );
    const calendar = alwaysActive.find((entry: { comment?: string }) =>
      String(entry.comment ?? "").includes("Birthday"),
    );
    expect(String(calendar?.content)).toMatch(/## Spring[\s\S]*## Summer[\s\S]*## Autumn[\s\S]*## Winter/);
    // Recursion must stay off precisely because those entries name everything:
    // rescanning their own content activates most of the book on turn one.
    expect(built.ir.lorebook.recursiveScanning).toBe(false);

    const keys = new Set(folders.map((folder) => String(folder.key)));
    expect(keys.size).toBe(folders.length);
    for (const key of keys) expect(key.startsWith("\uF000folder:")).toBe(true);
    for (const folder of folders) expect(String(folder.content)).toBe("");

    // Every non-folder entry belongs to a declared folder, and each folder's
    // children follow it directly so RisuAI renders one contiguous group.
    for (const entry of lore) if (entry.mode !== "folder") expect(keys.has(String(entry.folder))).toBe(true);
    let current = "";
    const seen = new Set<string>();
    for (const entry of lore) {
      if (entry.mode === "folder") {
        current = String(entry.key);
        expect(seen.has(current)).toBe(false);
        seen.add(current);
      } else expect(String(entry.folder)).toBe(current);
    }

    const residents = built.ir.lorebook.folders.find((folder) => folder.kinds.includes("character"));
    expect(residents).toBeDefined();
    const residentKey = String(folders.find((folder) => folder.comment === residents?.name)?.key ?? "");
    const residentEntries = lore.filter((entry) => entry.folder === residentKey);
    expect(residentEntries).toHaveLength(
      built.ir.entities.filter((entity) => entity.kind === "character").length,
    );
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
