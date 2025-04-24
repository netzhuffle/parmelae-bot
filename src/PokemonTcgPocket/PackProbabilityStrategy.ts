import { Rarity } from '@prisma/client';

/** Interface for pack probability strategies */
export interface PackProbabilityStrategy {
  /** Gets the rarity distribution for the fourth card in a pack */
  getCard4Distribution(): Map<Rarity, number>;
  /** Gets the rarity distribution for the fifth card in a pack */
  getCard5Distribution(): Map<Rarity, number>;
}

/** Strategy for normal boosters without shiny cards */
export class NormalPackProbabilityStrategy implements PackProbabilityStrategy {
  private readonly CARD4_RARITY_DISTRIBUTION = new Map<Rarity, number>([
    [Rarity.TWO_DIAMONDS, 0.9],
    [Rarity.THREE_DIAMONDS, 0.05],
    [Rarity.FOUR_DIAMONDS, 0.01666],
    [Rarity.ONE_STAR, 0.02572],
    [Rarity.TWO_STARS, 0.005],
    [Rarity.THREE_STARS, 0.00222],
    [Rarity.CROWN, 0.0004],
  ]);

  private readonly CARD5_RARITY_DISTRIBUTION = new Map<Rarity, number>([
    [Rarity.TWO_DIAMONDS, 0.6],
    [Rarity.THREE_DIAMONDS, 0.2],
    [Rarity.FOUR_DIAMONDS, 0.06664],
    [Rarity.ONE_STAR, 0.10288],
    [Rarity.TWO_STARS, 0.02],
    [Rarity.THREE_STARS, 0.00888],
    [Rarity.CROWN, 0.0016],
  ]);

  getCard4Distribution(): Map<Rarity, number> {
    return this.CARD4_RARITY_DISTRIBUTION;
  }

  getCard5Distribution(): Map<Rarity, number> {
    return this.CARD5_RARITY_DISTRIBUTION;
  }
}

/** Strategy for boosters with shiny cards */
export class ShinyPackProbabilityStrategy implements PackProbabilityStrategy {
  private readonly CARD4_RARITY_DISTRIBUTION = new Map<Rarity, number>([
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

  private readonly CARD5_RARITY_DISTRIBUTION = new Map<Rarity, number>([
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

  getCard4Distribution(): Map<Rarity, number> {
    return this.CARD4_RARITY_DISTRIBUTION;
  }

  getCard5Distribution(): Map<Rarity, number> {
    return this.CARD5_RARITY_DISTRIBUTION;
  }
}
