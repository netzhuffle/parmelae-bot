import { injectable, inject } from 'inversify';
import { PokemonTcgPocketRepository } from './Repositories/PokemonTcgPocketRepository.js';
import { load } from 'js-yaml';
import { Rarity, PokemonSet, PokemonBooster } from '@prisma/client';
import { PokemonCardWithRelations } from './Repositories/Types.js';
import { PokemonTcgPocketInvalidBoosterError } from './Errors/PokemonTcgPocketInvalidBoosterError.js';
import { PokemonTcgPocketInvalidRarityError } from './Errors/PokemonTcgPocketInvalidRarityError.js';
import { PokemonTcgPocketDuplicateCardNumberError } from './Errors/PokemonTcgPocketDuplicateCardNumberError.js';
import { PokemonTcgPocketInvalidCardNumberError } from './Errors/PokemonTcgPocketInvalidCardNumberError.js';
import { OwnershipFilter } from './Tools/pokemonCardSearchTool.js';

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
export const RARITY_REVERSE_MAP: Record<Rarity, string> = {
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

/** Service for managing Pokemon TCG Pocket data */
@injectable()
export class PokemonTcgPocketService {
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

  /** Synchronizes the database with the YAML source file. */
  async synchronizeCardDatabaseWithYmlSource(): Promise<void> {
    const sets = load(this.yamlContent) as Sets;

    for (const [setKey, setData] of Object.entries(sets)) {
      await this.synchronizeSet(setKey, setData);
    }
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
