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
