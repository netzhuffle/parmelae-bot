import { Rarity } from '../../generated/prisma/enums.js';
import { injectable } from 'inversify';
import { PackProbabilityStrategy } from './PackProbabilityStrategy.js';

/** Strategy for 5-card packs with potential 6th card from baby-exclusive pool */
@injectable()
export class BabyAsPotentialSixthCardStrategy implements PackProbabilityStrategy {
  readonly cardsPerPack = 5;
  readonly packWeights = {
    normal: 0.9162,
    god: 0.0005,
    six: 0.0833,
  } as const;

  private readonly slot1To3Distribution = new Map<Rarity, number>([
    [Rarity.ONE_DIAMOND, 1],
  ]);

  private readonly slot4Distribution: ReadonlyMap<Rarity, number> = new Map([
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

  private readonly slot5Distribution: ReadonlyMap<Rarity, number> = new Map([
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
    Rarity.ONE_SHINY,
    Rarity.TWO_SHINY,
    Rarity.CROWN,
  ]);

  readonly sixthCardFilterMode = 'flag-based' as const;
}
