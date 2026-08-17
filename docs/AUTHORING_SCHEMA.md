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
|-- presentation/greetings/{alternate,group-only}/*.md
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

## Token gate

`world.yaml` configures an OpenAI tiktoken encoding plus warning/error thresholds. `bun run charx tokens --project <id>` reports unique effective text and serialized card/module text, with the largest sections first. Authoring builds fail when the configured error threshold is reached.
