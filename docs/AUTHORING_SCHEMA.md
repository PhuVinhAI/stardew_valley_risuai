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
  recursiveScanning: false
  fullWordMatching: false
  folders:
    - id: residents
      name: Residents
      kinds: [character]
      insertionOrder: 100
```

`scanDepth` is how many recent messages RisuAI searches for keywords, and `tokenBudget` is how much lore it may insert once they match. The imported reference cards run 6–50 depth against 44k–80k budgets, because a shallow scan drops a resident who was named a few turns ago and a small budget silently discards the rest of a group as soon as one long profile is inserted. Prefer a deep scan with a large budget over trimming keywords.

`recursiveScanning` must stay off in a world that ships an always-active index. With it on, RisuAI feeds each activated entry's own content back into the search and rescans, so an index that deliberately names every resident, place, and festival activates most of the book on the first turn — measured at roughly 77k tokens before the player has said anything. With it off, an entry activates only from text the player and the assistant actually wrote, which is what the index is for: naming a place in prose pulls that place's entry in on the next turn.

`fullWordMatching` must stay off for a bilingual world. RisuAI's word-boundary matcher does not fire reliably on multi-syllable, diacritic-heavy Vietnamese keys such as `quảng trường` or `cửa hàng tổng hợp`; substring matching does. Every reference card disables it too. A bilingual entity therefore carries its English keys and their Vietnamese equivalents in the same `keywords` list — translate the descriptive part (`seed shop` → `cửa hàng hạt giống`) and leave proper names in Latin script.

Entries with `alwaysActive: true` are the only lore the model sees unprompted, so they double as its vocabulary: nothing in the prompt lists the lorebook's keys, and RisuAI matches them in client code before the request is built. `lore/cast-registry` names the residents and `lore/valley-index` names the places, festivals, and households for exactly that reason — each name is a trigger the model can reach for.

Each folder maps whole entity kinds into one RisuAI lorebook group. The compiler emits a `mode: folder` entry with the sentinel key `\uF000folder:<uuid>`, derived from the world id and folder id so rebuilds keep the same grouping, then emits that folder's children directly after it with a matching `folder` field. Entities whose kind no folder claims stay ungrouped at the end of the book. Folders carry no text; only entity `content.md` does.

## Start panel

`presentation/start-panel.yaml` declares languages, opening groups, UI strings, and the default language and scenario. Each `presentation/scenarios/<id>/scenario.yaml` declares its group, sort order, preview asset id, and per-language titles, summaries, `tags`, and body files.

The compiler builds the single `first_mes` from the sentinel plus one `{{#when}}` block per scenario per language, and emits two display regex scripts: one that expands the sentinel into the picker panel, and one that turns a `[Scene: ...]` line into chips. Scene tags are written into the message as that plain text line rather than as markup, so the model sees the same shape in the opening message and the example messages and keeps reproducing it. At most six tags per language per scenario, and a tag may not contain `|`, `]`, or a newline.

`bodies` is optional. A scenario that omits it opens on its scene header alone, which is what an open-ended "free start" wants — prose there would be an instruction sheet the model imitates as narration. Such a scenario must declare tags for every language, since the header is all it has.

## Token gate

`world.yaml` configures an OpenAI tiktoken encoding plus warning/error thresholds. `bun run charx tokens --project <id>` reports unique effective text and serialized card/module text, with the largest sections first. Authoring builds fail when the configured error threshold is reached.
