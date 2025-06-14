import { PokemonCard, Rarity } from '@prisma/client';
import { injectable } from 'inversify';
import {
  NormalPackProbabilityStrategy,
  ShinyPackProbabilityStrategy,
} from './PackProbabilityStrategy.js';

/** Constants for pack probabilities and configurations */
interface PackConfiguration {
  /** Probability of getting a normal pack (99.95%) */
  readonly NORMAL_PACK_PROBABILITY: number;
  /** Probability of getting a god pack (0.05%) */
  readonly GOD_PACK_PROBABILITY: number;
  /** Number of cards in each pack */
  readonly CARDS_PER_PACK: number;
  /** Number of guaranteed ONE_DIAMOND cards at the start of a normal pack */
  readonly GUARANTEED_ONE_DIAMOND_CARDS: number;
}

export const PACK_CONFIG: PackConfiguration = {
  NORMAL_PACK_PROBABILITY: 0.9995,
  GOD_PACK_PROBABILITY: 0.0005,
  CARDS_PER_PACK: 5,
  GUARANTEED_ONE_DIAMOND_CARDS: 3,
} as const;

/** Set of rarities that can appear in god packs */
const GOD_PACK_RARITIES = new Set<Rarity>([
  Rarity.ONE_STAR,
  Rarity.TWO_STARS,
  Rarity.THREE_STARS,
  Rarity.ONE_SHINY,
  Rarity.TWO_SHINY,
  Rarity.CROWN,
]);

/** Service for calculating Pokemon TCG Pocket card probabilities */
@injectable()
export class PokemonTcgPocketProbabilityService {
  /** Set of diamond rarities */
  private readonly DIAMOND_RARITIES = new Set<Rarity>([
    Rarity.ONE_DIAMOND,
    Rarity.TWO_DIAMONDS,
    Rarity.THREE_DIAMONDS,
    Rarity.FOUR_DIAMONDS,
  ]);

  private readonly TRADABLE_RARITIES = new Set<Rarity>([
    Rarity.ONE_DIAMOND,
    Rarity.TWO_DIAMONDS,
    Rarity.THREE_DIAMONDS,
    Rarity.FOUR_DIAMONDS,
    Rarity.ONE_STAR,
  ]);

  private readonly normalStrategy = new NormalPackProbabilityStrategy();
  private readonly shinyStrategy = new ShinyPackProbabilityStrategy();

  /**
   * Calculates the probability of getting at least one new card from a booster pack.
   * This considers both normal packs (99.95%) and god packs (0.05%).
   */
  calculateNewCardProbability(
    boosterCards: PokemonCard[],
    missingCards: PokemonCard[],
    hasShinyRarity: boolean,
  ): number {
    return this.calculateNewCardProbabilityForRarities(
      boosterCards,
      missingCards,
      () => true,
      hasShinyRarity,
    );
  }

  /**
   * Calculates the probability of getting at least one new diamond card from a booster pack.
   * This considers only cards with rarities ♢, ♢♢, ♢♢♢, and ♢♢♢♢.
   */
  calculateNewDiamondCardProbability(
    boosterCards: PokemonCard[],
    missingCards: PokemonCard[],
    hasShinyRarity: boolean,
  ): number {
    return this.calculateNewCardProbabilityForRarities(
      boosterCards,
      missingCards,
      (card) => card.rarity !== null && this.DIAMOND_RARITIES.has(card.rarity),
      hasShinyRarity,
    );
  }

  /**
   * Calculates the probability of getting at least one new tradable card from a booster pack.
   * This considers only cards with rarities ♢, ♢♢, ♢♢♢, ♢♢♢♢, and ☆.
   */
  calculateNewTradableCardProbability(
    boosterCards: PokemonCard[],
    missingCards: PokemonCard[],
    hasShinyRarity: boolean,
  ): number {
    return this.calculateNewCardProbabilityForRarities(
      boosterCards,
      missingCards,
      (card) => card.rarity !== null && this.TRADABLE_RARITIES.has(card.rarity),
      hasShinyRarity,
    );
  }

  /**
   * Calculates the probability of getting at least one new card from a booster pack
   * that matches the given rarity filter.
   */
  private calculateNewCardProbabilityForRarities(
    boosterCards: PokemonCard[],
    missingCards: PokemonCard[],
    rarityFilter: (card: PokemonCard) => boolean,
    hasShinyRarity: boolean,
  ): number {
    const filteredBoosterCards = boosterCards.filter(rarityFilter);
    const filteredMissingCards = missingCards.filter(rarityFilter);

    if (
      filteredBoosterCards.length === 0 ||
      filteredMissingCards.length === 0
    ) {
      return 0.0;
    }

    const normalPackChance = this.computeNormalPackChance(
      filteredBoosterCards,
      filteredMissingCards,
      hasShinyRarity,
    );
    const godPackChance = this.computeGodPackChance(
      filteredBoosterCards,
      filteredMissingCards,
    );

    return this.combinePackProbabilities(normalPackChance, godPackChance);
  }

  /**
   * Combines the probabilities from normal and god packs using their respective weights
   */
  private combinePackProbabilities(
    normalPackChance: number,
    godPackChance: number,
  ): number {
    return (
      PACK_CONFIG.NORMAL_PACK_PROBABILITY * normalPackChance +
      PACK_CONFIG.GOD_PACK_PROBABILITY * godPackChance
    );
  }

  /**
   * Calculates the probability of getting at least one new card in a normal pack.
   * Normal packs have:
   * - First 3 cards: Guaranteed ONE_DIAMOND
   * - Fourth card: Distribution according to CARD4_RARITY_DISTRIBUTION
   * - Fifth card: Distribution according to CARD5_RARITY_DISTRIBUTION
   */
  private computeNormalPackChance(
    boosterCards: PokemonCard[],
    missingCards: PokemonCard[],
    hasShinyRarity: boolean,
  ): number {
    const probabilityNoNewCard = this.computeProbabilityNoNewCardInNormalPack(
      boosterCards,
      missingCards,
      hasShinyRarity,
    );
    return 1.0 - probabilityNoNewCard;
  }

  /**
   * Computes the probability of getting no new cards in a normal pack
   */
  private computeProbabilityNoNewCardInNormalPack(
    boosterCards: PokemonCard[],
    missingCards: PokemonCard[],
    hasShinyRarity: boolean,
  ): number {
    let probabilityNoNewCard = 1.0;

    // First three slots are guaranteed ONE_DIAMOND
    probabilityNoNewCard *= this.computeProbabilityNoNewCardInGuaranteedSlots(
      boosterCards,
      missingCards,
    );

    const strategy = hasShinyRarity ? this.shinyStrategy : this.normalStrategy;

    // Fourth slot uses CARD4_RARITY_DISTRIBUTION
    const pNoNewSlot4 =
      1.0 -
      this.computeNewCardProbabilityForDistribution(
        strategy.getCard4Distribution(),
        boosterCards,
        missingCards,
      );
    probabilityNoNewCard *= pNoNewSlot4;

    // Fifth slot uses CARD5_RARITY_DISTRIBUTION
    const pNoNewSlot5 =
      1.0 -
      this.computeNewCardProbabilityForDistribution(
        strategy.getCard5Distribution(),
        boosterCards,
        missingCards,
      );
    probabilityNoNewCard *= pNoNewSlot5;

    return probabilityNoNewCard;
  }

  /**
   * Computes the probability of getting no new cards in the guaranteed ONE_DIAMOND slots
   */
  private computeProbabilityNoNewCardInGuaranteedSlots(
    boosterCards: PokemonCard[],
    missingCards: PokemonCard[],
  ): number {
    const pNewInOneDiamondSlot = this.probabilityOfNewCardInRarity(
      Rarity.ONE_DIAMOND,
      boosterCards,
      missingCards,
    );
    const pNoNewInOneDiamondSlot = 1.0 - pNewInOneDiamondSlot;

    return Math.pow(
      pNoNewInOneDiamondSlot,
      PACK_CONFIG.GUARANTEED_ONE_DIAMOND_CARDS,
    );
  }

  /**
   * Calculates the probability of getting at least one new card in a god pack.
   * In a god pack:
   * - All 5 cards are from {⭐️, ⭐️⭐️, ⭐️⭐️⭐️, ✴️, ✴️✴️, 👑}
   * - Each eligible card has equal probability
   */
  private computeGodPackChance(
    boosterCards: PokemonCard[],
    missingCards: PokemonCard[],
  ): number {
    const { godPackCards, missingGodPackCards } = this.filterGodPackCards(
      boosterCards,
      missingCards,
    );

    if (godPackCards.length === 0) {
      return 0.0;
    }

    const probabilityNewCardInOneSlot =
      missingGodPackCards.length / godPackCards.length;
    const probabilityNoNewCardInOneSlot = 1.0 - probabilityNewCardInOneSlot;
    const probabilityNoNewCardInPack = Math.pow(
      probabilityNoNewCardInOneSlot,
      PACK_CONFIG.CARDS_PER_PACK,
    );

    return 1.0 - probabilityNoNewCardInPack;
  }

  /**
   * Filters cards that are eligible for god packs
   */
  private filterGodPackCards(
    boosterCards: PokemonCard[],
    missingCards: PokemonCard[],
  ): {
    godPackCards: PokemonCard[];
    missingGodPackCards: PokemonCard[];
  } {
    const godPackCards = boosterCards.filter((card) =>
      this.isGodPackCard(card),
    );
    const missingGodPackCards = missingCards.filter((card) =>
      this.isGodPackCard(card),
    );

    return { godPackCards, missingGodPackCards };
  }

  /**
   * Checks if a card is eligible for god packs
   */
  private isGodPackCard(card: PokemonCard): boolean {
    return card.rarity !== null && GOD_PACK_RARITIES.has(card.rarity);
  }

  /**
   * Calculates the probability of getting a new card for a slot with multiple possible rarities
   */
  private computeNewCardProbabilityForDistribution(
    distribution: Map<Rarity, number>,
    boosterCards: PokemonCard[],
    missingCards: PokemonCard[],
  ): number {
    let probabilityNewCard = 0.0;

    for (const [rarity, probability] of distribution) {
      const probabilityNewCardInRarity = this.probabilityOfNewCardInRarity(
        rarity,
        boosterCards,
        missingCards,
      );
      probabilityNewCard += probability * probabilityNewCardInRarity;
    }

    return probabilityNewCard;
  }

  /**
   * Calculates the probability of getting a new card of a specific rarity.
   * This is the number of missing cards of that rarity divided by the total
   * number of cards of that rarity in the booster.
   */
  private probabilityOfNewCardInRarity(
    rarity: Rarity,
    boosterCards: PokemonCard[],
    missingCards: PokemonCard[],
  ): number {
    const cardsInRarity = boosterCards.filter((card) => card.rarity === rarity);
    const missingCardsInRarity = missingCards.filter(
      (card) => card.rarity === rarity,
    );

    if (cardsInRarity.length === 0) {
      return 0.0;
    }

    return missingCardsInRarity.length / cardsInRarity.length;
  }
}
