import { injectable, inject } from 'inversify';
import { PokemonTcgPocketRepository } from './Repositories/PokemonTcgPocketRepository.js';
import { Rarity, OwnershipStatus } from '../generated/prisma/enums.js';
import { PokemonSetModel } from '../generated/prisma/models/PokemonSet.js';
import { PokemonBoosterModel } from '../generated/prisma/models/PokemonBooster.js';
import { PokemonCardModel } from '../generated/prisma/models/PokemonCard.js';
import { PokemonTcgPocketInvalidBoosterError } from './Errors/PokemonTcgPocketInvalidBoosterError.js';
import { PokemonTcgPocketInvalidRarityError } from './Errors/PokemonTcgPocketInvalidRarityError.js';
import { PokemonTcgPocketDuplicateCardNumberError } from './Errors/PokemonTcgPocketDuplicateCardNumberError.js';
import { PokemonTcgPocketInvalidCardNumberError } from './Errors/PokemonTcgPocketInvalidCardNumberError.js';
import { PokemonCardWithRelations } from './Repositories/Types.js';
import { PokemonTcgPocketProbabilityService } from './PokemonTcgPocketProbabilityService.js';
import { BOOSTERS_STATS_EXPLANATION, SETS_STATS_EXPLANATION } from './texts.js';
import assert from 'node:assert/strict';
import {
  CARD_EXISTS_BUT_NO_MATCH_MESSAGE,
  MULTIPLE_MATCHES_MESSAGE,
  BULK_OPERATION_HEADER_MESSAGE,
  BULK_OPERATION_WARNING_MESSAGE,
  SINGLE_OPERATION_HEADER_MESSAGE,
  UPDATED_STATS_MESSAGE,
  NO_CARDS_FOUND_MESSAGE,
} from './texts.js';

/**
 * Booster pack probability calculation types (TypeScript-only enum).
 *
 * Determines pack structure, card counts, and probability distributions.
 * This enum is no longer persisted in the database; strategy selection
 * is now based on set keys via SET_DEFINITIONS.
 */
export enum BoosterProbabilitiesType {
  /** Standard 5-card packs without shiny rarities */
  FIVE_CARDS_WITHOUT_SHINY = 'FIVE_CARDS_WITHOUT_SHINY',
  /** Standard 5-card packs with shiny rarities */
  FIVE_CARDS = 'FIVE_CARDS',
  /** 5-card packs with potential 6th card from baby-exclusive pool */
  BABY_AS_POTENTIAL_SIXTH_CARD = 'BABY_AS_POTENTIAL_SIXTH_CARD',
  /** 4-card packs with guaranteed EX cards and foil rarities */
  FOUR_CARDS_WITH_GUARANTEED_EX = 'FOUR_CARDS_WITH_GUARANTEED_EX',
  /** 5-card packs with potential 6th card from shiny rarities (B1 and future non-A sets) */
  SHINY_AS_POTENTIAL_SIXTH_CARD = 'SHINY_AS_POTENTIAL_SIXTH_CARD',
}

/** Card ID regex pattern */
const CARD_ID_PATTERN = /^([A-Za-z0-9-]+)-(\d{1,3})$/;

/** Information about a card ID */
interface CardIdInfo {
  setKey: string;
  cardNumber: number;
}

/** Result of parsing a card identifier */
interface CardIdentifier {
  /** The parsed card ID info if the input was an ID, undefined otherwise */
  idInfo?: CardIdInfo;
  /** The card name if the input was a name, undefined otherwise */
  cardName?: string;
}

/**
 * Single source of truth for all set-level configuration.
 *
 * Contains set names, booster lists, and probability strategy types.
 * All other set-related constants are derived from this configuration.
 */
export const SET_DEFINITIONS = {
  'P-A': {
    name: 'PROMO-A',
    boosters: [] as const,
  },
  A1: {
    name: 'Unschlagbare Gene',
    boosters: ['Glurak', 'Mewtu', 'Pikachu'] as const,
    probabilitiesType: BoosterProbabilitiesType.FIVE_CARDS_WITHOUT_SHINY,
  },
  A1a: {
    name: 'Mysteriöse Insel',
    boosters: ['Mysteriöse Insel'] as const,
    probabilitiesType: BoosterProbabilitiesType.FIVE_CARDS_WITHOUT_SHINY,
  },
  A2: {
    name: 'Kollision von Raum und Zeit',
    boosters: ['Dialga', 'Palkia'] as const,
    probabilitiesType: BoosterProbabilitiesType.FIVE_CARDS_WITHOUT_SHINY,
  },
  A2a: {
    name: 'Licht des Triumphs',
    boosters: ['Licht des Triumphs'] as const,
    probabilitiesType: BoosterProbabilitiesType.FIVE_CARDS_WITHOUT_SHINY,
  },
  A2b: {
    name: 'Glänzendes Festival',
    boosters: ['Glänzendes Festival'] as const,
    probabilitiesType: BoosterProbabilitiesType.FIVE_CARDS,
  },
  A3: {
    name: 'Hüter des Firmaments',
    boosters: ['Solgaleo', 'Lunala'] as const,
    probabilitiesType: BoosterProbabilitiesType.FIVE_CARDS,
  },
  A3a: {
    name: 'Dimensionale Krise',
    boosters: ['Dimensionale Krise'] as const,
    probabilitiesType: BoosterProbabilitiesType.FIVE_CARDS,
  },
  A3b: {
    name: 'Evoli-Hain',
    boosters: ['Evoli-Hain'] as const,
    probabilitiesType: BoosterProbabilitiesType.FIVE_CARDS,
  },
  A4: {
    name: 'Weisheit von Meer und Himmel',
    boosters: ['Ho-Oh', 'Lugia'] as const,
    probabilitiesType: BoosterProbabilitiesType.BABY_AS_POTENTIAL_SIXTH_CARD,
  },
  A4a: {
    name: 'Verborgene Quelle',
    boosters: ['Verborgene Quelle'] as const,
    probabilitiesType: BoosterProbabilitiesType.BABY_AS_POTENTIAL_SIXTH_CARD,
  },
  A4b: {
    name: 'Deluxepack-ex',
    boosters: ['Deluxepack-ex'] as const,
    probabilitiesType: BoosterProbabilitiesType.FOUR_CARDS_WITH_GUARANTEED_EX,
  },
  'P-B': {
    name: 'PROMO-B',
    boosters: [] as const,
  },
  B1: {
    name: 'Mega-Aufstieg',
    boosters: ['Mega-Garados', 'Mega-Lohgock', 'Mega-Altaria'] as const,
    probabilitiesType: BoosterProbabilitiesType.SHINY_AS_POTENTIAL_SIXTH_CARD,
  },
} as const;

/** Set key type */
export type SetKey = keyof typeof SET_DEFINITIONS;

/** Set key values (derived from SET_DEFINITIONS) */
export const SET_KEY_VALUES = Object.keys(SET_DEFINITIONS) as SetKey[];

/** Maps set keys to their names (derived from SET_DEFINITIONS) */
export const SET_KEY_NAMES: Record<SetKey, string> = Object.fromEntries(
  Object.entries(SET_DEFINITIONS).map(([key, def]) => [key, def.name]),
) as Record<SetKey, string>;

/** Booster values (derived from SET_DEFINITIONS) */
export const BOOSTER_VALUES = [
  ...new Set(Object.values(SET_DEFINITIONS).flatMap((def) => def.boosters)),
] as const;

/** Maps set keys to their probability strategy types (derived from SET_DEFINITIONS) */
export const SET_PROBABILITY_STRATEGY: Record<
  SetKey,
  BoosterProbabilitiesType | undefined
> = Object.fromEntries(
  Object.entries(SET_DEFINITIONS).map(([key, def]) => [
    key,
    'probabilitiesType' in def ? def.probabilitiesType : undefined,
  ]),
) as Record<SetKey, BoosterProbabilitiesType | undefined>;

/** Ownership filter values */
export const OWNERSHIP_FILTER_VALUES = [
  'all',
  'owned',
  'missing',
  'not_needed',
] as const;

/** Ownership filter type */
export type OwnershipFilter = (typeof OWNERSHIP_FILTER_VALUES)[number];

/** Card operation type for add/remove/mark-as-not-needed operations */
export type PokemonCardOperation = 'add' | 'remove' | 'mark-as-not-needed';

/** Service-layer ownership status with explicit missing state */
export enum CardOwnershipStatus {
  OWNED = 'OWNED',
  NOT_NEEDED = 'NOT_NEEDED',
  MISSING = 'MISSING',
}

/** Symbol for injecting the Pokemon TCG Pocket YAML content */
export const POKEMON_TCGP_YAML_SYMBOL = Symbol('PokemonTcgPocketYaml');

/** Card data from the YAML file */
export interface Card {
  /** The name of the card */
  name: string;
  /** The rarity of the card: ♢, ♢♢, ♢♢♢, ♢♢♢♢, ☆, ☆☆, ☆☆☆, ☆☆☆☆, ✸, ✸✸, or ♛ */
  rarity?: string;
  /** The booster(s) this card belongs to. If undefined, belongs to all boosters in the set */
  boosters?: string | string[] | null;
  /**
   * Whether this card is exclusive to packs with six cards.
   *
   * Also marks the booster as having the possibility of six-card packs.
   */
  isSixPackOnly?: boolean;
  /**
   * For crown cards only: specifies which specific booster contains this card in god packs.
   * If undefined, crown card appears in god packs for all its regular boosters.
   * Must match one of the booster names this card belongs to.
   */
  godPackBooster?: string;
}

/** Set data from the YAML file */
export interface SetData {
  /** The name of the set */
  name: string;
  /** The boosters in this set. If undefined, creates a single booster with the set name. If null, creates no boosters */
  boosters?: string[] | null;
  /** The cards in this set, keyed by their number */
  cards: Record<number, Card>;
}

/** The complete YAML file structure */
export type Sets = Record<string, SetData>;

/**
 * Maps rarity symbols from YAML data to database enum values.
 *
 * **Symbol Categories:**
 * - Diamond rarities: ♢, ♢♢, ♢♢♢, ♢♢♢♢
 * - Foil rarities: ♢✦, ♢♢✦, ♢♢♢✦ (trigger FOUR_CARDS_WITH_GUARANTEED_EX)
 * - Star rarities: ☆, ☆☆, ☆☆☆, ☆☆☆☆
 * - Shiny rarities: ✸, ✸✸
 * - Crown rarity: ♛
 *
 * **Foil Detection:** The presence of foil symbols (✦ suffix) triggers
 * the FOUR_CARDS_WITH_GUARANTEED_EX probabilitiesType during synchronization.
 *
 * @see Rarity enum for complete rarity definitions
 */
export const RARITY_MAP: Record<string, Rarity> = {
  '♢': Rarity.ONE_DIAMOND,
  '♢✦': Rarity.ONE_DIAMOND_FOIL,
  '♢♢': Rarity.TWO_DIAMONDS,
  '♢♢✦': Rarity.TWO_DIAMONDS_FOIL,
  '♢♢♢': Rarity.THREE_DIAMONDS,
  '♢♢♢✦': Rarity.THREE_DIAMONDS_FOIL,
  '♢♢♢♢': Rarity.FOUR_DIAMONDS,
  '☆': Rarity.ONE_STAR,
  '☆☆': Rarity.TWO_STARS,
  '☆☆☆': Rarity.THREE_STARS,
  '☆☆☆☆': Rarity.FOUR_STARS,
  '✸': Rarity.ONE_SHINY,
  '✸✸': Rarity.TWO_SHINY,
  '♛': Rarity.CROWN,
};

/** Maps database enum values to rarity symbols */
const RARITY_REVERSE_MAP: Record<Rarity, string> = {
  [Rarity.ONE_DIAMOND]: '♢',
  [Rarity.ONE_DIAMOND_FOIL]: '♢✦',
  [Rarity.TWO_DIAMONDS]: '♢♢',
  [Rarity.TWO_DIAMONDS_FOIL]: '♢♢✦',
  [Rarity.THREE_DIAMONDS]: '♢♢♢',
  [Rarity.THREE_DIAMONDS_FOIL]: '♢♢♢✦',
  [Rarity.FOUR_DIAMONDS]: '♢♢♢♢',
  [Rarity.ONE_STAR]: '☆',
  [Rarity.TWO_STARS]: '☆☆',
  [Rarity.THREE_STARS]: '☆☆☆',
  [Rarity.FOUR_STARS]: '☆☆☆☆',
  [Rarity.ONE_SHINY]: '✸',
  [Rarity.TWO_SHINY]: '✸✸',
  [Rarity.CROWN]: '♛',
};

/** Card with ownership information */
interface CardWithOwnership {
  card: PokemonCardModel;
  ownershipStatus: CardOwnershipStatus;
}

/** Group of cards with ownership statistics */
interface CardGroup {
  cards: CardWithOwnership[];
  owned: number;
  notNeeded: number;
  total: number;
}

/** Service for managing Pokemon TCG Pocket data */
@injectable()
export class PokemonTcgPocketService {
  constructor(
    private readonly probabilityService: PokemonTcgPocketProbabilityService,
    private readonly repository: PokemonTcgPocketRepository,
    @inject(POKEMON_TCGP_YAML_SYMBOL)
    private readonly setsData: Sets,
  ) {}

  /** Search for cards using various filters */
  searchCards(filters: {
    cardName?: string;
    setName?: string;
    setKey?: string;
    booster?: string;
    cardNumber?: number;
    rarity?: Rarity;
    userId?: bigint;
    ownershipFilter?: OwnershipFilter;
  }): Promise<PokemonCardWithRelations[]> {
    return this.repository.searchCards(filters);
  }

  /** Adds a card to a user's collection */
  async addCardToCollection(
    cardId: number,
    userId: bigint,
    status: OwnershipStatus = OwnershipStatus.OWNED,
  ): Promise<PokemonCardWithRelations> {
    return this.repository.addCardToCollection(cardId, userId, status);
  }

  /** Removes a card from a user's collection */
  async removeCardFromCollection(
    cardId: number,
    userId: bigint,
  ): Promise<PokemonCardWithRelations> {
    return this.repository.removeCardFromCollection(cardId, userId);
  }

  /** Get card IDs in a range within a specific set */
  async getCardIdsInRange(
    setKey: string,
    startNumber: number,
    endNumber: number,
  ): Promise<number[]> {
    return this.repository.getCardIdsInRange(setKey, startNumber, endNumber);
  }

  /** Adds multiple cards to a user's collection in bulk and returns formatted result */
  async addMultipleCardsToCollection(
    cardIds: number[],
    userId: bigint,
  ): Promise<string> {
    const addedCards = await this.repository.addMultipleCardsToCollection(
      cardIds,
      userId,
    );

    const displayName = await this.getDisplayName(userId);
    const header = BULK_OPERATION_HEADER_MESSAGE(
      'added',
      addedCards.length,
      'to',
      displayName,
    );
    const csv = await this.formatCardsAsCsv(addedCards, userId);
    const stats = await this.getFormattedCollectionStats(userId);
    return BULK_OPERATION_WARNING_MESSAGE(header, csv, stats);
  }

  /** Synchronizes the database with the YAML source file. */
  async synchronizeCardDatabaseWithYamlSource(): Promise<void> {
    for (const [setKey, setData] of Object.entries(this.setsData)) {
      await this.synchronizeSet(setKey, setData);
    }
  }

  /** Gets a user's display name (username with @ if available, otherwise first name) */
  async getDisplayName(userId: bigint): Promise<string> {
    const user = await this.repository.retrieveUserNames(userId);
    return user.username ? `@${user.username}` : user.firstName;
  }

  /** Calculates the probability string for a card in its first booster */
  private async calculateCardProbabilityString(
    card: PokemonCardWithRelations,
  ): Promise<string> {
    if (card.boosters.length === 0) {
      return 'N/A';
    }

    try {
      // Use first booster (probability is same across all boosters for a card)
      const firstBooster = card.boosters[0];
      const setKey = card.set.key as SetKey;
      const probabilitiesType = SET_PROBABILITY_STRATEGY[setKey];
      if (!probabilitiesType) {
        // Set not in SET_DEFINITIONS (e.g., test sets), return N/A
        return 'N/A';
      }
      const probability =
        await this.probabilityService.calculateSingleCardProbability(
          card,
          firstBooster.id,
          probabilitiesType,
        );

      return probability > 0 ? `${(probability * 100).toFixed(2)}%` : 'N/A';
    } catch (error) {
      // Log error but don't fail CSV generation
      console.warn(
        `Failed to calculate probability for card ${card.id}:`,
        error,
      );
      return 'N/A';
    }
  }

  /** Formats multiple cards as CSV strings */
  async formatCardsAsCsv(
    cards: PokemonCardWithRelations[],
    userId?: bigint,
  ): Promise<string> {
    const displayName = userId ? await this.getDisplayName(userId) : 'Owned';
    const header = `ID,Name,Rarity,Set,Boosters,Probability,SixPackOnly,Owned by ${displayName}`;
    const csvLines = await Promise.all(
      cards.map((card) => this.formatCardAsCsv(card, userId)),
    );
    return [header, ...csvLines].join('\n');
  }

  /** Formats a card as a CSV string */
  private async formatCardAsCsv(
    card: PokemonCardWithRelations,
    userId?: bigint,
  ): Promise<string> {
    const boosterNames = card.boosters
      .map((b: PokemonBoosterModel) => b.name)
      .join(',');

    // Calculate probability for first booster (same probability across all boosters)
    const probabilityString = await this.calculateCardProbabilityString(card);

    let ownershipStatus = 'No';
    if (userId) {
      const ownership = card.ownership.find((o) => o.userId === userId);
      if (ownership) {
        if (ownership.status === OwnershipStatus.OWNED) {
          ownershipStatus = 'Yes';
        } else if (ownership.status === OwnershipStatus.NOT_NEEDED) {
          ownershipStatus = 'No (marked as not needed)';
        }
      }
    }

    const raritySymbol = card.rarity ? RARITY_REVERSE_MAP[card.rarity] : '';
    const sixPackOnly = card.isSixPackOnly ? 'Yes' : 'No';
    return `${card.set.key}-${card.number
      .toString()
      .padStart(
        3,
        '0',
      )},${card.name},${raritySymbol},${card.set.name},${boosterNames},${probabilityString},${sixPackOnly},${ownershipStatus}`;
  }

  /** Gets formatted collection statistics for a user */
  async getFormattedCollectionStats(userId: bigint): Promise<string> {
    const stats = await this.getCollectionStats(userId);
    const lines: string[] = [];

    // Header
    lines.push(`${stats.displayName}’s collection:`);
    lines.push('');

    // Sets section
    lines.push(...this.formatSetsSection(stats.sets));

    // Boosters section
    lines.push(...this.formatBoostersSection(stats.boosters));

    return lines.join('\n');
  }

  /** Formats the sets section of collection statistics */
  private formatSetsSection(
    sets: { name: string; stats: string[] }[],
  ): string[] {
    const lines: string[] = ['Sets:'];
    for (const { name, stats: setStats } of sets) {
      lines.push(`${name}: ${setStats.join(' ⋅ ')}`);
    }
    lines.push('');
    lines.push(SETS_STATS_EXPLANATION);
    lines.push('');
    return lines;
  }

  /** Formats the boosters section of collection statistics */
  private formatBoostersSection(
    boosters: {
      name: string;
      diamondOwned: number;
      diamondNotNeeded: number;
      diamondTotal: number;
      newDiamondCardProbability: number;
      tradableOwned: number;
      tradableNotNeeded: number;
      tradableTotal: number;
      newTradableCardProbability: number;
      allOwned: number;
      allNotNeeded: number;
      allTotal: number;
      newCardProbability: number;
    }[],
  ): string[] {
    // Helper function to format owned+notNeeded/total
    const formatBoosterCount = (
      owned: number,
      notNeeded: number,
      total: number,
    ): string => {
      if (notNeeded === 0) {
        return `${owned}/${total}`;
      }
      return `${owned}+${notNeeded}/${total}`;
    };

    const lines: string[] = [
      'Booster Packs (sorted by probability for new cards, descending):',
    ];
    for (const {
      name,
      diamondOwned,
      diamondNotNeeded,
      diamondTotal,
      newDiamondCardProbability,
      tradableOwned,
      tradableNotNeeded,
      tradableTotal,
      newTradableCardProbability,
      allOwned,
      allNotNeeded,
      allTotal,
      newCardProbability,
    } of boosters) {
      lines.push(
        `${name}: ♢–♢♢♢♢ ${formatBoosterCount(diamondOwned, diamondNotNeeded, diamondTotal)} ⋅ p${newDiamondCardProbability.toFixed(2)}%` +
          ` | ♢–☆ ${formatBoosterCount(tradableOwned, tradableNotNeeded, tradableTotal)} ⋅ p${newTradableCardProbability.toFixed(2)}%` +
          ` | ♢–♛ ${formatBoosterCount(allOwned, allNotNeeded, allTotal)} ⋅ p${newCardProbability.toFixed(2)}%`,
      );
    }
    lines.push('');
    lines.push(BOOSTERS_STATS_EXPLANATION);
    return lines;
  }

  /** Gets collection statistics for a user */
  async getCollectionStats(userId: bigint): Promise<{
    displayName: string;
    sets: {
      name: string;
      stats: string[];
    }[];
    boosters: {
      name: string;
      diamondOwned: number;
      diamondNotNeeded: number;
      diamondTotal: number;
      newDiamondCardProbability: number;
      tradableOwned: number;
      tradableNotNeeded: number;
      tradableTotal: number;
      newTradableCardProbability: number;
      allOwned: number;
      allNotNeeded: number;
      allTotal: number;
      newCardProbability: number;
    }[];
  }> {
    const rawStats = await this.repository.retrieveCollectionStats(userId);
    const displayName = await this.getDisplayName(userId);

    return {
      displayName,
      sets: rawStats.sets.map(({ set, cards }) => {
        const cardsWithServiceStatus: CardWithOwnership[] = cards.map(
          ({ card, ownershipStatus }) => ({
            card,
            ownershipStatus,
          }),
        );
        return {
          name: set.name,
          stats: this.formatSetStats(
            this.calculateSetStats(cardsWithServiceStatus),
          ),
        };
      }),
      boosters: rawStats.sets
        .flatMap(({ set, boosters }) =>
          boosters
            .map(({ booster, cards }) => {
              const cardsWithServiceStatus: CardWithOwnership[] = cards.map(
                ({ card, ownershipStatus }) => ({
                  card,
                  ownershipStatus,
                }),
              );

              const missingCards = cardsWithServiceStatus
                .filter(
                  ({ ownershipStatus }) =>
                    ownershipStatus !== CardOwnershipStatus.OWNED &&
                    ownershipStatus !== CardOwnershipStatus.NOT_NEEDED,
                )
                .map(({ card }) => card);
              const allCards = cardsWithServiceStatus.map(({ card }) => card);

              const diamondCards = cardsWithServiceStatus.filter(({ card }) =>
                this.isCardOfRarity(card, [
                  Rarity.ONE_DIAMOND,
                  Rarity.TWO_DIAMONDS,
                  Rarity.THREE_DIAMONDS,
                  Rarity.FOUR_DIAMONDS,
                ]),
              );

              const tradableCards = cardsWithServiceStatus.filter(({ card }) =>
                this.isCardOfRarity(card, [
                  Rarity.ONE_DIAMOND,
                  Rarity.TWO_DIAMONDS,
                  Rarity.THREE_DIAMONDS,
                  Rarity.FOUR_DIAMONDS,
                  Rarity.ONE_STAR,
                ]),
              );

              const setKey = set.key as SetKey;
              const probabilitiesType = SET_PROBABILITY_STRATEGY[setKey];
              // Skip boosters from sets not in SET_DEFINITIONS (e.g., test sets)
              if (!probabilitiesType) {
                return null;
              }
              return {
                name: booster.name,
                diamondOwned: diamondCards.filter(
                  ({ ownershipStatus }) =>
                    ownershipStatus === CardOwnershipStatus.OWNED,
                ).length,
                diamondNotNeeded: diamondCards.filter(
                  ({ ownershipStatus }) =>
                    ownershipStatus === CardOwnershipStatus.NOT_NEEDED,
                ).length,
                diamondTotal: diamondCards.length,
                newDiamondCardProbability:
                  this.probabilityService.calculateNewDiamondCardProbability(
                    allCards,
                    missingCards,
                    probabilitiesType,
                  ) * 100,
                tradableOwned: tradableCards.filter(
                  ({ ownershipStatus }) =>
                    ownershipStatus === CardOwnershipStatus.OWNED,
                ).length,
                tradableNotNeeded: tradableCards.filter(
                  ({ ownershipStatus }) =>
                    ownershipStatus === CardOwnershipStatus.NOT_NEEDED,
                ).length,
                tradableTotal: tradableCards.length,
                newTradableCardProbability:
                  this.probabilityService.calculateNewTradableCardProbability(
                    allCards,
                    missingCards,
                    probabilitiesType,
                  ) * 100,
                allOwned: cardsWithServiceStatus.filter(
                  ({ ownershipStatus }) =>
                    ownershipStatus === CardOwnershipStatus.OWNED,
                ).length,
                allNotNeeded: cardsWithServiceStatus.filter(
                  ({ ownershipStatus }) =>
                    ownershipStatus === CardOwnershipStatus.NOT_NEEDED,
                ).length,
                allTotal: cardsWithServiceStatus.length,
                newCardProbability:
                  this.probabilityService.calculateNewCardProbability(
                    allCards,
                    missingCards,
                    probabilitiesType,
                  ) * 100,
              };
            })
            .filter(
              (booster): booster is NonNullable<typeof booster> =>
                booster !== null,
            ),
        )
        .sort((a, b) => b.newCardProbability - a.newCardProbability),
    };
  }

  /** Checks if a card has a specific rarity */
  private isCardOfRarity(card: PokemonCardModel, rarities: Rarity[]): boolean {
    return rarities.includes(card.rarity!);
  }

  /** Calculates statistics for a set */
  private calculateSetStats(cards: CardWithOwnership[]): {
    diamonds: CardGroup;
    stars: CardGroup;
    shinies: CardGroup;
    crowns: CardGroup;
    promos: CardGroup;
  } {
    return {
      diamonds: this.calculateCardGroup(cards, (card) =>
        this.isCardOfRarity(card, [
          Rarity.ONE_DIAMOND,
          Rarity.TWO_DIAMONDS,
          Rarity.THREE_DIAMONDS,
          Rarity.FOUR_DIAMONDS,
        ]),
      ),
      stars: this.calculateCardGroup(cards, (card) =>
        this.isCardOfRarity(card, [
          Rarity.ONE_STAR,
          Rarity.TWO_STARS,
          Rarity.THREE_STARS,
          Rarity.FOUR_STARS,
        ]),
      ),
      shinies: this.calculateCardGroup(cards, (card) =>
        this.isCardOfRarity(card, [Rarity.ONE_SHINY, Rarity.TWO_SHINY]),
      ),
      crowns: this.calculateCardGroup(cards, (card) =>
        this.isCardOfRarity(card, [Rarity.CROWN]),
      ),
      promos: this.calculateCardGroup(cards, (card) => card.rarity === null),
    };
  }

  /** Calculates statistics for a group of cards */
  private calculateCardGroup(
    cards: CardWithOwnership[],
    filter: (card: PokemonCardModel) => boolean,
  ): CardGroup {
    const filteredCards = cards.filter(({ card }) => filter(card));
    return {
      cards: filteredCards,
      owned: filteredCards.filter(
        ({ ownershipStatus }) => ownershipStatus === CardOwnershipStatus.OWNED,
      ).length,
      notNeeded: filteredCards.filter(
        ({ ownershipStatus }) =>
          ownershipStatus === CardOwnershipStatus.NOT_NEEDED,
      ).length,
      total: filteredCards.length,
    };
  }

  /** Formats set statistics */
  private formatSetStats(stats: {
    diamonds: CardGroup;
    stars: CardGroup;
    shinies: CardGroup;
    crowns: CardGroup;
    promos: CardGroup;
  }): string[] {
    const parts: string[] = [];

    // Helper function to format owned+notNeeded/total
    const formatCount = (group: CardGroup): string => {
      if (group.notNeeded === 0) {
        return `${group.owned}/${group.total}`;
      }
      return `${group.owned}+${group.notNeeded}/${group.total}`;
    };

    // Always show total for diamond cards
    if (stats.diamonds.total > 0) {
      parts.push(`♦️ ${formatCount(stats.diamonds)}`);
    }

    // Show count for stars, shinies, and crowns if the user has any (owned or not needed)
    // For these rarities, only show the count, not the total
    if (stats.stars.owned > 0 || stats.stars.notNeeded > 0) {
      const starsCount =
        stats.stars.notNeeded === 0
          ? stats.stars.owned.toString()
          : `${stats.stars.owned}+${stats.stars.notNeeded}`;
      parts.push(`⭐️ ${starsCount}`);
    }
    if (stats.shinies.owned > 0 || stats.shinies.notNeeded > 0) {
      const shiniesCount =
        stats.shinies.notNeeded === 0
          ? stats.shinies.owned.toString()
          : `${stats.shinies.owned}+${stats.shinies.notNeeded}`;
      parts.push(`✴️ ${shiniesCount}`);
    }
    if (stats.crowns.owned > 0 || stats.crowns.notNeeded > 0) {
      const crownsCount =
        stats.crowns.notNeeded === 0
          ? stats.crowns.owned.toString()
          : `${stats.crowns.owned}+${stats.crowns.notNeeded}`;
      parts.push(`👑 ${crownsCount}`);
    }

    if (parts.length === 0) {
      // For promo sets without rarities - show only count, not total
      const promosCount =
        stats.promos.notNeeded === 0
          ? stats.promos.owned.toString()
          : `${stats.promos.owned}+${stats.promos.notNeeded}`;
      parts.push(promosCount);
    }

    return parts;
  }

  private async synchronizeSet(
    setKey: string,
    setData: SetData,
  ): Promise<void> {
    // Check for duplicate card numbers
    const cardNumbers = Object.keys(setData.cards);
    const uniqueNumbers = new Set(cardNumbers);
    if (uniqueNumbers.size !== cardNumbers.length) {
      // Find the duplicate number
      const duplicateNumber = cardNumbers.find(
        (num) => cardNumbers.filter((n) => n === num).length > 1,
      );
      throw new PokemonTcgPocketDuplicateCardNumberError(
        setKey,
        duplicateNumber!,
      );
    }

    const set = await this.getOrCreateSet(setKey, setData);
    if (!set) {
      return;
    }

    const boosters = await this.getOrCreateBoosters(setKey, setData);
    await this.synchronizeCards(setKey, setData, boosters);
  }

  private async getOrCreateSet(
    setKey: string,
    setData: SetData,
  ): Promise<PokemonSetModel | null> {
    const set =
      (await this.repository.retrieveSetByKey(setKey)) ??
      (await this.repository.createSet(setKey, setData.name));
    return set;
  }

  private async getOrCreateBoosters(
    setKey: string,
    setData: SetData,
  ): Promise<PokemonBoosterModel[]> {
    // If boosters is explicitly null, return an empty array (no boosters)
    if (setData.boosters === null) {
      return [];
    }

    // If boosters is undefined, create a single booster with the set name
    const boosterNames = setData.boosters ?? [setData.name];

    const boosters = await Promise.all(
      boosterNames.map(async (name) => {
        const booster =
          (await this.repository.retrieveBoosterByNameAndSetKey(
            name,
            setKey,
          )) ?? (await this.repository.createBooster(name, setKey));
        return booster;
      }),
    );

    return boosters.filter((b): b is NonNullable<typeof b> => b !== null);
  }

  private async synchronizeCards(
    setKey: string,
    setData: SetData,
    boosters: PokemonBoosterModel[],
  ): Promise<void> {
    // Create a set of valid booster names for this set
    const validBoosterNames = new Set(boosters.map((b) => b.name));

    // Process all cards and create them
    for (const [cardNumberString, card] of Object.entries(setData.cards)) {
      const cardNumber = parseInt(cardNumberString, 10);
      if (isNaN(cardNumber)) {
        throw new PokemonTcgPocketInvalidCardNumberError(
          setKey,
          cardNumberString,
        );
      }

      await this.synchronizeCard(setKey, cardNumber, card, validBoosterNames);
    }
  }

  private async synchronizeCard(
    setKey: string,
    number: number,
    cardData: Card,
    validBoosterNames: Set<string>,
  ): Promise<void> {
    const card = await this.repository.retrieveCardByNumberAndSetKey(
      number,
      setKey,
    );
    if (card) {
      return;
    }

    const cardBoosterNames = this.convertToBoosterNameArray(
      cardData,
      validBoosterNames,
      setKey,
    );
    const rarity = this.convertSymbolToRarity(cardData.rarity);
    const isSixPackOnly = cardData.isSixPackOnly === true;

    // Validate and resolve godPackBooster
    let godPackBoosterId: number | undefined = undefined;
    if (cardData.godPackBooster !== undefined) {
      // Validate godPackBooster is only set for crown cards
      if (rarity !== Rarity.CROWN) {
        throw new Error(
          `Card ${setKey}/${number} has godPackBooster but is not a crown card (rarity: ${cardData.rarity})`,
        );
      }

      // Validate godPackBooster name exists in the set's boosters
      if (!validBoosterNames.has(cardData.godPackBooster)) {
        throw new Error(
          `Card ${setKey}/${number} references non-existent godPackBooster: ${cardData.godPackBooster}`,
        );
      }

      // Validate godPackBooster is one of the card's assigned boosters
      if (!cardBoosterNames.includes(cardData.godPackBooster)) {
        throw new Error(
          `Card ${setKey}/${number} godPackBooster "${cardData.godPackBooster}" not in card's boosters: ${cardBoosterNames.join(', ')}`,
        );
      }

      // Validate godPackBooster is only set when card is in multiple boosters
      if (cardBoosterNames.length <= 1) {
        throw new Error(
          `Card ${setKey}/${number} has godPackBooster but is only in one booster. godPackBooster should only be set when card is in multiple boosters.`,
        );
      }

      // Look up the booster ID
      const godPackBooster =
        await this.repository.retrieveBoosterByNameAndSetKey(
          cardData.godPackBooster,
          setKey,
        );

      if (!godPackBooster) {
        throw new Error(
          `Card ${setKey}/${number} references non-existent godPackBooster: ${cardData.godPackBooster}`,
        );
      }

      godPackBoosterId = godPackBooster.id;
    }

    await this.repository.createCard({
      name: cardData.name,
      setKey,
      number,
      rarity,
      boosterNames: cardBoosterNames,
      isSixPackOnly,
      godPackBoosterId,
    });
  }

  private convertToBoosterNameArray(
    cardData: Card,
    validBoosterNames: Set<string>,
    setKey: string,
  ): string[] {
    // If boosters is explicitly null, return an empty array (no boosters)
    if (cardData.boosters === null) {
      return [];
    }

    // If boosters is undefined, use all boosters in the set
    if (cardData.boosters === undefined) {
      return Array.from(validBoosterNames);
    }

    const boosterNames = Array.isArray(cardData.boosters)
      ? cardData.boosters
      : [cardData.boosters];

    // Validate that all referenced boosters exist
    const invalidBoosters = boosterNames.filter(
      (name) => !validBoosterNames.has(name),
    );
    if (invalidBoosters.length > 0) {
      throw new PokemonTcgPocketInvalidBoosterError(cardData.name, setKey);
    }

    return boosterNames;
  }

  private convertSymbolToRarity(
    rarityString: string | undefined,
  ): Rarity | null {
    if (!rarityString) {
      return null;
    }

    const rarity = RARITY_MAP[rarityString];
    if (!rarity) {
      throw new PokemonTcgPocketInvalidRarityError(rarityString);
    }

    return rarity;
  }

  /** Parses a card identifier string into either an ID or name */
  parseCardIdentifier(card: string | null | undefined): CardIdentifier {
    if (!card) {
      return {};
    }

    const match = CARD_ID_PATTERN.exec(card);
    if (match) {
      return {
        idInfo: {
          setKey: match[1],
          cardNumber: parseInt(match[2], 10),
        },
      };
    }

    return { cardName: card };
  }

  /** Builds search parameters for card queries */
  buildSearchParams(
    cardName: string | null,
    setKey: string | null,
    booster: string | null,
    rarity: string | null,
    idInfo?: CardIdInfo,
    userId?: bigint,
    ownershipFilter?: string,
  ): Record<string, unknown> {
    const searchParams: Record<string, unknown> = {};

    if (cardName) searchParams.cardName = cardName;
    if (idInfo?.setKey ?? setKey)
      searchParams.setKey = idInfo?.setKey ?? setKey;
    if (booster) searchParams.booster = booster;
    if (idInfo?.cardNumber) searchParams.cardNumber = idInfo?.cardNumber;
    if (rarity) searchParams.rarity = RARITY_MAP[rarity];
    if (userId && ownershipFilter) {
      searchParams.userId = userId;
      searchParams.ownershipFilter = ownershipFilter;
    }

    return searchParams;
  }

  /** Searches for cards with fallback to ID-only search if no results */
  async searchCardsWithFallback(
    searchParams: Record<string, unknown>,
    idInfo?: CardIdInfo,
  ): Promise<{
    cards: PokemonCardWithRelations[];
    idOnlyCards?: PokemonCardWithRelations[];
  }> {
    const cards = await this.searchCards(searchParams);

    // If we have no results and used an ownership filter, try without it
    if (cards.length === 0 && searchParams.ownershipFilter) {
      const paramsWithoutOwnership = { ...searchParams };
      delete paramsWithoutOwnership.ownershipFilter;
      delete paramsWithoutOwnership.userId;
      const cardsWithoutOwnership = await this.searchCards(
        paramsWithoutOwnership,
      );
      if (cardsWithoutOwnership.length > 0) {
        return { cards: cardsWithoutOwnership };
      }
    }

    // If we still have no results and have an ID, try ID-only search
    if (cards.length === 0 && idInfo) {
      const idOnlyCards = await this.searchCards({
        setKey: idInfo.setKey,
        cardNumber: idInfo.cardNumber,
      });
      return { cards, idOnlyCards };
    }

    return { cards };
  }

  /** Handles the case when no cards are found, with fallback search if needed */
  async handleNoCardsFound(
    searchParams: Record<string, unknown>,
    userId: bigint,
    idInfo?: CardIdInfo,
  ): Promise<string> {
    // Search if the cards would exist without the ownership filter
    const existingCards = await this.searchCards(searchParams);

    if (existingCards.length === 0) {
      // If we have a card ID and still no results, try searching with just the ID
      if (idInfo) {
        const idOnlyCards = await this.searchCards({
          setKey: idInfo.setKey,
          cardNumber: idInfo.cardNumber,
        });

        if (idOnlyCards.length > 0) {
          const cardDetails = await this.formatCardsAsCsv(idOnlyCards, userId);
          return CARD_EXISTS_BUT_NO_MATCH_MESSAGE(
            idInfo.setKey,
            idInfo.cardNumber,
            cardDetails,
          );
        }
      }

      return NO_CARDS_FOUND_MESSAGE;
    }

    const cardDetails = await this.formatCardsAsCsv(existingCards, userId);
    return cardDetails;
  }

  /** Processes multiple cards for add/remove/mark-as-not-needed operations */
  async processCards(
    cards: PokemonCardWithRelations[],
    userId: bigint,
    operation: PokemonCardOperation,
    bulkOperation: boolean,
  ): Promise<string> {
    const displayName = await this.getDisplayName(userId);
    const operationMap: Record<
      PokemonCardOperation,
      { verb: string; preposition: string }
    > = {
      add: { verb: 'added', preposition: 'to' },
      remove: { verb: 'removed', preposition: 'from' },
      'mark-as-not-needed': { verb: 'marked as not needed', preposition: 'in' },
    };
    const { verb, preposition } = operationMap[operation];

    if (!bulkOperation && cards.length > 1) {
      return MULTIPLE_MATCHES_MESSAGE(
        await this.formatCardsAsCsv(cards, userId),
      );
    }

    if (cards.length > 1 && bulkOperation) {
      const updatedCards = await Promise.all(
        cards.map((card) => {
          if (operation === 'remove') {
            return this.removeCardFromCollection(card.id, userId);
          } else if (operation === 'add') {
            return this.addCardToCollection(
              card.id,
              userId,
              OwnershipStatus.OWNED,
            );
          } else {
            // mark-as-not-needed
            return this.addCardToCollection(
              card.id,
              userId,
              OwnershipStatus.NOT_NEEDED,
            );
          }
        }),
      );

      const header = BULK_OPERATION_HEADER_MESSAGE(
        verb,
        cards.length,
        preposition,
        displayName,
      );
      const csv = await this.formatCardsAsCsv(updatedCards, userId);
      const stats = await this.getFormattedCollectionStats(userId);
      return BULK_OPERATION_WARNING_MESSAGE(header, csv, stats);
    }

    // Process single card
    assert(cards.length === 1);
    const card = cards[0];
    let updatedCard: PokemonCardWithRelations;
    if (operation === 'remove') {
      updatedCard = await this.removeCardFromCollection(card.id, userId);
    } else if (operation === 'add') {
      updatedCard = await this.addCardToCollection(
        card.id,
        userId,
        OwnershipStatus.OWNED,
      );
    } else {
      // mark-as-not-needed
      updatedCard = await this.addCardToCollection(
        card.id,
        userId,
        OwnershipStatus.NOT_NEEDED,
      );
    }

    const header = SINGLE_OPERATION_HEADER_MESSAGE(
      verb,
      preposition,
      displayName,
    );
    const csv = await this.formatCardsAsCsv([updatedCard], userId);
    const stats = await this.getFormattedCollectionStats(userId);
    return `${header}\n${csv}${UPDATED_STATS_MESSAGE(stats)}`;
  }
}
