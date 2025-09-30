import { PokemonCardModel } from '../generated/prisma/models/PokemonCard.js';
import { Rarity, BoosterProbabilitiesType } from '../generated/prisma/enums.js';
import { injectable } from 'inversify';
import { NotExhaustiveSwitchError } from '../NotExhaustiveSwitchError.js';
import {
  NormalPackProbabilityStrategy,
  ShinyPackProbabilityStrategy,
} from './PackProbabilityStrategy.js';
import { FourCardGuaranteedExStrategy } from './FourCardGuaranteedExStrategy.js';

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

/** Weights for boosters that support six-card packs */
const SIX_PACK_WEIGHTS = {
  NORMAL_PACK_PROBABILITY: 0.9162,
  GOD_PACK_PROBABILITY: 0.0005,
  SIX_PACK_PROBABILITY: 0.0833,
} as const;

/** Rarity distribution for the 6th card in six-card packs */
const SIX_PACK_SLOT6_RARITY_WEIGHTS = {
  ONE_STAR: 0.129,
  THREE_DIAMONDS: 0.871,
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

/**
 * Service for calculating Pokemon TCG Pocket card probabilities.
 *
 * High-level flow:
 * - Determine pack type weights (normal/god, or normal/god/six when six-packs exist)
 * - Compute probability of no new card in the first five slots (shared for normal and six-packs)
 * - For six-packs, compute sixth-slot probability from isSixPackOnly pools
 * - Combine branch probabilities with their weights
 */
@injectable()
export class PokemonTcgPocketProbabilityService {
  /** Set of diamond rarities */
  private readonly DIAMOND_RARITIES = new Set<Rarity>([
    Rarity.ONE_DIAMOND,
    Rarity.ONE_DIAMOND_FOIL,
    Rarity.TWO_DIAMONDS,
    Rarity.TWO_DIAMONDS_FOIL,
    Rarity.THREE_DIAMONDS,
    Rarity.THREE_DIAMONDS_FOIL,
    Rarity.FOUR_DIAMONDS,
  ]);

  private readonly TRADABLE_RARITIES = new Set<Rarity>([
    Rarity.ONE_DIAMOND,
    Rarity.ONE_DIAMOND_FOIL,
    Rarity.TWO_DIAMONDS,
    Rarity.TWO_DIAMONDS_FOIL,
    Rarity.THREE_DIAMONDS,
    Rarity.THREE_DIAMONDS_FOIL,
    Rarity.FOUR_DIAMONDS,
    Rarity.ONE_STAR,
  ]);

  private readonly normalStrategy = new NormalPackProbabilityStrategy();
  private readonly shinyStrategy = new ShinyPackProbabilityStrategy();
  private readonly fourCardStrategy = new FourCardGuaranteedExStrategy();

  /**
   * Determines if the probabilities type includes shiny rarity cards
   */
  private hasShinyRarity(probabilitiesType: BoosterProbabilitiesType): boolean {
    switch (probabilitiesType) {
      case BoosterProbabilitiesType.NO_SHINY_RARITY:
      case BoosterProbabilitiesType.FOUR_CARDS_WITH_GUARANTEED_EX:
        return false;
      case BoosterProbabilitiesType.DEFAULT:
      case BoosterProbabilitiesType.POTENTIAL_SIXTH_CARD:
        return true;
      default:
        throw new NotExhaustiveSwitchError(probabilitiesType);
    }
  }

  /**
   * Determines if the probabilities type supports six-card packs
   */
  private hasSixPacks(probabilitiesType: BoosterProbabilitiesType): boolean {
    switch (probabilitiesType) {
      case BoosterProbabilitiesType.NO_SHINY_RARITY:
      case BoosterProbabilitiesType.DEFAULT:
      case BoosterProbabilitiesType.FOUR_CARDS_WITH_GUARANTEED_EX:
        return false;
      case BoosterProbabilitiesType.POTENTIAL_SIXTH_CARD:
        return true;
      default:
        throw new NotExhaustiveSwitchError(probabilitiesType);
    }
  }

  /**
   * Determines if a booster uses four-card pack mechanics.
   *
   * Four-card packs have fundamentally different probability calculations:
   * - Use FourCardGuaranteedExStrategy instead of standard slot logic
   * - Two-way weighting (normal + god) applies; god pack chance is 0.05% using 4 cards
   * - Use 4 slots instead of 5 slots
   * - Include foil rarities in distributions
   *
   * @param probabilitiesType - The booster's probability calculation type
   * @returns true if this is a four-card pack, false for standard 5-card packs
   *
   * @see FourCardGuaranteedExStrategy for four-card pack implementation
   * @see computeFourCardPackChance for four-card probability calculations
   */
  private isFourCardPack(probabilitiesType: BoosterProbabilitiesType): boolean {
    switch (probabilitiesType) {
      case BoosterProbabilitiesType.NO_SHINY_RARITY:
      case BoosterProbabilitiesType.DEFAULT:
      case BoosterProbabilitiesType.POTENTIAL_SIXTH_CARD:
        return false;
      case BoosterProbabilitiesType.FOUR_CARDS_WITH_GUARANTEED_EX:
        return true;
      default:
        throw new NotExhaustiveSwitchError(probabilitiesType);
    }
  }

  /**
   * Calculates the probability of getting at least one new card from a booster pack.
   * This considers both normal packs (99.95%) and god packs (0.05%).
   */
  calculateNewCardProbability(
    boosterCards: PokemonCardModel[],
    missingCards: PokemonCardModel[],
    probabilitiesType: BoosterProbabilitiesType,
  ): number {
    return this.calculateNewCardProbabilityForRarities(
      boosterCards,
      missingCards,
      () => true,
      probabilitiesType,
    );
  }

  /**
   * Calculates the probability of getting at least one new diamond card from a booster pack.
   * This considers only cards with rarities ♢, ♢♢, ♢♢♢, and ♢♢♢♢.
   */
  calculateNewDiamondCardProbability(
    boosterCards: PokemonCardModel[],
    missingCards: PokemonCardModel[],
    probabilitiesType: BoosterProbabilitiesType,
  ): number {
    return this.calculateNewCardProbabilityForRarities(
      boosterCards,
      missingCards,
      (card) => card.rarity !== null && this.DIAMOND_RARITIES.has(card.rarity),
      probabilitiesType,
    );
  }

  /**
   * Calculates the probability of getting at least one new tradable card from a booster pack.
   * This considers only cards with rarities ♢, ♢♢, ♢♢♢, ♢♢♢♢, and ☆.
   */
  calculateNewTradableCardProbability(
    boosterCards: PokemonCardModel[],
    missingCards: PokemonCardModel[],
    probabilitiesType: BoosterProbabilitiesType,
  ): number {
    return this.calculateNewCardProbabilityForRarities(
      boosterCards,
      missingCards,
      (card) => card.rarity !== null && this.TRADABLE_RARITIES.has(card.rarity),
      probabilitiesType,
    );
  }

  /**
   * Calculates the probability of getting at least one new card from a booster pack
   * that matches the given rarity filter.
   */
  private calculateNewCardProbabilityForRarities(
    boosterCards: PokemonCardModel[],
    missingCards: PokemonCardModel[],
    rarityFilter: (card: PokemonCardModel) => boolean,
    probabilitiesType: BoosterProbabilitiesType,
  ): number {
    const filteredBoosterCards = boosterCards.filter(rarityFilter);
    const filteredMissingCards = missingCards.filter(rarityFilter);

    if (
      filteredBoosterCards.length === 0 ||
      filteredMissingCards.length === 0
    ) {
      return 0.0;
    }

    // Handle four-card packs with god pack support
    if (this.isFourCardPack(probabilitiesType)) {
      const normalFourCardChance = this.computeFourCardPackChance(
        filteredBoosterCards,
        filteredMissingCards,
      );
      const godFourCardChance = this.computeGodPackChance(
        filteredBoosterCards,
        filteredMissingCards,
        4, // Four-card god packs contain 4 cards
      );
      return this.combinePackProbabilities(
        normalFourCardChance,
        godFourCardChance,
      );
    }

    const normalPackChance = this.computeNormalPackChance(
      filteredBoosterCards,
      filteredMissingCards,
      this.hasShinyRarity(probabilitiesType),
    );
    const godPackChance = this.computeGodPackChance(
      filteredBoosterCards,
      filteredMissingCards,
    );
    const hasSixPacks = this.hasSixPacks(probabilitiesType);
    if (!hasSixPacks) {
      return this.combinePackProbabilities(normalPackChance, godPackChance);
    }

    const sixPackChance = this.computeSixPackChance(
      filteredBoosterCards,
      filteredMissingCards,
      this.hasShinyRarity(probabilitiesType),
    );
    return this.combinePackProbabilities3(
      normalPackChance,
      godPackChance,
      sixPackChance,
    );
  }

  /**
   * Determines whether a booster supports six-card packs by checking for cards
   * flagged with `isSixPackOnly`. Used for branching into three-way weighting.
   */
  private isSixPackBooster(boosterCards: PokemonCardModel[]): boolean {
    return boosterCards.some((card) => card.isSixPackOnly === true);
  }

  /**
   * Combines the probabilities from normal and god packs using their respective weights
   */
  private combinePackProbabilities(
    normalPackChance: number,
    godPackChance: number,
  ): number {
    return this.combinePackProbabilitiesFrom(
      {
        NORMAL_PACK_PROBABILITY: PACK_CONFIG.NORMAL_PACK_PROBABILITY,
        GOD_PACK_PROBABILITY: PACK_CONFIG.GOD_PACK_PROBABILITY,
      },
      { normal: normalPackChance, god: godPackChance },
    );
  }

  /**
   * Combines probabilities from normal, god, and six-card packs using six-pack weights
   * Only used when boosters support six-card packs
   */
  private combinePackProbabilities3(
    normalPackChance: number,
    godPackChance: number,
    sixPackChance: number,
  ): number {
    return this.combinePackProbabilitiesFrom(
      {
        NORMAL_PACK_PROBABILITY: SIX_PACK_WEIGHTS.NORMAL_PACK_PROBABILITY,
        GOD_PACK_PROBABILITY: SIX_PACK_WEIGHTS.GOD_PACK_PROBABILITY,
        SIX_PACK_PROBABILITY: SIX_PACK_WEIGHTS.SIX_PACK_PROBABILITY,
      },
      { normal: normalPackChance, god: godPackChance, six: sixPackChance },
    );
  }

  /**
   * Generic combinator for weighted pack probability parts
   */
  private combinePackProbabilitiesFrom(
    weights: {
      readonly NORMAL_PACK_PROBABILITY: number;
      readonly GOD_PACK_PROBABILITY: number;
      readonly SIX_PACK_PROBABILITY?: number;
    },
    parts: {
      readonly normal: number;
      readonly god: number;
      readonly six?: number;
    },
  ): number {
    const base =
      weights.NORMAL_PACK_PROBABILITY * parts.normal +
      weights.GOD_PACK_PROBABILITY * parts.god;
    if (weights.SIX_PACK_PROBABILITY !== undefined && parts.six !== undefined) {
      return base + weights.SIX_PACK_PROBABILITY * parts.six;
    }
    return base;
  }

  /**
   * Calculates the probability of getting at least one new card in a normal pack.
   * Normal packs have:
   * - First 3 cards: Guaranteed ONE_DIAMOND
   * - Fourth card: Distribution according to CARD4_RARITY_DISTRIBUTION
   * - Fifth card: Distribution according to CARD5_RARITY_DISTRIBUTION
   */
  private computeNormalPackChance(
    boosterCards: PokemonCardModel[],
    missingCards: PokemonCardModel[],
    hasShinyRarity: boolean,
  ): number {
    const probabilityNoNewCard =
      this.computeProbabilityNoNewCardInFirstFiveSlots(
        boosterCards,
        missingCards,
        hasShinyRarity,
      );
    return 1.0 - probabilityNoNewCard;
  }

  /**
   * Computes the probability of getting no new cards in the first five slots
   */
  private computeProbabilityNoNewCardInFirstFiveSlots(
    boosterCards: PokemonCardModel[],
    missingCards: PokemonCardModel[],
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
      this.computeNewCardProbabilityAcrossRarities(
        strategy.getCard4Distribution(),
        boosterCards,
        missingCards,
      );
    probabilityNoNewCard *= pNoNewSlot4;

    // Fifth slot uses CARD5_RARITY_DISTRIBUTION
    const pNoNewSlot5 =
      1.0 -
      this.computeNewCardProbabilityAcrossRarities(
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
    boosterCards: PokemonCardModel[],
    missingCards: PokemonCardModel[],
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
   * - All cards are from {⭐️, ⭐️⭐️, ⭐️⭐️⭐️, ✴️, ✴️✴️, 👑}
   * - Each eligible card has equal probability
   *
   * @param boosterCards - All cards available in this booster
   * @param missingCards - Cards the user doesn't own yet
   * @param cardsPerPack - Number of cards in the pack (4 for four-card packs, 5 for others)
   * @returns Probability of getting at least one new card in a god pack
   */
  private computeGodPackChance(
    boosterCards: PokemonCardModel[],
    missingCards: PokemonCardModel[],
    cardsPerPack: number = PACK_CONFIG.CARDS_PER_PACK,
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
      cardsPerPack,
    );

    return 1.0 - probabilityNoNewCardInPack;
  }

  /**
   * Filters cards that are eligible for god packs
   */
  private filterGodPackCards(
    boosterCards: PokemonCardModel[],
    missingCards: PokemonCardModel[],
  ): {
    godPackCards: PokemonCardModel[];
    missingGodPackCards: PokemonCardModel[];
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
  private isGodPackCard(card: PokemonCardModel): boolean {
    return (
      card.rarity !== null &&
      GOD_PACK_RARITIES.has(card.rarity) &&
      !card.isSixPackOnly
    );
  }

  /**
   * Calculates the probability of getting a new card for a slot with multiple possible rarities
   */
  private computeNewCardProbabilityAcrossRarities(
    distribution: Map<Rarity, number>,
    boosterCards: PokemonCardModel[],
    missingCards: PokemonCardModel[],
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
   * Calculates the probability of getting at least one new card in a six-card pack.
   * Slots 1–5 follow the normal pack logic; the 6th slot uses the isSixPackOnly pools
   * with rarity distribution: 1★ = 12.9%, 3◆ = 87.1%.
   */
  private computeSixPackChance(
    boosterCards: PokemonCardModel[],
    missingCards: PokemonCardModel[],
    hasShinyRarity: boolean,
  ): number {
    // Probability of no new card in slots 1–5 (identical to normal pack)
    const pNoNewSlots1to5 = this.computeProbabilityNoNewCardInFirstFiveSlots(
      boosterCards,
      missingCards,
      hasShinyRarity,
    );

    // Probability of a new card in slot 6 from isSixPackOnly pools
    const pNewInSixth = this.computeNewCardProbabilityInSixthSlot(
      boosterCards,
      missingCards,
    );

    const pNoNewInSixPack = pNoNewSlots1to5 * (1.0 - pNewInSixth);
    return 1.0 - pNoNewInSixPack;
  }

  /**
   * Computes probability of a new card in the sixth slot of a six-card pack.
   * Only cards with isSixPackOnly are eligible. Rarity distribution:
   * P(1★) = 0.129, P(3◆) = 0.871. Within a rarity tier, uniform split.
   */
  private computeNewCardProbabilityInSixthSlot(
    boosterCards: PokemonCardModel[],
    missingCards: PokemonCardModel[],
  ): number {
    const all1Star = boosterCards.filter(
      (c) => c.isSixPackOnly && c.rarity === Rarity.ONE_STAR,
    );
    const missing1Star = missingCards.filter(
      (c) => c.isSixPackOnly && c.rarity === Rarity.ONE_STAR,
    );

    const all3Diamonds = boosterCards.filter(
      (c) => c.isSixPackOnly && c.rarity === Rarity.THREE_DIAMONDS,
    );
    const missing3Diamonds = missingCards.filter(
      (c) => c.isSixPackOnly && c.rarity === Rarity.THREE_DIAMONDS,
    );

    let probabilityNewCard = 0.0;

    if (all1Star.length > 0) {
      probabilityNewCard +=
        SIX_PACK_SLOT6_RARITY_WEIGHTS.ONE_STAR *
        (missing1Star.length / all1Star.length);
    }
    if (all3Diamonds.length > 0) {
      probabilityNewCard +=
        SIX_PACK_SLOT6_RARITY_WEIGHTS.THREE_DIAMONDS *
        (missing3Diamonds.length / all3Diamonds.length);
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
    boosterCards: PokemonCardModel[],
    missingCards: PokemonCardModel[],
  ): number {
    // Treat isSixPackOnly cards as non-existent for slots 1–5 and god packs
    const cardsInRarity = boosterCards.filter(
      (card) => card.rarity === rarity && !card.isSixPackOnly,
    );
    const missingCardsInRarity = missingCards.filter(
      (card) => card.rarity === rarity && !card.isSixPackOnly,
    );

    if (cardsInRarity.length === 0) {
      return 0.0;
    }

    return missingCardsInRarity.length / cardsInRarity.length;
  }

  /**
   * Calculates the probability of getting at least one new card in a four-card pack.
   *
   * **Four-Card Pack Logic:**
   * Unlike standard 5-card packs, four-card packs use a completely different
   * probability calculation system with 4 slots. Two-way weighting (normal + god)
   * applies; god pack chance is 0.05% using 4 cards.
   *
   * **Calculation Method:**
   * 1. For each slot (1-4), get the rarity distribution from FourCardGuaranteedExStrategy
   * 2. Calculate probability of NOT getting a new card in that slot
   * 3. Multiply all "no new card" probabilities together
   * 4. Return 1 - (combined no new card probability)
   *
   * **Slot Characteristics:**
   * - Slot 1: Always ONE_DIAMOND (common cards)
   * - Slot 2: Mix of ONE_DIAMOND and TWO_DIAMONDS
   * - Slot 3: Complex distribution including foil rarities
   * - Slot 4: Always FOUR_DIAMONDS (guaranteed EX)
   *
   * **Foil Rarity Handling:**
   * Foil rarities (♢✦, ♢♢✦, ♢♢♢✦) are included in slot distributions
   * and treated as first-class rarities, not mappings of base rarities.
   *
   * @param boosterCards - All cards available in this booster
   * @param missingCards - Cards the user doesn't own yet
   * @returns Probability (0.0-1.0) of getting at least one new card
   *
   * @see FourCardGuaranteedExStrategy for slot distributions
   * @see computeNoNewCardProbabilityForSlot for per-slot calculations
   * @see Task 61 for four-card pack requirements
   */
  private computeFourCardPackChance(
    boosterCards: PokemonCardModel[],
    missingCards: PokemonCardModel[],
  ): number {
    // Calculate probability of no new card in each slot independently
    let probabilityNoNewCard = 1.0;

    for (let slot = 1; slot <= 4; slot++) {
      const slotDistribution = this.fourCardStrategy.getSlotDistribution(
        slot as 1 | 2 | 3 | 4,
      );
      const probabilityNoNewInSlot = this.computeNoNewCardProbabilityForSlot(
        slotDistribution,
        boosterCards,
        missingCards,
      );
      probabilityNoNewCard *= probabilityNoNewInSlot;
    }

    return 1.0 - probabilityNoNewCard;
  }

  /**
   * Computes the probability of getting no new card in a specific slot
   * given the slot's rarity distribution
   */
  private computeNoNewCardProbabilityForSlot(
    distribution: ReadonlyMap<Rarity, number>,
    boosterCards: PokemonCardModel[],
    missingCards: PokemonCardModel[],
  ): number {
    let probabilityNoNewCard = 0.0;

    for (const [rarity, probability] of distribution) {
      const probabilityNoNewCardInRarity =
        1.0 -
        this.probabilityOfNewCardInRarity(rarity, boosterCards, missingCards);
      probabilityNoNewCard += probability * probabilityNoNewCardInRarity;
    }

    return probabilityNoNewCard;
  }
}
