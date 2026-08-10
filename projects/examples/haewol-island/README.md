# Haewol Island

> Imported example project. The decomposed source rebuilds to the same CharX entry contents as its reference.

## Snapshot

| Field | Value |
| --- | ---: |
| Characters | 4 |
| Lore entries | 14 |
| Assets | 520 |
| Regex scripts | 15 |
| Triggers | 14 |
| Reference SHA-256 | `251948a861bac91142afb5fd90de86ce79e3e870f6119b2f535d898560decf55` |

## Browse

- [World prompts](world/card/prompts/)
- [Character index](world/content/characters/index.json)
- [Lore order](world/content/lore-order.json)
- [Regex scripts](world/module/regex/)
- [Triggers](world/module/triggers/)
- [Asset manifest](world/card/assets.json)
- Reference CharX is intentionally local-only and excluded from Git.

## Characters

- [👩‍🌾 유소유 (Yoo Soyou)](world/content/characters/006-yoo-soyou/content.md) — 129 linked assets
- [👮‍♀ 강미연 (Kang Mi-yeon)](world/content/characters/007-kang-mi-yeon/content.md) — 258 linked assets
- [👩‍🦯 정가연 (Jeong Ga-yeon)](world/content/characters/008-jeong-ga-yeon/content.md) — 258 linked assets
- [🎣 최난희 (Choi Nan-hee)](world/content/characters/009-choi-nan-hee/content.md) — 129 linked assets

## Commands

```powershell
bun run charx check --project haewol-island
bun run charx build --project haewol-island
bun run charx verify --project haewol-island
```
