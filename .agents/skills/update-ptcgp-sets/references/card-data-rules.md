# Card-data rules

## Source hierarchy

- Use the PokéWiki set page passed to the scraper as the working source for the complete card list, numbering, rarities, and booster membership.
- Verify German card and set names against the German-language Pokémon TCG Pocket client or a primary capture supplied from it. When that evidence is unavailable or conflicts with PokéWiki, identify the affected names and leave verification explicitly unresolved.

## Authoritative representation

- Preserve official German card and set names exactly, including regional-form hyphenation.
- Use the exact Unicode rarity symbols accepted by `RARITY_SYMBOLS`; do not substitute visually similar emoji or ASCII characters.
- The intended card-name spelling uses a space before `ex`, not a hyphen. Existing data and validation still contain the older `-ex` spelling; surface that migration conflict rather than silently changing official input to match it.

## Live contracts

Consult these sources instead of copying their changing contents into this reference:

- `scripts/pokewiki-scraper.ts` and its tests for import and YAML formatting;
- `SetData`, `Card`, `RARITY_SYMBOLS`, and `SET_DEFINITIONS` in `src/PokemonTcgPocket/PokemonTcgPocketService.ts`;
- `src/PokemonTcgPocket/tcgpcards.yaml.test.ts` for accepted YAML relationships;
- `src/PokemonTcgPocket/PackProbabilityStrategies/` and probability tests for pack mechanics.
