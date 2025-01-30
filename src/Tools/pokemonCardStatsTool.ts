import { tool } from '@langchain/core/tools';
import { getContextVariable } from '@langchain/core/context';
import { PokemonTcgPocketService } from '../PokemonTcgPocketService.js';
import assert from 'assert';
import { z } from 'zod';
import { pokemonCardSearchTool } from './pokemonCardSearchTool.js';

const SEARCH_TOOL_NAME = pokemonCardSearchTool.name;

export const pokemonCardStatsTool = tool(
  async (): Promise<string> => {
    const service =
      getContextVariable<PokemonTcgPocketService>('pokemonTcgPocket');
    assert(service instanceof PokemonTcgPocketService);
    const userId = getContextVariable<bigint>('userId');
    assert(typeof userId === 'bigint');

    const stats = await service.getFormattedCollectionStats(userId);

    return `${stats}\n\nIf the user asked to see a list of which specific cards they own or are missing from their collection, run the ${SEARCH_TOOL_NAME} tool now to get this information.`;
  },
  {
    name: 'pokemonCardStats',
    description:
      'Shows numerical statistics and summaries about the Pokémon TCG Pocket card collection of the user who wrote the last message in the chat. Only provides counts and percentages – no card names or lists. Shows total number of owned cards per set and per booster, grouped by rarity category, and the probability of getting new cards from each booster. To get actual lists of cards with their names, use the pokemonCardSearch tool instead.',
    schema: z.object({}),
  },
);
