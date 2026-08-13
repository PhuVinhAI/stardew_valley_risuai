# RisuAI Multi-Character World Workspace

A Bun + TypeScript workspace for agents to author open-ended roleplay worlds and compile Character Card v3 `.charx` archives for RisuAI. People inspect content through a read-only Svelte viewer; agents work with YAML, Markdown, stable ids, and assets.

## Two source models

```text
projects/
|-- stardew-valley/             authoring source: YAML + Markdown + assets
`-- examples/                   lossless decompiled CharX fixtures
    |-- danganronpa-her/
    |-- haewol-island/
    `-- welcome-to-seikan/
```

Imported examples retain low-level CharX structure so they can round-trip exactly. New worlds do not copy that structure. They compile through a canonical `WorldIR`, so authors never manage RisuAI UUIDs, embedded URIs, archive ordering, or `x_meta` by hand.

Raw and generated `.charx` files are excluded from Git.

## Authoring pipeline

```text
YAML + Markdown + assets
          |
          v
      canonical WorldIR
          |
          v
  CCv3 card + RisuM module + generated metadata
          |
          v
        .charx
```

The world model is intentionally soft. Character personalities, relationships, locations, and setting knowledge provide roleplay context. Schedules, events, and systems are optional and must not force a game-like plot or predetermined outcome.

## Commands

```powershell
bun install --frozen-lockfile

bun run charx projects
bun run charx check --project stardew-valley
bun run charx tokens --project stardew-valley
bun run charx build --project stardew-valley

bun run viewer:data
bun run viewer

bun run check
bun run viewer:build
```

Add another imported reference:

```powershell
bun run charx add-example "C:\path\to\reference.charx" --id example-id --risuai ../Risuai
```

See [docs/AUTHORING_SCHEMA.md](docs/AUTHORING_SCHEMA.md) for the source contract and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for package boundaries. [docs/CANON_NOTES.md](docs/CANON_NOTES.md) records canon grounding decisions and open items; read it before changing character prose to match a raw game-data field.
