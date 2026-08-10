# Agent workflow

## Before authoring

1. Read root `AGENTS.md`.
2. Confirm the target project id with `bun run charx projects`.
3. Inspect the example project to learn structure; do not copy its setting-specific content.
4. Gather the user's canon, cast list, boundaries, desired gameplay loop, and available media.

## Recommended build order for a world

1. World premise and system constraints in `card/prompts/`.
2. Folder/category lore entries.
3. One character directory per cast member.
4. Locations, schedules, relationships, progression, and event rules.
5. RisuAI regex/trigger behaviors.
6. Assets and `x_meta` records.
7. Alternate greetings and scenario variants.
8. Validation, build, viewer catalog, and user review.

The primary Stardew Valley project currently contains only the empty valid scaffold. It should remain empty until the user provides or approves the actual design direction.
