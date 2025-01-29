import { tool } from '@langchain/core/tools';
import { getContextVariable } from '@langchain/core/context';
import { PokemonTcgPocketService } from '../PokemonTcgPocketService.js';
import assert from 'assert';
import { z } from 'zod';
import { pokemonCardSearchTool } from './pokemonCardSearchTool.js';

/** Explanation texts */
const SETS_EXPLANATION =
  '(♦️ is the number of different cards in the user’s collection with rarities ♢, ♢♢, ♢♢♢, and ♢♢♢♢ as well as the total in the set, ' +
  '⭐️ is the number of different cards in the user’s collection with rarities ☆, ☆☆, and ☆☆☆, ' +
  'and 👑 is the number of different cards in the user’s collection with rarity ♛. ' +
  'Promo sets don’t have rarities, thus only the number of different cards in the user’s collection is shown. ' +
  'When describing these stats to users, omit each ⭐️ and 👑 stat that is 0 for better readability and to match the ingame format, unless specifically asked for.)';

const BOOSTERS_EXPLANATION =
  '(First numbers are the collected and total number of different cards in the specific booster. ' +
  'p♢ is the probability of receiving a new card with rarity ♢, ♢♢, ♢♢♢, or ♢♢♢♢ currently missing in the user’s collection, ' +
  'and pN is the probability of receiving any new card currently missing in the user’s collection ' +
  'when opening the specific booster. These probabilities help the user decide which booster to open next to maximise their chances.)';

const SEARCH_TOOL_NAME = pokemonCardSearchTool.name;

const SEARCH_EXPLANATION = `If the user asked to see a list of which specific cards they own or are missing from their collection, run the ${SEARCH_TOOL_NAME} tool now to get this information.`;

function formatSetsSection(
  sets: { name: string; stats: string[] }[],
): string[] {
  const lines: string[] = ['Sets:'];
  for (const { name, stats: setStats } of sets) {
    lines.push(`${name}: ${setStats.join(' ⋅ ')}`);
  }
  lines.push('');
  lines.push(SETS_EXPLANATION);
  lines.push('');
  return lines;
}

function formatBoostersSection(
  boosters: {
    name: string;
    owned: number;
    total: number;
    newDiamondCardProbability: number;
    newCardProbability: number;
  }[],
): string[] {
  const lines: string[] = ['Packs:'];
  for (const {
    name,
    owned,
    total,
    newDiamondCardProbability,
    newCardProbability,
  } of boosters) {
    lines.push(
      `${name}: ${owned}/${total} ⋅ p♢ ${newDiamondCardProbability.toFixed(2)} % ⋅ pN ${newCardProbability.toFixed(2)} %`,
    );
  }
  lines.push('');
  lines.push(BOOSTERS_EXPLANATION);
  return lines;
}

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
    lines.push(...formatSetsSection(stats.sets));

    // Boosters section
    lines.push(...formatBoostersSection(stats.boosters));

    // Search explanation
    lines.push('');
    lines.push(SEARCH_EXPLANATION);

    return lines.join('\n');
  },
  {
    name: 'pokemonCardStats',
    description:
      'Shows numerical statistics and summaries about the Pokémon TCG Pocket card collection of the user who wrote the last message in the chat. Only provides counts and percentages – no card names or lists. Shows total number of owned cards per set and per booster, grouped by rarity category, and the probability of getting new cards from each booster. To get actual lists of cards with their names, use the pokemonCardSearch tool instead.',
    schema: z.object({}),
  },
);
