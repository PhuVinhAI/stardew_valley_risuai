import fs from "node:fs";
import path from "node:path";
import {
  AssetManifestSchema,
  AuthoringManifestSchema,
  CharacterSourceSchema,
  EventSourceSchema,
  LocationSourceSchema,
  LoreSourceSchema,
  RelationshipSourceSchema,
  ScheduleSourceSchema,
  SystemSourceSchema,
} from "@charx/project-schema";
import { encodeRisum } from "@charx/risum-codec";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { createZip } from "./archive.ts";
import { internalLoreToCcv3 } from "./lore.ts";
import { countBuiltSourceTokens } from "./tokens.ts";
import type {
  BuiltSources,
  CheckReport,
  ProjectContext,
  WorldEntityKind,
  WorldIR,
  WorldIrAsset,
  WorldIrEntity,
} from "./types.ts";
import {
  ensureDir,
  listFiles,
  loadRpackMap,
  normalizeArchivePath,
  sha256,
  sourceFingerprint,
  writeJson,
  writeText,
} from "./utils.ts";

const entityDirectories: {
  directory: string;
  filename: string;
  kind: WorldEntityKind;
  schema: { parse(value: unknown): Record<string, unknown> };
}[] = [
  { directory: "characters", filename: "character.yaml", kind: "character", schema: CharacterSourceSchema },
  { directory: "locations", filename: "location.yaml", kind: "location", schema: LocationSourceSchema },
  { directory: "lore", filename: "lore.yaml", kind: "lore", schema: LoreSourceSchema },
  {
    directory: "relationships",
    filename: "relationship.yaml",
    kind: "relationship",
    schema: RelationshipSourceSchema,
  },
  { directory: "schedules", filename: "schedule.yaml", kind: "schedule", schema: ScheduleSourceSchema },
  { directory: "systems", filename: "system.yaml", kind: "system", schema: SystemSourceSchema },
  { directory: "events", filename: "event.yaml", kind: "event", schema: EventSourceSchema },
];

function readYaml(file: string): unknown {
  return parseYaml(fs.readFileSync(file, "utf8"));
}

function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function readSourceText(sourceDir: string, relative: string): string {
  const root = path.resolve(sourceDir);
  const target = path.resolve(root, relative);
  if (!isInside(root, target)) throw new Error(`Unsafe source path: ${relative}`);
  if (!fs.existsSync(target)) throw new Error(`Missing source file: ${relative}`);
  return fs.readFileSync(target, "utf8");
}

function readEntityContent(yamlFile: string, relative: string): string {
  const root = path.dirname(yamlFile);
  const target = path.resolve(root, relative);
  if (!isInside(root, target)) throw new Error(`Unsafe entity content path: ${relative}`);
  if (!fs.existsSync(target)) throw new Error(`Missing entity content: ${target}`);
  return fs.readFileSync(target, "utf8");
}

function deterministicUuid(value: string): string {
  const bytes = Buffer.from(sha256(Buffer.from(value, "utf8")).slice(0, 32), "hex");
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function readMarkdownDirectory(sourceDir: string, relative: string): string[] {
  return listFiles(path.resolve(sourceDir, relative), "*.md").map((file) => fs.readFileSync(file, "utf8"));
}

function entityReferences(kind: WorldEntityKind, value: Record<string, unknown>): Record<string, string[]> {
  if (kind === "character") {
    return {
      relationships: (value.relationships as string[]) ?? [],
      locations: (value.locations as string[]) ?? [],
      schedules: (value.schedules as string[]) ?? [],
      systems: (value.systems as string[]) ?? [],
    };
  }
  if (kind === "relationship") return { participants: (value.participants as string[]) ?? [] };
  if (kind === "schedule")
    return { characters: [String(value.character)], locations: (value.locations as string[]) ?? [] };
  if (kind === "event") return { conditions: (value.conditions as string[]) ?? [] };
  return {};
}

function loadAssets(sourceDir: string): WorldIrAsset[] {
  const manifestFile = path.join(sourceDir, "assets", "manifest.yaml");
  if (!fs.existsSync(manifestFile)) return [];
  const manifest = AssetManifestSchema.parse(readYaml(manifestFile));
  const root = path.resolve(sourceDir);
  return manifest.assets.map((asset) => {
    const sourceFile = path.resolve(root, asset.file);
    if (!isInside(root, sourceFile)) throw new Error(`Unsafe asset path: ${asset.file}`);
    if (!fs.existsSync(sourceFile)) throw new Error(`Missing asset '${asset.id}': ${asset.file}`);
    const extension = path.extname(sourceFile).slice(1).toLowerCase();
    if (!extension) throw new Error(`Asset '${asset.id}' must have a file extension`);
    return {
      id: asset.id,
      name: asset.name ?? path.basename(sourceFile),
      type: asset.type,
      extension,
      sourceFile,
      archivePath: normalizeArchivePath(`assets/other/${extension}/${asset.id}.${extension}`),
    };
  });
}

export function loadWorldIR(context: ProjectContext): WorldIR {
  if (context.config.structure !== "authoring")
    throw new Error(`${context.projectId} is not an authoring project`);
  const manifest = AuthoringManifestSchema.parse(readYaml(path.join(context.sourceDir, "world.yaml")));
  if (manifest.id !== context.projectId) throw new Error(`world.yaml id must match '${context.projectId}'`);
  const entities: WorldIrEntity[] = [];
  for (const definition of entityDirectories) {
    for (const yamlFile of listFiles(
      path.join(context.sourceDir, definition.directory),
      `*/${definition.filename}`,
    )) {
      const value = definition.schema.parse(readYaml(yamlFile));
      entities.push({
        id: String(value.id),
        kind: definition.kind,
        name: String(value.name),
        content: readEntityContent(yamlFile, String(value.content)),
        keywords: (value.keywords as string[]) ?? [],
        secondaryKeywords: (value.secondaryKeywords as string[]) ?? [],
        alwaysActive: Boolean(value.alwaysActive),
        selective: Boolean(value.selective),
        insertionOrder: Number(value.insertionOrder),
        enabled: Boolean(value.enabled),
        useRegex: Boolean(value.useRegex),
        assets: (value.assets as string[]) ?? [],
        references: entityReferences(definition.kind, value),
        sourceFile: yamlFile,
      });
    }
  }
  entities.sort(
    (left, right) => left.insertionOrder - right.insertionOrder || left.id.localeCompare(right.id, "en"),
  );
  const ids = new Set<string>();
  for (const entity of entities) {
    if (ids.has(entity.id)) throw new Error(`Duplicate authoring entity id: ${entity.id}`);
    ids.add(entity.id);
  }
  const assets = loadAssets(context.sourceDir);
  const assetIds = new Set(assets.map((asset) => asset.id));
  for (const entity of entities) {
    for (const asset of entity.assets)
      if (!assetIds.has(asset)) throw new Error(`${entity.id} references unknown asset '${asset}'`);
    for (const [referenceType, references] of Object.entries(entity.references)) {
      if (referenceType === "conditions") continue;
      for (const reference of references)
        if (!ids.has(reference))
          throw new Error(`${entity.id} references unknown ${referenceType} '${reference}'`);
    }
  }
  const prompts = manifest.prompts;
  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    creator: manifest.creator,
    language: manifest.language,
    tags: manifest.tags,
    nickname: manifest.nickname,
    source: manifest.source,
    prompts: {
      description: readSourceText(context.sourceDir, prompts.description),
      personality: readSourceText(context.sourceDir, prompts.personality),
      scenario: readSourceText(context.sourceDir, prompts.scenario),
      firstMessage: readSourceText(context.sourceDir, prompts.firstMessage),
      exampleMessages: readSourceText(context.sourceDir, prompts.exampleMessages),
      creatorNotes: readSourceText(context.sourceDir, prompts.creatorNotes),
      systemPrompt: readSourceText(context.sourceDir, prompts.systemPrompt),
      postHistoryInstructions: readSourceText(context.sourceDir, prompts.postHistoryInstructions),
    },
    alternateGreetings: readMarkdownDirectory(context.sourceDir, manifest.greetings.alternateDir),
    groupOnlyGreetings: readMarkdownDirectory(context.sourceDir, manifest.greetings.groupOnlyDir),
    lorebook: manifest.lorebook,
    module: {
      name: manifest.module.name ?? `${manifest.name} Module`,
      description: manifest.module.description,
      id: manifest.module.id ?? deterministicUuid(`risuai-world:${manifest.id}`),
    },
    risuai: manifest.risuai,
    tokenCheck: manifest.tokenCheck,
    entities,
    assets,
  };
}

function internalLore(ir: WorldIR): Record<string, unknown>[] {
  return ir.entities
    .filter((entity) => entity.enabled)
    .map((entity) => ({
      key: entity.keywords.join(", "),
      comment: entity.name,
      content: entity.content,
      mode: "normal",
      insertorder: entity.insertionOrder,
      alwaysActive: entity.alwaysActive,
      secondkey: entity.secondaryKeywords.join(", "),
      selective: entity.selective,
      useRegex: entity.useRegex,
      bookVersion: 2,
      extentions: {
        risu_authoring_id: entity.id,
        risu_authoring_kind: entity.kind,
        risu_authoring_assets: entity.assets,
        risu_authoring_references: entity.references,
      },
    }));
}

export function compileAuthoringSources(
  context: ProjectContext,
  writeGenerated = true,
): BuiltSources & { ir: WorldIR } {
  const ir = loadWorldIR(context);
  const lorebook = internalLore(ir);
  const cardAssets = ir.assets.map((asset) => ({
    type: asset.type,
    uri: `embeded://${asset.archivePath}`,
    name: asset.name,
    ext: asset.extension,
  }));
  const timestamp = Number.parseInt(sourceFingerprint(context.sourceDir).slice(0, 8), 16);
  const card = {
    spec: "chara_card_v3",
    spec_version: "3.0",
    data: {
      name: ir.name,
      description: ir.prompts.description,
      personality: ir.prompts.personality,
      scenario: ir.prompts.scenario,
      first_mes: ir.prompts.firstMessage,
      mes_example: ir.prompts.exampleMessages,
      creator_notes: ir.prompts.creatorNotes,
      system_prompt: ir.prompts.systemPrompt,
      post_history_instructions: ir.prompts.postHistoryInstructions,
      alternate_greetings: ir.alternateGreetings,
      character_book: {
        scan_depth: ir.lorebook.scanDepth,
        token_budget: ir.lorebook.tokenBudget,
        recursive_scanning: ir.lorebook.recursiveScanning,
        extensions: {},
        entries: lorebook.map(internalLoreToCcv3),
      },
      tags: ir.tags,
      creator: ir.creator,
      character_version: ir.version,
      extensions: { risuai: ir.risuai },
      group_only_greetings: ir.groupOnlyGreetings,
      nickname: ir.nickname,
      source: ir.source,
      creation_date: timestamp,
      modification_date: timestamp,
      assets: cardAssets,
    },
  };
  const moduleWrapper = {
    type: "risuModule" as const,
    module: {
      name: ir.module.name,
      description: ir.module.description,
      id: ir.module.id,
      trigger: [],
      regex: [],
      lorebook,
      assets: [],
    },
  };
  const cardData = Buffer.from(JSON.stringify(card, null, 4), "utf8");
  const moduleData = encodeRisum({ wrapper: moduleWrapper, assets: [] }, loadRpackMap(context.stateDir));
  if (writeGenerated) {
    ensureDir(context.generatedDir);
    writeJson(path.join(context.generatedDir, "world-ir.json"), {
      ...ir,
      assets: ir.assets.map((asset) => ({
        ...asset,
        sourceFile: path.relative(context.projectRoot, asset.sourceFile),
      })),
      entities: ir.entities.map((entity) => ({
        ...entity,
        sourceFile: path.relative(context.projectRoot, entity.sourceFile),
      })),
    });
    writeText(path.join(context.generatedDir, "card.json"), `${cardData.toString("utf8")}\n`);
    fs.writeFileSync(path.join(context.generatedDir, "module.risum"), moduleData);
  }
  return { card, cardData, moduleWrapper, moduleData, internalLorebook: lorebook, ir };
}

export function checkAuthoringProject(context: ProjectContext): CheckReport {
  try {
    const built = compileAuthoringSources(context, false);
    const { ir } = built;
    const warnings: string[] = [];
    if (ir.entities.length === 0) warnings.push("Authoring project has no entities yet");
    if (!ir.prompts.description.trim()) warnings.push("World description is empty");
    const tokens = countBuiltSourceTokens(built, ir.tokenCheck);
    if (tokens.status === "warning")
      warnings.push(`OpenAI token budget warning: ${tokens.total} >= ${tokens.warnAt}`);
    const errors =
      tokens.status === "error" ? [`OpenAI token budget exceeded: ${tokens.total} >= ${tokens.errorAt}`] : [];
    return {
      errors,
      warnings,
      stats: {
        name: ir.name,
        characters: ir.entities.filter((entity) => entity.kind === "character").length,
        loreEntries: ir.entities.filter((entity) => entity.enabled).length,
        assets: ir.assets.length,
        regexScripts: 0,
        triggers: 0,
      },
    };
  } catch (error) {
    return {
      errors: [error instanceof Error ? error.message : String(error)],
      warnings: [],
      stats: {
        name: context.projectId,
        characters: 0,
        loreEntries: 0,
        assets: 0,
        regexScripts: 0,
        triggers: 0,
      },
    };
  }
}

export function buildAuthoringProject(context: ProjectContext): { output: string } {
  const report = checkAuthoringProject(context);
  if (report.errors.length) throw new Error(report.errors.join("\n"));
  const built = compileAuthoringSources(context);
  writeJson(
    path.join(context.generatedDir, "token-report.json"),
    countBuiltSourceTokens(built, built.ir.tokenCheck),
  );
  const entries = [
    { name: "module.risum", level: 0, data: built.moduleData },
    { name: "card.json", level: 0, data: built.cardData },
    ...built.ir.assets.flatMap((asset) => [
      { name: asset.archivePath, level: 0, data: fs.readFileSync(asset.sourceFile) },
      {
        name: `x_meta/${asset.id}.json`,
        level: 6,
        data: Buffer.from(JSON.stringify({ type: asset.extension.toUpperCase() }), "utf8"),
      },
    ]),
  ];
  const output = path.resolve(context.projectRoot, context.config.outputCharx);
  ensureDir(path.dirname(output));
  fs.writeFileSync(output, createZip(entries, new Date("2020-01-01T00:00:00.000Z")));
  return { output };
}

export function scaffoldAuthoringProject(context: ProjectContext, name: string): void {
  if (fs.existsSync(context.sourceDir) && fs.readdirSync(context.sourceDir).length > 0)
    throw new Error(`Refusing to overwrite non-empty ${context.sourceDir}`);
  for (const file of [
    "description.md",
    "personality.md",
    "scenario.md",
    "first-message.md",
    "example-messages.md",
    "creator-notes.md",
    "system-prompt.md",
    "post-history-instructions.md",
  ])
    writeText(path.join(context.sourceDir, "world", file), "");
  for (const directory of [
    "characters",
    "locations",
    "lore",
    "presentation/greetings/alternate",
    "presentation/greetings/group-only",
    "assets/files",
  ])
    writeText(path.join(context.sourceDir, directory, ".gitkeep"), "");
  writeText(
    path.join(context.sourceDir, "world.yaml"),
    stringifyYaml({
      schema: "risuai-world/v1",
      id: context.projectId,
      name,
      version: "0.1.0",
      creator: "",
      language: "en",
      tags: [],
      prompts: {},
      greetings: {},
      lorebook: {},
      module: { description: `RisuAI module for ${name}` },
      risuai: {},
      tokenCheck: { encoding: "o200k_base", warnAt: 100000, errorAt: 120000 },
    }),
  );
  writeText(
    path.join(context.sourceDir, "assets", "manifest.yaml"),
    stringifyYaml({ schema: "risuai-assets/v1", assets: [] }),
  );
}
