import { Rarity } from '../../generated/prisma/enums.js';

/**
 * Interface for pack probability strategies.
 *
 * All strategies are pure configuration data - no methods, just declarative fields
 * that define "which rarities appear where" in different pack types.
 */
export interface PackProbabilityStrategy {
  /** Number of cards in the normal pack (before potential sixth card) */
  readonly cardsPerPack: number;

  /**
   * Weights for different pack types.
   * Sum must equal 1.0.
   *
   * - For 4- and 5-card-only packs: { normal, god }
   * - For packs with a potential sixth card: { normal, god, six }
   */
  readonly packWeights: {
    readonly normal: number;
    readonly god: number;
    readonly six?: number;
  };

  /**
   * Rarity distribution for each slot (1-based slot numbers).
   * Each map's values must sum to 1.0.
   *
   * For 5-card strategies: slots 1-5 required
   * For 6-card strategies: slots 1-6 required (slot 6 is the potential extra card)
   * For 4-card strategies: slots 1-4 required
   */
  readonly slotDistributions: {
    readonly 1: ReadonlyMap<Rarity, number>;
    readonly 2: ReadonlyMap<Rarity, number>;
    readonly 3: ReadonlyMap<Rarity, number>;
    readonly 4: ReadonlyMap<Rarity, number>;
    readonly 5?: ReadonlyMap<Rarity, number>;
    readonly 6?: ReadonlyMap<Rarity, number>;
  };

  /**
   * Which rarities are eligible for god packs.
   * Different strategies may exclude different rarities.
   *
   * Example (most strategies):
   *   [ONE_STAR, TWO_STARS, THREE_STARS, ONE_SHINY, TWO_SHINY, CROWN]
   *
   * Example (B1 - excludes shiny):
   *   [ONE_STAR, TWO_STARS, THREE_STARS, CROWN]
   */
  readonly godPackRarities: ReadonlySet<Rarity>;

  /**
   * How to filter cards for the sixth slot (if six-card packs exist).
   *
   * - 'flag-based':
   *   Slots 1-5 and god packs use cards where isSixPackOnly=false
   *   Slot 6 uses cards where isSixPackOnly=true
   *   Used by: A4 sets with baby-exclusive cards
   *
   * - 'rarity-based':
   *   All slots use all cards matching their rarity distributions
   *   The isSixPackOnly flag is ignored
   *   Used by: B1 sets where slot rarities naturally separate cards
   *
   * - undefined: No sixth card exists for this strategy
   */
  readonly sixthCardFilterMode?: 'flag-based' | 'rarity-based';
}
