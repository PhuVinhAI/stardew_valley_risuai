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
      firstMessage: SourcePathSchema.default("world/first-message.md"),
      exampleMessages: SourcePathSchema.default("world/example-messages.md"),
      creatorNotes: SourcePathSchema.default("world/creator-notes.md"),
      systemPrompt: SourcePathSchema.default("world/system-prompt.md"),
      postHistoryInstructions: SourcePathSchema.default("world/post-history-instructions.md"),
    })
    .default({
      description: "world/description.md",
      personality: "world/personality.md",
      scenario: "world/scenario.md",
      firstMessage: "world/first-message.md",
      exampleMessages: "world/example-messages.md",
      creatorNotes: "world/creator-notes.md",
      systemPrompt: "world/system-prompt.md",
      postHistoryInstructions: "world/post-history-instructions.md",
    }),
  greetings: z
    .object({
      alternateDir: SourcePathSchema.default("presentation/greetings/alternate"),
      groupOnlyDir: SourcePathSchema.default("presentation/greetings/group-only"),
    })
    .default({
      alternateDir: "presentation/greetings/alternate",
      groupOnlyDir: "presentation/greetings/group-only",
    }),
  lorebook: z
    .object({
      scanDepth: z.number().int().positive().default(8),
      tokenBudget: z.number().int().positive().default(4096),
      recursiveScanning: z.boolean().default(true),
    })
    .default({ scanDepth: 8, tokenBudget: 4096, recursiveScanning: true }),
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
      prebuiltAssetCommand: z.string().default(""),
      prebuiltAssetExclude: z.array(z.string()).default([]),
      prebuiltAssetStyle: z.string().default(""),
      toggles: z.record(z.string(), z.unknown()).default({}),
    })
    .default({
      lowLevelAccess: false,
      defaultVariables: "",
      prebuiltAssetCommand: "",
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
  outfits: z.record(
    StableIdSchema,
    z.object({
      context: StableIdSchema,
      defaultEnabled: z.boolean().default(true),
      frames: z.record(StableIdSchema, StableIdSchema).default({}),
      duplicates: z.array(z.object({ frame: StableIdSchema, duplicateOf: StableIdSchema })).default([]),
    }),
  ),
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

export function parseProjectConfig(value: unknown): ProjectConfig {
  return ProjectConfigSchema.parse(value);
}

export function parseWorkspaceConfig(value: unknown): WorkspaceConfig {
  return WorkspaceConfigSchema.parse(value);
}

export function parseArchiveOrder(value: unknown): ArchiveOrder {
  return ArchiveOrderSchema.parse(value);
}
