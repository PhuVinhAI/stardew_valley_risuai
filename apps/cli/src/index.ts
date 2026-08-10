import fs from "node:fs";
import path from "node:path";
import {
  buildProject,
  checkProject,
  importCharx,
  importMudPortraits,
  importOoPortraits,
  inspectCharx,
  listProjects,
  projectTokenReport,
  projectViewerData,
  registerExampleProject,
  reindexCharacterAssets,
  resolveProject,
  scaffoldProject,
  verifyProject,
  writeExampleReadme,
} from "@charx/core";
import { Command } from "commander";
import { consola } from "consola";
import pc from "picocolors";

const workspaceRoot = path.resolve(import.meta.dir, "../../..");
const program = new Command()
  .name("charx")
  .description("Agent-first RisuAI multi-project world authoring CLI")
  .version("1.0.0");

program
  .command("import-oo-portraits")
  .description("Split OO anime portrait sheets and create non-destructive 2x RisuAI derivatives")
  .requiredOption("--project <id>", "Workspace project id")
  .requiredOption("--pack <path>", "OO Anime Style Skimpy Portraits pack directory")
  .action(async (options: { project: string; pack: string }) => {
    const context = resolveProject(workspaceRoot, options.project);
    const report = await importOoPortraits(context, path.resolve(options.pack));
    consola.success(
      `Imported ${report.summary.characters} characters, ${report.summary.outfitVariants} outfits, ${report.summary.expressionImages} expressions in original and 2x variants`,
    );
    consola.info(`Preferred RisuAI variant: ${report.preferredVariant}`);
    consola.info(`Local-only asset root: ${report.outputRoot}`);
  });

program
  .command("import-mud-portraits")
  .description("Split Mud portrait sheets into standalone lossless WebP assets for an authoring project")
  .requiredOption("--project <id>", "Workspace project id")
  .requiredOption("--volume-1 <path>", "Mud Skimpy Portraits volume 1 directory")
  .requiredOption("--volume-2 <path>", "Mud Skimpy Portraits volume 2 directory")
  .action(async (options: { project: string; volume1: string; volume2: string }) => {
    const context = resolveProject(workspaceRoot, options.project);
    const report = await importMudPortraits(
      context,
      path.resolve(options.volume1),
      path.resolve(options.volume2),
    );
    consola.success(
      `Imported ${report.summary.characters} characters, ${report.summary.outfitVariants} outfits, ${report.summary.expressionImages} standalone expressions`,
    );
    consola.info(`Local-only asset root: ${report.outputRoot}`);
  });

program
  .command("tokens")
  .description("Count effective world text with an OpenAI tiktoken encoding before using it in RisuAI")
  .requiredOption("--project <id>", "Workspace project id")
  .option("--top <count>", "Number of largest sections to print", "20")
  .action((options: { project: string; top: string }) => {
    const report = projectTokenReport(resolveProject(workspaceRoot, options.project));
    const top = Math.max(1, Number.parseInt(options.top, 10) || 20);
    console.log(`Encoding: ${report.encoding}`);
    console.log(`Effective unique text: ${report.total.toLocaleString("en-US")} tokens`);
    console.log(`Serialized card + module text: ${report.archiveTextTokens.toLocaleString("en-US")} tokens`);
    console.log(`Budget status: ${report.status} (warn ${report.warnAt}, error ${report.errorAt})`);
    console.log("");
    for (const section of report.sections.slice(0, top)) {
      console.log(
        `${String(section.tokens).padStart(8)}  ${section.kind.padEnd(12)}  ${section.id}  ${section.name}`,
      );
    }
    if (report.status === "error") process.exitCode = 1;
  });

program
  .command("projects")
  .description("List all CharX projects in the workspace")
  .action(() => {
    for (const project of listProjects(workspaceRoot))
      console.log(`${project.id}\t${project.kind}\t${project.path}`);
  });

program
  .command("import")
  .description("Import a reference CharX into an example/primary project source tree")
  .argument("[charx]", "CharX file; defaults to the project's referenceCharx")
  .requiredOption("--project <id>", "Workspace project id")
  .requiredOption("--risuai <path>", "RisuAI source checkout containing src/ts/rpack/rpack_map.bin")
  .action((charx: string | undefined, options: { project: string; risuai: string }) => {
    const context = resolveProject(workspaceRoot, options.project);
    const input = charx
      ? path.resolve(workspaceRoot, charx)
      : context.config.referenceCharx
        ? path.resolve(context.projectRoot, context.config.referenceCharx)
        : undefined;
    if (!input) throw new Error("Import needs a CharX argument or project referenceCharx");
    importCharx(context, input, path.resolve(workspaceRoot, options.risuai));
    consola.success(`Imported ${pc.cyan(context.projectId)} into ${context.worldDir}`);
  });

program
  .command("add-example")
  .description("Register, copy, and decompose a new reference CharX example")
  .argument("<charx>", "Reference CharX file")
  .option("--id <id>", "Project id; defaults to a slug derived from card name")
  .requiredOption("--risuai <path>", "RisuAI source checkout containing the RPack map")
  .action((charx: string, options: { id?: string; risuai: string }) => {
    const input = path.resolve(workspaceRoot, charx);
    const report = inspectCharx(input) as { sha256?: string; card?: { name?: string } };
    const derived = String(report.card?.name ?? "example")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const projectId = options.id ?? (derived || `example-${String(report.sha256 ?? "unknown").slice(0, 8)}`);
    const context = registerExampleProject(workspaceRoot, projectId, input);
    const reference = path.resolve(context.projectRoot, context.config.referenceCharx ?? "");
    importCharx(context, reference, path.resolve(workspaceRoot, options.risuai));
    consola.success(`Added example ${pc.cyan(projectId)} (${report.card?.name ?? "unknown"})`);
  });

program
  .command("scaffold")
  .description("Create an agent-ready empty world project")
  .requiredOption("--project <id>", "Workspace project id")
  .requiredOption("--name <name>", "Top-level character/world name")
  .requiredOption("--risuai <path>", "RisuAI source checkout containing the RPack map")
  .action((options: { project: string; name: string; risuai: string }) => {
    const context = resolveProject(workspaceRoot, options.project);
    scaffoldProject(context, options.name, path.resolve(workspaceRoot, options.risuai));
    const target = context.config.structure === "authoring" ? context.sourceDir : context.worldDir;
    consola.success(`Scaffolded ${pc.cyan(context.projectId)} at ${target}`);
  });

program
  .command("check")
  .description("Validate project schema, references, assets, and archive manifest")
  .requiredOption("--project <id>", "Workspace project id")
  .action((options: { project: string }) => {
    const report = checkProject(resolveProject(workspaceRoot, options.project));
    for (const warning of report.warnings) consola.warn(warning);
    if (report.errors.length) {
      for (const error of report.errors) consola.error(error);
      process.exitCode = 1;
      return;
    }
    consola.success(
      `${report.stats.name}: ${report.stats.characters} characters, ${report.stats.loreEntries} lore entries, ${report.stats.assets} assets`,
    );
  });

program
  .command("check-all")
  .description("Validate every registered primary and example project")
  .action(() => {
    let failed = false;
    for (const project of listProjects(workspaceRoot)) {
      const report = checkProject(resolveProject(workspaceRoot, project.id));
      for (const warning of report.warnings) consola.warn(`${project.id}: ${warning}`);
      if (report.errors.length) {
        failed = true;
        for (const error of report.errors) consola.error(`${project.id}: ${error}`);
      } else {
        consola.success(
          `${project.id}: ${report.stats.characters} characters, ${report.stats.assets} assets`,
        );
      }
    }
    if (failed) process.exitCode = 1;
  });

program
  .command("reindex")
  .description("Refresh derived character-to-asset indexes without changing CharX output")
  .requiredOption("--project <id>", "Workspace project id")
  .action((options: { project: string }) => {
    const count = reindexCharacterAssets(resolveProject(workspaceRoot, options.project));
    consola.success(`Reindexed assets for ${count} characters in ${options.project}`);
  });

program
  .command("build")
  .description("Compile the selected project into a RisuAI CharX archive")
  .requiredOption("--project <id>", "Workspace project id")
  .option("--exact", "Copy the reference byte-for-byte when the source is unchanged")
  .action((options: { project: string; exact?: boolean }) => {
    const result = buildProject(resolveProject(workspaceRoot, options.project), Boolean(options.exact));
    consola.success(`Built ${pc.cyan(result.output)}`);
    if (result.comparison) {
      consola.info(
        `Entry-identical: ${result.comparison.entryIdentical}; byte-identical: ${result.comparison.byteIdentical}`,
      );
      if (!result.comparison.entryIdentical) process.exitCode = 1;
    }
  });

program
  .command("verify")
  .description("Compare generated archive entries with the imported reference")
  .requiredOption("--project <id>", "Workspace project id")
  .action((options: { project: string }) => {
    const result = verifyProject(resolveProject(workspaceRoot, options.project));
    console.log(JSON.stringify(result, null, 2));
    if (!result.entryIdentical) process.exitCode = 1;
  });

program
  .command("inspect")
  .description("Print a compact structural report for a CharX file")
  .argument("<charx>", "CharX path")
  .action((charx: string) =>
    console.log(JSON.stringify(inspectCharx(path.resolve(workspaceRoot, charx)), null, 2)),
  );

program
  .command("catalog")
  .description("Generate the read-only Svelte viewer catalog for every initialized project")
  .option("--output <path>", "Catalog output path", "apps/viewer/public/catalog.json")
  .action((options: { output: string }) => {
    const projects = [];
    for (const project of listProjects(workspaceRoot)) {
      try {
        projects.push(projectViewerData(resolveProject(workspaceRoot, project.id)));
      } catch (error) {
        consola.warn(`Skipping ${project.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    const output = path.resolve(workspaceRoot, options.output);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(
      output,
      `${JSON.stringify({ generatedAt: new Date().toISOString(), projects }, null, 2)}\n`,
    );
    consola.success(`Viewer catalog: ${output}`);
  });

program
  .command("docs")
  .description("Generate browsable README files for every example project")
  .action(() => {
    const examples = listProjects(workspaceRoot).filter((project) => project.kind === "example");
    for (const project of examples) writeExampleReadme(resolveProject(workspaceRoot, project.id));
    const rows = examples.map((project) => {
      const report = checkProject(resolveProject(workspaceRoot, project.id));
      return `| [${report.stats.name}](${project.id}/) | ${report.stats.characters} | ${report.stats.loreEntries} | ${report.stats.assets} |`;
    });
    const index = [
      "# Imported CharX examples",
      "",
      "These projects are losslessly decomposed references for agents and read-only examples for users.",
      "",
      "| Project | Characters | Lore | Assets |",
      "| --- | ---: | ---: | ---: |",
      ...rows,
      "",
      "Run `bun run viewer:data && bun run viewer` for the visual browser.",
      "",
    ].join("\n");
    fs.writeFileSync(path.join(workspaceRoot, "projects", "examples", "README.md"), index);
    consola.success(`Generated documentation for ${examples.length} examples`);
  });

program
  .command("clean")
  .description("Remove generated build output, temporary import caches, and unused viewer scaffold assets")
  .action(() => {
    const candidates = [
      ...listProjects(workspaceRoot).flatMap((project) => {
        const context = resolveProject(workspaceRoot, project.id);
        return [
          path.join(context.projectRoot, "dist"),
          path.join(context.projectRoot, "generated"),
          path.join(context.stateDir, "cache"),
        ];
      }),
      path.join(workspaceRoot, "apps", "viewer", "dist"),
      path.join(workspaceRoot, "apps", "viewer", "src", "assets"),
      path.join(workspaceRoot, "tools"),
    ];
    for (const candidate of candidates) {
      const resolved = path.resolve(candidate);
      if (!resolved.startsWith(`${workspaceRoot}${path.sep}`))
        throw new Error(`Unsafe cleanup target: ${resolved}`);
      if (fs.existsSync(resolved)) {
        fs.rmSync(resolved, { recursive: true, force: true });
        consola.info(`Removed ${resolved}`);
      }
    }
    consola.success("Workspace build/cache cleanup complete; local reference CharX files were preserved");
  });

program.parseAsync().catch((error: unknown) => {
  consola.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
