# Canon notes and open items

Decisions and known gaps from grounding the cast in the installed game's data (Stardew Valley `1.6.15.24356`). Read this before changing character prose to match a raw data field.

## Standing world rule: no men

The valley is entirely women, and nineteen of the thirty-two residents are futanari, which is how the town still has parents, children, and grandparents. This overrides the game data wherever the two disagree — genders, husbands, fathers, sons, brothers, and every male pronoun in the extracted corpus. The world prompts in `projects/stardew-valley/source/world/` and the 32 character profiles are the authority; `.research/` is input, not truth. Never "correct" a profile back toward the game's gender for a character.

## Decision: `Age: Teen` in game data vs. the authored adult framing

`Data/Characters.json` records `Age: "Teen"` for **Abigail, Maru, Penny, Sam, Sebastian**, and `Age: "Adult"` for the rest of the cast, including other marriage candidates such as Alex, Emily, Elliott, Haley, Harvey, Leah, and Shane.

Authored prose describes all five as adults. That is deliberate:

- The field is a behavior bucket, not a stated age. It drives things like reactions to alcohol gifts and a few dialogue substitutions.
- It is not applied consistently as an age claim: the same romanceable group is split across both values.
- Every one of the five is marriageable in the game's own marriage system.
- Every character in this world is written as an adult woman, and the explicit portrait sets and prose depend on that being true of the whole cast without exception.
- Abigail's source, authored earlier, already used the same framing.

**Do not "correct" these five to teenagers to match the field.** Every resident of this valley is an adult; that is not negotiable and is not a field to be reconciled with game data.

## Other data-vs-prose judgments already made

- **Gunther and Morris have `Gender: "Undefined"`** in the character data, and in-game dialogue refers to both with male terms — a child calls Gunther "the man who runs the museum", and Morris is addressed as Mr. Morris in written material. Neither is followed. This world has no men: both are written as women, and both are futanari. The game's genders are research input, not the state of the world.
- **`HomeRegion: "Other"`** for Gunther, Morris, and the Wizard means none of the three is a valley native. This is stated in their prose as an origin fact only, with no invented backstory attached.
- **Gift tastes stay unresolved.** `Data/NPCGiftTastes` gives numeric item ids. `Data/Objects.json` is now available locally and could resolve them, but prose only mentions a food or gift where dialogue or a secret note names it in words. Resolving the ids is optional flavor, not a correction.
- **Marlon's lost eye stays a joke.** He blames the caves in one line and a slime-breeding hobby in another, then says he is kidding. No account is treated as true.

## Locations: what the 28 place entries are grounded in

The `source/locations/*` entries were written from the unpacked 1.6 data rather than from the wiki:

- `Data/WorldMap.json` + `Strings/StringsFromCSFiles.json` (`MapPage.cs.*`) for canonical place names, house addresses, and posted opening hours.
- `Data/Locations.json` for per-location forage by season, artifact spots, fish lists, and ambience.
- `Maps/*.tmx` warp tables for which places actually connect, and the `Action`/`TouchAction` tile properties for what is interactive in each building.
- `Strings/StringsFromMaps.json` for interior detail — the books on people's shelves, Clint's unsent letter to Emily, Clara's letter in the Mullner house, Kent's letter home, the mayor's hidden note, Pam's bottles, Maru's floppy disks.
- `Data/Shops.json`, `Data/Festivals/*`, `Data/PassiveFestivals.json`, `Data/mail.json`, `Data/SecretNotes.json`, `Data/MuseumRewards.json`, `Data/Minecarts.json`, `Data/Monsters.json`, and `Data/Quests.json` for stock, festival dates and venues, unlock events, and the mine's 120 levels.

Judgments made while writing them:

- **Place names follow the game, characters do not.** "JojaMart", "Pelican Town", "Calico Desert", "Cindersap Forest", "Stardrop Saloon", "Sandy's Oasis", "Zuzu City", "Gotoro Empire", "Ferngill Republic" are used as written. Every person in them is a woman, and male pronouns in the extracted strings were converted (Gil, Gunther, Morris, Clint, George, Pierre, the Woods statue, the Old Mariner).
- **Contested state is written as contested, not resolved.** The community center / warehouse-store / cinema outcome, the bus, Willy's boat, the beach bridge, the trailer, the greenhouse, and the railroad boulder are all presented as live possibilities. Locations say so explicitly instead of picking a timeline.
- **No mechanics.** Shop inventories, prices, bundle checklists, museum donation counts, mine progression, and building costs were deliberately left out; the entries name what a place sells or gives in prose only.
- **Off-cast NPCs stay peripheral.** Jas, Vincent, Gil, Leo, the sewer shadow-merchant, the dwarf, the witch, the junimos, and the Old Mariner appear as scenery in place entries because the game puts them there, and none has a character profile. They are described without pronouns where the game's gender would otherwise leak through.
- **`locations:` references were added to all 32 character sources** — home plus one or two habitual places each. These are soft context for the compiler's reference graph, not schedules.

## Festivals: what the 13 event entries are grounded in

The `source/events/*` entries were written from the same unpacked 1.6 data as the locations, not from the wiki:

- `Data/Festivals/FestivalDates.json` for the eight calendar festivals and their exact days; `Data/Festivals/<season><day>.json` for each one's venue and posted hours (the `conditions` field, e.g. `Town/900 1400`), its script structure, and every villager's festival line in both the year-one and year-two variants.
- `Data/PassiveFestivals.json` for the four multi-day events the calendar does not show as festivals — Night Market, Desert Festival, Trout Derby, SquidFest — including season, start and end day, and start time.
- `Data/mail.json` for the mayor's advance notices, which are the in-world source for dates, hours, venues, and what people are told to bring.
- `Strings/1_6_Strings.json` for everything at the Desert Festival (stall dialogue, the racers, the scholar's quiz, the chef's dish names, the fixer, the guild challenge booth) and the two fishing derbies' booth text and signs.
- `Strings/StringsFromCSFiles.json` for the fair (grange judging results, star tokens, the strength-game rating scale, the fortune teller's readings) and the flower dance's partner prompts.
- `Strings/SimpleNonVillagerDialogues.json` for the twenty-two visiting anglers at the two derbies.
- `Strings/schedules/*.json` (`winter_15`–`winter_17`) for what the cast says during the Night Market, which is the only place that dialogue lives.
- `Strings/Locations.json` for the Night Market's submarine, painter, coffee merchant, and warper; `Data/Shops.json` for what each festival stall actually stocks; `Data/SecretNotes.json` for the mermaid show's five-number note.

Judgments made while writing them:

- **Every festival attendee was converted to a woman**, including the four non-cast figures the data places at them: the governor at the Luau, the fair's hired clown, Welwick the fortune teller, and the Night Market's painter, submarine captain, and shrouded warper. The governor's `Gender: "Undefined"` and the game's male pronouns for the clown, the captain and the anglers are research input, not the state of the world. The Luau line about the governor's "missus" became a wife.
- **Mechanics stayed out.** No star-token prices, catch targets, egg counts, grange scoring, calico-egg exchange rates, or item lists. The entries say what a stall sells or a contest asks for in prose only.
- **Outcomes are written as unfixed.** The Luau soup has six recorded reactions in the data and the entry presents the range rather than picking one; contest winners, the flower queen, the grange result, and the secret-gift pairings are all explicitly not settled.
- **Off-cast NPCs stay scenery**, as in the locations: Jas, Vincent, Leo, Gil, the dwarf, the shadow-dweller, and the visiting anglers appear because the data puts them there, and none gains a profile.
- **`Gunther` and `Morris` are absent from all eight festival files** and are therefore absent from the entries. That is the game's own omission, not an oversight.
- **Sandy's festival line is a single repeated string** in seven of the eight files, so she is written as present only where the data actually places her (the fair's year-two setup) and at the Desert Festival, where she has real lines.
- **`conditions:` on each event** records season, day, venue and hours as flat tags for the reference graph. They are metadata, not rails — the entries say in prose that no festival has to happen on cue.

## Open items, deferred

1. **`canon.ts` misses text reached by indirection.** Extraction filters `Strings/*` entries by character name, so lines referenced from elsewhere are dropped — `Data/Shops.json` points at keys like `ShopMenu.cs.11517`, which contain no name. That cost five Marlon lines and two Sandy lines until the keys were resolved by hand. A future pass should resolve `[LocalizedText …]` references and shop-owner dialogue into the per-character corpus.
2. **Typed 1.6 data is not part of the automated corpus.** The `xnb` reader cannot parse 49 structured files. They were unpacked once with StardewXnbHack (requires SMAPI installed in the game folder; it ignores `--asset-path` and `--out-path` and writes to `<game>\Content (unpacked)`). The eight files that mattered were copied to `projects/stardew-valley/.research/unpacked/`, which is gitignored. Extraction should read them directly instead of depending on a manual unpack.
3. **`<game>\Content (unpacked)` is still on disk**, about 177 MB in the user's game folder. It is tool output and harmless, but it can be deleted once nothing else is needed from it.
4. **Thin-canon characters remain thin.** Gunther has no dialogue file, no shop, no gift tastes, no calendar birthday, and no friendship track; Marlon and Morris have no dialogue file; Kent and Sandy have small ones, and Sandy's festival line is a single repeated string. Their sources say so explicitly rather than filling the gaps.
5. **Festival research helpers live in `.research/tools/`** and are gitignored along with the rest of that directory: `festival_scan.py` (substring sweep over unpacked `Strings/` and `Data/`), `festival_roster.py` (per-festival speaker and script inventory), `festival_shops.py` (resolves festival shop stock to item names), `festival_absentees.py` (which cast members each festival omits). They read `<game>\Content (unpacked)` directly and will stop working if it is deleted.
