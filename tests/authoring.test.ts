import { describe, expect, test } from "bun:test";
import path from "node:path";
import { compileAuthoringSources, countBuiltSourceTokens, loadWorldIR, resolveProject } from "@charx/core";

const workspaceRoot = process.cwd();
const primary = resolveProject(workspaceRoot, "stardew-valley");
const fixtureRoot = path.join(workspaceRoot, "tests", "fixtures", "minimal-world");
const context = {
  ...primary,
  projectId: "minimal-world",
  projectRoot: fixtureRoot,
  sourceDir: path.join(fixtureRoot, "source"),
  generatedDir: path.join(fixtureRoot, "generated"),
};

describe("agent authoring source", () => {
  test("loads stable ids into canonical WorldIR", () => {
    const ir = loadWorldIR(context);
    expect(ir.id).toBe("minimal-world");
    expect(ir.entities.map((entity) => [entity.id, entity.kind])).toEqual([["example-person", "character"]]);
  });

  test("compiles CCv3/RisuM and counts OpenAI tokens", () => {
    const built = compileAuthoringSources(context, false);
    expect(built.card.spec).toBe("chara_card_v3");
    expect(built.card.data.character_book.entries).toHaveLength(1);
    expect(built.moduleWrapper.module.lorebook).toHaveLength(1);
    const report = countBuiltSourceTokens(built, built.ir.tokenCheck);
    expect(report.total).toBeGreaterThan(0);
    expect(report.status).toBe("ok");
  });
});
