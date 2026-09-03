---
name: update-ptcgp-sets
description: Add or update Pokémon TCG Pocket set and card data from PokéWiki, including set metadata and pack-probability mechanics.
---

# Update Pokémon TCG Pocket sets

Read [the card-data rules](references/card-data-rules.md) before editing imported data.

1. Run `bun scripts/pokewiki-scraper.ts <PokéWiki-set-URL>`. Treat its YAML output as a draft, not as authoritative reviewed data.
2. Compare the draft with the source hierarchy in the card-data rules and correct names, rarity symbols, booster membership, card counts, and special properties.
3. Merge the reviewed data into `resources/tcgpcards.yaml`. Follow the accepted shapes expressed by `SetData`, the scraper formatter, and `src/PokemonTcgPocket/tcgpcards.yaml.test.ts` rather than copying a historical set’s shape blindly.
4. Update `SET_DEFINITIONS` in `src/PokemonTcgPocket/PokemonTcgPocketService.ts`. Its set keys, names, boosters, and probability strategy feed the derived exports; do not edit those derived exports separately.
5. Select the probability strategy by inspecting `BoosterProbabilitiesType`, `src/PokemonTcgPocket/PackProbabilityStrategies/`, and their tests. Explicitly account for foil cards, baby or shiny sixth-card pools, six-pack-only cards, and four-card packs when present. Add focused strategy coverage for a new mechanic.
6. Run the scraper tests, YAML contract tests, service tests, and probability tests relevant to the update. Review the resulting YAML and metadata diff against the source.

The update is complete when the named sources have been checked and the reviewed data, YAML contract, `SET_DEFINITIONS`, selected probability strategy, and mechanic-specific tests agree. If primary German naming evidence is unavailable, report that gap instead of declaring the update complete. Then satisfy the repository-wide completion gate in `AGENTS.md`.
