import fs from "node:fs";
import path from "node:path";
import { parseProjectConfig, parseWorkspaceConfig, type WorkspaceConfig } from "@charx/project-schema";
import type { ProjectContext } from "./types.ts";
import { ensureDir, readJson, writeJson } from "./utils.ts";

export function loadWorkspace(workspaceRoot: string): WorkspaceConfig {
  return parseWorkspaceConfig(readJson(path.join(workspaceRoot, "charx.workspace.json")));
}

export function listProjects(workspaceRoot: string): { id: string; path: string; kind: string }[] {
  const workspace = loadWorkspace(workspaceRoot);
  return Object.entries(workspace.projects).map(([id, relative]) => {
    const config = parseProjectConfig(readJson(path.join(workspaceRoot, relative, "charx.project.json")));
    return { id, path: relative, kind: config.kind };
  });
}

export function resolveProject(workspaceRoot: string, requestedProject?: string): ProjectContext {
  const workspace = loadWorkspace(workspaceRoot);
  const projectId = requestedProject ?? workspace.defaultProject;
  const relativeRoot = workspace.projects[projectId];
  if (!relativeRoot)
    throw new Error(
      `Unknown project '${projectId}'. Available: ${Object.keys(workspace.projects).join(", ")}`,
    );
  const projectRoot = path.resolve(workspaceRoot, relativeRoot);
  const configPath = path.join(projectRoot, "charx.project.json");
  if (!fs.existsSync(configPath)) throw new Error(`Missing project config: ${configPath}`);
  const config = parseProjectConfig(readJson(configPath));
  return {
    workspaceRoot,
    projectId,
    projectRoot,
    config,
    worldDir: path.resolve(projectRoot, config.worldDir),
    sourceDir: path.resolve(projectRoot, config.sourceDir),
    generatedDir: path.resolve(projectRoot, config.generatedDir),
    stateDir: path.resolve(projectRoot, config.stateDir),
  };
}

export function registerExampleProject(
  workspaceRoot: string,
  projectId: string,
  sourceCharx: string,
): ProjectContext {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(projectId)) {
    throw new Error("Project id must contain only lowercase letters, numbers, and hyphens");
  }
  const workspacePath = path.join(workspaceRoot, "charx.workspace.json");
  const workspace = loadWorkspace(workspaceRoot);
  if (workspace.projects[projectId]) throw new Error(`Project '${projectId}' already exists`);
  if (!fs.existsSync(sourceCharx)) throw new Error(`CharX not found: ${sourceCharx}`);
  const relativeRoot = `projects/examples/${projectId}`;
  const projectRoot = path.join(workspaceRoot, relativeRoot);
  const referenceRelative = "reference/source.charx";
  const reference = path.join(projectRoot, referenceRelative);
  ensureDir(path.dirname(reference));
  fs.copyFileSync(sourceCharx, reference);
  writeJson(path.join(projectRoot, "charx.project.json"), {
    format: "risuai-charx-world-project",
    formatVersion: 1,
    kind: "example",
    structure: "decompiled",
    worldDir: "world",
    stateDir: ".charx",
    referenceCharx: referenceRelative,
    outputCharx: `dist/${projectId}.charx`,
    exactOutputCharx: `dist/${projectId}.exact.charx`,
  });
  workspace.projects[projectId] = relativeRoot;
  writeJson(workspacePath, workspace);
  return resolveProject(workspaceRoot, projectId);
}
