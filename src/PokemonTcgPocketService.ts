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
import { OwnershipFilter } from './Tools/pokemonCardSearchTool.js';
import { PokemonCardWithRelations } from './Repositories/Types.js';
import { PokemonTcgPocketProbabilityService } from './PokemonTcgPocketProbabilityService.js';

/** Symbol for injecting the Pokemon TCG Pocket YAML content */
export const PokemonTcgPocketYamlSymbol = Symbol('PokemonTcgPocketYaml');

/** Card data from the YAML file */
export interface Card {
  /** The name of the card */
  name: string;
  /** The rarity of the card: ♢, ♢♢, ♢♢♢, ♢♢♢♢, ☆, ☆☆, ☆☆☆, ☆☆☆☆, or ♛ */
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
  private readonly probabilityService =
    new PokemonTcgPocketProbabilityService();

  constructor(
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
  async synchronizeCardDatabaseWithYmlSource(): Promise<void> {
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
  async getCollectionStats(userId: bigint): Promise<{
    displayName: string;
    sets: {
      name: string;
      stats: string[];
    }[];
    boosters: {
      name: string;
      owned: number;
      total: number;
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
          return {
            name: booster.name,
            owned: cards.filter(({ isOwned }) => isOwned).length,
            total: cards.length,
            newCardProbability:
              this.probabilityService.calculateNewCardProbability(
                cards.map(({ card }) => card),
                missingCards,
              ) * 100,
          };
        }),
      ),
    };
  }

  /** Calculates statistics for a set */
  private calculateSetStats(cards: CardWithOwnership[]): {
    diamonds: CardGroup;
    stars: CardGroup;
    crowns: CardGroup;
    promos: CardGroup;
  } {
    const isDiamondCard = (card: PokemonCard): boolean =>
      card.rarity === Rarity.ONE_DIAMOND ||
      card.rarity === Rarity.TWO_DIAMONDS ||
      card.rarity === Rarity.THREE_DIAMONDS ||
      card.rarity === Rarity.FOUR_DIAMONDS;

    const isStarCard = (card: PokemonCard): boolean =>
      card.rarity === Rarity.ONE_STAR ||
      card.rarity === Rarity.TWO_STARS ||
      card.rarity === Rarity.THREE_STARS ||
      card.rarity === Rarity.FOUR_STARS;

    const isCrownCard = (card: PokemonCard): boolean =>
      card.rarity === Rarity.CROWN;

    const isPromoCard = (card: PokemonCard): boolean => card.rarity === null;

    return {
      diamonds: this.calculateCardGroup(cards, isDiamondCard),
      stars: this.calculateCardGroup(cards, isStarCard),
      crowns: this.calculateCardGroup(cards, isCrownCard),
      promos: this.calculateCardGroup(cards, isPromoCard),
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

  /** Formats the statistics for a set */
  private formatSetStats(stats: {
    diamonds: CardGroup;
    stars: CardGroup;
    crowns: CardGroup;
    promos: CardGroup;
  }): string[] {
    const parts: string[] = [];

    // For sets with rarities
    const hasRarities =
      stats.diamonds.total > 0 ||
      stats.stars.total > 0 ||
      stats.crowns.total > 0;

    if (hasRarities) {
      if (stats.diamonds.total > 0) {
        parts.push(`♦️ ${stats.diamonds.owned}/${stats.diamonds.total}`);
      }
      if (stats.stars.total > 0) {
        parts.push(`⭐️ ${stats.stars.owned}`);
      }
      if (stats.crowns.total > 0) {
        parts.push(`👑 ${stats.crowns.owned}`);
      }
    } else {
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
    let set = await this.repository.retrieveSetByKey(setKey);
    if (!set) {
      set = await this.repository.createSet(setKey, setData.name);
    }
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
        let booster = await this.repository.retrieveBoosterByNameAndSetKey(
          name,
          setKey,
        );
        if (!booster) {
          booster = await this.repository.createBooster(name, setKey);
        }
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
}
