import { injectable } from 'inversify';
import { Rarity } from '../../generated/prisma/enums.js';
import { PrismaClient } from '../../generated/prisma/client.js';
import { PokemonTcgPocketDatabaseError } from '../Errors/PokemonTcgPocketDatabaseError.js';

/**
 * Repository for probability-specific card count queries.
 *
 * Provides efficient count queries for card probability calculations without
 * fetching full card lists. Used exclusively by PokemonTcgPocketProbabilityService.
 */
@injectable()
export class PokemonTcgPocketProbabilityRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Formats database errors for consistent error handling
   */
  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  /**
   * Count cards by booster and rarity, filtering by the isSixPackOnly flag.
   *
   * Used by flag-based filtering strategies (sixthCardFilterMode === 'flag-based')
   * where card selection depends on the isSixPackOnly flag.
   *
   * @param boosterId - The booster to count cards in
   * @param rarity - The rarity to count
   * @param isSixPackOnly - Whether to count only six-pack-only cards (true) or exclude them (false)
   * @returns Promise resolving to the count of matching cards
   */
  async countByBoosterRarityFilteringSixPackFlag(
    boosterId: number,
    rarity: Rarity,
    isSixPackOnly: boolean,
  ): Promise<number> {
    try {
      return await this.prisma.pokemonCard.count({
        where: {
          rarity,
          isSixPackOnly,
          boosters: {
            some: {
              id: boosterId,
            },
          },
        },
      });
    } catch (error) {
      throw new PokemonTcgPocketDatabaseError(
        'count',
        'cards by booster rarity filtering six-pack flag',
        this.formatError(error),
      );
    }
  }

  /**
   * Count cards by booster and rarity, ignoring the isSixPackOnly flag.
   *
   * Used by rarity-based filtering strategies (sixthCardFilterMode === 'rarity-based' or undefined)
   * where card selection is based purely on rarity, not the isSixPackOnly flag.
   * Applies to normal pack slots (1-5) and slot 6 when using rarity-based filtering.
   *
   * @param boosterId - The booster to count cards in
   * @param rarity - The rarity to count
   * @returns Promise resolving to the count of matching cards (including all cards regardless of isSixPackOnly flag)
   */
  async countByBoosterRarity(
    boosterId: number,
    rarity: Rarity,
  ): Promise<number> {
    try {
      return await this.prisma.pokemonCard.count({
        where: {
          rarity,
          boosters: {
            some: {
              id: boosterId,
            },
          },
        },
      });
    } catch (error) {
      throw new PokemonTcgPocketDatabaseError(
        'count',
        'cards by booster rarity',
        this.formatError(error),
      );
    }
  }

  /**
   * Count god pack eligible cards in a booster.
   *
   * Must exclude isSixPackOnly cards and only count cards with rarities
   * in the provided godPackRarities set.
   *
   * @param boosterId - The booster to count god pack eligible cards in
   * @param godPackRarities - Set of rarities eligible for god packs
   * @returns Promise resolving to the count of god pack eligible cards
   */
  async countGodPackEligibleByBooster(
    boosterId: number,
    godPackRarities: ReadonlySet<Rarity>,
  ): Promise<number> {
    try {
      // Convert Set to Array for Prisma's `in` operator
      const godPackRaritiesArray = Array.from(godPackRarities);

      return await this.prisma.pokemonCard.count({
        where: {
          AND: [
            {
              rarity: {
                in: godPackRaritiesArray,
              },
            },
            {
              isSixPackOnly: false, // Exclude six-pack-only cards from god packs
            },
            {
              boosters: {
                some: {
                  id: boosterId,
                },
              },
            },
            {
              // Only count cards where godPackBoosterId is null OR matches this booster
              OR: [{ godPackBoosterId: null }, { godPackBoosterId: boosterId }],
            },
          ],
        },
      });
    } catch (error) {
      throw new PokemonTcgPocketDatabaseError(
        'count',
        'god pack eligible cards by booster',
        this.formatError(error),
      );
    }
  }
}
