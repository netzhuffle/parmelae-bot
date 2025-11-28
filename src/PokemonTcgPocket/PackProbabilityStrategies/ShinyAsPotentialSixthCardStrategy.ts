import { Rarity } from '../../generated/prisma/enums.js';
import { injectable } from 'inversify';
import { PackProbabilityStrategy } from './PackProbabilityStrategy.js';

/**
 * Strategy for B1 and future non-A sets with shiny rarities as potential sixth card.
 *
 * Key behaviors:
 * - Slots 1-5 use non-shiny rarities only
 * - Slot 6 uses shiny rarities only (ONE_SHINY, TWO_SHINY)
 * - God packs exclude shiny rarities
 * - Uses rarity-based filtering (no isSixPackOnly flag needed)
 */
@injectable()
export class ShinyAsPotentialSixthCardStrategy implements PackProbabilityStrategy {
  readonly cardsPerPack = 5;

  readonly packWeights = {
    normal: 0.947115,
    god: 0.0005,
    six: 0.052385,
  } as const;

  private readonly slot1To3Distribution = new Map<Rarity, number>([
    [Rarity.ONE_DIAMOND, 1],
  ]);

  private readonly slot4Distribution: ReadonlyMap<Rarity, number> = new Map([
    [Rarity.TWO_DIAMONDS, 0.89999],
    [Rarity.THREE_DIAMONDS, 0.05],
    [Rarity.FOUR_DIAMONDS, 0.01667],
    [Rarity.ONE_STAR, 0.02572],
    [Rarity.TWO_STARS, 0.005],
    [Rarity.THREE_STARS, 0.00222],
    [Rarity.CROWN, 0.0004],
  ]);

  private readonly slot5Distribution: ReadonlyMap<Rarity, number> = new Map([
    [Rarity.TWO_DIAMONDS, 0.59998],
    [Rarity.THREE_DIAMONDS, 0.2],
    [Rarity.FOUR_DIAMONDS, 0.06667],
    [Rarity.ONE_STAR, 0.10286],
    [Rarity.TWO_STARS, 0.02],
    [Rarity.THREE_STARS, 0.00889],
    [Rarity.CROWN, 0.0016],
  ]);

  private readonly slot6Distribution: ReadonlyMap<Rarity, number> = new Map([
    [Rarity.ONE_SHINY, 0.6818],
    [Rarity.TWO_SHINY, 0.3182],
  ]);

  readonly slotDistributions = {
    1: this.slot1To3Distribution,
    2: this.slot1To3Distribution,
    3: this.slot1To3Distribution,
    4: this.slot4Distribution,
    5: this.slot5Distribution,
    6: this.slot6Distribution,
  } as const;

  readonly godPackRarities = new Set<Rarity>([
    Rarity.ONE_STAR,
    Rarity.TWO_STARS,
    Rarity.THREE_STARS,
    Rarity.CROWN,
    // ONE_SHINY and TWO_SHINY explicitly excluded from god packs
  ]);

  readonly sixthCardFilterMode = 'rarity-based' as const;
}
