# Redraw tag authoring

Goal: a Danbooru tag set that lets an anime checkpoint generate every portrait in
this card from scratch, so the shipped art is generated rather than taken from the
OO / Mud portrait mods. Nothing here is read by the compiler — `charx` only looks
inside `source/`.

## Everything comes from prose, not from the images

Each character's `source/characters/<id>/content.md` already describes hair,
eyes, proportions, permanent marks, every outfit, and every expression, because
the profiles were written from those portraits in the first place. Marnie's
expression line, for instance, covers all five of her labels including the hand
position and the drawn effect:

> a warm open-eyed smile; a delighted closed-eyed smile with one hand resting
> against her cheek; a small concerned frown; an attentive neutral look; and a
> startled one with both hands clapped over her mouth and orange shock lines
> flying off her head

So no image needs to be opened. Prop and effect labels that sound opaque from
their names are described too: Shane's `hen-content` is "holding one of her hens
against her chest, eyes shut, smiling properly", Sebastian's `spread-on-bench` is
"seated on a workbench with both legs hauled up and spread wide toward the
viewer, a spanner in one hand and a screwdriver in the other", Demetrius's
`respirator-stars` is "a grey twin-cartridge respirator strapped over her nose and
mouth" with star pasties.

Five labels are the exception, 15 images in total: `composed-alt` (Abigail),
`explicit-aftermath-alt` (Haley), `bent-over-explicit-alt` (Harvey),
`serene-portrait` and `quiet-portrait` (Linus). The prose does not say how the
second drawing differs from the first.

Where a base label also exists — Abigail's `composed`, Haley's
`explicit-aftermath`, Harvey's `bent-over-explicit` — give the variant the same
tags as its base and roll a different seed. Linus is not that case: she has no
bare `serene` or `quiet` label, only the two `-portrait` ones, so writing a base
block would leave it `UNUSED`. Her two blocks are written separately from the
prose that distinguishes them (`closed eyes` against `half-closed eyes`).

## Layout

- `tags/<character>.yaml` — the tag source. One `identity` block, one block per
  outfit, one block per expression.
- `sheets/<character>.md` and `SHEETS.md` — which portraits exist, their outfits,
  and their file paths. Reference material; regenerate with
  `bun tools/redraw-sheets.ts`.
- `prompts.jsonl` — generated, and git-ignored. One `{name, prompt}` per portrait,
  ready to feed a ComfyUI batch loop. Build with
  `bun tools/redraw-prompts.ts [character]`.

## The format

A prompt is assembled as:

```
identity + outfits[<outfit>] + expressions[<expression>] + overrides[<outfit>.<expression>]
```

`tags/marnie.yaml` is the worked reference: 15 portraits from 1 identity block, 3
outfit blocks, and 5 expression blocks. Across the whole cast that is 32 identity
blocks, 124 outfit blocks, and 221 character-specific expression blocks covering
918 portraits.

What belongs where:

- `identity` — true in every image of that character: count tag, age impression,
  hair colour and style, eye colour, body proportions, permanent marks. For a
  futanari character this is where `futanari, penis, testicles` goes, explicitly —
  in `identity` and not in the `nude` block, because a checkpoint needs `futanari`
  to build the body correctly even when an outfit covers it. Never framing, pose,
  or expression.
- `outfits` — the garment, how much it covers, and the accessories belonging to
  that outfit. `nude` and `garter` blocks describe exposure and, for futanari, the
  state of the penis — the state only; the anatomy nouns stay in `identity`.
- `expressions` — only what changes between portraits of the same outfit: eyes,
  mouth, hands, gaze, blush intensity, drawn effect lines. Written per character:
  the same label means different faces on different characters, and no label is
  shared by all 32 — Marlon has one (`stern`), Alex has eighteen.
- `overrides` — optional, keyed `<outfit>.<expression>`, with `drop` and `add`
  lists. Needed only where an expression changes what the outfit covers and plain
  concatenation would contradict itself: `demetrius.default.respirator-stars` is a
  topless pose whose only outfit is a turtleneck, and
  `harvey.nude.bent-over-explicit` inherits `clothes aside` with nothing to push
  aside. Two exist in the whole cast; a stale key is reported as
  `UNUSED override`, and a `drop` that matches no tag as `OVERRIDE drop ...
  matched nothing`.

A tag repeated across blocks is deduped on assembly, first appearance winning, so
`identity` keeps the lead position.

Keep the blocks in that order and keep expression blocks roughly equal in length
within a character. Anime checkpoints react to prompt length, and stable length is
what lets a locked seed hold a face between renders.

Checkpoint, quality tags, negatives, resolution, and sampler settings stay in the
ComfyUI workflow, not in these files, so the model can be swapped without editing
32 files.

## Cross-checks

Three tools, all read-only except the first:

- `bun tools/redraw-prompts.ts` fails loudly rather than silently: it reports a
  `MISSING outfit` or `MISSING expression` for any portrait a tag file does not
  cover, and `UNUSED` for a block no portrait uses. A clean run means the tag file
  matches the card's asset list exactly.
- `bun tools/redraw-audit.ts` checks the tag files and every assembled prompt: the
  futanari flag against the cast registry, `futanari`/`penis`/`testicles` present
  in `identity` for all 19, absent for the other 13, `1girl` everywhere, no male or
  minor tags, no censoring or hedging tags, no framing or mood tags leaking into
  `identity`, and no prompt that asks for a garment and nudity at once. It must
  report `ERRORS (0)`. Its warnings are cross-block duplicates, which the prompt
  builder removes — redundancy in the source, not a defect in the output.
- `bun tools/redraw-verify-quotes.ts` re-reads every `"quoted"` fragment in the
  tag-file comments and confirms it appears verbatim in that character's
  `content.md` (or in this README, for rules quoted from here). It must report `0`.
  This is what catches a tag block justified by a sentence nobody wrote.
- `bun tools/redraw-review.ts` writes `REVIEW.md` (git-ignored): each character's
  visual prose followed by her tag file, so both can be read in one pass. Use it
  for judgement calls a checker cannot make — whether a tag is the right reading
  of an ambiguous sentence.

The futanari split is fixed and worth double-checking against
`source/lore/cast-registry/content.md`: 19 of the 32 have a penis, 13 do not.
Getting it wrong in `identity` produces wrong anatomy in every render of that
character.

## Generating

Text-to-image, not img2img — the point is not to derive from the mod art. One
consequence to design around: a locked seed does not survive a prompt change, so
the same character drifts between outfits. Two ways to hold a face steady, both
working with these files unchanged:

- Generate one canonical portrait per character first (default outfit, neutral
  expression), pick the best of several seeds, then use it as an IPAdapter
  reference (`Plus Face` or `FaceID Plus v2`, weight 0.6-0.8) for that
  character's remaining portraits. The reference is generated art, so nothing
  from the mods enters the pipeline.
- Or accept the drift and cull. Cheaper to set up, many more generations.

Many portraits are nude or explicit and 19 characters need futanari anatomy, so
this needs a local uncensored anime checkpoint rather than a hosted API.

Finished renders go into `source/assets/` under the same filenames, which makes
the swap invisible to the card. Note that `packages/charx-core/src/portraits.ts`
tracks source hashes, and `tests/authoring.test.ts` asserts the OO originals are
preserved alongside non-destructive 2x derivatives — that test needs revisiting
when originals are actually replaced.
