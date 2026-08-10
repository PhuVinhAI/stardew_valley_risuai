import fs from "node:fs";
import path from "node:path";
import { readJson, slugify, writeJson, writeText } from "./utils.ts";

function folderId(value: unknown): string | null {
  return String(value ?? "").match(/folder:([0-9a-f-]+)/i)?.[1] ?? null;
}

export function internalLoreToCcv3(lore: Record<string, any>): Record<string, unknown> {
  const extensions = structuredClone(lore.extentions ?? {});
  extensions.risu_activationPercent = lore.activationPercent;
  extensions.risu_loreCache = lore.loreCache;
  const result = {
    keys: String(lore.key ?? "")
      .split(",")
      .map((item) => item.trim()),
    secondary_keys: lore.selective
      ? String(lore.secondkey ?? "")
          .split(",")
          .map((item) => item.trim())
      : undefined,
    content: lore.content,
    extensions,
    enabled: true,
    insertion_order: lore.insertorder,
    constant: lore.alwaysActive,
    selective: lore.selective,
    name: lore.comment,
    comment: lore.comment,
    case_sensitive: extensions.risu_case_sensitive ?? false,
    use_regex: lore.useRegex ?? false,
    mode: lore.mode ?? "normal",
    folder: lore.folder,
  };
  return JSON.parse(JSON.stringify(result)) as Record<string, unknown>;
}

export interface CharacterIndexEntry {
  name: string;
  source: string;
  assets?: string[];
}

export function splitLorebook(lorebook: Record<string, any>[], contentDir: string): CharacterIndexEntry[] {
  const folders = new Map<string, string>();
  for (const lore of lorebook) {
    if (lore.mode === "folder") {
      const id = folderId(lore.key);
      if (id) folders.set(id, lore.comment || "folder");
    }
  }
  const characterFolders = new Set(
    [...folders.entries()].filter(([, name]) => name.trim().toLowerCase() === "character").map(([id]) => id),
  );
  const flatCharacterEntries = new Set<number>();
  if (characterFolders.size === 0) {
    let insideCharacterSection = false;
    lorebook.forEach((lore, index) => {
      const comment = String(lore.comment ?? "").trim();
      const isSectionMarker = /^----\s*<.*>\s*----$/u.test(comment);
      if (isSectionMarker) {
        insideCharacterSection = /\b(?:npc|characters?)\b/i.test(comment);
      } else if (insideCharacterSection && lore.mode !== "folder") {
        flatCharacterEntries.add(index);
      }
    });
  }
  const order: string[] = [];
  const characters: CharacterIndexEntry[] = [];
  const used = new Set<string>();

  lorebook.forEach((lore, index) => {
    const parentId = folderId(lore.folder);
    const parentName = folders.get(parentId ?? "") || "root";
    const hasProfileKey = /(?:^|[_-])profile(?:[_-]|$)/i.test(String(lore.key ?? ""));
    const isCharacter =
      lore.mode !== "folder" &&
      ((parentId !== null && characterFolders.has(parentId)) ||
        flatCharacterEntries.has(index) ||
        hasProfileKey);
    const label = lore.comment || lore.key || `entry-${index + 1}`;
    const baseName = `${String(index + 1).padStart(3, "0")}-${slugify(label, `entry-${index + 1}`)}`;
    let relativeDir = isCharacter
      ? `characters/${baseName}`
      : `lorebook/${slugify(parentName, "root")}/${baseName}`;
    while (used.has(relativeDir)) relativeDir += "-copy";
    used.add(relativeDir);

    const absoluteDir = path.join(contentDir, relativeDir);
    const template = structuredClone(lore);
    writeText(path.join(absoluteDir, "content.md"), String(lore.content ?? ""));
    template.content = { $text: "content.md" };
    writeJson(path.join(absoluteDir, "entry.template.json"), template);
    const source = `${relativeDir}/entry.template.json`;
    order.push(source);
    if (isCharacter) characters.push({ name: lore.comment || `Character ${index + 1}`, source });
  });
  writeJson(path.join(contentDir, "lore-order.json"), order);
  writeJson(path.join(contentDir, "characters", "index.json"), characters);
  return characters;
}

export function readLorebook(contentDir: string): Record<string, any>[] {
  const order = readJson<string[]>(path.join(contentDir, "lore-order.json"));
  return order.map((relative) => {
    const templatePath = path.join(contentDir, relative);
    const template = readJson<Record<string, any>>(templatePath);
    if (template.content && typeof template.content === "object" && "$text" in template.content) {
      template.content = fs.readFileSync(
        path.join(path.dirname(templatePath), String(template.content.$text)),
        "utf8",
      );
    }
    return template;
  });
}
