# Agent authoring contract

This is an agent-first, multi-project RisuAI CharX workspace. People primarily inspect content through `apps/viewer`; agents create and maintain world source.

## Scope and project selection

- `projects/stardew-valley` is the default primary project. It is intentionally empty until the user starts the Stardew Valley design phase.
- `projects/examples/danganronpa-her` is a read-only behavioral/reference example unless the user explicitly requests changes to it.
- Never copy example lore, characters, or Danganronpa assets into Stardew Valley merely to fill the scaffold.
- Every CLI operation that can affect content must name the project with `--project`.

## Authoring rules

1. Keep large prose in Markdown, not inside generated `card.json`.
2. Create one directory per character or lore entry with `entry.template.json` and `content.md`.
3. Update `content/lore-order.json` whenever entries are added, removed, or reordered.
4. Put regex and triggers in separate ordered JSON files and update their `order.json` manifests.
5. Put media beneath `world/assets/` using its final CharX path; add the CCv3 record to `card/assets.json` and matching metadata to `world/x_meta/`.
6. Do not manually create `card.json` or `module.risum`; they are compiler outputs.
7. Do not reformat imported example world data. Its exact property order and text bytes are intentional for lossless round trips.
8. Do not invent character facts when the user's source material is missing. Leave explicit TODOs or report the missing source.

## Required validation

For normal source changes:

```powershell
bun run typecheck
bun test
bun run lint
bun run charx check --project <project-id>
bun run charx build --project <project-id>
bun run viewer:data
bun run viewer:build
```

For the Danganronpa reference, also run:

```powershell
bun run verify
```

The example must remain entry-identical unless the user explicitly asks to modify it.
