# Task: visual portrait audit, curation, and attachment

## Objective

Attach local portrait assets to the 32 authored Stardew Valley characters by **looking at every image**. Character prose already exists; this task adds appearance description and per-character/per-outfit curation. Abigail is already curated and attached and is the structural reference — but her labels, frame count, and outfit list must not be copied onto anyone else.

Nothing in this task may be inferred from filenames, catalogs, canon text, or another character's curation. Every label, duplicate claim, and appearance sentence must come from having viewed the frame.

## Hard rules

- No shared emotion map. Labels are decided per character, and per outfit when the outfits differ.
- No assumed frame counts. Counts come from the actual files on disk.
- Never invent a frame that does not exist, and never drop a frame that does.
- Use `unclassified-01`, `unclassified-02`, ... for frames whose expression you cannot read confidently.
- Only list a frame under `duplicates` after visually confirming it matches the frame it points at.
- Do not modify anything under `source/assets/imported/`. It is local-only and gitignored.
- Do not edit `projects/examples/*`.
- Do not commit `.charx`, `generated/`, `dist/`, imported assets, or the `.research` corpus.

## Source material

Two imported packs, already split into standalone WebP frames:

```text
projects/stardew-valley/source/assets/imported/mud-portraits/<id>/<outfit>/expression-NN.webp
projects/stardew-valley/source/assets/imported/oo-anime-portraits/<id>/<outfit>/{original,upscaled-2x}/expression-NN.webp
```

- The Mud pack has one variant per frame. The OO pack has `original` and `upscaled-2x`; its catalog names `upscaled-2x` as the preferred RisuAI variant, and the generated per-character `manifest.yaml` already points at it.
- Each character directory has a `catalog.json`; each pack root has one too. Treat those as an index of what exists, not as a description of what is in the picture.
- Per-character `manifest.yaml` files already declare every imported frame as an optional asset. Curation files select from those frames; they do not replace the manifests.

## Frame counts differ per character and per outfit

Read the counts from disk. As imported, they are not uniform — for example the Mud pack ranges from 7 frames per outfit for one character to 14 for another, one character's `nude` set is smaller than their clothed sets, and the OO pack ranges from a single frame to eight. Outfit sets differ too: some characters have only `default`, others add `beach`, `winter`, `swimsuit`, `swimsuit-ex`, `nude`, and several have character-specific sets such as glasses variants, a work uniform, a clinic outfit, or post-event variants. Never normalize these.

## Required output per character

1. A curation file at `projects/stardew-valley/source/assets/curation/<id>.yaml` using `risuai-portrait-curation/v1`:
   - `character`, `sourcePack`, `sourceRoot`
   - one entry per outfit that actually exists, each with `context`, `frames` (frame id → semantic label), and `duplicates`
   - `defaultEnabled: false` for any outfit that must not be selectable by default
   - YAML anchors may be reused across outfits **only** when the frames really are the same expressions in the same order, verified visually.
2. Asset ids added to `source/characters/<id>/character.yaml`, in a deliberate order, referencing only ids the compiler can resolve. Curated ids are formed as `portrait-<character>-<outfit>-<frame>`; the OO pack's manifest ids carry an `oo` segment, so confirm the id you reference is the one the loader actually declares before adding it.
3. The `## Portrait audit` placeholder in `source/characters/<id>/content.md` replaced with an appearance section written from the images: hair, eyes, skin, build, face, and per-outfit clothing and accessories, plus what the expression range actually covers. Abigail's content file shows the expected depth and tone.

## Adult and private material

The Mud pack includes `nude` outfits and `swimsuit-ex` variants for its twelve characters. The OO pack does not.

- Keep these private, adult-only, and consent-gated. Set `defaultEnabled: false`.
- State in the character's prose that the set is never the default appearance and may only be referenced when the character is established as an adult, the setting is private, and consent is explicit and mutual.
- Never treat nudity as consent, and never let a romantic cue alone select one of these frames.
- If a frame looks ambiguous in a way that matters for this, leave it out and record why.

## Method

1. Read `AGENTS.md`, `docs/AUTHORING_SCHEMA.md`, Abigail's curation file and content file, and this task.
2. For one character at a time: list the outfits and frames on disk, then open every frame and look at it.
3. Group visually identical or near-identical frames; pick one survivor and record the rest under `duplicates`.
4. Assign labels from what you see. Prefer plain, stable words over invented emotion taxonomies. Use `unclassified-*` when unsure.
5. Write the curation file, then the appearance prose, then the asset list.
6. Re-run validation and confirm the asset count rose by exactly the number of non-duplicate frames you curated.

Work in coherent batches, but never carry one character's label set into the next.

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

The check must still report 32 characters. Asset count must increase and must equal the number of curated, non-duplicate frames. Token totals must stay below the configured error threshold; appearance prose is the largest addition here, so re-read the token report before building.

## Completion criteria

- every character with imported portraits has a curation file whose frames match the files on disk exactly;
- every label was assigned from a viewed image, with `unclassified-*` used wherever confidence was low;
- duplicates are visually verified and are not emitted as separate assets;
- no two characters were given the same label set unless their frames genuinely match;
- every `## Portrait audit` placeholder is replaced with observed appearance prose;
- adult sets are disabled by default, consent-gated, and described as non-default;
- no character references an asset id the compiler cannot resolve;
- all validation commands pass, generated output is cleaned, and the diff contains no `.charx`, imported assets, or `.research` corpus.
