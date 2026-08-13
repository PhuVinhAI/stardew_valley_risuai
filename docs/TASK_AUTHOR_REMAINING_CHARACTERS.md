# Task: author all remaining Stardew Valley characters with local portrait assets

## Objective

Create the remaining Stardew Valley roleplay characters that already have imported local portrait assets. Abigail is already authored and is the reference for quality and tone. This task creates character source only. Do not attach, copy, rename, curate, describe, or otherwise process portrait images in this task; portrait review and attachment will be performed separately after the character prose is complete.

The result must be an open-ended RisuAI roleplay world, not a deterministic recreation of the Stardew Valley game loop. Characters must feel like people with independent lives, motives, boundaries, relationships, and the ability to surprise the user.

## Characters in scope

Author every unique character below except `abigail`, which already exists.

### Mud portrait pack characters

- `alex`
- `elliott`
- `emily`
- `haley`
- `harvey`
- `leah`
- `maru`
- `penny`
- `sam`
- `sebastian`
- `shane`

### OO anime portrait pack characters

- `caroline`
- `clint`
- `demetrius`
- `evelyn`
- `george`
- `gunther`
- `gus`
- `jodi`
- `kent`
- `lewis`
- `linus`
- `marlon`
- `marnie`
- `morris`
- `pam`
- `pierre`
- `robin`
- `sandy`
- `willy`
- `wizard`

This is 31 new unique character ids. Do not create duplicate ids for the same person merely because they appear in both a source pack or in several outfits. The source pack is an asset provenance detail, not a character identity.

## Required source layout

For each character create:

```text
projects/stardew-valley/source/characters/<id>/
  character.yaml
  content.md
```

Use the existing authoring schema in `docs/AUTHORING_SCHEMA.md` and the Abigail files as the structural reference:

- `schema: risuai-character/v1`
- stable kebab-case `id`
- canonical display `name`
- `content: content.md`
- useful aliases and keywords
- no hand-written UUIDs, `embeded://` URIs, `x_meta`, `card.json`, or `module.risum`
- leave `assets: []` for this task
- do not add image ids to `character.yaml`

## Canon research requirements

Use the installed game data at:

```text
C:\Users\tomis\Downloads\Stardew-Valley-AnkerGames\Stardew Valley
```

The confirmed game version is Stardew Valley `1.6.15.24356`.

For every character, read the complete locally extracted relevant corpus before writing prose. Use the canon extraction command with the project explicitly named, or inspect the existing local research corpus if it already exists:

```powershell
bun run charx extract-canon --project stardew-valley --game "C:\Users\tomis\Downloads\Stardew-Valley-AnkerGames\Stardew Valley" --character "<Canonical Name>"
```

Read all matching/full sources available for that character, including where applicable:

- normal dialogue;
- marriage dialogue and engagement dialogue;
- schedule text, but only as soft context;
- event and heart-event participation;
- festival dialogue;
- gift tastes and reactions;
- movie, resort, desert festival, and 1.6 additions;
- strings that name, describe, or reference the character;
- dialogue by family members, friends, and other NPCs that reveals the character;
- quests, secret notes, animations, and other direct character references.

Do not use wiki summaries as a substitute when game data is available. Do not paste raw XNB JSON, extracted dialogue blocks, or copyrighted game dialogue into `content.md`.

If a source is unreadable or the data does not establish a fact, do not guess. Record a short `TODO` or an explicit uncertainty in the character source rather than inventing canon.

## Required content for every character

Each `content.md` must be original prose and cover, at minimum:

1. Identity and current life
   - home/community role;
   - work, study, craft, or responsibilities;
   - important personal possessions, pets, or routines only when canon supports them.

2. Personality
   - stable traits and contradictions;
   - what energizes, frustrates, embarrasses, or comforts them;
   - how they behave when relaxed, stressed, hurt, excited, or angry.

3. Motives and inner life
   - wants, fears, conflicts, ambitions, coping patterns, and blind spots;
   - what they are trying to change or protect;
   - what they keep private and what earns trust.

4. Skills, interests, and limitations
   - hobbies, work skills, creative or practical abilities;
   - realistic limits, anxieties, vulnerabilities, and mistakes;
   - do not turn a character into a list of game mechanics.

5. Voice and behavior
   - sentence rhythm, directness, humor, formality, verbal habits, and emotional tells;
   - how their speech changes with strangers, friends, family, conflict, and intimacy;
   - write behavioral guidance, not copied dialogue.

6. Relationships and social context
   - family, close friends, rivals, coworkers, neighbors, and meaningful social tensions;
   - describe relationships as dynamic and mutual, not as static relationship meters;
   - only reference ids of entities that actually exist, or keep the relationship in prose until a later pass.

7. Roleplay agency and boundaries
   - the user is not automatically the Farmer, friend, romantic partner, spouse, employer, or savior;
   - the character can initiate, disagree, refuse, leave, change their mind, ask for space, and pursue goals away from the user;
   - romance and intimacy must develop through roleplay and clear mutual adult consent;
   - nudity never implies consent.

8. Flexible canon handling
   - schedules, festivals, heart events, marriage routes, quests, and game progression are optional context;
   - do not force a calendar, heart-level progression, quest chain, or fixed ending;
   - preserve canon motivations while allowing original stories and alternate user roles.

## Appearance rule for this task

Do not write an appearance section based on memory, wiki text, or portrait filenames during this task.

For each new character, add this exact placeholder at the end of `content.md`:

```md
## Portrait audit

TODO: describe appearance only after the portrait-audit pass has visually reviewed every available outfit and expression for this character. Do not infer appearance from canon text or asset filenames alone.
```

Do not add any portrait asset ids, outfit ids, expression labels, or image references to the character source yet. The later portrait pass will:

- inspect every frame visually;
- detect exact and near duplicates per character and per outfit;
- preserve the actual number of frames each outfit contains;
- create semantic labels only when visually justified;
- use `unclassified-*` when uncertain;
- write a per-character/per-outfit curation manifest;
- copy or expose only the intended local assets;
- keep nude assets private, adult-only, consent-gated, and disabled by default where applicable.

Never assume all characters have the same number of expressions or the same emotion ordering. Counts must come from the actual character/outfit assets.

## What not to build

- no hard-coded game simulator;
- no mandatory schedules or deterministic daily routes;
- no heart-level variables unless a later design explicitly requires them;
- no forced Farmer identity for the user;
- no copied game dialogue;
- no wiki-derived appearance descriptions;
- no portrait attachment or asset renaming in this task;
- no raw game corpus committed to Git;
- no `.charx`, `generated/`, or `dist/` output committed;
- no edits to `projects/examples/*` fixtures.

## Recommended implementation order

1. Read `AGENTS.md`, `docs/AUTHORING_SCHEMA.md`, Abigail's source, and this task file.
2. Inventory the 31 target ids and confirm the corresponding imported local portrait catalogs exist. Do not modify those catalogs in this pass.
3. Extract/read each character's full game corpus before authoring that character.
4. Author characters in coherent social groups so family and friendship context stays consistent:
   - Pierre / Caroline / Abigail;
   - Robin / Demetrius / Maru / Sebastian;
   - Jodi / Kent / Sam / Vincent context;
   - Pam / Penny;
   - Marnie / Lewis / Shane context;
   - the remaining town, shop, museum, mine, beach, and wizard characters.
5. Create only `character.yaml` and `content.md` for each target character.
6. Run the required validation commands.
7. Review token totals before build.
8. Leave portrait attachment for the separate visual audit task.

## Validation requirements

Run from the repository root:

```powershell
bun run typecheck
bun test
bun run lint
bun run charx check --project stardew-valley
bun run charx tokens --project stardew-valley
bun run charx build --project stardew-valley
bun run viewer:data
bun run viewer:build
```

The project check must report 32 characters total after this task: Abigail plus 31 new characters. Asset count may remain unchanged for the authored source because portrait attachment is intentionally deferred. Build output is local verification only and must be removed before commit.

## Completion criteria

The task is complete only when:

- all 31 ids above have valid source files;
- every character was grounded in the installed game's extracted data;
- no raw dialogue was copied into authored prose;
- every character has agency, boundaries, motives, social context, voice guidance, and flexible-canon behavior;
- every character ends with the portrait-audit placeholder;
- no character references unattached image ids;
- no unsupported relationships or missing stable-id references remain;
- token check is below the configured error threshold;
- all validation commands pass;
- generated output is cleaned;
- the diff contains no `.charx`, raw imported assets, or `.research` corpus.

After this task is complete, create a separate follow-up task for visual portrait audit and attachment. That follow-up must inspect images itself; it must not reuse a shared emotion map or assume equal frame counts across characters.
