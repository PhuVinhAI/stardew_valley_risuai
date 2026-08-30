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
second drawing differs from the first, so give the variant the same tags as its
base label and roll a different seed.

## Layout

- `tags/<character>.yaml` — the tag source. One `identity` block, one block per
  outfit, one block per expression.
- `sheets/<character>.md` and `SHEETS.md` — which portraits exist, their outfits,
  and their file paths. Reference material; regenerate with
  `bun tools/redraw-sheets.ts`.
- `prompts.jsonl` — generated. One `{name, prompt}` per portrait, ready to feed a
  ComfyUI batch loop. Build with `bun tools/redraw-prompts.ts [character]`.

## The format

A prompt is assembled as:

```
identity + outfits[<outfit>] + expressions[<expression>]
```

`tags/marnie.yaml` is the worked reference: 15 portraits from 1 identity block, 3
outfit blocks, and 5 expression blocks. Across the whole cast that is 32 identity
blocks, ~90 outfit blocks, and ~340 character-specific expression blocks covering
918 portraits.

What belongs where:

- `identity` — true in every image of that character: count tag, age impression,
  hair colour and style, eye colour, body proportions, permanent marks. For a
  futanari character this is where `futanari, penis, testicles` goes, explicitly.
  Never framing, pose, or expression.
- `outfits` — the garment, how much it covers, and the accessories belonging to
  that outfit. `nude` and `garter` blocks describe exposure and, for futanari, the
  state of the penis.
- `expressions` — only what changes between portraits of the same outfit: eyes,
  mouth, hands, gaze, blush intensity, drawn effect lines. Written per character:
  the same label means different faces on different characters, and no label is
  shared by all 32 — Marlon has one (`stern`), Alex has eighteen.

Keep the blocks in that order and keep expression blocks roughly equal in length
within a character. Anime checkpoints react to prompt length, and stable length is
what lets a locked seed hold a face between renders.

Checkpoint, quality tags, negatives, resolution, and sampler settings stay in the
ComfyUI workflow, not in these files, so the model can be swapped without editing
32 files.

## Cross-checks

`bun tools/redraw-prompts.ts` fails loudly rather than silently: it reports a
`MISSING outfit` or `MISSING expression` for any portrait a tag file does not
cover, and `UNUSED` for a block no portrait uses. A clean run means the tag file
matches the card's asset list exactly.

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
