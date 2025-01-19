import {
  PrismaClient,
  PokemonSet,
  PokemonBooster,
  PokemonCard,
  Rarity,
} from '@prisma/client';
import { injectable } from 'inversify';
import { PokemonTcgPocketDatabaseError } from '../Errors/PokemonTcgPocketDatabaseError.js';
import { PokemonTcgPocketNotFoundError } from '../Errors/PokemonTcgPocketNotFoundError.js';
import { PokemonTcgPocketEntityCache } from '../Caches/PokemonTcgPocketEntityCache.js';
import { PokemonCardWithRelations } from './Types.js';
import { OwnershipFilter } from '../Tools/pokemonCardSearchTool.js';

/** Repository for Pokémon TCG Pocket data */
@injectable()
export class PokemonTcgPocketRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cache: PokemonTcgPocketEntityCache,
  ) {}

  /** Retrieves a set by its key, or null if it doesn't exist */
  async retrieveSetByKey(key: string): Promise<PokemonSet | null> {
    try {
      const set = await this.prisma.pokemonSet.findUnique({
        where: { key },
      });

      if (set) {
        this.cache.setSetId(key, set.id);
      }

      return set;
    } catch (error) {
      throw new PokemonTcgPocketDatabaseError(
        'retrieve',
        `set ${key}`,
        this.formatError(error),
      );
    }
  }

  /** Retrieves a booster by its name and set key, or null if it doesn't exist */
  async retrieveBoosterByNameAndSetKey(
    name: string,
    setKey: string,
  ): Promise<PokemonBooster | null> {
    try {
      const setId = await this.resolveSetId(setKey);
      if (!setId) {
        return null;
      }

      const booster = await this.prisma.pokemonBooster.findUnique({
        where: {
          setId_name: {
            setId,
            name,
          },
        },
      });

      if (booster) {
        this.cache.setBoosterId(setKey, name, booster.id);
      }

      return booster;
    } catch (error) {
      throw new PokemonTcgPocketDatabaseError(
        'retrieve',
        `booster ${name} from set ${setKey}`,
        this.formatError(error),
      );
    }
  }

  /** Retrieves a card by its number and set key, or null if it doesn't exist */
  async retrieveCardByNumberAndSetKey(
    number: number,
    setKey: string,
  ): Promise<PokemonCard | null> {
    try {
      const setId = await this.resolveSetId(setKey);
      if (!setId) {
        return null;
      }

      return this.prisma.pokemonCard.findUnique({
        where: {
          setId_number: {
            setId,
            number,
          },
        },
      });
    } catch (error) {
      throw new PokemonTcgPocketDatabaseError(
        'retrieve',
        `card ${number} from set ${setKey}`,
        this.formatError(error),
      );
    }
  }

  /** Creates a new set */
  async createSet(key: string, name: string): Promise<PokemonSet> {
    try {
      const set = await this.prisma.pokemonSet.create({
        data: {
          key,
          name,
        },
      });

      this.cache.setSetId(key, set.id);
      return set;
    } catch (error) {
      throw new PokemonTcgPocketDatabaseError(
        'create',
        `set ${key}`,
        this.formatError(error),
      );
    }
  }

  /** Creates a new booster */
  async createBooster(name: string, setKey: string): Promise<PokemonBooster> {
    try {
      const setId = await this.resolveSetId(setKey);
      if (!setId) {
        throw new PokemonTcgPocketNotFoundError('Set', setKey);
      }

      const booster = await this.prisma.pokemonBooster.create({
        data: {
          name,
          setId,
        },
      });

      this.cache.setBoosterId(setKey, name, booster.id);
      return booster;
    } catch (error) {
      if (error instanceof PokemonTcgPocketNotFoundError) {
        throw error;
      }
      throw new PokemonTcgPocketDatabaseError(
        'create',
        `booster ${name} in set ${setKey}`,
        this.formatError(error),
      );
    }
  }

  /** Creates a new card */
  async createCard(
    name: string,
    setKey: string,
    number: number,
    rarity: Rarity | null,
    boosterNames: string[],
  ): Promise<PokemonCard> {
    try {
      const setId = await this.resolveSetId(setKey);
      if (!setId) {
        throw new PokemonTcgPocketNotFoundError('Set', setKey);
      }

      const boosterIds = await this.resolveBoosterIds(setKey, boosterNames);

      return this.prisma.pokemonCard.create({
        data: {
          name,
          setId,
          number,
          rarity,
          boosters: {
            connect: boosterIds.map((id) => ({ id })),
          },
        },
      });
    } catch (error) {
      if (error instanceof PokemonTcgPocketNotFoundError) {
        throw error;
      }
      throw new PokemonTcgPocketDatabaseError(
        'create',
        `card ${name} in set ${setKey}`,
        this.formatError(error),
      );
    }
  }

  /** Search for cards using various filters */
  async searchCards(filters: {
    cardName?: string;
    setName?: string;
    setKey?: string;
    booster?: string;
    cardNumber?: number;
    rarity?: Rarity;
    userId?: bigint;
    ownershipFilter?: OwnershipFilter;
  }): Promise<PokemonCardWithRelations[]> {
    try {
      const ownershipCondition =
        filters.userId && filters.ownershipFilter
          ? filters.ownershipFilter === OwnershipFilter.OWNED
            ? { some: { id: filters.userId } }
            : filters.ownershipFilter === OwnershipFilter.MISSING
              ? { none: { id: filters.userId } }
              : undefined
          : undefined;

      return this.prisma.pokemonCard.findMany({
        where: {
          name: filters.cardName ? { contains: filters.cardName } : undefined,
          number: filters.cardNumber,
          rarity: filters.rarity,
          set: {
            name: filters.setName,
            key: filters.setKey,
          },
          boosters: filters.booster
            ? {
                some: {
                  name: filters.booster,
                },
              }
            : undefined,
          owners: ownershipCondition,
        },
        include: {
          set: true,
          boosters: true,
          owners: true,
        },
        orderBy: [{ set: { key: 'asc' } }, { number: 'asc' }],
      });
    } catch (error) {
      throw new PokemonTcgPocketDatabaseError(
        'search',
        'cards',
        this.formatError(error),
      );
    }
  }

  /** Adds a card to a user's collection */
  async addCardToCollection(
    cardId: number,
    userId: bigint,
  ): Promise<PokemonCardWithRelations> {
    try {
      return this.prisma.pokemonCard.update({
        where: { id: cardId },
        data: {
          owners: {
            connect: { id: userId },
          },
        },
        include: {
          set: true,
          boosters: true,
          owners: true,
        },
      });
    } catch (error) {
      throw new PokemonTcgPocketDatabaseError(
        'add',
        `card ${cardId} to user ${userId}'s collection`,
        this.formatError(error),
      );
    }
  }

  /** Returns a user's names by their ID */
  async retrieveUserNames(userId: bigint): Promise<{
    username: string | null;
    firstName: string;
  }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        username: true,
        firstName: true,
      },
    });
    return user;
  }

  /** Returns collection statistics for a user */
  async retrieveCollectionStats(userId: bigint): Promise<{
    sets: {
      set: PokemonSet;
      cards: {
        card: PokemonCard;
        isOwned: boolean;
      }[];
      boosters: {
        booster: PokemonBooster;
        cards: {
          card: PokemonCard;
          isOwned: boolean;
        }[];
      }[];
    }[];
  }> {
    try {
      const sets = await this.prisma.pokemonSet.findMany({
        include: {
          cards: {
            include: {
              owners: {
                where: { id: userId },
              },
            },
          },
          boosters: {
            include: {
              cards: {
                include: {
                  owners: {
                    where: { id: userId },
                  },
                },
              },
            },
          },
        },
      });

      return {
        sets: sets.map((set) => ({
          set,
          cards: set.cards.map((card) => ({
            card,
            isOwned: card.owners.length > 0,
          })),
          boosters: set.boosters.map((booster) => ({
            booster,
            cards: booster.cards.map((card) => ({
              card,
              isOwned: card.owners.length > 0,
            })),
          })),
        })),
      };
    } catch (error) {
      throw new PokemonTcgPocketDatabaseError(
        'retrieve',
        `collection stats for user ${userId}`,
        this.formatError(error),
      );
    }
  }

  /** Removes a card from a user's collection */
  async removeCardFromCollection(
    cardId: number,
    userId: bigint,
  ): Promise<PokemonCardWithRelations> {
    try {
      return this.prisma.pokemonCard.update({
        where: { id: cardId },
        data: {
          owners: {
            disconnect: { id: userId },
          },
        },
        include: {
          set: true,
          boosters: true,
          owners: true,
        },
      });
    } catch (error) {
      throw new PokemonTcgPocketDatabaseError(
        'remove',
        `card ${cardId} from user ${userId}'s collection`,
        this.formatError(error),
      );
    }
  }

  private async resolveSetId(key: string): Promise<number | null> {
    const cachedId = this.cache.getSetId(key);
    if (cachedId !== null) {
      return cachedId;
    }

    const set = await this.retrieveSetByKey(key);
    return set?.id ?? null;
  }

  private async resolveBoosterIds(
    setKey: string,
    names: string[],
  ): Promise<number[]> {
    const ids = await Promise.all(
      names.map(async (name) => {
        const cachedId = this.cache.getBoosterId(setKey, name);
        if (cachedId !== null) {
          return cachedId;
        }

        const booster = await this.retrieveBoosterByNameAndSetKey(name, setKey);
        if (!booster) {
          throw new PokemonTcgPocketNotFoundError(
            'Booster',
            `${name} in set ${setKey}`,
          );
        }

        return booster.id;
      }),
    );

    return ids;
  }

  /** Converts an unknown error to a string or Error */
  private formatError(error: unknown): string | Error {
    if (error instanceof Error) {
      return error;
    }
    return String(error);
  }
}
