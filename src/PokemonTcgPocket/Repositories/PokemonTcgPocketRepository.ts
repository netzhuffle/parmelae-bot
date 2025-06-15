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
import {
  OwnershipFilter,
  CardOwnershipStatus,
} from '../PokemonTcgPocketService.js';
import { OwnershipStatus } from '@prisma/client';
import { NotExhaustiveSwitchError } from '../../NotExhaustiveSwitchError.js';

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
          ? filters.ownershipFilter === 'owned'
            ? {
                some: { userId: filters.userId, status: OwnershipStatus.OWNED },
              }
            : filters.ownershipFilter === 'missing'
              ? { none: { userId: filters.userId } }
              : filters.ownershipFilter === 'not_needed'
                ? {
                    some: {
                      userId: filters.userId,
                      status: OwnershipStatus.NOT_NEEDED,
                    },
                  }
                : undefined
          : undefined;

      return this.prisma.pokemonCard.findMany({
        where: {
          name: filters.cardName ? { contains: filters.cardName } : undefined,
          number: filters.cardNumber,
          rarity: filters.rarity,
          set: {
            key: filters.setKey,
          },
          boosters: filters.booster
            ? {
                some: {
                  name: filters.booster,
                },
              }
            : undefined,
          ownership: ownershipCondition,
        },
        include: {
          set: true,
          boosters: true,
          ownership: {
            include: {
              user: true,
            },
          },
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
    status: OwnershipStatus = OwnershipStatus.OWNED,
  ): Promise<PokemonCardWithRelations> {
    try {
      return this.prisma.pokemonCard.update({
        where: { id: cardId },
        data: {
          ownership: {
            create: {
              userId,
              status,
            },
          },
        },
        include: {
          set: true,
          boosters: true,
          ownership: {
            include: {
              user: true,
            },
          },
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
    try {
      const sets = await this.prisma.pokemonSet.findMany({
        include: {
          cards: {
            include: {
              ownership: {
                where: { userId },
                include: {
                  user: true,
                },
              },
            },
          },
          boosters: {
            include: {
              cards: {
                include: {
                  ownership: {
                    where: { userId },
                    include: {
                      user: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return {
        sets: sets.map((set) => ({
          set: {
            id: set.id,
            key: set.key,
            name: set.name,
          },
          cards: set.cards.map((card) => ({
            card: {
              id: card.id,
              name: card.name,
              number: card.number,
              setId: card.setId,
              rarity: card.rarity,
            },
            ownershipStatus: this.convertToCardOwnershipStatus(
              card.ownership[0]?.status ?? null,
            ),
          })),
          boosters: set.boosters.map((booster) => ({
            booster: {
              id: booster.id,
              name: booster.name,
              setId: booster.setId,
              hasShinyRarity: booster.hasShinyRarity,
            },
            cards: booster.cards.map((card) => ({
              card: {
                id: card.id,
                name: card.name,
                number: card.number,
                setId: card.setId,
                rarity: card.rarity,
              },
              ownershipStatus: this.convertToCardOwnershipStatus(
                card.ownership[0]?.status ?? null,
              ),
            })),
          })),
        })),
      };
    } catch (error) {
      throw new PokemonTcgPocketDatabaseError(
        'retrieve',
        'collection stats',
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
          ownership: {
            deleteMany: {
              userId,
            },
          },
        },
        include: {
          set: true,
          boosters: true,
          ownership: {
            include: {
              user: true,
            },
          },
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

  /** Updates the hasShinyRarity field of a booster */
  async updateBoosterShinyRarity(
    boosterId: number,
    hasShinyRarity: boolean,
  ): Promise<PokemonBooster> {
    try {
      return this.prisma.pokemonBooster.update({
        where: { id: boosterId },
        data: { hasShinyRarity },
      });
    } catch (error) {
      throw new PokemonTcgPocketDatabaseError(
        'update',
        `booster ${boosterId} shiny rarity`,
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

  protected convertToCardOwnershipStatus(
    status: OwnershipStatus | null,
  ): CardOwnershipStatus {
    switch (status) {
      case OwnershipStatus.OWNED:
        return CardOwnershipStatus.OWNED;
      case OwnershipStatus.NOT_NEEDED:
        return CardOwnershipStatus.NOT_NEEDED;
      case null:
        return CardOwnershipStatus.MISSING;
      default:
        throw new NotExhaustiveSwitchError(status);
    }
  }
}
