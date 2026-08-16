# Task: rewrite character prompts as roleplay prose, fix portrait curation

This task supersedes the appearance and adult-material sections of
`TASK_PORTRAIT_AUDIT_AND_ATTACHMENT.md`. Where the two disagree, this file wins.

## Why this task exists

The 32 character files in `projects/stardew-valley/source/characters/` were written as an
asset inventory rather than as roleplay prompts. Three defects run through all of them:

1. **They describe image files, not people.** Sentences talk about "sets", "frames",
   "the pack", "the artist", "expression range", and "Visual measurements:". A roleplay
   model reads these to inhabit a character, not to look up a sprite directory.
2. **They repeat verbatim across files.** Eleven characters state their anatomy with the
   same sentence; five share the same consent sentence. Identical wording makes distinct
   people sound like one person.
3. **They hedge.** Content-warning phrasing ("private adult material", "belongs only in
   intimate scenes", "requires clear, mutual, ongoing adult consent", "never the default")
   turns a character sheet into a moderation notice.

Separately, the portrait curation layer has real data defects: 74 byte-identical images are
emitted as 74 separate assets, and 12 assets point at files that do not exist.

## Scope

All 32 characters. The eight already touched in commit `dd593f4` (abigail, alex, elliott,
emily, haley, harvey, leah, maru) are **in scope for a full rewrite** — they carry all three
prose defects.

---

## Part 1 — Writing rules

### Rule 1: describe the person, never the file

The prose is read by a model that will play this character. It must read like a description
of a living person.

**Banned vocabulary in prose:** `set`, `frame`, `portrait`, `variant`, `the pack`,
`the artist`, `expression range`, `Visual measurements:`, `sourceRoot`, `catalog`,
`defaultEnabled`, any `expression-NN` id, any filename.

| Wrong (current) | Right |
|---|---|
| "Her nude set removes the outfit while keeping the choker." | "With everything off she keeps only the choker at her throat." |
| "One frame in every set shows her kneeling with her legs apart." | "She kneels with her legs apart, …" |
| "Every set the pack draws for her leaves her chest uncovered." | "Nothing she owns covers her chest." |
| "Her expression range is the same in every outfit and quite narrow." | "She has a narrow register: pleasant, amused, embarrassed, quiet — and that is most of it." |
| "The pleased frame and the drink frame are the only two that look happy." | "She looks genuinely happy twice: when something pleases her, and with a drink in her hand." |
| "Visual measurements: about 158 cm tall, 78-55-82 cm, small B-cup bust." | "She is about 158 cm, 78-55-82, a small B-cup." |

Penny's red-ink scribble is an artefact of the source pack, not a fact about Penny. Do not
describe it in her prose at all — record it as an excluded frame in her curation file instead.

### Rule 2: no repeated sentences

No sentence may appear verbatim in more than one character file. This applies hardest to the
anatomy line, currently identical across eleven characters:

> "She is futanari: she presents and lives as a woman and has both female and male anatomy."

Rewrite per character, in that character's register. Same fact, different voice:

- Clint (awkward, ashamed): the fact arrives sideways, with visible discomfort.
- Morris (slick, transactional): stated flatly, as if it were a line item.
- Marlon (blunt, military): one short clause, no elaboration.
- Gus (warm, unbothered): mentioned the way you'd mention shoe size.

Before finishing a character, check the sentence does not already exist elsewhere.

### Rule 3: no fixed template

The current files all march through `hair → eyes → skin → build → measurements → default →
beach → swimsuit → swimsuit-ex → winter → nude → expressions`. Break it.

Lead with whatever is most striking about that person. Let paragraph count and length vary.
A character with one outfit gets a short section; a character with twelve gets a longer one.
Do not force every category into every file.

Measurements stay (height in cm, three-size in cm, cup size) — woven into a sentence, never
as a labelled data field.

### Rule 4: explicit, not hedged

Name body parts directly and state exactly what each garment leaves uncovered. This is the
established register in the already-written files and is correct:

> "…an open white lab coat with nothing under it except a red necktie hanging between her
> bare breasts. Both breasts are exposed down the open front, with visible nipples…"

> "…large bare breasts with visible nipples, a defined abdomen, muscular thighs, a visible
> penis, and visible testicles."

> "…a visible vulva, and no penis."

**Banned hedging:** "private adult material", "belongs only in intimate scenes",
"never selected because", "requires clear, mutual, ongoing adult consent", "not an
invitation", "never treated as consent", "never the default appearance", "18+", "NSFW",
"adult-only", "consent-gated".

Every character is an adult; that is established once in `## Agency` and needs no repetition.

---

## Part 2 — World rule: no men

This world has no men. It still has parents, children, grandparents, and siblings, so
whoever fills the siring role is futanari with a penis.

### Who is futanari

1. **Anyone who holds a father / husband / grandfather role in Stardew Valley canon.**
2. **Anyone whose file already says so**, including unpartnered characters. Being single
   does not remove it. This covers gunther, marlon, morris, wizard, sandy and others.
3. **Children of a futanari parent may inherit it.** Already reflected in the repo:
   sebastian (Robin × Demetrius) and sam (Jodi × Kent) are futanari; maru, sebastian's
   half-sister by the same futanari parent, is not. Sibling divergence is biologically
   coherent — keep it.

**Do not change anyone's futanari status.** Nineteen files already declare it; that list is
authoritative. The work here is making the *family language* consistent with it, and making
each anatomy description match: futanari characters get an explicit penis and testicles in
their undressed description, non-futanari characters get an explicit vulva and no penis.

Current futanari roster (19): alex, clint, demetrius, elliott, george, gunther, gus, harvey,
kent, lewis, linus, marlon, morris, pierre, sam, sebastian, shane, willy, wizard.

### Family language to rewrite

The repo is currently self-contradictory: demetrius already reads "her wife Robin, their
adult daughter Maru", but robin still reads "her husband Demetrius, her adult son Sebastian"
— the same household described two ways.

Replace `husband → wife/partner`, `son → daughter`, `father → mother/parent`,
`brother → sister`, `nephew → niece`, `grandfather → grandmother`, `he/him/his → she/her`,
`man/men → woman/women`.

| File | Occurrences | Lines |
|---|---|---|
| robin | 13 | 5, 23, 27, 37, 41 |
| jodi | 13 | 5, 23, 33, 37, 43 |
| maru | 9 | 5, 27, 33, 41 |
| sam | 8 | 5, 23, 27, 29, 33, 39, 43 |
| kent | 8 | 5, 27, 35, 43 |
| marnie | 7 | 5, 29, 45 |
| willy | 6 | 5, 27, 35, 39, 43 |
| caroline | 5 | 5, 25, 29, 43 |
| alex | 5 | 23, 27, 37, 41, 45 |
| penny | 3 | 29, 45 |
| lewis | 3 | 23, 27, 39 |
| morris | 2 | 45 |
| clint | 3 | 5 |
| shane | 1 | 43 |
| pam | 1 | 43 |
| leah | 1 | 43 |
| emily | 1 | 41 |
| elliott | 1 | 41 |
| abigail | 1 | 35 |

Verify with:

```powershell
bun --eval "0" ; rg -icoP '\b(husband|father|dad|son|grandson|brother|uncle|nephew|himself|he|his|him|man|men|boyfriend|grandfather)\b' projects/stardew-valley/source/characters
```

Watch for false positives: "she" contains no standalone "he", but `rg -i '\bhe\b'` will not
match it. Words like "shepherd" or "theme" are safe under `\b`. Review each hit — some
"man" uses are idiomatic ("a decent man" → "a decent woman").

---

## Part 3 — `## Agency` section format

Rename `## Agency, boundaries, and consent` → `## Agency`. Two paragraphs, following the
pattern already established in alex, haley, leah, and maru:

**Paragraph 1** — what the user is not, and what the character may do:

> "The user is not automatically a farmer, friend, coworker, or romantic prospect. Maru may
> invite someone into her workshop or refuse, cancel plans for a deadline, disagree, get
> absorbed and forget the conversation, set a boundary about her family, or pursue a project
> entirely without the user. Her interest is never assumed."

**Paragraph 2** — adulthood, anatomy if futanari (in her own voice per Rule 2), a
personality note, and what is not on rails:

> "She is an adult woman. Nothing about the seasons, festivals, quests, comet nights, or the
> robot storyline is fixed."

Vary the phrasing per character — paragraph 1 currently repeats across three files.

Delete every consent clause. Keep genuine agency content (the character can refuse, close
the shop, change the subject, disclose their past on their own terms) — that is
characterisation, not moderation.

---

## Part 4 — Portrait curation fixes

### 4a. 74 byte-identical assets

Commit `dd593f4` removed `duplicates` entries on the theory that self-referential
`duplicateOf` was a structural bug hiding real images. SHA-1 comparison shows the duplicate
claims were **correct**: `beach/expression-00.webp` and `swimsuit/expression-00.webp` are the
same file byte for byte across most characters. Only the syntax was wrong.

Result: 74 redundant assets now ship.

| Character | Emitted | Byte-identical redundant |
|---|---|---|
| alex | 64 | 19 |
| haley | 84 | 17 |
| harvey | 73 | 11 |
| leah | 54 | 10 |
| maru | 84 | 9 |
| elliott | 42 | 7 |
| emily | 48 | 1 |

Worst case is alex: `default/expression-06`, `beach/expression-06`, `winter/expression-06`,
`swimsuit-ex/expression-06`, `nude/expression-00`, and `swimsuit/expression-06` are six ids
for one file.

**Fix:** restore `duplicates` with correct cross-outfit syntax —
`duplicateOf: beach/expression-00`, never pointing at itself — and drop the redundant ids
from `character.yaml`. No image is lost; each remains reachable through its surviving outfit.

Note the same pattern is intact and correct in the 19 untouched OO characters plus penny,
sebastian, sam, and shane. Do not "fix" those the way `dd593f4` did.

### 4b. 12 assets pointing at missing files

| Character | Curation says | Actually on disk |
|---|---|---|
| penny | `expression-07` (all 6 outfits) | `expression-12` exists, unreferenced |
| sebastian | `expression-06` (all 6 outfits) | `expression-09` exists, unreferenced |

`charx check` reports these as healthy because `loadAssets` in
`packages/charx-core/src/authoring.ts:161-163` marks curated assets `optional: true` and
skips missing files silently, while adding the id to `declaredIds` at line 152 beforehand.
The reported total of 988 is therefore inflated by 12.

Fix the frame ids to match disk. Do not change the loader.

### 4c. Frame counts on disk (remaining Mud characters)

| Character | Outfits | Frames each | Montages |
|---|---|---|---|
| penny | beach, default, nude, swimsuit, swimsuit-ex, winter | 11 | 3 |
| sam | + joja-uniform (7 total) | 12 | 4 |
| sebastian | 6 | 9 | 3 |
| shane | 12 (6 base + 6 `-post-event`) | 11 | 6 |

---

## Part 5 — Image review method

For each character, in one pass:

1. Open **every montage** for that character — all outfits, all expressions.
   `projects/stardew-valley/.research/montage/<pack>/<id>[-N].png`
2. Then open **one full-size frame per outfit** for detail on garments, accessories, and body.
   `projects/stardew-valley/source/assets/imported/<pack>/<id>/<outfit>/[<variant>/]expression-NN.webp`
   (OO pack frames sit under a `upscaled-2x/` subdirectory; Mud frames do not.)
3. Check the YAML labels against what the faces actually show; correct mislabels.
4. Rewrite that character's prose, then move on. Do not batch characters.

Montage counts: mud characters have 3–6; OO characters have 1–2 (clint, demetrius, robin
have 2).

Measurements come from the image, not from a formula. Abigail is a small B-cup at 158 cm;
Harvey is an H-cup at 168 cm. Do not normalise toward a house average.

---

## Execution order

**Phase A — mechanical, no images needed**
- Restore correct `duplicates` for alex, haley, harvey, leah, maru, elliott, emily (74)
- Fix penny and sebastian frame ids (12)
- Re-run the audit; confirm redundant = 0 and phantom = 0

**Phase B — remaining Mud characters**
penny → sam → sebastian → shane

**Phase C — OO characters (19)**
caroline, clint, demetrius, evelyn, george, gunther, gus, jodi, kent, lewis, linus, marlon,
marnie, morris, pam, pierre, robin, sandy, willy, wizard

**Phase D — rewrite the eight from `dd593f4`**
abigail, alex, elliott, emily, haley, harvey, leah, maru

---

## Validation

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

`charx check` must still report 32 characters. Asset count will **drop** by roughly 74 as
duplicates stop being emitted — that is the intended outcome, not a regression. Token totals
must stay under the configured error threshold.

## Completion criteria

- no banned production-vocabulary term appears in any `content.md`;
- no sentence appears verbatim in two character files;
- no hedging phrase from Rule 4 survives anywhere;
- every family relationship reads consistently with a world that has no men, and both sides
  of each relationship agree;
- every futanari character's undressed description names a penis and testicles; every
  non-futanari character's names a vulva and no penis;
- every `## Agency, boundaries, and consent` heading is now `## Agency` with the two-paragraph
  form and no consent clauses;
- zero byte-identical images emitted as separate assets;
- zero assets referencing files that do not exist on disk;
- all validation commands pass; the diff contains no `.charx`, imported assets, generated
  output, or `.research` corpus.
