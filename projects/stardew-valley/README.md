# Stardew Valley roleplay world

This is the primary authoring project for an open-ended Stardew Valley roleplay world, currently shipping as `Stardew Valley - Beta 0.1`.

The goal is a RisuAI world where the user lives and creates new stories with the valley's residents. It is not a deterministic recreation of the game. Canon grounds personalities, relationships, places, culture, and everyday life while leaving time, romance, conflict, and outcomes free to emerge through roleplay.

## How the card is assembled

- `source/world/*.md` are the card's own prompt fields. They address the model and the reader of the card, not this repository.
- `source/presentation/start-panel.yaml` plus `source/presentation/scenarios/<id>/` build the single first message: a language and scene picker, with one opening per scenario per language.
- Each opening begins with a plain `[Scene: season | time | place | who]` line that a display regex renders as chips. `source/world/example-messages.md` repeats the same line and the same narration/dialogue paragraph split so the model keeps writing it.
- `source/world.yaml` sets the lorebook envelope, including the folder groups (Residents, Places, Bonds and Households, Festivals and Seasons, World Rules) and a deep scan with a large token budget.

Optional `schedules` and `systems` directories exist for soft context only. Leave them empty unless a specific roleplay need justifies them.
