import {
  PokemonSet,
  PokemonBooster,
  PokemonCard,
  Rarity,
  PrismaClient,
} from '@prisma/client';
import { PokemonTcgPocketRepository } from '../Repositories/PokemonTcgPocketRepository.js';
import { PokemonTcgPocketEntityCache } from '../Caches/PokemonTcgPocketEntityCache.js';

/** Fake repository for testing Pokemon TCG Pocket functionality */
export class PokemonTcgPocketRepositoryFake extends PokemonTcgPocketRepository {
  private sets = new Map<string, PokemonSet>();
  private boosters = new Map<string, PokemonBooster>();
  private cards = new Map<string, PokemonCard>();
  private cardBoosters = new Map<number, Set<number>>();
  private nextId = 1;

  constructor() {
    // Pass empty objects as we won't use them
    super(
      undefined as unknown as PrismaClient,
      undefined as unknown as PokemonTcgPocketEntityCache,
    );
  }

  /** Retrieves a set by its key, or null if it doesn't exist */
  retrieveSetByKey(key: string): Promise<PokemonSet | null> {
    return Promise.resolve(this.sets.get(key) ?? null);
  }

  /** Retrieves a booster by its name and set key, or null if it doesn't exist */
  retrieveBoosterByNameAndSetKey(
    name: string,
    setKey: string,
  ): Promise<PokemonBooster | null> {
    const set = this.sets.get(setKey);
    if (!set) return Promise.resolve(null);

    return Promise.resolve(this.boosters.get(`${set.id}_${name}`) ?? null);
  }

  /** Retrieves a card by its number and set key, or null if it doesn't exist */
  retrieveCardByNumberAndSetKey(
    number: number,
    setKey: string,
  ): Promise<PokemonCard | null> {
    const set = this.sets.get(setKey);
    if (!set) return Promise.resolve(null);

    return Promise.resolve(this.cards.get(`${set.id}_${number}`) ?? null);
  }

  /** Creates a new set */
  createSet(key: string, name: string): Promise<PokemonSet> {
    const set: PokemonSet = {
      id: this.nextId++,
      key,
      name,
    };
    this.sets.set(key, set);
    return Promise.resolve(set);
  }

  /** Creates a new booster */
  createBooster(name: string, setKey: string): Promise<PokemonBooster> {
    const set = this.sets.get(setKey);
    if (!set) {
      throw new Error(`Set ${setKey} not found`);
    }

    const booster: PokemonBooster = {
      id: this.nextId++,
      name,
      setId: set.id,
    };
    this.boosters.set(`${set.id}_${name}`, booster);
    return Promise.resolve(booster);
  }

  /** Creates a new card */
  createCard(
    name: string,
    setKey: string,
    number: number,
    rarity: Rarity | null,
    boosterNames: string[],
  ): Promise<PokemonCard> {
    const set = this.sets.get(setKey);
    if (!set) {
      throw new Error(`Set ${setKey} not found`);
    }

    // Verify all boosters exist and collect their IDs
    const boosterIds = new Set<number>();
    for (const boosterName of boosterNames) {
      const booster = this.boosters.get(`${set.id}_${boosterName}`);
      if (!booster) {
        throw new Error(`Booster ${boosterName} not found in set ${setKey}`);
      }
      boosterIds.add(booster.id);
    }

    const card: PokemonCard = {
      id: this.nextId++,
      name,
      setId: set.id,
      number,
      rarity,
    };
    this.cards.set(`${set.id}_${number}`, card);
    this.cardBoosters.set(card.id, boosterIds);
    return Promise.resolve(card);
  }

  /** Gets boosters for a card */
  getCardBoosters(cardId: number): PokemonBooster[] {
    const boosterIds = this.cardBoosters.get(cardId) ?? new Set<number>();
    return Array.from(this.boosters.values()).filter((b) =>
      boosterIds.has(b.id),
    );
  }

  /** Clears all stored data */
  clear(): void {
    this.sets.clear();
    this.boosters.clear();
    this.cards.clear();
    this.cardBoosters.clear();
    this.nextId = 1;
  }

  /** Gets all stored sets */
  getAllSets(): PokemonSet[] {
    return Array.from(this.sets.values());
  }

  /** Gets all stored boosters */
  getAllBoosters(): PokemonBooster[] {
    return Array.from(this.boosters.values());
  }

  /** Gets all stored cards */
  getAllCards(): PokemonCard[] {
    return Array.from(this.cards.values());
  }

  /** Search for cards using various filters */
  async searchCards(): Promise<
    (PokemonCard & {
      set: { name: string; id: number; key: string };
      boosters: PokemonBooster[];
    })[]
  > {
    // Add a minimal delay to satisfy require-await
    await Promise.resolve();

    return Array.from(this.cards.values()).map((card) => {
      const set = Array.from(this.sets.values()).find(
        (s) => s.id === card.setId,
      )!;
      const boosters = this.getCardBoosters(card.id);
      return {
        ...card,
        set,
        boosters,
      };
    });
  }
}
