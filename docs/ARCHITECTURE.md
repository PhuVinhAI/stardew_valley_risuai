# Architecture

The workspace deliberately separates human/agent authoring concepts from RisuAI transport details.

```text
apps/cli                 validation, token reports, compile, import, verify
apps/viewer              read-only Svelte browser for people
packages/project-schema  Zod schemas for both project modes and authoring entities
packages/risum-codec     RisuM container and RPack codec
packages/charx-core      WorldIR loader, compiler, CharX archive, viewer catalog
projects                 primary authoring worlds and imported fixtures
```

## Authoring projects

`source/` is canonical. YAML carries identity, activation hints, and stable references; Markdown carries prose. The loader validates everything and creates `WorldIR`. The RisuAI adapter then emits CCv3 lore entries, `card.json`, `module.risum`, embedded asset paths, and metadata.

`generated/` is inspectable compiler output and `dist/` contains CharX archives. Both are disposable and excluded from Git.

## Decompiled examples

`projects/examples/*/world` preserves imported ordering, text bytes, RisuAI fields, and archive metadata. Template directives keep large text editable while retaining a lossless rebuild. This mode exists for analysis and regression testing, not as the recommended authoring API.

## Soft-canon roleplay

WorldIR stores knowledge, not a game state machine. Characters, places, lore, relationships, schedules, systems, and events all compile to context entries. Only characters and general world knowledge are expected in most projects. The other entity kinds are optional hints and must remain descriptive unless the user explicitly requests simulation mechanics.
