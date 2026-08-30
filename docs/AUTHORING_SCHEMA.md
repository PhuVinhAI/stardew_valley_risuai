# Authoring schema

## Project layout

```text
source/
|-- world.yaml
|-- world/*.md
|-- characters/<id>/character.yaml + content.md
|-- locations/<id>/location.yaml + content.md
|-- lore/<id>/lore.yaml + content.md
|-- relationships/<id>/relationship.yaml + content.md   optional
|-- schedules/<id>/schedule.yaml + content.md            optional
|-- systems/<id>/system.yaml + content.md                 optional
|-- events/<id>/event.yaml + content.md                   optional
|-- presentation/start-panel.yaml
|-- presentation/scenarios/<id>/scenario.yaml + <id>.<lang>.md
`-- assets/manifest.yaml + assets/files/**
```

All ids use kebab-case and remain stable across refactors. References use those ids, never generated CharX paths or UUIDs.

Portrait curation is per character and per outfit. A curation file must list only the frames that actually exist for that outfit and may assign different semantic labels to different characters. There is no shared emotion index or required frame count across the cast. Exact duplicate frames are listed under that outfit's `duplicates` and are not emitted as separate assets. Use `unclassified-01` (or another stable `unclassified-*` id) when visual labeling is uncertain.

Set `icon` to a curated frame reference such as `default/expression-00` to emit a character icon. Curated image names use dot-separated RisuAI names such as `example-character.default.pleasant.webp`; archive paths remain generated transport metadata.

## Character example

```yaml
schema: risuai-character/v1
id: example-character
name: Example Character
content: content.md
aliases: []
keywords: [example-character]
alwaysActive: false
relationships: []
locations: []
schedules: []
systems: []
assets: []
```

The adjacent `content.md` should describe identity, personality, motives, speech, boundaries, and useful social context. It should not prescribe a fixed story arc.

Character profiles default to keyword activation rather than loading the entire cast into every turn. A small always-active cast registry may summarize who exists; detailed profiles should activate when their names or aliases are relevant.

## Lorebook folders and activation

`world.yaml` owns the whole lorebook envelope:

```yaml
lorebook:
  scanDepth: 50
  tokenBudget: 60000
  recursiveScanning: true
  folders:
    - id: residents
      name: Residents
      kinds: [character]
      insertionOrder: 100
```

`scanDepth` is how many recent messages RisuAI searches for keywords, and `tokenBudget` is how much lore it may insert once they match. The imported reference cards run 6–50 depth against 44k–80k budgets, because a shallow scan drops a resident who was named a few turns ago and a small budget silently discards the rest of a group as soon as one long profile is inserted. Prefer a deep scan with a large budget over trimming keywords.

Each folder maps whole entity kinds into one RisuAI lorebook group. The compiler emits a `mode: folder` entry with the sentinel key `\uF000folder:<uuid>`, derived from the world id and folder id so rebuilds keep the same grouping, then emits that folder's children directly after it with a matching `folder` field. Entities whose kind no folder claims stay ungrouped at the end of the book. Folders carry no text; only entity `content.md` does.

## Start panel

`presentation/start-panel.yaml` declares languages, opening groups, UI strings, and the default language and scenario. Each `presentation/scenarios/<id>/scenario.yaml` declares its group, sort order, preview asset id, and per-language titles, summaries, `tags`, and body files.

The compiler builds the single `first_mes` from the sentinel plus one `{{#when}}` block per scenario per language, and emits two display regex scripts: one that expands the sentinel into the picker panel, and one that turns a `[Scene: ...]` line into chips. Scene tags are written into the message as that plain text line rather than as markup, so the model sees the same shape in the opening message and the example messages and keeps reproducing it. At most six tags per language per scenario, and a tag may not contain `|`, `]`, or a newline.

## Token gate

`world.yaml` configures an OpenAI tiktoken encoding plus warning/error thresholds. `bun run charx tokens --project <id>` reports unique effective text and serialized card/module text, with the largest sections first. Authoring builds fail when the configured error threshold is reached.
