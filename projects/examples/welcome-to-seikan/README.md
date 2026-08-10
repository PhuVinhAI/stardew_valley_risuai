# 어서 오세요! 세이칸에

> Imported example project. The decomposed source rebuilds to the same CharX entry contents as its reference.

## Snapshot

| Field | Value |
| --- | ---: |
| Characters | 8 |
| Lore entries | 52 |
| Assets | 122 |
| Regex scripts | 2 |
| Triggers | 1 |
| Reference SHA-256 | `5a9a9ae761daca2cd200c514918dc9d88f5bf197ebb991db2d5ddbb660e1ea6a` |

## Browse

- [World prompts](world/card/prompts/)
- [Character index](world/content/characters/index.json)
- [Lore order](world/content/lore-order.json)
- [Regex scripts](world/module/regex/)
- [Triggers](world/module/triggers/)
- [Asset manifest](world/card/assets.json)
- Reference CharX is intentionally local-only and excluded from Git.

## Characters

- [미사키](world/content/characters/003-entry-3/content.md) — 15 linked assets
- [유카코](world/content/characters/004-entry-4/content.md) — 15 linked assets
- [하루카](world/content/characters/005-entry-5/content.md) — 15 linked assets
- [마키](world/content/characters/006-entry-6/content.md) — 15 linked assets
- [시노](world/content/characters/007-entry-7/content.md) — 15 linked assets
- [나츠메](world/content/characters/008-entry-8/content.md) — 15 linked assets
- [레이라](world/content/characters/009-entry-9/content.md) — 15 linked assets
- [루시](world/content/characters/025-entry-25/content.md) — 15 linked assets

## Commands

```powershell
bun run charx check --project welcome-to-seikan
bun run charx build --project welcome-to-seikan
bun run charx verify --project welcome-to-seikan
```
