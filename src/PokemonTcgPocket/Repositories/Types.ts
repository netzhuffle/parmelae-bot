/**
 * File for custom types used in repository signatures.
 *
 * While Prisma creates and exports most types, some need to be created manually.
 * See https://www.prisma.io/docs/concepts/components/prisma-client/advanced-type-safety/operating-against-partial-structures-of-model-types#problem-using-variations-of-the-generated-model-type.
 */

import {
  PokemonCardDefaultArgs,
  PokemonCardGetPayload,
} from '../../generated/prisma/models/PokemonCard.js';
import { Rarity } from '../../generated/prisma/enums.js';

/* eslint-disable @typescript-eslint/no-unused-vars */

/** Type value for a Pokemon card including set, boosters, and ownership relations. */
const POKEMON_CARD_WITH_RELATIONS = {
  include: {
    set: true,
    boosters: true,
    ownership: {
      include: {
        user: true,
      },
    },
  },
} satisfies PokemonCardDefaultArgs;

/** Pokemon card including set, boosters, and ownership relations. */
export type PokemonCardWithRelations = PokemonCardGetPayload<
  typeof POKEMON_CARD_WITH_RELATIONS
>;

/**
 * Adapter interface for count-based probability calculations.
 *
 * Provides efficient count queries for card probability calculations without
 * fetching full card lists. Implementations must enforce exclusion rules:
 * - Normal slots exclude isSixPackOnly cards
 * - God packs exclude isSixPackOnly cards and only include god pack rarities
 * - Count queries must be accurate for the specific booster context
 */
export interface BoosterCardCountsAdapter {
  /**
   * Count cards by rarity and six-pack exclusivity for probability calculations.
   *
   * @param rarity - The rarity to count
   * @param isSixPackOnly - Whether to count only six-pack-only cards (true) or exclude them (false)
   * @returns Promise resolving to the count of matching cards
   */
  countByRarity(rarity: Rarity, isSixPackOnly: boolean): Promise<number>;

  /**
   * Count god pack eligible cards in the booster.
   *
   * Must exclude isSixPackOnly cards and only count god pack rarities:
   * ONE_STAR, TWO_STARS, THREE_STARS, ONE_SHINY, TWO_SHINY, CROWN
   *
   * @returns Promise resolving to the count of god pack eligible cards
   */
  countGodPackEligible(): Promise<number>;
}
