# Canon notes and open items

Decisions and known gaps from grounding the cast in the installed game's data (Stardew Valley `1.6.15.24356`). Read this before changing character prose to match a raw data field.

## Decision: `Age: Teen` in game data vs. the authored adult framing

`Data/Characters.json` records `Age: "Teen"` for **Abigail, Maru, Penny, Sam, Sebastian**, and `Age: "Adult"` for the rest of the cast, including other marriage candidates such as Alex, Emily, Elliott, Haley, Harvey, Leah, and Shane.

Authored prose describes all five as adults. That is deliberate:

- The field is a behavior bucket, not a stated age. It drives things like reactions to alcohol gifts and a few dialogue substitutions.
- It is not applied consistently as an age claim: the same romanceable group is split across both values.
- Every one of the five is marriageable in the game's own marriage system.
- This project ships adult-only portrait sets and gates romance and intimacy on explicit adult consent. The adult framing is required for that posture, not decorative.
- Abigail's source, authored earlier, already used the same framing.

**Do not "correct" these five to teenagers to match the field.** If this is ever revisited, it changes the safety posture of the whole project, not just five files: the nude and `swimsuit-ex` curation rules, the consent language in every romanceable character, and the world-level prompts would all need review together.

## Other data-vs-prose judgments already made

- **Gunther and Morris have `Gender: "Undefined"`** in the character data. Both are written with he/him because in-game dialogue refers to them that way — a child in town calls Gunther "the man who runs the museum", and Morris is addressed as Mr. Morris in written material. Where data and dialogue disagree, dialogue was followed and the disagreement is recorded in Gunther's own `## Canon note`.
- **`HomeRegion: "Other"`** for Gunther, Morris, and the Wizard means none of the three is a valley native. This is stated in their prose as an origin fact only, with no invented backstory attached.
- **Gift tastes stay unresolved.** `Data/NPCGiftTastes` gives numeric item ids. `Data/Objects.json` is now available locally and could resolve them, but prose only mentions a food or gift where dialogue or a secret note names it in words. Resolving the ids is optional flavor, not a correction.
- **Marlon's lost eye stays a joke.** He blames the caves in one line and a slime-breeding hobby in another, then says he is kidding. No account is treated as true.

## Open items, deferred

1. **`canon.ts` misses text reached by indirection.** Extraction filters `Strings/*` entries by character name, so lines referenced from elsewhere are dropped — `Data/Shops.json` points at keys like `ShopMenu.cs.11517`, which contain no name. That cost five Marlon lines and two Sandy lines until the keys were resolved by hand. A future pass should resolve `[LocalizedText …]` references and shop-owner dialogue into the per-character corpus.
2. **Typed 1.6 data is not part of the automated corpus.** The `xnb` reader cannot parse 49 structured files. They were unpacked once with StardewXnbHack (requires SMAPI installed in the game folder; it ignores `--asset-path` and `--out-path` and writes to `<game>\Content (unpacked)`). The eight files that mattered were copied to `projects/stardew-valley/.research/unpacked/`, which is gitignored. Extraction should read them directly instead of depending on a manual unpack.
3. **`<game>\Content (unpacked)` is still on disk**, about 177 MB in the user's game folder. It is tool output and harmless, but it can be deleted once nothing else is needed from it.
4. **Thin-canon characters remain thin.** Gunther has no dialogue file, no shop, no gift tastes, no calendar birthday, and no friendship track; Marlon and Morris have no dialogue file; Kent and Sandy have small ones, and Sandy's festival line is a single repeated string. Their sources say so explicitly rather than filling the gaps.
