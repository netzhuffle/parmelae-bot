import { PokemonCardModel } from '../generated/prisma/models/PokemonCard.js';
import { Rarity } from '../generated/prisma/enums.js';
import { injectable } from 'inversify';
import { NotExhaustiveSwitchError } from '../NotExhaustiveSwitchError.js';
import { PackProbabilityStrategy } from './PackProbabilityStrategies/PackProbabilityStrategy.js';
import { FiveCardsWithoutShinyStrategy } from './PackProbabilityStrategies/FiveCardsWithoutShinyStrategy.js';
import { FiveCardsStrategy } from './PackProbabilityStrategies/FiveCardsStrategy.js';
import { BabyAsPotentialSixthCardStrategy } from './PackProbabilityStrategies/BabyAsPotentialSixthCardStrategy.js';
import { FourCardGuaranteedExStrategy } from './PackProbabilityStrategies/FourCardGuaranteedExStrategy.js';
import { ShinyAsPotentialSixthCardStrategy } from './PackProbabilityStrategies/ShinyAsPotentialSixthCardStrategy.js';
import {
  BoosterProbabilitiesType,
  DIAMOND_RARITIES as DIAMOND_RARITIES_ARRAY,
  TRADABLE_RARITIES as TRADABLE_RARITIES_ARRAY,
} from './PokemonTcgPocketService.js';
import { PokemonTcgPocketProbabilityRepository } from './Repositories/PokemonTcgPocketProbabilityRepository.js';

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
  /** Set of diamond rarities (converted from shared constant for efficient lookups) */
  private readonly DIAMOND_RARITIES = new Set<Rarity>(DIAMOND_RARITIES_ARRAY);

  private readonly TRADABLE_RARITIES = new Set<Rarity>(TRADABLE_RARITIES_ARRAY);

  constructor(
    private readonly fiveCardsWithoutShinyStrategy: FiveCardsWithoutShinyStrategy,
    private readonly fiveCardsStrategy: FiveCardsStrategy,
    private readonly babyAsPotentialSixthCardStrategy: BabyAsPotentialSixthCardStrategy,
    private readonly fourCardStrategy: FourCardGuaranteedExStrategy,
    private readonly shinyAsPotentialSixthCardStrategy: ShinyAsPotentialSixthCardStrategy,
    private readonly repository: PokemonTcgPocketProbabilityRepository,
  ) {}

  /**
   * Gets the pack probability strategy for a given probabilities type
   */
  private getStrategy(
    probabilitiesType: BoosterProbabilitiesType,
  ): PackProbabilityStrategy {
    switch (probabilitiesType) {
      case BoosterProbabilitiesType.FIVE_CARDS_WITHOUT_SHINY:
        return this.fiveCardsWithoutShinyStrategy;
      case BoosterProbabilitiesType.FIVE_CARDS:
        return this.fiveCardsStrategy;
      case BoosterProbabilitiesType.BABY_AS_POTENTIAL_SIXTH_CARD:
        return this.babyAsPotentialSixthCardStrategy;
      case BoosterProbabilitiesType.FOUR_CARDS_WITH_GUARANTEED_EX:
        return this.fourCardStrategy;
      case BoosterProbabilitiesType.SHINY_AS_POTENTIAL_SIXTH_CARD:
        return this.shinyAsPotentialSixthCardStrategy;
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
      this.getStrategy(probabilitiesType),
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
      this.getStrategy(probabilitiesType),
    );
  }

  /**
   * Calculates the probability of getting at least one new tradable card from a booster pack.
   * This considers cards with diamond rarities (including foil variants: ♢, ♢✦, ♢♢, ♢♢✦, ♢♢♢, ♢♢♢✦, ♢♢♢♢) and ☆.
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
      this.getStrategy(probabilitiesType),
    );
  }

  /**
   * Calculates the probability of drawing a specific card from a booster pack.
   *
   * Uses count-based approach for efficient probability calculations without
   * fetching full card lists. Combines probabilities from different pack types
   * using the formula: 1 − Π(1 − p_slot) for single-pack probability composition.
   *
   * **Pack Type Precedence (handled by probabilitiesType):**
   * 1. **FOUR_CARDS_WITH_GUARANTEED_EX**: 4-card packs with foil rarities
   * 2. **BABY_AS_POTENTIAL_SIXTH_CARD**: 5-card packs + potential 6th card from baby-exclusive pool
   * 3. **FIVE_CARDS**: Standard 5-card packs with shiny rarities
   * 4. **FIVE_CARDS_WITHOUT_SHINY**: Standard 5-card packs without shiny rarities
   *
   * **Exclusion Rules by Context:**
   * - **Normal slots (1-5)**: Exclude isSixPackOnly cards from all normal flow
   * - **God packs**: Exclude isSixPackOnly cards, only include god pack rarities (ONE_STAR, TWO_STARS, THREE_STARS, ONE_SHINY, TWO_SHINY, CROWN)
   * - **Six-pack slot**: Only include isSixPackOnly cards with uniform distribution
   * - **Four-card packs**: Exclude ONE_SHINY and isSixPackOnly cards entirely
   *
   * **Probability Combination Formulas:**
   * - **5-card packs**: P(normal) + P(god) using pack weights (99.95% + 0.05%)
   * - **6-card packs**: P(normal_5_cards) + P(sixth_card) where sixth_card uses six-pack-only pool
   * - **4-card packs**: P(normal_4_cards) + P(god_4_cards) using 2-way weighting
   *
   * **Slot Distribution Logic:**
   * - Each slot has specific rarity distributions from pack strategies (FiveCardsWithoutShinyStrategy, etc.)
   * - Per-card probability = slot_weight × (1 / cards_of_same_rarity_and_six_pack_flag)
   * - Uniform split assumption within same rarity bucket and six-pack exclusivity
   * - Returns 0 when rarity count is 0 (division-by-zero protection)
   *
   * **Algorithm Steps:**
   * 1. Determine pack type from probabilitiesType
   * 2. Calculate normal pack probability using slot distributions
   * 3. Calculate god pack probability if applicable
   * 4. Calculate six-pack probability if applicable
   * 5. Combine using appropriate weights and composition rules
   *
   * @param targetCard - The specific card to calculate probability for
   * @param boosterId - The booster ID to calculate probability for
   * @param probabilitiesType - The booster's probability calculation type
   * @returns Probability (0.0-1.0) of drawing the target card in one pack, or 0 if no eligible counts
   * @throws NotExhaustiveSwitchError for unexpected probabilitiesType values
   */
  async calculateSingleCardProbability(
    targetCard: PokemonCardModel,
    boosterId: number,
    probabilitiesType: BoosterProbabilitiesType,
  ): Promise<number> {
    const strategy = this.getStrategy(probabilitiesType);

    const normalProb = await this.calculateNormalPackSingleCardProbability(
      targetCard,
      boosterId,
      strategy,
    );
    const godProb = await this.calculateGodPackSingleCardProbability(
      targetCard,
      boosterId,
      strategy,
    );

    // Handle six-card packs
    const sixPackProb =
      strategy.packWeights.six !== undefined
        ? await this.calculateSixPackSingleCardProbability(
            targetCard,
            boosterId,
            strategy,
          )
        : undefined;

    return this.combinePackProbabilities(
      normalProb,
      godProb,
      sixPackProb,
      strategy.packWeights,
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
    strategy: PackProbabilityStrategy,
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
      strategy,
    );
    const godPackChance = this.computeGodPackChance(
      filteredBoosterCards,
      filteredMissingCards,
      strategy,
    );

    // Handle six-card packs
    const sixPackChance =
      strategy.packWeights.six !== undefined
        ? this.computeSixPackChance(
            filteredBoosterCards,
            filteredMissingCards,
            strategy,
          )
        : undefined;

    return this.combinePackProbabilities(
      normalPackChance,
      godPackChance,
      sixPackChance,
      strategy.packWeights,
    );
  }

  /**
   * Combines probabilities from normal, god, and optionally six-card packs using strategy pack weights.
   * If sixPackChance is provided and packWeights.six is defined, includes six-card pack probability.
   * Otherwise, uses only normal and god pack probabilities.
   */
  private combinePackProbabilities(
    normalPackChance: number,
    godPackChance: number,
    sixPackChance: number | undefined,
    packWeights: {
      readonly normal: number;
      readonly god: number;
      readonly six?: number;
    },
  ): number {
    const base =
      packWeights.normal * normalPackChance + packWeights.god * godPackChance;
    if (packWeights.six !== undefined && sixPackChance !== undefined) {
      return base + packWeights.six * sixPackChance;
    }
    return base;
  }

  /**
   * Calculates the probability of getting at least one new card in a normal pack.
   */
  private computeNormalPackChance(
    boosterCards: PokemonCardModel[],
    missingCards: PokemonCardModel[],
    strategy: PackProbabilityStrategy,
  ): number {
    let probabilityNoNewCard = 1.0;
    for (let slot = 1; slot <= strategy.cardsPerPack; slot++) {
      const distribution =
        strategy.slotDistributions[
          slot as keyof typeof strategy.slotDistributions
        ];
      if (!distribution) {
        throw new Error(`Slot ${slot} not defined for strategy`);
      }
      const pNoNewInSlot = this.computeNoNewCardProbabilityForSlot(
        distribution,
        boosterCards,
        missingCards,
        strategy,
      );
      probabilityNoNewCard *= pNoNewInSlot;
    }

    return 1.0 - probabilityNoNewCard;
  }

  /**
   * Calculates the probability of getting at least one new card in a six-card pack.
   * Slots 1–5 follow the normal pack logic; the 6th slot uses the strategy's slot 6 distribution.
   */
  private computeSixPackChance(
    boosterCards: PokemonCardModel[],
    missingCards: PokemonCardModel[],
    strategy: PackProbabilityStrategy,
  ): number {
    // Probability of no new card in slots 1–5 (reuse normal pack logic)
    const probabilityNoNewCardSlots1to5 =
      1.0 - this.computeNormalPackChance(boosterCards, missingCards, strategy);

    // Probability of a new card in slot 6
    const pNewInSixth = this.computeNewCardProbabilityInSixthSlot(
      boosterCards,
      missingCards,
      strategy,
    );

    // Combine: 1 - (pNoNew_1to5 * (1 - pNewInSixth))
    const probabilityNoNewCardInSixPack =
      probabilityNoNewCardSlots1to5 * (1.0 - pNewInSixth);
    return 1.0 - probabilityNoNewCardInSixPack;
  }

  /**
   * Calculates the probability of getting at least one new card in a god pack.
   * In a god pack:
   * - All cards are from the strategy's godPackRarities
   * - Each eligible card has equal probability
   *
   * @param boosterCards - All cards available in this booster
   * @param missingCards - Cards the user doesn't own yet
   * @param strategy - The pack probability strategy
   * @returns Probability of getting at least one new card in a god pack
   */
  private computeGodPackChance(
    boosterCards: PokemonCardModel[],
    missingCards: PokemonCardModel[],
    strategy: PackProbabilityStrategy,
  ): number {
    const { godPackCards, missingGodPackCards } = this.filterGodPackCards(
      boosterCards,
      missingCards,
      strategy,
    );

    if (godPackCards.length === 0 || missingGodPackCards.length === 0) {
      return 0.0;
    }

    const probabilityNewCardInOneSlot =
      missingGodPackCards.length / godPackCards.length;
    const probabilityNoNewCardInOneSlot = 1.0 - probabilityNewCardInOneSlot;
    const probabilityNoNewCardInPack = Math.pow(
      probabilityNoNewCardInOneSlot,
      strategy.cardsPerPack,
    );

    return 1.0 - probabilityNoNewCardInPack;
  }

  /**
   * Filters cards that are eligible for god packs
   */
  private filterGodPackCards(
    boosterCards: PokemonCardModel[],
    missingCards: PokemonCardModel[],
    strategy: PackProbabilityStrategy,
  ): {
    godPackCards: PokemonCardModel[];
    missingGodPackCards: PokemonCardModel[];
  } {
    const godPackCards = boosterCards.filter((card) =>
      this.isGodPackCard(card, strategy),
    );
    const missingGodPackCards = missingCards.filter((card) =>
      this.isGodPackCard(card, strategy),
    );

    return { godPackCards, missingGodPackCards };
  }

  /**
   * Checks if a card is eligible for god packs based on the strategy's configuration
   */
  private isGodPackCard(
    card: PokemonCardModel,
    strategy: PackProbabilityStrategy,
  ): boolean {
    // Check if card's rarity is in strategy's god pack rarities
    if (card.rarity === null || !strategy.godPackRarities.has(card.rarity)) {
      return false;
    }

    // For flag-based filtering, exclude isSixPackOnly cards from god packs
    // For rarity-based filtering, ignore the isSixPackOnly flag
    if (strategy.sixthCardFilterMode === 'flag-based' && card.isSixPackOnly) {
      return false;
    }

    return true;
  }

  /**
   * Computes probability of a new card in the sixth slot of a six-card pack.
   * Uses the strategy's slot 6 distribution and sixthCardFilterMode to determine eligibility.
   */
  private computeNewCardProbabilityInSixthSlot(
    boosterCards: PokemonCardModel[],
    missingCards: PokemonCardModel[],
    strategy: PackProbabilityStrategy,
  ): number {
    if (!strategy.sixthCardFilterMode) {
      return 0.0;
    }

    const slot6Distribution = strategy.slotDistributions[6];
    if (!slot6Distribution) {
      return 0.0;
    }

    let probabilityNewCard = 0.0;

    for (const [rarity, weight] of slot6Distribution) {
      let allCards: PokemonCardModel[];
      let missingCardsInRarity: PokemonCardModel[];

      if (strategy.sixthCardFilterMode === 'flag-based') {
        // Filter by isSixPackOnly flag
        allCards = boosterCards.filter(
          (c) => c.isSixPackOnly === true && c.rarity === rarity,
        );
        missingCardsInRarity = missingCards.filter(
          (c) => c.isSixPackOnly === true && c.rarity === rarity,
        );
      } else {
        // rarity-based: Use all cards of this rarity
        allCards = boosterCards.filter((c) => c.rarity === rarity);
        missingCardsInRarity = missingCards.filter((c) => c.rarity === rarity);
      }

      if (allCards.length > 0) {
        probabilityNewCard +=
          weight * (missingCardsInRarity.length / allCards.length);
      }
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
    strategy: PackProbabilityStrategy,
  ): number {
    // For flag-based filtering, exclude isSixPackOnly cards
    // For rarity-based filtering or strategies without sixth card, ignore the isSixPackOnly flag
    const isFlagBasedFiltering = strategy.sixthCardFilterMode === 'flag-based';

    const rarityMatches = (card: PokemonCardModel) => card.rarity === rarity;
    const rarityMatchesAndNotSixPackOnly = (card: PokemonCardModel) =>
      card.rarity === rarity && !card.isSixPackOnly;

    const cardFilter = isFlagBasedFiltering
      ? rarityMatchesAndNotSixPackOnly
      : rarityMatches;

    const cardsInRarity = boosterCards.filter(cardFilter);
    const missingCardsInRarity = missingCards.filter(cardFilter);

    if (cardsInRarity.length === 0) {
      return 0.0;
    }

    return missingCardsInRarity.length / cardsInRarity.length;
  }

  /**
   * Computes the probability of getting no new card in a specific slot
   * given the slot's rarity distribution
   */
  private computeNoNewCardProbabilityForSlot(
    distribution: ReadonlyMap<Rarity, number>,
    boosterCards: PokemonCardModel[],
    missingCards: PokemonCardModel[],
    strategy: PackProbabilityStrategy,
  ): number {
    let probabilityNoNewCard = 0.0;

    for (const [rarity, probability] of distribution) {
      const probabilityNoNewCardInRarity =
        1.0 -
        this.probabilityOfNewCardInRarity(
          rarity,
          boosterCards,
          missingCards,
          strategy,
        );
      probabilityNoNewCard += probability * probabilityNoNewCardInRarity;
    }

    return probabilityNoNewCard;
  }

  /**
   * Calculates single card probability for normal packs (works for both 4-card and 5-card packs).
   * Uses the strategy's cardsPerPack and slot distributions to calculate the probability.
   */
  private async calculateNormalPackSingleCardProbability(
    targetCard: PokemonCardModel,
    boosterId: number,
    strategy: PackProbabilityStrategy,
  ): Promise<number> {
    let probabilityNoTarget = 1.0;

    for (let slot = 1; slot <= strategy.cardsPerPack; slot++) {
      const distribution =
        strategy.slotDistributions[
          slot as keyof typeof strategy.slotDistributions
        ];
      if (!distribution) {
        throw new Error(`Slot ${slot} not defined for strategy`);
      }
      const slotProb = await this.calculateSlotProbabilityFromDistribution(
        targetCard,
        distribution,
        boosterId,
        strategy,
      );
      probabilityNoTarget *= 1.0 - slotProb;
    }

    return 1.0 - probabilityNoTarget;
  }

  /**
   * Calculates single card probability for god packs
   */
  private async calculateGodPackSingleCardProbability(
    targetCard: PokemonCardModel,
    boosterId: number,
    strategy: PackProbabilityStrategy,
  ): Promise<number> {
    // Check if target card can appear in god packs using strategy's configuration
    if (!this.isGodPackCard(targetCard, strategy)) {
      return 0.0;
    }

    const godPackEligibleCount =
      await this.repository.countGodPackEligibleByBooster(
        boosterId,
        strategy.godPackRarities,
      );
    if (godPackEligibleCount === 0) return 0.0;

    // Probability = 1 - (probability of NOT getting target card in any slot)
    const probNotGettingCard = Math.pow(
      (godPackEligibleCount - 1) / godPackEligibleCount,
      strategy.cardsPerPack,
    );

    return 1.0 - probNotGettingCard;
  }

  /**
   * Calculates single card probability for six-card packs.
   * Slots 1–5 follow the normal pack logic; the 6th slot uses the strategy's slot 6 distribution.
   */
  private async calculateSixPackSingleCardProbability(
    targetCard: PokemonCardModel,
    boosterId: number,
    strategy: PackProbabilityStrategy,
  ): Promise<number> {
    // Probability of no target card in slots 1–5 (reuse normal pack logic)
    const probabilityNoTarget15 =
      1.0 -
      (await this.calculateNormalPackSingleCardProbability(
        targetCard,
        boosterId,
        strategy,
      ));

    // Probability of target card in slot 6
    let slot6Prob = 0.0;
    if (strategy.sixthCardFilterMode) {
      slot6Prob = await this.calculateSixthSlotProbability(
        targetCard,
        boosterId,
        strategy,
      );
    }

    // Combine: 1 - (pNoTarget_1to5 * (1 - p6))
    return 1.0 - probabilityNoTarget15 * (1.0 - slot6Prob);
  }

  /**
   * Calculates probability for a slot with rarity distribution
   */
  private async calculateSlotProbabilityFromDistribution(
    targetCard: PokemonCardModel,
    distribution: ReadonlyMap<Rarity, number>,
    boosterId: number,
    strategy: PackProbabilityStrategy,
  ): Promise<number> {
    if (!targetCard.rarity) {
      return 0.0;
    }

    // For flag-based filtering, exclude isSixPackOnly cards from slots 1-5
    // For rarity-based filtering, ignore the isSixPackOnly flag
    const shouldExcludeSixPackOnly =
      strategy.sixthCardFilterMode === 'flag-based';
    if (shouldExcludeSixPackOnly && targetCard.isSixPackOnly) {
      return 0.0; // Excluded from normal slots in flag-based mode
    }

    const rarityWeight = distribution.get(targetCard.rarity);
    if (!rarityWeight) {
      return 0.0; // Rarity not in this slot's distribution
    }

    const count = shouldExcludeSixPackOnly
      ? await this.repository.countByBoosterRarityFilteringSixPackFlag(
          boosterId,
          targetCard.rarity,
          false,
        )
      : await this.repository.countByBoosterRarity(
          boosterId,
          targetCard.rarity,
        );
    return count > 0 ? rarityWeight * (1.0 / count) : 0.0;
  }

  /**
   * Calculates probability for the sixth slot in six-card packs
   */
  private async calculateSixthSlotProbability(
    targetCard: PokemonCardModel,
    boosterId: number,
    strategy: PackProbabilityStrategy,
  ): Promise<number> {
    if (!targetCard.rarity) {
      return 0.0;
    }

    const slot6Distribution = strategy.slotDistributions[6];
    if (!slot6Distribution) {
      return 0.0;
    }

    const rarityWeight = slot6Distribution.get(targetCard.rarity);
    if (!rarityWeight || rarityWeight === 0.0) {
      return 0.0; // Rarity not eligible for slot 6
    }

    let count: number;
    if (strategy.sixthCardFilterMode === 'flag-based') {
      // Only count cards where isSixPackOnly=true
      if (!targetCard.isSixPackOnly) return 0.0;
      count = await this.repository.countByBoosterRarityFilteringSixPackFlag(
        boosterId,
        targetCard.rarity,
        true,
      );
    } else {
      // rarity-based: Count all cards of this rarity (including isSixPackOnly)
      count = await this.repository.countByBoosterRarity(
        boosterId,
        targetCard.rarity,
      );
    }

    return count > 0 ? rarityWeight * (1.0 / count) : 0.0;
  }
}
