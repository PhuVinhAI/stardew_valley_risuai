import type { ProjectConfig } from "@charx/project-schema";

export interface ProjectContext {
  workspaceRoot: string;
  projectId: string;
  projectRoot: string;
  config: ProjectConfig;
  worldDir: string;
  sourceDir: string;
  generatedDir: string;
  stateDir: string;
}

export type WorldEntityKind =
  | "character"
  | "location"
  | "lore"
  | "relationship"
  | "schedule"
  | "system"
  | "event";

export interface WorldIrEntity {
  id: string;
  kind: WorldEntityKind;
  name: string;
  content: string;
  keywords: string[];
  secondaryKeywords: string[];
  alwaysActive: boolean;
  selective: boolean;
  insertionOrder: number;
  enabled: boolean;
  useRegex: boolean;
  assets: string[];
  references: Record<string, string[]>;
  sourceFile: string;
}

export interface WorldIrAsset {
  id: string;
  name: string;
  type: string;
  extension: string;
  sourceFile: string;
  archivePath: string;
}

export interface WorldIR {
  id: string;
  name: string;
  version: string;
  creator: string;
  language: string;
  tags: string[];
  nickname: string;
  source: string[];
  prompts: Record<
    | "description"
    | "personality"
    | "scenario"
    | "firstMessage"
    | "exampleMessages"
    | "creatorNotes"
    | "systemPrompt"
    | "postHistoryInstructions",
    string
  >;
  alternateGreetings: string[];
  groupOnlyGreetings: string[];
  lorebook: { scanDepth: number; tokenBudget: number; recursiveScanning: boolean };
  module: { name: string; description: string; id: string };
  risuai: {
    lowLevelAccess: boolean;
    defaultVariables: string;
    prebuiltAssetCommand: string;
    prebuiltAssetExclude: string[];
    prebuiltAssetStyle: string;
    toggles: Record<string, unknown>;
  };
  tokenCheck: {
    encoding: "o200k_base" | "cl100k_base" | "p50k_base" | "r50k_base";
    warnAt: number;
    errorAt: number;
  };
  entities: WorldIrEntity[];
  assets: WorldIrAsset[];
}

export interface TokenSection {
  id: string;
  kind: "prompt" | WorldEntityKind;
  name: string;
  tokens: number;
}

export interface TokenReport {
  encoding: WorldIR["tokenCheck"]["encoding"];
  total: number;
  archiveTextTokens: number;
  warnAt: number;
  errorAt: number;
  status: "ok" | "warning" | "error";
  sections: TokenSection[];
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
