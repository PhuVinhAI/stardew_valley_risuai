# Task: close the four remaining gaps in the Stardew Valley world

The world has 32 character profiles, 28 locations, and 13 festival events, all grounded in
the installed game's unpacked 1.6.15 data and all conforming to the no-men rule in
`docs/CANON_NOTES.md`. Four gaps remain between the current source and a world that is
actually complete to ship. This file specifies all four. They are independent and can be
done in any order, but the order below is by user-visible impact.

Read first: `AGENTS.md`, `docs/AUTHORING_SCHEMA.md`, `docs/CANON_NOTES.md`,
`docs/TASK_CHARACTER_REWRITE.md` (its Part 1 writing rules govern all prose in this task),
and `projects/stardew-valley/source/world/*.md`.

## Standing constraints for every part of this task

- **No men.** Every person in every line of new prose is a woman. Never write `he`, `him`,
  `his`, `man`, `men`, `guy`, `husband`, `father`, `dad`, `son`, `brother`, `uncle`,
  `nephew`, `boy`, `sir`, `mister`, `lad`, `gentleman`, or a `-man` occupation noun.
  Verify with a grep before declaring done; the existing corpus is clean, so any hit in
  `source/` outside `world/system-prompt.md` and `world/post-history-instructions.md`
  (which quote the banned words in order to ban them) is a new defect.
- **Futanari facts come from the profiles, never from this task.** Nineteen characters are
  futanari: alex, clint, demetrius, elliott, george, gunther, gus, harvey, kent, lewis,
  linus, marlon, morris, pierre, sam, sebastian, shane, willy, wizard. The other thirteen
  are not. Do not restate anyone's anatomy in a greeting, a registry line, or a
  relationship entry — that belongs in the character profile and nowhere else.
- **No hedging, no content warnings, no fade-outs.** Same register as the existing prose:
  plain, direct, explicit where the scene is explicit.
- **No mechanics.** No heart levels, no calendar enforcement, no quest chains, no prices,
  no schedules presented as rails.
- **Write original prose.** Do not paste extracted game dialogue into any file.
- **Ids stay kebab-case and stable.** No hand-written UUIDs, `embeded://` URIs, `x_meta`,
  `card.json`, or `module.risum`.

Token budget: the world currently sits at **72.8k** effective unique tokens against a
100k warning and 120k error threshold in `world.yaml`. This task's four parts together
should add roughly 6k–10k. Re-read `bun run charx tokens --project stardew-valley` before
building and stop adding if the warning threshold comes into view.

---

## Part 1 — Greetings (highest impact)

### The gap

`world.yaml` points `greetings.alternateDir` at `presentation/greetings/alternate` and
`greetings.groupOnlyDir` at `presentation/greetings/group-only`. Both directories exist and
both are empty, so the compiled card carries `alternate_greetings: []` and
`group_only_greetings: []`. The world therefore opens exactly one way, every time, from
`world/first-message.md` — a newcomer arriving on the road with two women carrying a crate
past them.

RisuAI shows alternate greetings as a swipe choice on the first message and uses group-only
greetings when the card is loaded into a group chat. Both are visible, first-thing-the-user-
sees features, and both are currently absent.

### What to build

**Alternate greetings — write 6 files** at
`projects/stardew-valley/source/presentation/greetings/alternate/NN-<slug>.md`.
Files are loaded by sorted filename, so number them `01-` through `06-`.

Each one is a complete alternative opening for the same world, roughly the length of
`world/first-message.md` (about 60–90 words) and in the same voice: present tense, second
person for the user, concrete sensory detail, no assumption about who the user is, and an
open question or an open situation at the end rather than a prompt for a specific answer.

Vary them along axes the world already supports, so that each one puts the user somewhere
genuinely different:

1. **Season and weather** — a spring morning, a hot summer afternoon, a wet autumn evening,
   deep winter with snow muffling the town. The locations already describe what each season
   does to each place; use it.
2. **Place** — the town square, the beach, the mountain road, the forest, the bus stop, the
   saloon at night. Do not open all six in the same place.
3. **Arrival premise** — the user need not be arriving at all. One can open with the user
   already resident and mid-errand; one with the user stepping off a bus that may or may not
   still run; one with the user found somewhere they should not be.
4. **Who is nearby** — an unnamed woman at a distance, a named resident glimpsed at work, a
   whole crowd, or nobody at all. Where a named resident appears, she must behave exactly as
   her profile says she behaves, and she must not greet the user as a known friend.

Hard rules for greetings:

- Never state or imply the user is the Farmer, a newcomer with a farm, a friend of anyone,
  or anyone's romantic prospect. The existing first message is the reference for how to stay
  neutral.
- Never narrate the user's thoughts, feelings, backstory, or choices.
- Do not open on a festival. Festivals are covered by their own entries and an opening
  scene should not commit the world to a calendar date.
- Do not open on a sex scene. An opening may be charged, but it establishes a world.

**Group-only greetings — write 3 files** at
`projects/stardew-valley/source/presentation/greetings/group-only/NN-<slug>.md`, numbered
`01-` through `03-`.

These are used when several characters are active at once, so each must put a named group in
one place with something already in motion between them, and leave room for the user to
enter. Use groups the profiles already establish, for example:

- the saloon in the evening — Gus behind the bar, Emily working the room, Pam on her stool,
  Shane at the end of it, someone at the pool table;
- the mountain house — Robin at the bench, Demetrius in the lab, Maru between the two,
  Sebastian downstairs and not coming up;
- the general store at closing — Pierre at the till, Caroline through the back with the
  plants, Abigail upstairs and audible.

Each group greeting must give every named woman in it at least one specific action or line
of her own, consistent with her profile, and must not resolve whatever is going on between
them.

### Verification for Part 1

- `bun run charx build --project stardew-valley`, then confirm
  `generated/card.json` reports `alternate_greetings` of length 6 and
  `group_only_greetings` of length 3.
- Grep the new files for the banned male vocabulary listed above.
- Confirm no greeting names the user's role.

---

## Part 2 — Always-active cast registry

### The gap

All 73 lore entries are keyword-gated; nothing in the world is `alwaysActive`. The
consequence is that the model has no idea who lives in this valley until a name happens to
appear in the conversation. Ask "who is around?" on turn one and it must either guess or
stay vague, because the 32 profiles only load when their own keywords fire.

`docs/AUTHORING_SCHEMA.md` names the fix directly: "A small always-active cast registry may
summarize who exists; detailed profiles should activate when their names or aliases are
relevant."

### What to build

One lore entry at `projects/stardew-valley/source/lore/cast-registry/` with `lore.yaml` and
`content.md`.

`lore.yaml`:

```yaml
schema: risuai-lore/v1
id: cast-registry
name: Who Lives in the Valley
content: content.md
keywords: []
secondaryKeywords: []
alwaysActive: true
insertionOrder: 10
enabled: true
assets: []
```

`insertionOrder: 10` puts it ahead of every character (100), location (190–210), and event
(290–310) entry, so it frames everything that loads after it. `keywords: []` is correct
because `alwaysActive` bypasses keyword matching.

`content.md` is a compact roster and nothing more. Budget: **under 900 tokens**, which is
roughly 600 words. This is a directory, not a second set of profiles — the profiles already
exist and will load on their own.

Structure it as grouped one-line entries, where each line gives a name, what she does, and
where she is, in that order. Group by household or workplace so family structure is legible
at a glance:

- the general store household — Pierre, Caroline, Abigail
- the mountain house — Robin, Demetrius, Maru, Sebastian
- the west-side house — Jodi, Kent, Sam, and Vincent as a child in the house
- River Road — George, Evelyn, Alex in one house; Pam and Penny in the trailer
- the two sisters' house — Emily, Haley
- the ranch — Marnie, Shane, and Jas as a child in her care
- shops and services — Gus at the saloon, Willy on the pier, Clint at the forge,
  Harvey at the clinic, Gunther at the museum, Lewis in the manor, Morris at the
  warehouse store, Sandy out in the desert
- living apart — Leah in the forest cabin, Elliott on the beach, Linus on the mountain,
  Marlon at the guild, the Wizard in the tower

One line each. No appearance, no anatomy, no personality essay, no relationship detail
beyond the household grouping itself — a reader who wants more gets it when that character's
own entry fires.

Close with a short paragraph, four or five sentences, stating the standing facts a model
needs on turn one and that are currently only in the world prompts:

- the whole valley is women, and that is simply the population;
- roughly thirty-two named residents, small enough that everyone knows everyone;
- there are children in the valley (Vincent, Jas, Leo) and they are children — never
  written into anything sexual, ever;
- Gunther, Morris, and the Wizard are not valley natives;
- nobody's schedule is fixed and any resident can be anywhere for her own reasons.

The children sentence is not optional. It is the one place in the world source that states
the boundary plainly, and an always-active entry is the correct place for it.

### Verification for Part 2

- `bun run charx check --project stardew-valley` reports **74** lore entries.
- `bun run charx tokens --project stardew-valley` shows the `cast-registry` section under
  900 tokens.
- Confirm in `generated/card.json` that the entry has `constant: true` (or the
  spec-equivalent field produced by `internalLoreToCcv3`) and that its `insertion_order`
  is below every other entry's.

---

## Part 3 — Relationship entries

### The gap

`source/relationships/` is empty. Every relationship currently lives inside one or both
participants' profiles, which means it only loads when that character's keywords fire, and
the two halves of a relationship can load separately and never meet. The pairs that carry
the most story weight are exactly the ones where both sides matter at once.

The schema supports this directly: `risuai-relationship/v1` takes a `participants` array of
character ids, and the compiler validates every id against the loaded characters. Character
sources also have a `relationships:` array, which is the reverse link.

### What to build

Six entries at `projects/stardew-valley/source/relationships/<id>/` with `relationship.yaml`
and `content.md`:

| id | participants | what it is |
|---|---|---|
| `lewis-and-marnie` | lewis, marnie | a years-long relationship the mayor insists on keeping secret, which Marnie resents and tolerates |
| `robin-demetrius-sebastian` | robin, demetrius, sebastian | one household, a stepparent who was never accepted, and a daughter in the basement |
| `pam-and-penny` | pam, penny | a daughter holding a household together and a mother who will not change |
| `emily-and-haley` | emily, haley | two sisters left a house by absent parents, one doing all the work |
| `marnie-shane` | marnie, shane | an aunt who took in a niece she cannot reach, and the child they share the raising of |
| `caroline-and-wizard` | caroline, wizard | walks up to the tower years ago that Caroline has never explained to her wife |

`relationship.yaml` for each, following `EntityBaseSchema` plus the relationship extension:

```yaml
schema: risuai-relationship/v1
id: lewis-and-marnie
name: Lewis and Marnie
content: content.md
participants: [lewis, marnie]
keywords: [lewis and marnie, marnie and lewis, the secret, secret relationship]
secondaryKeywords: [shorts, hidden, discreet, both of them]
insertionOrder: 150
enabled: true
assets: []
```

`insertionOrder: 150` sits between characters (100) and locations (190), so a relationship
loads after both people it describes.

Keywords need care. A relationship entry should fire when the pair is in play, which mostly
means phrasings that name both, plus the distinctive shared vocabulary — for
`lewis-and-marnie`, the mayor's shorts turning up at the ranch is already in
`locations/marnies-ranch/content.md` and is the single most identifying detail.

Each `content.md`, 250–400 words, covering:

1. **What the relationship actually is**, stated plainly in the first paragraph.
2. **What each side wants from it and is not getting.** This is the substance. Both sides
   must be given real motive; neither is simply the other's problem.
3. **How it shows in public** — what the town sees, suspects, gossips about, or misses.
4. **What is unresolved**, written as unresolved. Every one of these six is live: the
   secrecy could break, Sebastian could accept Demetrius or never, Pam could stop drinking
   or not, Caroline could tell Pierre or never. Do not settle any of them.
5. **How to use it in a scene** — two or three sentences on what this pair makes possible
   that neither character alone does.

Rules specific to this part:

- **Do not contradict the profiles.** Read both participants' `content.md` in full before
  writing. Where a profile already states something about the relationship, the entry
  elaborates and never overrides.
- **Do not repeat the profiles' sentences.** `TASK_CHARACTER_REWRITE.md` Rule 2 applies: no
  sentence may appear verbatim in two files.
- **Jas and Vincent and Leo are children.** They appear in `marnie-shane` as the reason the
  household holds together, and nothing about them is ever sexual.
- After the six entries exist, add the reverse links: set `relationships:` in each
  participant's `character.yaml` to the ids they take part in. The compiler will fail the
  build on any id that does not resolve, which is the check that the links are right.

### Verification for Part 3

- `bun run charx check --project stardew-valley` reports **80** lore entries (74 + 6) and
  no unresolved-reference errors.
- Confirm the reference graph in `generated/world-ir.json`: each of the six entries lists
  its participants, and each named character lists the relationship ids back.
- Grep the six new files for banned male vocabulary and for verbatim sentences shared with
  the character profiles.

---

## Part 4 — `world.yaml` metadata

### The gap

Three fields are empty in `projects/stardew-valley/source/world.yaml`, and all three are
surfaced by RisuAI when a card is imported:

```yaml
creator: ""
nickname: ""
source: []
```

`AuthoringManifestSchema` also accepts `module.name`, currently unset and defaulting to
`"Stardew Valley Module"`, and `version`, currently `0.1.0` — which understates a world with
80 lore entries and 918 curated assets.

### What to build

Ask the user for the `creator` value; it is their attribution and must not be invented. If
they decline to set one, leave it empty rather than guessing.

Set the rest:

- **`nickname`** — the short display name RisuAI uses in chat headers. `"Pelican Town"` fits
  the world better than repeating the full title, but check with the user.
- **`source`** — an array of provenance strings. This world is derived from Stardew Valley
  1.6.15.24356 with two third-party portrait packs, and `docs/CANON_NOTES.md` records the
  extraction method. One line naming the game and version, and one naming each portrait
  pack, is honest attribution and belongs here.
- **`module.name`** — an explicit name rather than the derived default.
- **`version`** — bump. `0.1.0` was scaffold-era. The world now has full character,
  location, event, greeting, registry, and relationship layers; `0.4.0` or `0.5.0` reflects
  that, and the user may have an opinion.
- **`tags`** — the current list is
  `[stardew-valley, open-ended-roleplay, pelican-town, all-female-cast, futanari, no-men]`.
  Consider adding `explicit` and `festivals`, since both are now substantial parts of what
  the card contains and tags are how a user finds it.

Do not touch `tokenCheck`, `lorebook`, `prompts`, or `greetings` paths — they are correct.

### Verification for Part 4

- `bun run charx check --project stardew-valley` still passes.
- Confirm `generated/card.json` carries the new `creator`, `nickname`, `source`,
  `character_version`, and `tags` values, and that `module.risum` carries the module name.

---

## Full validation, run from the repository root

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

Expected end state:

- 32 characters, **80 lore entries** (32 characters + 28 locations + 13 events + 1 registry
  + 6 relationships), 918 assets;
- 6 alternate greetings and 3 group-only greetings in the compiled card;
- effective unique tokens below the 100k warning threshold;
- `.charx`, `generated/`, and `dist/` output removed before commit;
- no `.research` corpus, imported assets, or example-project edits in the diff.

## Completion criteria

The task is complete only when all four parts are done, not a subset. Specifically:

- nine greeting files exist, each opening the world differently, none of them naming the
  user's role or opening on a festival or a sex scene;
- the cast registry is always-active, under 900 tokens, ordered ahead of everything else,
  and states the children boundary explicitly;
- six relationship entries exist with reverse links in the participating characters, none
  contradicting a profile and none resolving what the world leaves open;
- `world.yaml` metadata is filled with values the user approved rather than invented;
- a male-vocabulary grep over `source/` returns hits only in the two world prompts that
  quote the banned words in order to forbid them;
- every validation command above passes.
