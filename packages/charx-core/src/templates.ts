import fs from "node:fs";
import path from "node:path";
import { internalLoreToCcv3 } from "./lore.ts";
import { listFiles, readJson } from "./utils.ts";

export interface TemplateContext {
  internalLorebook: Record<string, any>[];
}

export function resolveTemplate(value: unknown, baseDir: string, context: TemplateContext): any {
  if (Array.isArray(value)) return value.map((item) => resolveTemplate(item, baseDir, context));
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, any>;
  const keys = Object.keys(record);
  if (keys.length === 1 && keys[0] === "$text")
    return fs.readFileSync(path.join(baseDir, record.$text), "utf8");
  if (keys.length === 1 && keys[0] === "$textArray") {
    return listFiles(path.join(baseDir, record.$textArray), "**/*.md").map((file) =>
      fs.readFileSync(file, "utf8"),
    );
  }
  if (keys.length === 1 && keys[0] === "$json") return readJson(path.join(baseDir, record.$json));
  if (keys.length === 1 && keys[0] === "$orderedJson") {
    const directory = path.join(baseDir, record.$orderedJson);
    return readJson<string[]>(path.join(directory, "order.json")).map((file) =>
      readJson(path.join(directory, file)),
    );
  }
  if (keys.length === 1 && keys[0] === "$internalLorebook") return context.internalLorebook;
  if (keys.length === 1 && keys[0] === "$ccv3Lorebook")
    return context.internalLorebook.map(internalLoreToCcv3);
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(record)) result[key] = resolveTemplate(item, baseDir, context);
  return result;
}
