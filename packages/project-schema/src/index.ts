import { z } from "zod";

export const ProjectConfigSchema = z.object({
  format: z.literal("risuai-charx-world-project"),
  formatVersion: z.number().int().positive(),
  kind: z.enum(["primary", "example"]),
  structure: z.enum(["authoring", "decompiled"]).default("decompiled"),
  worldDir: z.string().min(1).default("world"),
  sourceDir: z.string().min(1).default("source"),
  generatedDir: z.string().min(1).default("generated"),
  stateDir: z.string().min(1),
  referenceCharx: z.string().min(1).optional(),
  outputCharx: z.string().min(1),
  exactOutputCharx: z.string().min(1).optional(),
});

const StableIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "Use a stable kebab-case id");
const FrameRefSchema = z
  .string()
  .regex(
    /^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)?$/,
    "Use 'frame' for the same outfit or 'outfit/frame' to point at another outfit",
  );
const SourcePathSchema = z
  .string()
  .min(1)
  .refine((value) => !value.includes("..") && !/^[A-Za-z]:/.test(value), {
    message: "Source paths must be relative and stay inside the project source directory",
  });

export const OpenAiTokenBudgetSchema = z
  .object({
    encoding: z.enum(["o200k_base", "cl100k_base", "p50k_base", "r50k_base"]).default("o200k_base"),
    warnAt: z.number().int().positive().default(100_000),
    errorAt: z.number().int().positive().default(120_000),
  })
  .refine((budget) => budget.errorAt > budget.warnAt, {
    message: "errorAt must be greater than warnAt",
  });

export const WorldEntityKindSchema = z.enum([
  "character",
  "location",
  "lore",
  "relationship",
  "schedule",
  "system",
  "event",
]);

/**
 * One RisuAI lorebook folder. Folders carry no text of their own; they exist so
 * the compiled book opens as labelled groups instead of one flat list, and so
 * `kinds` can route whole entity directories into a group without touching each
 * entity file.
 */
export const LorebookFolderSchema = z.object({
  id: StableIdSchema,
  name: z.string().min(1),
  kinds: z.array(WorldEntityKindSchema).default([]),
  insertionOrder: z.number().int().default(100),
});

export const LorebookSettingsSchema = z.object({
  scanDepth: z.number().int().positive().default(8),
  tokenBudget: z.number().int().positive().default(4096),
  recursiveScanning: z.boolean().default(true),
  folders: z.array(LorebookFolderSchema).default([]),
});

export const AuthoringManifestSchema = z.object({
  schema: z.literal("risuai-world/v1"),
  id: StableIdSchema,
  name: z.string().min(1),
  version: z.string().min(1).default("0.1.0"),
  creator: z.string().default(""),
  language: z.string().min(2).default("en"),
  tags: z.array(z.string().min(1)).default([]),
  nickname: z.string().default(""),
  source: z.array(z.string().min(1)).default([]),
  prompts: z
    .object({
      description: SourcePathSchema.default("world/description.md"),
      personality: SourcePathSchema.default("world/personality.md"),
      scenario: SourcePathSchema.default("world/scenario.md"),
      exampleMessages: SourcePathSchema.default("world/example-messages.md"),
      creatorNotes: SourcePathSchema.default("world/creator-notes.md"),
      systemPrompt: SourcePathSchema.default("world/system-prompt.md"),
      postHistoryInstructions: SourcePathSchema.default("world/post-history-instructions.md"),
    })
    .default({
      description: "world/description.md",
      personality: "world/personality.md",
      scenario: "world/scenario.md",
      exampleMessages: "world/example-messages.md",
      creatorNotes: "world/creator-notes.md",
      systemPrompt: "world/system-prompt.md",
      postHistoryInstructions: "world/post-history-instructions.md",
    }),
  startPanel: z
    .object({
      manifest: SourcePathSchema.default("presentation/start-panel.yaml"),
      scenarioDir: SourcePathSchema.default("presentation/scenarios"),
    })
    .default({
      manifest: "presentation/start-panel.yaml",
      scenarioDir: "presentation/scenarios",
    }),
  lorebook: LorebookSettingsSchema.default({
    scanDepth: 8,
    tokenBudget: 4096,
    recursiveScanning: true,
    folders: [],
  }),
  module: z
    .object({
      name: z.string().min(1).optional(),
      description: z.string().default(""),
      id: z.string().uuid().optional(),
    })
    .default({ description: "" }),
  risuai: z
    .object({
      lowLevelAccess: z.boolean().default(false),
      defaultVariables: z.string().default(""),
      prebuiltAssetCommand: z.boolean().default(false),
      prebuiltAssetExclude: z.array(z.string()).default([]),
      prebuiltAssetStyle: z.string().default(""),
      toggles: z.record(z.string(), z.unknown()).default({}),
    })
    .default({
      lowLevelAccess: false,
      defaultVariables: "",
      prebuiltAssetCommand: false,
      prebuiltAssetExclude: [],
      prebuiltAssetStyle: "",
      toggles: {},
    }),
  tokenCheck: OpenAiTokenBudgetSchema.default({ encoding: "o200k_base", warnAt: 100_000, errorAt: 120_000 }),
});

const EntityBaseSchema = z.object({
  id: StableIdSchema,
  name: z.string().min(1),
  content: SourcePathSchema.default("content.md"),
  keywords: z.array(z.string()).default([]),
  secondaryKeywords: z.array(z.string()).default([]),
  alwaysActive: z.boolean().default(false),
  selective: z.boolean().default(false),
  insertionOrder: z.number().int().default(100),
  enabled: z.boolean().default(true),
  useRegex: z.boolean().default(false),
  assets: z.array(StableIdSchema).default([]),
});

export const CharacterSourceSchema = EntityBaseSchema.extend({
  schema: z.literal("risuai-character/v1"),
  aliases: z.array(z.string()).default([]),
  alwaysActive: z.boolean().default(false),
  relationships: z.array(StableIdSchema).default([]),
  locations: z.array(StableIdSchema).default([]),
  schedules: z.array(StableIdSchema).default([]),
  systems: z.array(StableIdSchema).default([]),
});

export const LocationSourceSchema = EntityBaseSchema.extend({
  schema: z.literal("risuai-location/v1"),
});

export const LoreSourceSchema = EntityBaseSchema.extend({
  schema: z.literal("risuai-lore/v1"),
});

export const SystemSourceSchema = EntityBaseSchema.extend({
  schema: z.literal("risuai-system/v1"),
  alwaysActive: z.boolean().default(true),
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
});

export const EventSourceSchema = EntityBaseSchema.extend({
  schema: z.literal("risuai-event/v1"),
  conditions: z.array(z.string()).default([]),
});

export const ScheduleSourceSchema = EntityBaseSchema.extend({
  schema: z.literal("risuai-schedule/v1"),
  character: StableIdSchema,
  locations: z.array(StableIdSchema).default([]),
});

export const RelationshipSourceSchema = EntityBaseSchema.extend({
  schema: z.literal("risuai-relationship/v1"),
  participants: z.array(StableIdSchema).min(2),
  alwaysActive: z.boolean().default(false),
});

export const AssetManifestSchema = z.object({
  schema: z.literal("risuai-assets/v1"),
  assets: z
    .array(
      z.object({
        id: StableIdSchema,
        file: SourcePathSchema,
        name: z.string().min(1).optional(),
        type: z.string().min(1).default("x-risu-asset"),
        optional: z.boolean().default(false),
      }),
    )
    .default([]),
});

export const PortraitCurationSchema = z.object({
  schema: z.literal("risuai-portrait-curation/v1"),
  character: StableIdSchema,
  sourcePack: z.string().min(1),
  sourceRoot: SourcePathSchema,
  icon: FrameRefSchema.optional(),
  variant: StableIdSchema.optional(),
  outfits: z.record(
    StableIdSchema,
    z.object({
      context: StableIdSchema,
      defaultEnabled: z.boolean().default(true),
      variant: StableIdSchema.optional(),
      frames: z.record(StableIdSchema, StableIdSchema).default({}),
      duplicates: z
        .array(
          z
            .object({ frame: StableIdSchema, duplicateOf: FrameRefSchema })
            .refine((entry) => entry.duplicateOf !== entry.frame, {
              message: "duplicateOf must name another frame, not itself; use 'outfit/frame' across outfits",
            }),
        )
        .default([]),
    }),
  ),
});

const LocalizedTextSchema = z.record(StableIdSchema, z.string().min(1));

export const StartPanelSchema = z.object({
  schema: z.literal("risuai-start-panel/v1"),
  sentinel: z.string().min(3).default("[[sv-start-panel]]"),
  defaultLanguage: StableIdSchema,
  defaultScenario: StableIdSchema,
  variables: z
    .object({
      language: z.string().min(1).default("sv_lang"),
      group: z.string().min(1).default("sv_group"),
      scene: z.string().min(1).default("sv_scene"),
    })
    .default({ language: "sv_lang", group: "sv_group", scene: "sv_scene" }),
  languages: z.array(z.object({ id: StableIdSchema, label: z.string().min(1) })).min(1),
  groups: z.array(z.object({ id: StableIdSchema, labels: LocalizedTextSchema })).min(1),
  ui: z.record(z.string().min(1), LocalizedTextSchema),
});

export const ScenarioSourceSchema = z.object({
  schema: z.literal("risuai-scenario/v1"),
  id: StableIdSchema,
  group: StableIdSchema,
  order: z.number().int().default(100),
  preview: StableIdSchema.optional(),
  titles: LocalizedTextSchema,
  summaries: LocalizedTextSchema,
  tags: z.record(StableIdSchema, z.array(z.string().min(1))).default({}),
  bodies: z.record(StableIdSchema, SourcePathSchema),
});

export const WorkspaceConfigSchema = z.object({
  format: z.literal("risuai-charx-workspace"),
  formatVersion: z.number().int().positive(),
  defaultProject: z.string().min(1),
  projects: z.record(z.string().min(1), z.string().min(1)),
});

export const ArchiveEntrySchema = z.object({
  name: z.string().min(1),
  level: z.number().int().min(0).max(9),
});

export const ArchiveOrderSchema = z.object({
  mtime: z.string().datetime(),
  note: z.string().optional(),
  entries: z.array(ArchiveEntrySchema).min(1),
});

export const WorldManifestSchema = z.object({
  name: z.string().min(1),
  format: z.literal("RisuAI CharX v3"),
  source: z.string().min(1),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  characters: z.number().int().nonnegative(),
  loreEntries: z.number().int().nonnegative(),
  regexScripts: z.number().int().nonnegative(),
  triggers: z.number().int().nonnegative(),
  assets: z.number().int().nonnegative(),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
export type WorkspaceConfig = z.infer<typeof WorkspaceConfigSchema>;
export type ArchiveOrder = z.infer<typeof ArchiveOrderSchema>;
export type WorldManifest = z.infer<typeof WorldManifestSchema>;
export type AuthoringManifest = z.infer<typeof AuthoringManifestSchema>;
export type CharacterSource = z.infer<typeof CharacterSourceSchema>;
export type LocationSource = z.infer<typeof LocationSourceSchema>;
export type LoreSource = z.infer<typeof LoreSourceSchema>;
export type SystemSource = z.infer<typeof SystemSourceSchema>;
export type EventSource = z.infer<typeof EventSourceSchema>;
export type ScheduleSource = z.infer<typeof ScheduleSourceSchema>;
export type RelationshipSource = z.infer<typeof RelationshipSourceSchema>;
export type AssetManifest = z.infer<typeof AssetManifestSchema>;
export type PortraitCuration = z.infer<typeof PortraitCurationSchema>;
export type StartPanel = z.infer<typeof StartPanelSchema>;
export type ScenarioSource = z.infer<typeof ScenarioSourceSchema>;
export type LorebookFolder = z.infer<typeof LorebookFolderSchema>;
export type LorebookSettings = z.infer<typeof LorebookSettingsSchema>;

export function parseProjectConfig(value: unknown): ProjectConfig {
  return ProjectConfigSchema.parse(value);
}

export function parseWorkspaceConfig(value: unknown): WorkspaceConfig {
  return WorkspaceConfigSchema.parse(value);
}

export function parseArchiveOrder(value: unknown): ArchiveOrder {
  return ArchiveOrderSchema.parse(value);
}
