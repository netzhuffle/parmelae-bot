import { Rarity } from '../../generated/prisma/enums.js';
import { injectable } from 'inversify';
import { PackProbabilityStrategy } from './PackProbabilityStrategy.js';

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
 * THREE_DIAMONDS_FOIL).
 *
 * **Normal Pack Probability Calculation:**
 * This strategy defines the slot distributions for normal four-card packs.
 * God pack handling is universal across all booster types and computed
 * separately in the probability service using the global god pack rarity pool.
 *
 */
@injectable()
export class FourCardGuaranteedExStrategy implements PackProbabilityStrategy {
  readonly cardsPerPack = 4;
  readonly packWeights = {
    normal: 0.9995,
    god: 0.0005,
  } as const;

  /** Slot 1: 100% ONE_DIAMOND */
  private readonly slot1Distribution = new Map<Rarity, number>([
    [Rarity.ONE_DIAMOND, 1.0],
  ]);

  /** Slot 2: 17.73% ONE_DIAMOND, 82.27% TWO_DIAMONDS */
  private readonly slot2Distribution = new Map<Rarity, number>([
    [Rarity.ONE_DIAMOND, 0.1773],
    [Rarity.TWO_DIAMONDS, 0.8227],
  ]);

  /** Slot 3: Complex distribution with foil rarities */
  private readonly slot3Distribution = new Map<Rarity, number>([
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
  private readonly slot4Distribution = new Map<Rarity, number>([
    [Rarity.FOUR_DIAMONDS, 1.0],
  ]);

  readonly slotDistributions = {
    1: this.slot1Distribution,
    2: this.slot2Distribution,
    3: this.slot3Distribution,
    4: this.slot4Distribution,
  } as const;

  readonly godPackRarities = new Set<Rarity>([
    Rarity.ONE_STAR,
    Rarity.TWO_STARS,
    Rarity.THREE_STARS,
    Rarity.TWO_SHINY,
    Rarity.CROWN,
    // ONE_SHINY excluded (not in 4-card pack strategy)
  ]);

  // No sixthCardFilterMode (4-card packs only)
}
