import { get_encoding } from "tiktoken";
import type { BuiltSources, TokenReport, TokenSection, WorldIR } from "./types.ts";

const promptFields = [
  ["description", "Description"],
  ["personality", "Personality"],
  ["scenario", "Scenario"],
  ["first_mes", "First message"],
  ["mes_example", "Example messages"],
  ["creator_notes", "Creator notes"],
  ["system_prompt", "System prompt"],
  ["post_history_instructions", "Post-history instructions"],
] as const;

export function countBuiltSourceTokens(
  built: BuiltSources,
  tokenCheck: WorldIR["tokenCheck"] = { encoding: "o200k_base", warnAt: 100_000, errorAt: 120_000 },
): TokenReport {
  const encoder = get_encoding(tokenCheck.encoding);
  try {
    const sections: TokenSection[] = [];
    for (const [field, name] of promptFields) {
      const value = String(built.card.data?.[field] ?? "");
      sections.push({ id: field, kind: "prompt", name, tokens: encoder.encode(value).length });
    }
    for (const [field, label] of [
      ["alternate_greetings", "Alternate greeting"],
      ["group_only_greetings", "Group-only greeting"],
    ] as const) {
      const greetings = Array.isArray(built.card.data?.[field]) ? built.card.data[field] : [];
      greetings.forEach((greeting: unknown, index: number) => {
        sections.push({
          id: `${field}-${index + 1}`,
          kind: "prompt",
          name: `${label} ${index + 1}`,
          tokens: encoder.encode(String(greeting)).length,
        });
      });
    }
    for (const [index, lore] of built.internalLorebook.entries()) {
      const extensions = lore.extentions ?? {};
      const kind = String(extensions.risu_authoring_kind ?? "lore") as TokenSection["kind"];
      sections.push({
        id: String(extensions.risu_authoring_id ?? `lore-${index + 1}`),
        kind,
        name: String(lore.comment ?? lore.key ?? `Lore ${index + 1}`),
        tokens: encoder.encode(String(lore.content ?? "")).length,
      });
    }
    const scripts = [
      ...(built.moduleWrapper.module.regex ?? []),
      ...(built.moduleWrapper.module.trigger ?? []),
    ];
    if (scripts.length)
      sections.push({
        id: "risuai-scripts",
        kind: "system",
        name: "RisuAI regex and triggers",
        tokens: encoder.encode(JSON.stringify(scripts)).length,
      });
    const total = sections.reduce((sum, section) => sum + section.tokens, 0);
    const archiveTextTokens = encoder.encode(
      `${built.cardData.toString("utf8")}\n${JSON.stringify(built.moduleWrapper)}`,
    ).length;
    return {
      encoding: tokenCheck.encoding,
      total,
      archiveTextTokens,
      warnAt: tokenCheck.warnAt,
      errorAt: tokenCheck.errorAt,
      status: total >= tokenCheck.errorAt ? "error" : total >= tokenCheck.warnAt ? "warning" : "ok",
      sections: sections.sort((left, right) => right.tokens - left.tokens),
    };
  } finally {
    encoder.free();
  }
}
