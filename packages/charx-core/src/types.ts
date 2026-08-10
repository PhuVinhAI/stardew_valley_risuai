import type { ProjectConfig } from "@charx/project-schema";

export interface ProjectContext {
  workspaceRoot: string;
  projectId: string;
  projectRoot: string;
  config: ProjectConfig;
  worldDir: string;
  stateDir: string;
}

export interface CheckReport {
  errors: string[];
  warnings: string[];
  stats: {
    name: string;
    characters: number;
    loreEntries: number;
    assets: number;
    regexScripts: number;
    triggers: number;
  };
}

export interface BuiltSources {
  card: Record<string, any>;
  cardData: Buffer;
  moduleWrapper: { type: "risuModule"; module: Record<string, any> };
  moduleData: Buffer;
  internalLorebook: Record<string, any>[];
}

export interface ArchiveComparison {
  byteIdentical: boolean;
  entryIdentical: boolean;
  leftSha256: string;
  rightSha256: string;
  differences: string[];
}
