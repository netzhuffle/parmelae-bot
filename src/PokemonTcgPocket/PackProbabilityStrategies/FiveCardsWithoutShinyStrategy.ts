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

  private readonly slot1To3Distribution = new Map<Rarity, number>([
    [Rarity.ONE_DIAMOND, 1],
  ]);

  private readonly slot4Distribution: ReadonlyMap<Rarity, number> = new Map([
    [Rarity.TWO_DIAMONDS, 0.9],
    [Rarity.THREE_DIAMONDS, 0.05],
    [Rarity.FOUR_DIAMONDS, 0.01666],
    [Rarity.ONE_STAR, 0.02572],
    [Rarity.TWO_STARS, 0.005],
    [Rarity.THREE_STARS, 0.00222],
    [Rarity.CROWN, 0.0004],
  ]);

  private readonly slot5Distribution: ReadonlyMap<Rarity, number> = new Map([
    [Rarity.TWO_DIAMONDS, 0.6],
    [Rarity.THREE_DIAMONDS, 0.2],
    [Rarity.FOUR_DIAMONDS, 0.06664],
    [Rarity.ONE_STAR, 0.10288],
    [Rarity.TWO_STARS, 0.02],
    [Rarity.THREE_STARS, 0.00888],
    [Rarity.CROWN, 0.0016],
  ]);

  readonly slotDistributions = {
    1: this.slot1To3Distribution,
    2: this.slot1To3Distribution,
    3: this.slot1To3Distribution,
    4: this.slot4Distribution,
    5: this.slot5Distribution,
  } as const;

  readonly godPackRarities = new Set<Rarity>([
    Rarity.ONE_STAR,
    Rarity.TWO_STARS,
    Rarity.THREE_STARS,
    Rarity.CROWN,
    // ONE_SHINY, TWO_SHINY not included (strategy doesn't use shiny)
  ]);

  // No sixthCardFilterMode (no sixth card)
}
