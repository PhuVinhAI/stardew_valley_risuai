# Agent authoring contract

This is an agent-first RisuAI CharX workspace. People primarily inspect content through `apps/viewer`; agents create and maintain world source.

## Project modes

- `projects/stardew-valley` is the primary `authoring` project. It is intentionally content-empty until the design phase begins.
- `projects/examples/*` are `decompiled` lossless fixtures. Do not reformat or reinterpret them.
- Never copy example lore, characters, prompts, or assets into another project merely to fill a scaffold.
- Every content-changing CLI operation must name the project with `--project`.

## Authoring principles

1. Write stable kebab-case ids such as `abigail` and `pelican-town`; never author UUIDs, `embeded://` URIs, `x_meta`, `card.json`, or `module.risum` by hand.
2. Keep prose in Markdown and metadata/references in YAML.
3. Treat canon as a flexible roleplay foundation, not a deterministic game simulation. Schedules, systems, events, and relationships are optional context, not hard rails.
4. Prefer personality, motives, social context, places, and open-ended situations over quest steps, fixed timelines, or forced outcomes.
5. Do not invent facts when source material is missing. Leave an explicit TODO or report the gap.
6. Reference entities and assets only by stable id. The compiler validates references and generates transport metadata.
7. Keep generated files out of source control. `.charx`, `generated/`, and `dist/` are build products.

## Required validation

```powershell
bun run typecheck
bun test
bun run lint
bun run charx check --project <project-id>
bun run charx tokens --project <project-id>
bun run charx build --project <project-id>
bun run viewer:data
bun run viewer:build
```

For an unchanged imported reference, also run `bun run charx verify --project <example-id>`.
