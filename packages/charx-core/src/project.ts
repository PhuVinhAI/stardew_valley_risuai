import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseArchiveOrder, WorldManifestSchema } from "@charx/project-schema";
import { type DecodedRisum, decodeRisum, encodeRisum } from "@charx/risum-codec";
import { unzipSync } from "fflate";
import { compareArchives, createZip, zipMtime } from "./archive.ts";
import {
  buildAuthoringProject,
  checkAuthoringProject,
  compileAuthoringSources,
  loadWorldIR,
  scaffoldAuthoringProject,
} from "./authoring.ts";
import { type CharacterIndexEntry, internalLoreToCcv3, readLorebook, splitLorebook } from "./lore.ts";
import { resolveTemplate } from "./templates.ts";
import { countBuiltSourceTokens } from "./tokens.ts";
import type { ArchiveComparison, BuiltSources, CheckReport, ProjectContext, TokenReport } from "./types.ts";
import {
  copyRpackMap,
  ensureDir,
  listFiles,
  loadRpackMap,
  normalizeArchivePath,
  readJson,
  sha256,
  slugify,
  sourceFingerprint,
  writeJson,
  writeText,
} from "./utils.ts";

function directive(name: string, value: string): Record<string, string> {
  return { [name]: value };
}

function replacePrompts(card: Record<string, any>, cardDir: string): void {
  const fields = [
    ["description", "description.md"],
    ["personality", "personality.md"],
    ["scenario", "scenario.md"],
    ["first_mes", "first-message.md"],
    ["mes_example", "example-messages.md"],
    ["creator_notes", "creator-notes.md"],
    ["system_prompt", "system-prompt.md"],
    ["post_history_instructions", "post-history-instructions.md"],
  ] as const;
  for (const [field, filename] of fields) {
    writeText(path.join(cardDir, "prompts", filename), String(card.data[field] ?? ""));
    card.data[field] = directive("$text", `prompts/${filename}`);
  }
  for (const [field, relativeDir] of [
    ["alternate_greetings", "greetings/alternate"],
    ["group_only_greetings", "greetings/group-only"],
  ] as const) {
    const values = Array.isArray(card.data[field]) ? card.data[field] : [];
    values.forEach((value: unknown, index: number) => {
      writeText(path.join(cardDir, relativeDir, `${String(index + 1).padStart(3, "0")}.md`), String(value));
    });
    card.data[field] = directive("$textArray", relativeDir);
  }
}

function splitOrderedObjects(items: unknown[], directory: string, kind: string): void {
  const order: string[] = [];
  items.forEach((item: any, index) => {
    const label = item?.comment || item?.name || item?.type || `${kind}-${index + 1}`;
    const filename = `${String(index + 1).padStart(3, "0")}-${slugify(label, kind)}.json`;
    writeJson(path.join(directory, filename), item);
    order.push(filename);
  });
  writeJson(path.join(directory, "order.json"), order);
}

function updateCharacterAssetIndexes(
  contentDir: string,
  characters: CharacterIndexEntry[],
  assets: Record<string, any>[],
): void {
  const normalized = (value: string): string =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  for (const character of characters) {
    const sourcePath = path.join(contentDir, character.source);
    const template = readJson<Record<string, any>>(sourcePath);
    const characterName = normalized(`${character.name} ${template.key ?? ""}`);
    const ignoredTokens = new Set(["character", "profile", "seikan", "haewol", "island"]);
    const tokens = characterName.split(" ").filter((token) => token.length >= 3 && !ignoredTokens.has(token));
    const matches = assets
      .filter((asset) => {
        const candidate = normalized(`${asset.name ?? ""} ${asset.uri ?? ""}`);
        return (
          characterName.length > 0 &&
          (candidate.includes(characterName) || tokens.some((token) => candidate.includes(token)))
        );
      })
      .map((asset) => asset.uri)
      .filter((value): value is string => typeof value === "string");
    writeJson(path.join(path.dirname(sourcePath), "assets.json"), matches);
    character.assets = matches;
  }
  writeJson(path.join(contentDir, "characters", "index.json"), characters);
}

export function buildSources(context: ProjectContext): BuiltSources {
  if (context.config.structure === "authoring") return compileAuthoringSources(context, false);
  const internalLorebook = readLorebook(path.join(context.worldDir, "content"));
  const templateContext = { internalLorebook };
  const cardTemplate = readJson(path.join(context.worldDir, "card", "card.template.json"));
  const card = resolveTemplate(cardTemplate, path.join(context.worldDir, "card"), templateContext);
  const moduleTemplate = readJson(path.join(context.worldDir, "module", "module.template.json"));
  const moduleWrapper = resolveTemplate(
    moduleTemplate,
    path.join(context.worldDir, "module"),
    templateContext,
  ) as DecodedRisum["wrapper"];
  const moduleAssets = listFiles(path.join(context.worldDir, "module", "assets"), "**/*.bin").map((file) =>
    fs.readFileSync(file),
  );
  const moduleData = encodeRisum(
    { wrapper: moduleWrapper, assets: moduleAssets },
    loadRpackMap(context.stateDir),
  );
  return {
    card,
    cardData: Buffer.from(JSON.stringify(card, null, 4), "utf8"),
    moduleWrapper,
    moduleData,
    internalLorebook,
  };
}

export function checkProject(context: ProjectContext): CheckReport {
  if (context.config.structure === "authoring") return checkAuthoringProject(context);
  const built = buildSources(context);
  const errors: string[] = [];
  const warnings: string[] = [];
  const card = built.card;
  if (card.spec !== "chara_card_v3" || card.spec_version !== "3.0") errors.push("Card must be CCv3 3.0");
  if (!card.data?.name) errors.push("card.data.name is required");
  if (!Array.isArray(card.data?.assets)) errors.push("card.data.assets must be an array");
  if (!Array.isArray(card.data?.character_book?.entries))
    errors.push("character_book.entries must be an array");
  if (built.moduleWrapper.type !== "risuModule") errors.push("module wrapper type must be risuModule");
  if (!built.moduleWrapper.module.id) errors.push("module.id is required");

  const seen = new Set<string>();
  for (const asset of card.data?.assets ?? []) {
    if (!String(asset.uri ?? "").startsWith("embeded://")) {
      warnings.push(`External asset URI: ${asset.name} -> ${asset.uri}`);
      continue;
    }
    const archivePath = normalizeArchivePath(String(asset.uri).slice("embeded://".length));
    if (seen.has(archivePath)) warnings.push(`Duplicate asset URI: ${archivePath}`);
    seen.add(archivePath);
    if (!fs.existsSync(path.join(context.worldDir, archivePath)))
      errors.push(`Missing asset: ${archivePath}`);
    const metaName = `${path.basename(archivePath, path.extname(archivePath))}.json`;
    if (!fs.existsSync(path.join(context.worldDir, "x_meta", metaName)))
      errors.push(`Missing x_meta/${metaName}`);
  }

  const archiveOrder = parseArchiveOrder(readJson(path.join(context.worldDir, "archive-order.json")));
  const archiveNames = new Set<string>();
  for (const entry of archiveOrder.entries) {
    normalizeArchivePath(entry.name);
    if (archiveNames.has(entry.name)) errors.push(`Duplicate archive entry: ${entry.name}`);
    archiveNames.add(entry.name);
    if (
      entry.name !== "card.json" &&
      entry.name !== "module.risum" &&
      !fs.existsSync(path.join(context.worldDir, entry.name))
    ) {
      errors.push(`Missing archive source: ${entry.name}`);
    }
  }
  if (!archiveNames.has("card.json") || !archiveNames.has("module.risum")) {
    errors.push("archive-order.json must contain card.json and module.risum");
  }
  return {
    errors,
    warnings,
    stats: {
      name: String(card.data?.name ?? ""),
      characters: readJson<CharacterIndexEntry[]>(
        path.join(context.worldDir, "content", "characters", "index.json"),
      ).length,
      loreEntries: built.internalLorebook.length,
      assets: card.data?.assets?.length ?? 0,
      regexScripts: built.moduleWrapper.module.regex?.length ?? 0,
      triggers: built.moduleWrapper.module.trigger?.length ?? 0,
    },
  };
}

export function importCharx(context: ProjectContext, inputPath: string, risuaiRoot: string): void {
  if (fs.existsSync(context.worldDir) && fs.readdirSync(context.worldDir).length > 0) {
    throw new Error(`Refusing to overwrite non-empty ${context.worldDir}`);
  }
  ensureDir(context.worldDir);
  ensureDir(context.stateDir);
  copyRpackMap(risuaiRoot, context.stateDir);
  const original = fs.readFileSync(inputPath);
  const files = unzipSync(original);
  const names = Object.keys(files);
  if (!files["card.json"] || !files["module.risum"])
    throw new Error("CharX must contain card.json and module.risum");
  for (const name of names) {
    normalizeArchivePath(name);
    if (name === "card.json" || name === "module.risum") continue;
    const data = files[name];
    if (!data) throw new Error(`ZIP entry disappeared while importing: ${name}`);
    const output = path.join(context.worldDir, name);
    ensureDir(path.dirname(output));
    fs.writeFileSync(output, data);
  }

  const decoded = decodeRisum(files["module.risum"], loadRpackMap(context.stateDir));
  const internalLorebook = decoded.wrapper.module.lorebook ?? [];
  const characters = splitLorebook(internalLorebook, path.join(context.worldDir, "content"));
  const card = JSON.parse(new TextDecoder().decode(files["card.json"])) as Record<string, any>;
  if (
    JSON.stringify(internalLorebook.map(internalLoreToCcv3)) !==
    JSON.stringify(card.data.character_book?.entries ?? [])
  ) {
    throw new Error("Card lorebook cannot be losslessly derived from module lorebook");
  }
  const cardDir = path.join(context.worldDir, "card");
  replacePrompts(card, cardDir);
  const assets = card.data.assets ?? [];
  writeJson(path.join(cardDir, "assets.json"), assets);
  updateCharacterAssetIndexes(path.join(context.worldDir, "content"), characters, assets);
  card.data.assets = directive("$json", "assets.json");
  card.data.character_book.entries = directive("$ccv3Lorebook", "../content/lore-order.json");
  writeJson(path.join(cardDir, "card.template.json"), card);

  const moduleTemplate = structuredClone(decoded.wrapper) as Record<string, any>;
  const moduleDir = path.join(context.worldDir, "module");
  splitOrderedObjects(moduleTemplate.module.trigger ?? [], path.join(moduleDir, "triggers"), "trigger");
  splitOrderedObjects(moduleTemplate.module.regex ?? [], path.join(moduleDir, "regex"), "regex");
  moduleTemplate.module.trigger = directive("$orderedJson", "triggers");
  moduleTemplate.module.regex = directive("$orderedJson", "regex");
  moduleTemplate.module.lorebook = directive("$internalLorebook", "../content/lore-order.json");
  writeJson(path.join(moduleDir, "module.template.json"), moduleTemplate);
  decoded.assets.forEach((asset, index) => {
    const file = path.join(moduleDir, "assets", `${String(index + 1).padStart(3, "0")}.bin`);
    ensureDir(path.dirname(file));
    fs.writeFileSync(file, asset);
  });

  writeJson(path.join(context.worldDir, "archive-order.json"), {
    mtime: zipMtime(original).toISOString(),
    note: "Entry order and RisuAI compression levels captured from the imported reference.",
    entries: names.map((name) => ({ name, level: name.startsWith("x_meta/") ? 6 : 0 })),
  });
  writeJson(path.join(context.worldDir, "world.json"), {
    name: card.data.name,
    format: "RisuAI CharX v3",
    source: path.basename(inputPath),
    sourceSha256: sha256(original),
    characters: characters.length,
    loreEntries: internalLorebook.length,
    regexScripts: decoded.wrapper.module.regex?.length ?? 0,
    triggers: decoded.wrapper.module.trigger?.length ?? 0,
    assets: assets.length,
  });
  writeJson(path.join(context.stateDir, "import-state.json"), {
    source: path.relative(context.projectRoot, inputPath).replaceAll("\\", "/"),
    sourceSha256: sha256(original),
    sourceBytes: original.length,
    worldFingerprint: sourceFingerprint(context.worldDir),
    entries: names.map((name) => ({
      name,
      bytes: files[name]?.length ?? 0,
      sha256: sha256(files[name] ?? new Uint8Array()),
    })),
  });
}

export function scaffoldProject(context: ProjectContext, name: string, risuaiRoot: string): void {
  if (context.config.structure === "authoring") {
    ensureDir(context.stateDir);
    copyRpackMap(risuaiRoot, context.stateDir);
    scaffoldAuthoringProject(context, name);
    return;
  }
  if (fs.existsSync(context.worldDir) && fs.readdirSync(context.worldDir).length > 0) {
    throw new Error(`Refusing to overwrite non-empty ${context.worldDir}`);
  }
  ensureDir(context.worldDir);
  ensureDir(context.stateDir);
  copyRpackMap(risuaiRoot, context.stateDir);
  const cardDir = path.join(context.worldDir, "card");
  const promptValues: Record<string, string> = {
    "description.md": "",
    "personality.md": "",
    "scenario.md": "",
    "first-message.md": "",
    "example-messages.md": "",
    "creator-notes.md": "",
    "system-prompt.md": "",
    "post-history-instructions.md": "",
  };
  for (const [file, value] of Object.entries(promptValues))
    writeText(path.join(cardDir, "prompts", file), value);
  writeJson(path.join(cardDir, "assets.json"), []);
  writeJson(path.join(context.worldDir, "content", "lore-order.json"), []);
  writeJson(path.join(context.worldDir, "content", "characters", "index.json"), []);
  writeJson(path.join(context.worldDir, "module", "triggers", "order.json"), []);
  writeJson(path.join(context.worldDir, "module", "regex", "order.json"), []);
  const now = Math.floor(Date.now() / 1000);
  writeJson(path.join(cardDir, "card.template.json"), {
    spec: "chara_card_v3",
    spec_version: "3.0",
    data: {
      name,
      description: { $text: "prompts/description.md" },
      personality: { $text: "prompts/personality.md" },
      scenario: { $text: "prompts/scenario.md" },
      first_mes: { $text: "prompts/first-message.md" },
      mes_example: { $text: "prompts/example-messages.md" },
      creator_notes: { $text: "prompts/creator-notes.md" },
      system_prompt: { $text: "prompts/system-prompt.md" },
      post_history_instructions: { $text: "prompts/post-history-instructions.md" },
      alternate_greetings: { $textArray: "greetings/alternate" },
      character_book: {
        scan_depth: 8,
        token_budget: 4096,
        recursive_scanning: true,
        extensions: {},
        entries: { $ccv3Lorebook: "../content/lore-order.json" },
      },
      tags: [],
      creator: "",
      character_version: "1.0.0",
      extensions: {
        risuai: {
          lowLevelAccess: false,
          defaultVariables: "",
          prebuiltAssetCommand: false,
          prebuiltAssetExclude: [],
          prebuiltAssetStyle: "",
          toggles: {},
        },
      },
      group_only_greetings: { $textArray: "greetings/group-only" },
      nickname: "",
      source: [],
      creation_date: now,
      modification_date: now,
      assets: { $json: "assets.json" },
    },
  });
  writeJson(path.join(context.worldDir, "module", "module.template.json"), {
    module: {
      name: `${name} Module`,
      description: `Module for ${name}`,
      id: crypto.randomUUID(),
      trigger: { $orderedJson: "triggers" },
      regex: { $orderedJson: "regex" },
      lorebook: { $internalLorebook: "../content/lore-order.json" },
      assets: [],
    },
    type: "risuModule",
  });
  writeJson(path.join(context.worldDir, "archive-order.json"), {
    mtime: new Date().toISOString(),
    entries: [
      { name: "module.risum", level: 0 },
      { name: "card.json", level: 0 },
    ],
  });
  writeJson(path.join(context.worldDir, "world.json"), {
    name,
    format: "RisuAI CharX v3",
    source: "agent-authored",
    sourceSha256: "0".repeat(64),
    characters: 0,
    loreEntries: 0,
    regexScripts: 0,
    triggers: 0,
    assets: 0,
  });
}

export function buildProject(
  context: ProjectContext,
  exact = false,
): { output: string; comparison?: ArchiveComparison } {
  if (context.config.structure === "authoring") {
    if (exact) throw new Error("Exact builds are only available for decompiled reference projects");
    return buildAuthoringProject(context);
  }
  const report = checkProject(context);
  if (report.errors.length) throw new Error(report.errors.join("\n"));
  const built = buildSources(context);
  if (exact) {
    if (!context.config.referenceCharx || !context.config.exactOutputCharx)
      throw new Error("Exact build requires referenceCharx and exactOutputCharx");
    const reference = path.resolve(context.projectRoot, context.config.referenceCharx);
    const referenceFiles = unzipSync(fs.readFileSync(reference));
    const order = parseArchiveOrder(readJson(path.join(context.worldDir, "archive-order.json")));
    const referenceNames = Object.keys(referenceFiles);
    if (JSON.stringify(referenceNames) !== JSON.stringify(order.entries.map((entry) => entry.name))) {
      throw new Error("Exact build refused: archive entry order differs from reference");
    }
    for (const entry of order.entries) {
      const current =
        entry.name === "card.json"
          ? built.cardData
          : entry.name === "module.risum"
            ? built.moduleData
            : fs.readFileSync(path.join(context.worldDir, entry.name));
      const expected = referenceFiles[entry.name];
      if (!expected || !Buffer.from(expected).equals(current)) {
        throw new Error(`Exact build refused: content differs from reference at ${entry.name}`);
      }
    }
    const output = path.resolve(context.projectRoot, context.config.exactOutputCharx);
    ensureDir(path.dirname(output));
    fs.copyFileSync(reference, output);
    return { output, comparison: compareArchives(reference, output) };
  }
  const order = parseArchiveOrder(readJson(path.join(context.worldDir, "archive-order.json")));
  const entries = order.entries.map((entry) => ({
    name: entry.name,
    level: entry.level,
    data:
      entry.name === "card.json"
        ? built.cardData
        : entry.name === "module.risum"
          ? built.moduleData
          : fs.readFileSync(path.join(context.worldDir, entry.name)),
  }));
  const output = path.resolve(context.projectRoot, context.config.outputCharx);
  ensureDir(path.dirname(output));
  fs.writeFileSync(output, createZip(entries, new Date(order.mtime)));
  const reference = context.config.referenceCharx
    ? path.resolve(context.projectRoot, context.config.referenceCharx)
    : undefined;
  if (reference && fs.existsSync(reference))
    return { output, comparison: compareArchives(reference, output) };
  return { output };
}

export function reindexCharacterAssets(context: ProjectContext): number {
  if (context.config.structure === "authoring") {
    throw new Error("Authoring projects use stable asset ids and do not need reindexing");
  }
  const built = buildSources(context);
  const contentDir = path.join(context.worldDir, "content");
  const characters = readJson<CharacterIndexEntry[]>(path.join(contentDir, "characters", "index.json"));
  updateCharacterAssetIndexes(contentDir, characters, built.card.data.assets ?? []);
  return characters.length;
}

export function verifyProject(context: ProjectContext): ArchiveComparison {
  if (!context.config.referenceCharx) throw new Error("This project has no reference CharX");
  return compareArchives(
    path.resolve(context.projectRoot, context.config.referenceCharx),
    path.resolve(context.projectRoot, context.config.outputCharx),
  );
}

export function projectTokenReport(context: ProjectContext): TokenReport {
  const built = buildSources(context);
  const tokenCheck = context.config.structure === "authoring" ? loadWorldIR(context).tokenCheck : undefined;
  return countBuiltSourceTokens(built, tokenCheck);
}

export function readWorldManifest(context: ProjectContext): Record<string, unknown> {
  if (context.config.structure === "authoring")
    return loadWorldIR(context) as unknown as Record<string, unknown>;
  return WorldManifestSchema.parse(readJson(path.join(context.worldDir, "world.json")));
}

function viewerTokenSummary(context: ProjectContext): Record<string, unknown> {
  const report = projectTokenReport(context);
  return {
    encoding: report.encoding,
    total: report.total,
    archiveTextTokens: report.archiveTextTokens,
    status: report.status,
  };
}

export function projectViewerData(context: ProjectContext): Record<string, unknown> {
  if (context.config.structure === "authoring") {
    const ir = loadWorldIR(context);
    return {
      id: context.projectId,
      kind: context.config.kind,
      structure: context.config.structure,
      name: ir.name,
      description: ir.prompts.description,
      scenario: ir.prompts.scenario,
      firstMessage: ir.prompts.firstMessage,
      stats: checkAuthoringProject(context).stats,
      tokens: viewerTokenSummary(context),
      tags: ir.tags,
      lore: ir.entities.map((entity) => ({
        id: entity.id,
        name: entity.name,
        kind: entity.kind,
        keys: entity.keywords.join(", "),
        content: entity.content,
        assets: entity.assets,
        references: entity.references,
      })),
      assets: ir.assets.map((asset) => ({ id: asset.id, name: asset.name, ext: asset.extension })),
    };
  }
  const built = buildSources(context);
  const characters = readJson<CharacterIndexEntry[]>(
    path.join(context.worldDir, "content", "characters", "index.json"),
  );
  const bySource = new Map(characters.map((character) => [character.source, character]));
  const order = readJson<string[]>(path.join(context.worldDir, "content", "lore-order.json"));
  const lore = built.internalLorebook.map((entry, index) => {
    const source = order[index] ?? "";
    const character = bySource.get(source);
    return {
      name: entry.comment || entry.key || `Entry ${index + 1}`,
      kind: character ? "character" : entry.mode === "folder" ? "folder" : "lore",
      folder: entry.folder ?? null,
      keys: entry.key ?? "",
      content: entry.content ?? "",
      assets: character?.assets ?? [],
    };
  });
  return {
    id: context.projectId,
    kind: context.config.kind,
    structure: context.config.structure,
    name: built.card.data.name,
    description: built.card.data.description,
    scenario: built.card.data.scenario,
    firstMessage: built.card.data.first_mes,
    stats: checkProject(context).stats,
    tokens: viewerTokenSummary(context),
    tags: built.card.data.tags ?? [],
    lore,
    assets: built.card.data.assets ?? [],
  };
}

export function writeExampleReadme(context: ProjectContext): void {
  if (context.config.kind !== "example") return;
  const report = checkProject(context);
  const characters = readJson<CharacterIndexEntry[]>(
    path.join(context.worldDir, "content", "characters", "index.json"),
  );
  const manifest = readJson<Record<string, any>>(path.join(context.worldDir, "world.json"));
  const characterLines = characters.length
    ? characters.map((character) => {
        const contentPath = `world/content/${character.source.replace(/entry\.template\.json$/, "content.md")}`;
        return `- [${character.name}](${encodeURI(contentPath)}) — ${character.assets?.length ?? 0} linked assets`;
      })
    : ["- No character entries were confidently classified; inspect the lorebook index below."];
  const lines = [
    `# ${report.stats.name}`,
    "",
    "> Imported example project. The decomposed source rebuilds to the same CharX entry contents as its reference.",
    "",
    "## Snapshot",
    "",
    "| Field | Value |",
    "| --- | ---: |",
    `| Characters | ${report.stats.characters} |`,
    `| Lore entries | ${report.stats.loreEntries} |`,
    `| Assets | ${report.stats.assets} |`,
    `| Regex scripts | ${report.stats.regexScripts} |`,
    `| Triggers | ${report.stats.triggers} |`,
    `| Reference SHA-256 | \`${manifest.sourceSha256 ?? "unknown"}\` |`,
    "",
    "## Browse",
    "",
    "- [World prompts](world/card/prompts/)",
    "- [Character index](world/content/characters/index.json)",
    "- [Lore order](world/content/lore-order.json)",
    "- [Regex scripts](world/module/regex/)",
    "- [Triggers](world/module/triggers/)",
    "- [Asset manifest](world/card/assets.json)",
    "- Reference CharX is intentionally local-only and excluded from Git.",
    "",
    "## Characters",
    "",
    ...characterLines,
    "",
    "## Commands",
    "",
    "```powershell",
    `bun run charx check --project ${context.projectId}`,
    `bun run charx build --project ${context.projectId}`,
    `bun run charx verify --project ${context.projectId}`,
    "```",
    "",
  ];
  writeText(path.join(context.projectRoot, "README.md"), lines.join("\n"));
}
