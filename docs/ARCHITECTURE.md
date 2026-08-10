# Architecture

The workspace separates authoring data from transport codecs and presentation.

```text
apps/cli                 Commander-based agent/compiler interface
apps/viewer              Svelte 5 read-only human interface
packages/project-schema  Zod schemas for workspace/project/archive manifests
packages/risum-codec     RisuM container and RPack substitution codec
packages/charx-core      Import, decomposition, validation, build, verify, catalog
projects                 Independent primary/example world projects
```

The top-level Character Card is a world card. Individual cast members are canonical internal Risu lore entries stored as separate character directories. During build, the compiler converts those canonical entries to CCv3 `character_book.entries` while embedding the same internal entries in `module.risum`.

Template directives (`$text`, `$textArray`, `$json`, `$orderedJson`, `$internalLorebook`, `$ccv3Lorebook`) keep prose and ordered collections in manageable source files without losing JSON property order.

The viewer never edits source. `charx catalog` produces a read model at `apps/viewer/public/catalog.json`, and Svelte renders project, character, lore, prompt, script, and asset summaries.
