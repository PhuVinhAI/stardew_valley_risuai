# CharX format analysis

The supplied file is a standard ZIP-based RisuAI CharX v3 archive, not a proprietary monolithic binary.

Its logical payload is:

```text
card.json       Character Card v3 data and embedded-asset references
module.risum    RisuAI module with lore, regex scripts, and triggers
assets/         Embedded image/audio files
x_meta/         Per-asset image/type metadata
```

The reference contains 1,138 entries: 568 assets, 568 metadata files, `module.risum`, and `card.json`. The top-level card is named `Danganronpa HER`; the multi-character world is represented by character lore entries, shared rules/scenarios, scripts, and 568 linked assets rather than by multiple top-level `card.json` files.

`module.risum` uses RisuAI's legacy module container:

1. byte `111` magic;
2. byte `0` version;
3. little-endian 32-bit encoded JSON length;
4. JSON bytes transformed through RPack's substitution map;
5. zero or more module asset records;
6. byte `0` terminator.

The project compiler reproduces that format using the same 512-byte RPack map from the analyzed RisuAI source tree.
