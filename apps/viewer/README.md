# Read-only world viewer

Svelte 5 + Vite interface for people to browse registered worlds, characters, lore, prompts, and asset counts without editing source files.

```powershell
bun run viewer:data
bun run viewer
```

`viewer:data` compiles all initialized projects into `public/catalog.json`. The viewer is deliberately read-only; authoring happens through the structured project source and agent CLI.
