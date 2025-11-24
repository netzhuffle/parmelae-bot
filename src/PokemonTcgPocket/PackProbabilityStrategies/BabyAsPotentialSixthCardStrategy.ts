import { Rarity } from '../../generated/prisma/enums.js';
import { injectable } from 'inversify';
import { PackProbabilityStrategy } from './PackProbabilityStrategy.js';

/** Strategy for 5-card packs with potential 6th card from baby-exclusive pool */
@injectable()
export class BabyAsPotentialSixthCardStrategy
  implements PackProbabilityStrategy
{
  readonly cardsPerPack = 5;
  readonly packWeights = {
    normal: 0.9162,
    god: 0.0005,
    six: 0.0833,
  } as const;

  private readonly card4Distribution: ReadonlyMap<Rarity, number> = new Map([
    [Rarity.TWO_DIAMONDS, 0.89],
    [Rarity.THREE_DIAMONDS, 0.04952],
    [Rarity.FOUR_DIAMONDS, 0.01666],
    [Rarity.ONE_STAR, 0.02572],
    [Rarity.TWO_STARS, 0.005],
    [Rarity.THREE_STARS, 0.00222],
    [Rarity.ONE_SHINY, 0.00714],
    [Rarity.TWO_SHINY, 0.00333],
    [Rarity.CROWN, 0.0004],
  ]);

  private readonly card5Distribution: ReadonlyMap<Rarity, number> = new Map([
    [Rarity.TWO_DIAMONDS, 0.56],
    [Rarity.THREE_DIAMONDS, 0.1981],
    [Rarity.FOUR_DIAMONDS, 0.06664],
    [Rarity.ONE_STAR, 0.10288],
    [Rarity.TWO_STARS, 0.02],
    [Rarity.THREE_STARS, 0.00888],
    [Rarity.ONE_SHINY, 0.02857],
    [Rarity.TWO_SHINY, 0.01333],
    [Rarity.CROWN, 0.0016],
  ]);

  private readonly slot6Distribution: ReadonlyMap<Rarity, number> = new Map([
    [Rarity.ONE_STAR, 0.129],
    [Rarity.THREE_DIAMONDS, 0.871],
  ]);

  readonly sixPackConfig = {
    useIsSixPackOnly: true,
  } as const;

  getSlotDistribution(slot: number): ReadonlyMap<Rarity, number> {
    if (slot >= 1 && slot <= 3) {
      // Slots 1-3: 100% ONE_DIAMOND
      return new Map([[Rarity.ONE_DIAMOND, 1]]);
    }
    if (slot === 4) {
      return this.card4Distribution;
    }
    if (slot === 5) {
      return this.card5Distribution;
    }
    if (slot === 6) {
      return this.slot6Distribution;
    }
    throw new Error(
      `Invalid slot ${slot} for BabyAsPotentialSixthCardStrategy (expected 1-6)`,
    );
  }
}
