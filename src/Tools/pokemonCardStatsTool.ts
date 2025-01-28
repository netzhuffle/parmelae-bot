import { tool } from '@langchain/core/tools';
import { getContextVariable } from '@langchain/core/context';
import { PokemonTcgPocketService } from '../PokemonTcgPocketService.js';
import assert from 'assert';

/** Explanation texts */
const SETS_EXPLANATION =
  '(♦️ is the number of different cards in the user’s collection with rarities ♢, ♢♢, ♢♢♢, and ♢♢♢♢ as well as the total in the set, ' +
  '⭐️ is the number of different cards in the user’s collection with rarities ☆, ☆☆, and ☆☆☆, ' +
  'and 👑 is the number of different cards in the user’s collection with rarity ♛. ' +
  'Promo sets don’t have rarities, thus only the number of different cards in the user’s collection is shown. ' +
  'When describing these stats to users, omit each ⭐️ and 👑 stat that is 0 for better readability and to match the ingame format, unless specifically asked for.)';

const BOOSTERS_EXPLANATION =
  '(First numbers are the collected and total number of different cards in the specific booster. ' +
  "Percentage number is the probability of receiving a new card currently missing in the user's collection " +
  'when opening the specific booster. This is the most interesting number for the user so they can decide ' +
  'which booster to open next to maximise their chances.)';

export const pokemonCardStatsTool = tool(
  async (): Promise<string> => {
    const service =
      getContextVariable<PokemonTcgPocketService>('pokemonTcgPocket');
    assert(service instanceof PokemonTcgPocketService);
    const userId = getContextVariable<bigint>('userId');
    assert(typeof userId === 'bigint');

    const stats = await service.getCollectionStats(userId);
    const lines: string[] = [];

    // Header
    lines.push(`${stats.displayName}’s collection:`);
    lines.push('');

    // Sets section
    lines.push('Sets:');
    for (const { name, stats: setStats } of stats.sets) {
      lines.push(`${name}: ${setStats.join(' ⋅ ')}`);
    }
    lines.push('');
    lines.push(SETS_EXPLANATION);
    lines.push('');

    // Boosters section
    lines.push('Packs:');
    for (const { name, owned, total, newCardProbability } of stats.boosters) {
      lines.push(
        `${name}: ${owned}/${total} ⋅ ${newCardProbability.toFixed(2)} %`,
      );
    }
    lines.push('');
    lines.push(BOOSTERS_EXPLANATION);

    return lines.join('\n');
  },
  {
    name: 'pokemonCardStats',
    description:
      'Shows numerical statistics and summaries about the Pokémon TCG Pocket card collection of the user who wrote the last message in the chat. Only provides counts and percentages – no card names or lists. Shows total number of owned cards per set and per booster, grouped by rarity category, and the probability of getting new cards from each booster. To get actual lists of cards with their names, use the pokemonCardSearch tool instead.',
  },
);
