import { tool } from '@langchain/core/tools';
import * as z from 'zod';
import { POKEMON_CARD_SEARCH_TOOL_NAME } from './toolNames.js';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { getToolContext } from '../ChatGptAgentService.js';

export const pokemonCardStatsTool = tool(
  async (_, config: LangGraphRunnableConfig): Promise<string> => {
    const context = getToolContext(config);
    const userId = context.userId;
    const service = context.pokemonTcgPocketService;

    const stats = await service.getFormattedCollectionStats(userId);

    return `${stats}\n\nIf the user asked to see a list of which specific cards they own or are missing from their collection, please run the ${POKEMON_CARD_SEARCH_TOOL_NAME} tool now to get this information.`;
  },
  {
    name: 'pokemonCardStats',
    description: `Shows numerical statistics and summaries about the Pokémon TCG Pocket card collection of the user who wrote the last message in the chat. Only provides counts and percentages – no card names or lists. Shows total number of owned cards per set and per booster, grouped by rarity category, and the probability of getting new cards from each booster. To get actual lists of cards with their names, use the ${POKEMON_CARD_SEARCH_TOOL_NAME} tool instead.`,
    schema: z.object({}),
  },
);
