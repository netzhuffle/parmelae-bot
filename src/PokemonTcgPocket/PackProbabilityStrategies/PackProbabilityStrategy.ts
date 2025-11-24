import { Rarity } from '../../generated/prisma/enums.js';

/**
 * Interface for pack probability strategies.
 */
export interface PackProbabilityStrategy {
  /** Number of cards in the *normal* pack. */
  readonly cardsPerPack: number;

  /**
   * Weights for choosing between normal, god, and optional six-card packs.
   * - For 4- and 5-card-only packs: { normal, god }
   * - For packs with a potential sixth card: { normal, god, six }
   */
  readonly packWeights: {
    readonly normal: number;
    readonly god: number;
    readonly six?: number;
  };

  /**
   * Rarity distribution for a given slot (1-based).
   */
  getSlotDistribution(slot: number): ReadonlyMap<Rarity, number>;

  /**
   * Optional configuration for an extra card (always slot 6 when present).
   *
   * If true, cards marked isSixPackOnly are excluded from slots 1 to 5, even if rarity
   * matches, and only these cards will be used for the rarities in slot 6.
   * Otherwise, all cards of the given rarities will be used for all 6 slots.
   */
  readonly sixPackConfig?: {
    readonly useIsSixPackOnly: boolean;
  };
}
