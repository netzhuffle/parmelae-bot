import { Rarity } from '../generated/prisma/enums.js';

/** Interface for four-card pack probability strategies */
export interface FourCardPackProbabilityStrategy {
  /** Gets the number of cards per pack */
  getCardsPerPack(): 4;
  /** Gets the rarity distribution for a specific slot (1-4) */
  getSlotDistribution(slot: 1 | 2 | 3 | 4): ReadonlyMap<Rarity, number>;
}

/**
 * Strategy for four-card packs with guaranteed EX cards.
 *
 * Implements the `FOUR_CARDS_WITH_GUARANTEED_EX` probabilitiesType with
 * a fundamentally different pack structure from standard 5-card packs.
 *
 * **Pack Characteristics:**
 * - Always contains exactly **4 cards** (not 5)
 * - **Never contains six-pack-only** cards (incompatible mechanics)
 * - **Includes foil rarities** with ✦ symbol suffix
 *
 * **Slot Distribution System:**
 * - **Slot 1:** 100% ONE_DIAMOND (guaranteed common)
 * - **Slot 2:** 17.73% ONE_DIAMOND, 82.27% TWO_DIAMONDS
 * - **Slot 3:** Complex distribution including foil rarities (see SLOT3_DISTRIBUTION)
 * - **Slot 4:** 100% FOUR_DIAMONDS (guaranteed EX card)
 *
 * **Foil Rarity Integration:**
 * Slot 3 includes foil variants (ONE_DIAMOND_FOIL, TWO_DIAMONDS_FOIL,
 * THREE_DIAMONDS_FOIL) that trigger this pack type when detected in YAML data.
 *
 * **Normal Pack Probability Calculation:**
 * This strategy defines the slot distributions for normal four-card packs.
 * God pack handling is universal across all booster types and computed
 * separately in the probability service using the global god pack rarity pool.
 *
 * **Validation Rules:**
 * - All slot distributions must sum to 1.0 (validated in constructor)
 * - No negative probabilities allowed
 *
 * @see BoosterProbabilitiesType.FOUR_CARDS_WITH_GUARANTEED_EX
 * @see FourCardPackProbabilityStrategy interface
 * @see Task 61 for implementation requirements
 * @see Task 53 for probability calculation patterns
 */
export class FourCardGuaranteedExStrategy
  implements FourCardPackProbabilityStrategy
{
  /** Slot 1: 100% ONE_DIAMOND */
  private readonly SLOT1_DISTRIBUTION = new Map<Rarity, number>([
    [Rarity.ONE_DIAMOND, 1.0],
  ]);

  /** Slot 2: 17.73% ONE_DIAMOND, 82.27% TWO_DIAMONDS */
  private readonly SLOT2_DISTRIBUTION = new Map<Rarity, number>([
    [Rarity.ONE_DIAMOND, 0.1773],
    [Rarity.TWO_DIAMONDS, 0.8227],
  ]);

  /** Slot 3: Complex distribution with foil rarities */
  private readonly SLOT3_DISTRIBUTION = new Map<Rarity, number>([
    [Rarity.ONE_DIAMOND_FOIL, 0.23021],
    [Rarity.TWO_DIAMONDS_FOIL, 0.17986],
    [Rarity.THREE_DIAMONDS, 0.31663],
    [Rarity.THREE_DIAMONDS_FOIL, 0.08996],
    [Rarity.ONE_STAR, 0.12858],
    [Rarity.TWO_STARS, 0.025],
    [Rarity.THREE_STARS, 0.01111],
    [Rarity.TWO_SHINY, 0.01667],
    [Rarity.CROWN, 0.00198],
  ]);

  /** Slot 4: 100% FOUR_DIAMONDS */
  private readonly SLOT4_DISTRIBUTION = new Map<Rarity, number>([
    [Rarity.FOUR_DIAMONDS, 1.0],
  ]);

  constructor() {
    // Validate all distributions sum to 1.0 and contain no negative values
    this.validateDistribution(this.SLOT1_DISTRIBUTION, 'Slot 1');
    this.validateDistribution(this.SLOT2_DISTRIBUTION, 'Slot 2');
    this.validateDistribution(this.SLOT3_DISTRIBUTION, 'Slot 3');
    this.validateDistribution(this.SLOT4_DISTRIBUTION, 'Slot 4');
  }

  getCardsPerPack(): 4 {
    return 4;
  }

  getSlotDistribution(slot: 1 | 2 | 3 | 4): ReadonlyMap<Rarity, number> {
    switch (slot) {
      case 1:
        return this.SLOT1_DISTRIBUTION;
      case 2:
        return this.SLOT2_DISTRIBUTION;
      case 3:
        return this.SLOT3_DISTRIBUTION;
      case 4:
        return this.SLOT4_DISTRIBUTION;
    }
  }

  /**
   * Validates that a distribution sums to 1.0 (within tolerance) and has no negative values
   */
  private validateDistribution(
    distribution: Map<Rarity, number>,
    slotName: string,
  ): void {
    const sum = Array.from(distribution.values()).reduce(
      (acc, prob) => acc + prob,
      0,
    );
    const tolerance = 0.0001;

    if (Math.abs(sum - 1.0) > tolerance) {
      throw new Error(`${slotName} distribution does not sum to 1.0: ${sum}`);
    }

    for (const [rarity, probability] of distribution) {
      if (probability < 0) {
        throw new Error(
          `${slotName} has negative probability for ${rarity}: ${probability}`,
        );
      }
    }
  }
}
