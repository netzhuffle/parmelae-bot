import {
  PokemonSet,
  PokemonBooster,
  PokemonCard,
  Rarity,
  PrismaClient,
  OwnershipStatus,
} from '@prisma/client';
import { PokemonTcgPocketRepository } from '../Repositories/PokemonTcgPocketRepository.js';
import { PokemonTcgPocketEntityCache } from '../Caches/PokemonTcgPocketEntityCache.js';
import { PokemonCardWithRelations } from '../Repositories/Types.js';
import {
  OwnershipFilter,
  CardOwnershipStatus,
} from '../PokemonTcgPocketService.js';
import { PokemonTcgPocketDatabaseError } from '../Errors/PokemonTcgPocketDatabaseError.js';

/** Fake repository for testing Pokemon TCG Pocket functionality */
export class PokemonTcgPocketRepositoryFake extends PokemonTcgPocketRepository {
  private sets = new Map<string, PokemonSet>();
  private boosters = new Map<string, PokemonBooster>();
  private cards = new Map<string, PokemonCard>();
  private cardBoosters = new Map<number, Set<number>>();
  private cardOwners = new Map<number, Set<bigint>>();
  private cardOwnershipStatus = new Map<string, OwnershipStatus>();
  private nextId = 1;
  private idOnlyCards = new Set<number>();

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
      hasShinyRarity: false,
      hasSixPacks: false,
    };
    this.boosters.set(`${set.id}_${name}`, booster);
    return Promise.resolve(booster);
  }

  /** Creates a new card */
  createCard({
    name,
    setKey,
    number,
    rarity,
    boosterNames,
    isSixPackOnly,
  }: {
    name: string;
    setKey: string;
    number: number;
    rarity: Rarity | null;
    boosterNames: string[];
    isSixPackOnly: boolean;
  }): Promise<PokemonCard> {
    const set = this.sets.get(setKey);
    if (!set) {
      throw new Error(`Set ${setKey} not found`);
    }

    const card: PokemonCard = {
      id: this.nextId++,
      name,
      setId: set.id,
      number,
      rarity,
      isSixPackOnly,
    };
    this.cards.set(`${setKey}_${number}`, card);

    // Store booster associations
    const boosterIds = new Set<number>();
    for (const boosterName of boosterNames) {
      const booster = this.boosters.get(`${set.id}_${boosterName}`);
      if (booster) {
        boosterIds.add(booster.id);
      }
    }
    this.cardBoosters.set(card.id, boosterIds);

    return Promise.resolve(card);
  }

  /** Creates a new card that will only match when searched by ID */
  async createIdOnlyCard(
    name: string,
    setKey: string,
    number: number,
    rarity: Rarity | null,
    boosterNames: string[],
  ): Promise<PokemonCard> {
    const card = await this.createCard({
      name,
      setKey,
      number,
      rarity,
      boosterNames,
      isSixPackOnly: false,
    });
    this.idOnlyCards.add(card.id);
    return card;
  }

  /** Search for cards using various filters */
  async searchCards(searchCriteria?: {
    cardName?: string;
    setName?: string;
    booster?: string;
    rarity?: Rarity;
    setKey?: string;
    cardNumber?: number;
    userId?: bigint;
    ownershipFilter?: OwnershipFilter;
  }): Promise<PokemonCardWithRelations[]> {
    // Return all cards with their relationships
    // Apply only basic filtering to minimize business logic in fakes/tests
    let cards = Array.from(this.cards.values());

    // If we have both cardNumber and setKey, we're searching by ID
    const isIdSearch =
      searchCriteria?.cardNumber !== undefined &&
      searchCriteria?.setKey !== undefined;
    const hasOtherCriteria =
      searchCriteria?.cardName !== undefined ||
      searchCriteria?.setName !== undefined ||
      searchCriteria?.booster !== undefined ||
      searchCriteria?.rarity !== undefined;

    // Apply basic ID filtering
    if (isIdSearch) {
      const setKey = searchCriteria.setKey;
      const cardNumber = searchCriteria.cardNumber;
      cards = cards.filter((card) => {
        const cardKey = Array.from(this.cards.entries()).find(
          ([_, c]) => c.id === card.id,
        )?.[0];
        if (!cardKey) return false;
        const [cardSetKey, cardNumberStr] = cardKey.split('_');
        return (
          cardSetKey === setKey && parseInt(cardNumberStr, 10) === cardNumber
        );
      });
    }

    // If we have other criteria, filter out ID-only cards
    if (hasOtherCriteria) {
      cards = cards.filter((card) => !this.idOnlyCards.has(card.id));
    }

    // Apply basic name filtering
    const searchName = searchCriteria?.cardName;
    if (searchName) {
      cards = cards.filter((card) =>
        card.name.toLowerCase().includes(searchName.toLowerCase()),
      );
    }

    // Only apply userId filtering as it's critical for ownership tests
    if (searchCriteria?.userId !== undefined) {
      const userId = searchCriteria.userId;
      if (searchCriteria.ownershipFilter === 'owned') {
        cards = cards.filter((card) => {
          const owners = this.cardOwners.get(card.id);
          if (!owners?.has(userId)) return false;
          const statusKey = `${card.id}_${userId}`;
          const status = this.cardOwnershipStatus.get(statusKey);
          return status === OwnershipStatus.OWNED;
        });
      } else if (searchCriteria.ownershipFilter === 'missing') {
        cards = cards.filter((card) => {
          const owners = this.cardOwners.get(card.id);
          return !owners?.has(userId);
        });
      } else if (searchCriteria.ownershipFilter === 'not_needed') {
        cards = cards.filter((card) => {
          const owners = this.cardOwners.get(card.id);
          if (!owners?.has(userId)) return false;
          const statusKey = `${card.id}_${userId}`;
          const status = this.cardOwnershipStatus.get(statusKey);
          return status === OwnershipStatus.NOT_NEEDED;
        });
      }
    }

    return Promise.resolve(
      cards.map((card) => {
        // Find the set by looking up the card's setId in the sets map
        const set = Array.from(this.sets.values()).find(
          (s) => s.id === card.setId,
        );
        if (!set) {
          // Find the set by key instead since that's what we use in tests
          const cardKey = Array.from(this.cards.entries()).find(
            ([_, c]) => c.id === card.id,
          )?.[0];
          if (!cardKey) {
            throw new Error(`Card ${card.id} not found in lookup map`);
          }
          const setKey = cardKey.split('_')[0];
          const setByKey = this.sets.get(setKey);
          if (!setByKey) {
            throw new Error(`Set with key ${setKey} not found`);
          }
          return {
            ...card,
            set: setByKey,
            boosters: this.getCardBoosters(card.id),
            ownership: Array.from(this.cardOwners.get(card.id) ?? []).map(
              (userId) => ({
                id: this.nextId++, // ownership record id
                cardId: card.id,
                userId: userId,
                status: OwnershipStatus.OWNED,
                createdAt: new Date(),
                updatedAt: new Date(),
                user: {
                  id: userId,
                  isBot: false,
                  firstName: 'Test' + userId,
                  lastName: null,
                  username: Number(userId) % 2 === 0 ? null : 'test' + userId,
                  languageCode: null,
                },
              }),
            ),
          };
        }
        const boosters = this.getCardBoosters(card.id);
        const ownership = Array.from(this.cardOwners.get(card.id) ?? []).map(
          (userId) => {
            const statusKey = `${card.id}_${userId}`;
            const ownershipStatus =
              this.cardOwnershipStatus.get(statusKey) ?? OwnershipStatus.OWNED;
            return {
              id: this.nextId++, // ownership record id
              cardId: card.id,
              userId: userId,
              status: ownershipStatus,
              createdAt: new Date(),
              updatedAt: new Date(),
              user: {
                id: userId,
                isBot: false,
                firstName: 'Test' + userId,
                lastName: null,
                username: Number(userId) % 2 === 0 ? null : 'test' + userId,
                languageCode: null,
              },
            };
          },
        );
        return {
          ...card,
          set,
          boosters,
          ownership,
        };
      }),
    );
  }

  /** Adds a card to a user's collection */
  addCardToCollection(
    cardId: number,
    userId: bigint,
    status: OwnershipStatus = OwnershipStatus.OWNED,
  ): Promise<PokemonCardWithRelations> {
    const card = this.findCardById(cardId);
    if (!card) {
      throw new Error(`Card ${cardId} not found`);
    }

    let owners = this.cardOwners.get(cardId);
    if (!owners) {
      owners = new Set<bigint>();
      this.cardOwners.set(cardId, owners);
    }
    owners.add(userId);

    // Store the ownership status separately
    const statusKey = `${cardId}_${userId}`;
    this.cardOwnershipStatus.set(statusKey, status);

    const set = Array.from(this.sets.values()).find(
      (s) => s.id === card.setId,
    )!;
    const boosters = this.getCardBoosters(card.id);
    const ownership = Array.from(owners).map((ownerId) => {
      const statusKey = `${card.id}_${ownerId}`;
      const ownershipStatus =
        this.cardOwnershipStatus.get(statusKey) ?? OwnershipStatus.OWNED;
      return {
        id: this.nextId++,
        cardId: card.id,
        userId: ownerId,
        status: ownershipStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: ownerId,
          isBot: false,
          firstName: 'Test' + ownerId,
          lastName: null,
          username: Number(ownerId) % 2 === 0 ? null : 'test' + ownerId,
          languageCode: null,
        },
      };
    });

    return Promise.resolve({
      ...card,
      set,
      boosters,
      ownership,
    });
  }

  /** Get card IDs within a number range in a specific set */
  getCardIdsInRange(
    setKey: string,
    startNumber: number,
    endNumber: number,
  ): Promise<number[]> {
    const cards = Array.from(this.cards.values());
    const set = Array.from(this.sets.values()).find((s) => s.key === setKey);

    if (!set) {
      return Promise.resolve([]);
    }

    const filteredCards = cards.filter((card) => {
      // Check set match
      if (card.setId !== set.id) return false;

      // Check number range
      if (card.number < startNumber || card.number > endNumber) return false;

      return true;
    });

    // Return just the card IDs, sorted by number
    const cardIds = filteredCards
      .sort((a, b) => a.number - b.number)
      .map((card) => card.id);

    return Promise.resolve(cardIds);
  }

  /** Adds multiple cards to a user's collection in bulk with upsert logic */
  addMultipleCardsToCollection(
    cardIds: number[],
    userId: bigint,
  ): Promise<PokemonCardWithRelations[]> {
    const result: PokemonCardWithRelations[] = [];

    for (const cardId of cardIds) {
      const card = this.findCardById(cardId);
      if (!card) {
        continue; // Skip non-existent cards
      }

      let owners = this.cardOwners.get(cardId);
      if (!owners) {
        owners = new Set<bigint>();
        this.cardOwners.set(cardId, owners);
      }

      // Upsert logic: create or update ownership status (always OWNED for bulk adds)
      owners.add(userId);
      const statusKey = `${cardId}_${userId}`;
      this.cardOwnershipStatus.set(statusKey, OwnershipStatus.OWNED);

      const set = Array.from(this.sets.values()).find(
        (s) => s.id === card.setId,
      )!;
      const boosters = this.getCardBoosters(card.id);
      const ownership = Array.from(owners).map((ownerId) => {
        const statusKey = `${card.id}_${ownerId}`;
        const ownershipStatus =
          this.cardOwnershipStatus.get(statusKey) ?? OwnershipStatus.OWNED;
        return {
          id: this.nextId++,
          cardId: card.id,
          userId: ownerId,
          status: ownershipStatus,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: ownerId,
            isBot: false,
            firstName: 'Test' + ownerId,
            lastName: null,
            username: Number(ownerId) % 2 === 0 ? null : 'test' + ownerId,
            languageCode: null,
          },
        };
      });

      result.push({
        ...card,
        set,
        boosters,
        ownership,
      });
    }

    return Promise.resolve(
      result.sort(
        (a, b) => a.set.key.localeCompare(b.set.key) || a.number - b.number,
      ),
    );
  }

  /** Removes a card from a user's collection */
  removeCardFromCollection(
    cardId: number,
    userId: bigint,
  ): Promise<PokemonCardWithRelations> {
    const card = this.findCardById(cardId);
    if (!card) {
      throw new Error(`Card ${cardId} not found`);
    }

    const owners = this.cardOwners.get(cardId);
    if (owners) {
      owners.delete(userId);
    }

    const set = Array.from(this.sets.values()).find(
      (s) => s.id === card.setId,
    )!;
    const boosters = this.getCardBoosters(card.id);
    const ownership = Array.from(owners ?? []).map((ownerId) => {
      const statusKey = `${card.id}_${ownerId}`;
      const ownershipStatus =
        this.cardOwnershipStatus.get(statusKey) ?? OwnershipStatus.OWNED;
      return {
        id: this.nextId++,
        cardId: card.id,
        userId: ownerId,
        status: ownershipStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: ownerId,
          isBot: false,
          firstName: 'Test' + ownerId,
          lastName: null,
          username: Number(ownerId) % 2 === 0 ? null : 'test' + ownerId,
          languageCode: null,
        },
      };
    });

    return Promise.resolve({
      ...card,
      set,
      boosters,
      ownership,
    });
  }

  /** Gets boosters for a card */
  getCardBoosters(cardId: number): PokemonBooster[] {
    const boosterIds = this.cardBoosters.get(cardId) ?? new Set<number>();
    return Array.from(this.boosters.values()).filter((b) =>
      boosterIds.has(b.id),
    );
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

  /** Finds a card by its ID */
  private findCardById(cardId: number): PokemonCard | undefined {
    return Array.from(this.cards.values()).find((c) => c.id === cardId);
  }

  /** Returns a user's names by their ID */
  retrieveUserNames(userId: bigint): Promise<{
    username: string | null;
    firstName: string;
  }> {
    return Promise.resolve({
      username: Number(userId) % 2 === 0 ? null : 'test' + userId,
      firstName: 'Test' + userId,
    });
  }

  /** Clears all stored data */
  clear(): void {
    this.sets.clear();
    this.boosters.clear();
    this.cards.clear();
    this.cardBoosters.clear();
    this.cardOwners.clear();
    this.cardOwnershipStatus.clear();
    this.idOnlyCards.clear();
    this.nextId = 1;
  }

  /** Returns collection statistics for a user */
  retrieveCollectionStats(userId: bigint): Promise<{
    sets: {
      set: PokemonSet;
      cards: {
        card: PokemonCard;
        ownershipStatus: CardOwnershipStatus;
      }[];
      boosters: {
        booster: PokemonBooster;
        cards: {
          card: PokemonCard;
          ownershipStatus: CardOwnershipStatus;
        }[];
      }[];
    }[];
  }> {
    const sets = Array.from(this.sets.values());
    const result = {
      sets: sets.map((set) => {
        const setCards = Array.from(this.cards.values()).filter(
          (card) => card.setId === set.id,
        );
        const setBoosterIds = new Set<number>();
        setCards.forEach((card) => {
          const boosterIds = this.cardBoosters.get(card.id);
          if (boosterIds) {
            boosterIds.forEach((id) => setBoosterIds.add(id));
          }
        });
        const setBoosters = Array.from(this.boosters.values()).filter(
          (booster) => setBoosterIds.has(booster.id),
        );

        return {
          set,
          cards: setCards.map((card) => {
            const hasOwnership = (
              this.cardOwners.get(card.id) ?? new Set()
            ).has(userId);
            const statusKey = `${card.id}_${userId}`;
            const dbOwnershipStatus = hasOwnership
              ? (this.cardOwnershipStatus.get(statusKey) ??
                OwnershipStatus.OWNED)
              : null;
            return {
              card,
              ownershipStatus:
                this.convertToCardOwnershipStatus(dbOwnershipStatus),
            };
          }),
          boosters: setBoosters.map((booster) => ({
            booster,
            cards: setCards
              .filter(
                (card) =>
                  this.cardBoosters.get(card.id)?.has(booster.id) ?? false,
              )
              .map((card) => {
                const hasOwnership = (
                  this.cardOwners.get(card.id) ?? new Set()
                ).has(userId);
                const statusKey = `${card.id}_${userId}`;
                const dbOwnershipStatus = hasOwnership
                  ? (this.cardOwnershipStatus.get(statusKey) ??
                    OwnershipStatus.OWNED)
                  : null;
                return {
                  card,
                  ownershipStatus:
                    this.convertToCardOwnershipStatus(dbOwnershipStatus),
                };
              }),
          })),
        };
      }),
    };

    return Promise.resolve(result);
  }

  /** Updates the hasShinyRarity field of a booster */
  async updateBoosterShinyRarity(
    boosterId: number,
    hasShinyRarity: boolean,
  ): Promise<PokemonBooster> {
    const booster = Array.from(this.boosters.values()).find(
      (b) => b.id === boosterId,
    );
    if (!booster) {
      throw new PokemonTcgPocketDatabaseError(
        'update',
        `booster ${boosterId} shiny rarity`,
        'Booster not found',
      );
    }
    booster.hasShinyRarity = hasShinyRarity;
    return await Promise.resolve(booster);
  }

  /** Updates the hasSixPacks field of a booster */
  async updateBoosterSixPacks(
    boosterId: number,
    hasSixPacks: boolean,
  ): Promise<PokemonBooster> {
    const booster = Array.from(this.boosters.values()).find(
      (b) => b.id === boosterId,
    );
    if (!booster) {
      throw new PokemonTcgPocketDatabaseError(
        'update',
        `booster ${boosterId} six packs`,
        'Booster not found',
      );
    }
    booster.hasSixPacks = hasSixPacks;
    return await Promise.resolve(booster);
  }
}
