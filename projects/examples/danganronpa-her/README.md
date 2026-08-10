# Danganronpa HER

> Imported example project. The decomposed source rebuilds to the same CharX entry contents as its reference.

## Snapshot

| Field | Value |
| --- | ---: |
| Characters | 18 |
| Lore entries | 48 |
| Assets | 568 |
| Regex scripts | 16 |
| Triggers | 1 |
| Reference SHA-256 | `367caff3a37074bbc77c6c410297d351a1cab0ba7a84614be6d5f98a735b829f` |

## Browse

- [World prompts](world/card/prompts/)
- [Character index](world/content/characters/index.json)
- [Lore order](world/content/lore-order.json)
- [Regex scripts](world/module/regex/)
- [Triggers](world/module/triggers/)
- [Asset manifest](world/card/assets.json)
- Reference CharX is intentionally local-only and excluded from Git.

## Characters

- [Maizyono Saya](world/content/characters/003-maizyono-saya/content.md) — 23 linked assets
- [Sangatsu Nanoka](world/content/characters/004-sangatsu-nanoka/content.md) — 24 linked assets
- [Wasurena Gusa](world/content/characters/005-wasurena-gusa/content.md) — 21 linked assets
- [Kain Mariegomez](world/content/characters/006-kain-mariegomez/content.md) — 22 linked assets
- [Suzuki Raina](world/content/characters/007-suzuki-raina/content.md) — 22 linked assets
- [Takano Mesu](world/content/characters/008-takano-mesu/content.md) — 21 linked assets
- [Towa Kazer](world/content/characters/009-towa-kazer/content.md) — 24 linked assets
- [ ](world/content/characters/010-entry-10/content.md) — 0 linked assets
- [Hikari Star](world/content/characters/011-hikari-star/content.md) — 23 linked assets
- [Suoh Ouka](world/content/characters/012-suoh-ouka/content.md) — 21 linked assets
- [Chitama Koyomi](world/content/characters/013-chitama-koyomi/content.md) — 22 linked assets
- [Kasane Tenno](world/content/characters/014-kasane-tenno/content.md) — 22 linked assets
- [Yumemizu Ann](world/content/characters/015-yumemizu-ann/content.md) — 22 linked assets
- [Shiroyuki Hime](world/content/characters/016-shiroyuki-hime/content.md) — 21 linked assets
- [Kurose Akalrin](world/content/characters/017-kurose-akalrin/content.md) — 20 linked assets
- [Haninozuka Lion](world/content/characters/018-haninozuka-lion/content.md) — 39 linked assets
- [Haninozuka Lina](world/content/characters/019-haninozuka-lina/content.md) — 39 linked assets
- [Shiroshima Yasu](world/content/characters/020-shiroshima-yasu/content.md) — 21 linked assets

## Commands

```powershell
bun run charx check --project danganronpa-her
bun run charx build --project danganronpa-her
bun run charx verify --project danganronpa-her
```
