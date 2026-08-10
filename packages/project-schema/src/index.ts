import { z } from "zod";

export const ProjectConfigSchema = z.object({
  format: z.literal("risuai-charx-world-project"),
  formatVersion: z.number().int().positive(),
  kind: z.enum(["primary", "example"]),
  worldDir: z.string().min(1),
  stateDir: z.string().min(1),
  referenceCharx: z.string().min(1).optional(),
  outputCharx: z.string().min(1),
  exactOutputCharx: z.string().min(1).optional(),
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

export function parseProjectConfig(value: unknown): ProjectConfig {
  return ProjectConfigSchema.parse(value);
}

export function parseWorkspaceConfig(value: unknown): WorkspaceConfig {
  return WorkspaceConfigSchema.parse(value);
}

export function parseArchiveOrder(value: unknown): ArchiveOrder {
  return ArchiveOrderSchema.parse(value);
}
