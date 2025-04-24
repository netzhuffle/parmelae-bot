import { injectable, inject } from 'inversify';
import { PokemonTcgPocketRepository } from './Repositories/PokemonTcgPocketRepository.js';
import { load } from 'js-yaml';
import {
  Rarity,
  PokemonSet,
  PokemonBooster,
  User,
  PokemonCard,
} from '@prisma/client';
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
  NO_CARDS_IN_DB_MESSAGE,
  NO_MATCHING_CARDS_IN_COLLECTION_MESSAGE,
  NO_MATCHING_MISSING_CARDS_MESSAGE,
  MULTIPLE_MATCHES_MESSAGE,
  BULK_OPERATION_HEADER_MESSAGE,
  BULK_OPERATION_WARNING_MESSAGE,
  SINGLE_OPERATION_HEADER_MESSAGE,
  UPDATED_STATS_MESSAGE,
  OPERATION_RESULT_MESSAGE,
  NO_CARDS_FOUND_MESSAGE,
} from './texts.js';

/** Card ID regex pattern */
const CARD_ID_PATTERN = /^([A-Za-z0-9-]+)-(\d{3})$/;

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

/** Set key values */
export const SET_KEY_VALUES = [
  'A1',
  'A1a',
  'A2',
  'A2a',
  'A2b',
  'PROMO-A',
] as const;

/** Set key type */
export type SetKey = (typeof SET_KEY_VALUES)[number];

/** Maps set keys to their names */
export const SET_KEY_NAMES: Record<SetKey, string> = {
  A1: 'Unschlagbare Gene',
  A1a: 'Mysteriöse Insel',
  A2: 'Kollision von Raum und Zeit',
  A2a: 'Licht des Triumphs',
  A2b: 'Glänzendes Festival',
  'PROMO-A': 'Promo-A',
};

/** Booster values */
export const BOOSTER_VALUES = [
  'Glurak',
  'Mewtu',
  'Pikachu',
  'Mysteriöse Insel',
  'Dialga',
  'Palkia',
  'Licht des Triumphs',
  'Glänzendes Festival',
] as const;

/** Booster type */
export type Booster = (typeof BOOSTER_VALUES)[number];

/** Ownership filter values */
export const OWNERSHIP_FILTER_VALUES = ['all', 'owned', 'missing'] as const;

/** Ownership filter type */
export type OwnershipFilter = (typeof OWNERSHIP_FILTER_VALUES)[number];

/** Symbol for injecting the Pokemon TCG Pocket YAML content */
export const PokemonTcgPocketYamlSymbol = Symbol('PokemonTcgPocketYaml');

/** Card data from the YAML file */
export interface Card {
  /** The name of the card */
  name: string;
  /** The rarity of the card: ♢, ♢♢, ♢♢♢, ♢♢♢♢, ☆, ☆☆, ☆☆☆, ☆☆☆☆, ✸, ✸✸, or ♛ */
  rarity?: string;
  /** The booster(s) this card belongs to. If undefined, belongs to all boosters in the set */
  boosters?: string | string[] | null;
  /** Reference to another set that has a card with the same name that this card is equal to */
  equalTo?: string;
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

/** Maps rarity symbols to database enum values */
export const RARITY_MAP: Record<string, Rarity> = {
  '♢': Rarity.ONE_DIAMOND,
  '♢♢': Rarity.TWO_DIAMONDS,
  '♢♢♢': Rarity.THREE_DIAMONDS,
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
  [Rarity.TWO_DIAMONDS]: '♢♢',
  [Rarity.THREE_DIAMONDS]: '♢♢♢',
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
  card: PokemonCard;
  isOwned: boolean;
}

/** Group of cards with ownership statistics */
interface CardGroup {
  cards: CardWithOwnership[];
  owned: number;
  total: number;
}

/** Service for managing Pokemon TCG Pocket data */
@injectable()
export class PokemonTcgPocketService {
  constructor(
    private readonly probabilityService: PokemonTcgPocketProbabilityService,
    private readonly repository: PokemonTcgPocketRepository,
    @inject(PokemonTcgPocketYamlSymbol) private readonly yamlContent: string,
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
  ): Promise<PokemonCardWithRelations> {
    return this.repository.addCardToCollection(cardId, userId);
  }

  /** Removes a card from a user's collection */
  async removeCardFromCollection(
    cardId: number,
    userId: bigint,
  ): Promise<PokemonCardWithRelations> {
    return this.repository.removeCardFromCollection(cardId, userId);
  }

  /** Synchronizes the database with the YAML source file. */
  async synchronizeCardDatabaseWithYamlSource(): Promise<void> {
    const sets = load(this.yamlContent) as Sets;

    for (const [setKey, setData] of Object.entries(sets)) {
      await this.synchronizeSet(setKey, setData);
    }
  }

  /** Gets a user's display name (username with @ if available, otherwise first name) */
  async getDisplayName(userId: bigint): Promise<string> {
    const user = await this.repository.retrieveUserNames(userId);
    return user.username ? `@${user.username}` : user.firstName;
  }

  /** Formats multiple cards as CSV strings */
  async formatCardsAsCsv(
    cards: PokemonCardWithRelations[],
    userId?: bigint,
  ): Promise<string> {
    const displayName = userId ? await this.getDisplayName(userId) : 'Owned';
    const header = `ID,Name,Rarity,Set,Boosters,Owned by ${displayName}`;
    const csvLines = await Promise.all(
      cards.map((card) => this.formatCardAsCsv(card, userId)),
    );
    return [header, ...csvLines].join('\n');
  }

  /** Formats a card as a CSV string */
  private formatCardAsCsv(
    card: PokemonCardWithRelations,
    userId?: bigint,
  ): string {
    const boosterNames = card.boosters
      .map((b: PokemonBooster) => b.name)
      .join(',');
    const isOwned = userId
      ? card.owners.some((o: User) => o.id === userId)
      : false;
    const raritySymbol = card.rarity ? RARITY_REVERSE_MAP[card.rarity] : '';
    return `${card.set.key}-${card.number.toString().padStart(3, '0')},${card.name},${raritySymbol},${card.set.name},${boosterNames},${isOwned ? 'Yes' : 'No'}`;
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
      diamondTotal: number;
      newDiamondCardProbability: number;
      tradableOwned: number;
      tradableTotal: number;
      newTradableCardProbability: number;
      allOwned: number;
      allTotal: number;
      newCardProbability: number;
    }[],
  ): string[] {
    const lines: string[] = ['Booster Packs:'];
    for (const {
      name,
      diamondOwned,
      diamondTotal,
      newDiamondCardProbability,
      tradableOwned,
      tradableTotal,
      newTradableCardProbability,
      allOwned,
      allTotal,
      newCardProbability,
    } of boosters) {
      lines.push(
        `${name}: ♢–♢♢♢♢ ${diamondOwned}/${diamondTotal} ⋅ p${newDiamondCardProbability.toFixed(2)}%` +
          ` | ♢–☆ ${tradableOwned}/${tradableTotal} ⋅ p${newTradableCardProbability.toFixed(2)}%` +
          ` | ♢–♛ ${allOwned}/${allTotal} ⋅ p${newCardProbability.toFixed(2)}%`,
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
      diamondTotal: number;
      newDiamondCardProbability: number;
      tradableOwned: number;
      tradableTotal: number;
      newTradableCardProbability: number;
      allOwned: number;
      allTotal: number;
      newCardProbability: number;
    }[];
  }> {
    const rawStats = await this.repository.retrieveCollectionStats(userId);
    const displayName = await this.getDisplayName(userId);

    return {
      displayName,
      sets: rawStats.sets.map(({ set, cards }) => ({
        name: set.name,
        stats: this.formatSetStats(this.calculateSetStats(cards)),
      })),
      boosters: rawStats.sets.flatMap(({ boosters }) =>
        boosters.map(({ booster, cards }) => {
          const missingCards = cards
            .filter(({ isOwned }) => !isOwned)
            .map(({ card }) => card);
          const allCards = cards.map(({ card }) => card);

          const diamondCards = cards.filter(({ card }) =>
            this.isCardOfRarity(card, [
              Rarity.ONE_DIAMOND,
              Rarity.TWO_DIAMONDS,
              Rarity.THREE_DIAMONDS,
              Rarity.FOUR_DIAMONDS,
            ]),
          );

          const tradableCards = cards.filter(({ card }) =>
            this.isCardOfRarity(card, [
              Rarity.ONE_DIAMOND,
              Rarity.TWO_DIAMONDS,
              Rarity.THREE_DIAMONDS,
              Rarity.FOUR_DIAMONDS,
              Rarity.ONE_STAR,
            ]),
          );

          return {
            name: booster.name,
            diamondOwned: diamondCards.filter(({ isOwned }) => isOwned).length,
            diamondTotal: diamondCards.length,
            newDiamondCardProbability:
              this.probabilityService.calculateNewDiamondCardProbability(
                allCards,
                missingCards,
                booster.hasShinyRarity,
              ) * 100,
            tradableOwned: tradableCards.filter(({ isOwned }) => isOwned)
              .length,
            tradableTotal: tradableCards.length,
            newTradableCardProbability:
              this.probabilityService.calculateNewTradableCardProbability(
                allCards,
                missingCards,
                booster.hasShinyRarity,
              ) * 100,
            allOwned: cards.filter(({ isOwned }) => isOwned).length,
            allTotal: cards.length,
            newCardProbability:
              this.probabilityService.calculateNewCardProbability(
                allCards,
                missingCards,
                booster.hasShinyRarity,
              ) * 100,
          };
        }),
      ),
    };
  }

  /** Checks if a card has a specific rarity */
  private isCardOfRarity(card: PokemonCard, rarities: Rarity[]): boolean {
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
    filter: (card: PokemonCard) => boolean,
  ): CardGroup {
    const filteredCards = cards.filter(({ card }) => filter(card));
    return {
      cards: filteredCards,
      owned: filteredCards.filter(({ isOwned }) => isOwned).length,
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

    // Always show total for diamond cards
    if (stats.diamonds.total > 0) {
      parts.push(`♦️ ${stats.diamonds.owned}/${stats.diamonds.total}`);
    }

    // Only show owned count for stars, shinies, and crowns if the user owns at least one
    if (stats.stars.owned > 0) {
      parts.push(`⭐️ ${stats.stars.owned}`);
    }
    if (stats.shinies.owned > 0) {
      parts.push(`✴️ ${stats.shinies.owned}`);
    }
    if (stats.crowns.owned > 0) {
      parts.push(`👑 ${stats.crowns.owned}`);
    }

    if (parts.length === 0) {
      // For promo sets without rarities
      parts.push(stats.promos.owned.toString());
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
  ): Promise<PokemonSet | null> {
    const set =
      (await this.repository.retrieveSetByKey(setKey)) ??
      (await this.repository.createSet(setKey, setData.name));
    return set;
  }

  private async getOrCreateBoosters(
    setKey: string,
    setData: SetData,
  ): Promise<PokemonBooster[]> {
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
    boosters: PokemonBooster[],
  ): Promise<void> {
    // Create a set of valid booster names for this set
    const validBoosterNames = new Set(boosters.map((b) => b.name));

    // Track which boosters contain shiny cards
    const boostersWithShinyCards = new Set<string>();

    // First pass: Process all cards and track which boosters contain shiny cards
    for (const [cardNumberString, card] of Object.entries(setData.cards)) {
      const cardNumber = parseInt(cardNumberString, 10);
      if (isNaN(cardNumber)) {
        throw new PokemonTcgPocketInvalidCardNumberError(
          setKey,
          cardNumberString,
        );
      }

      // If card has shiny rarity, mark its boosters
      if (card.rarity === '✸' || card.rarity === '✸✸') {
        const cardBoosterNames = this.convertToBoosterNameArray(
          card,
          validBoosterNames,
          setKey,
        );
        cardBoosterNames.forEach((name) => boostersWithShinyCards.add(name));
      }
    }

    // Update hasShinyRarity for boosters
    await Promise.all(
      boosters.map((booster) =>
        this.repository.updateBoosterShinyRarity(
          booster.id,
          boostersWithShinyCards.has(booster.name),
        ),
      ),
    );

    // Second pass: Create all cards
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

    await this.repository.createCard(
      cardData.name,
      setKey,
      number,
      rarity,
      cardBoosterNames,
    );
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

  /** Handles the case when no cards are found for add/remove operations */
  async handleNoCardsFoundForAddRemove(
    searchParams: Record<string, unknown>,
    userId: bigint,
    remove: boolean,
    idInfo?: CardIdInfo,
  ): Promise<string> {
    const displayName = await this.getDisplayName(userId);

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
          return (
            CARD_EXISTS_BUT_NO_MATCH_MESSAGE(
              idInfo.setKey,
              idInfo.cardNumber,
              cardDetails,
            ) + OPERATION_RESULT_MESSAGE(remove)
          );
        }
      }

      return NO_CARDS_IN_DB_MESSAGE(remove);
    }

    const cardDetails = await this.formatCardsAsCsv(existingCards, userId);
    if (remove) {
      return NO_MATCHING_CARDS_IN_COLLECTION_MESSAGE(displayName, cardDetails);
    }
    return NO_MATCHING_MISSING_CARDS_MESSAGE(displayName, cardDetails);
  }

  /** Processes multiple cards for add/remove operations */
  async processCards(
    cards: PokemonCardWithRelations[],
    userId: bigint,
    remove: boolean,
    bulkOperation: boolean,
  ): Promise<string> {
    const displayName = await this.getDisplayName(userId);
    const operation = remove ? 'removed' : 'added';
    const preposition = remove ? 'from' : 'to';

    if (!bulkOperation && cards.length > 1) {
      return MULTIPLE_MATCHES_MESSAGE(
        await this.formatCardsAsCsv(cards, userId),
      );
    }

    if (cards.length > 1 && bulkOperation) {
      const updatedCards = await Promise.all(
        cards.map((card) =>
          remove
            ? this.removeCardFromCollection(card.id, userId)
            : this.addCardToCollection(card.id, userId),
        ),
      );

      const header = BULK_OPERATION_HEADER_MESSAGE(
        operation,
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
    const updatedCard = remove
      ? await this.removeCardFromCollection(card.id, userId)
      : await this.addCardToCollection(card.id, userId);

    const header = SINGLE_OPERATION_HEADER_MESSAGE(
      operation,
      preposition,
      displayName,
    );
    const csv = await this.formatCardsAsCsv([updatedCard], userId);
    const stats = await this.getFormattedCollectionStats(userId);
    return `${header}\n${csv}${UPDATED_STATS_MESSAGE(stats)}`;
  }
}
