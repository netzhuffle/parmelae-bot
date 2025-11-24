import { Rarity } from '../../generated/prisma/enums.js';
import { injectable } from 'inversify';
import { PackProbabilityStrategy } from './PackProbabilityStrategy.js';

/** Strategy for 5-card packs without shiny cards */
@injectable()
export class FiveCardsWithoutShinyStrategy implements PackProbabilityStrategy {
  readonly cardsPerPack = 5;
  readonly packWeights = {
    normal: 0.9995,
    god: 0.0005,
  } as const;

  private readonly card4Distribution: ReadonlyMap<Rarity, number> = new Map([
    [Rarity.TWO_DIAMONDS, 0.9],
    [Rarity.THREE_DIAMONDS, 0.05],
    [Rarity.FOUR_DIAMONDS, 0.01666],
    [Rarity.ONE_STAR, 0.02572],
    [Rarity.TWO_STARS, 0.005],
    [Rarity.THREE_STARS, 0.00222],
    [Rarity.CROWN, 0.0004],
  ]);

  private readonly card5Distribution: ReadonlyMap<Rarity, number> = new Map([
    [Rarity.TWO_DIAMONDS, 0.6],
    [Rarity.THREE_DIAMONDS, 0.2],
    [Rarity.FOUR_DIAMONDS, 0.06664],
    [Rarity.ONE_STAR, 0.10288],
    [Rarity.TWO_STARS, 0.02],
    [Rarity.THREE_STARS, 0.00888],
    [Rarity.CROWN, 0.0016],
  ]);

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
    throw new Error(
      `Invalid slot ${slot} for FiveCardsWithoutShinyStrategy (expected 1-5)`,
    );
  }
}
