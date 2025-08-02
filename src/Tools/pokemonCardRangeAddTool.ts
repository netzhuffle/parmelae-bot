import { tool } from '@langchain/core/tools';
import { z } from 'zod/v4';
import {
  SET_KEY_VALUES,
  SET_KEY_NAMES,
} from '../PokemonTcgPocket/PokemonTcgPocketService.js';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { getToolContext } from '../ChatGptAgentService.js';
import { POKEMON_CARD_ADD_TOOL_NAME } from './toolNames.js';

const schema = z.object({
  setKey: z
    .enum(SET_KEY_VALUES)
    .describe(
      `Set key of the set to add cards from: ${SET_KEY_VALUES.map((key) => `${key} (${SET_KEY_NAMES[key]})`).join(', ')}.`,
    ),
  startNumber: z
    .number()
    .describe('Starting card number in the range (inclusive).'),
  endNumber: z
    .number()
    .describe('Ending card number in the range (inclusive).'),
});

type PokemonCardRangeAddInput = z.infer<typeof schema>;

/**
 * Tool for adding multiple Pokemon cards from a specific set within a given ID range.
 *
 * This tool allows users to bulk add consecutive cards from a set (e.g., cards 1-50 from set A1).
 * It validates the input range and processes each card individually, providing feedback about
 * successful additions and any cards that couldn't be added.
 */
export const pokemonCardRangeAddTool = tool(
  async (
    { setKey, startNumber, endNumber }: PokemonCardRangeAddInput,
    config: LangGraphRunnableConfig,
  ): Promise<string> => {
    const context = getToolContext(config);
    const userId = context.userId;
    const service = context.pokemonTcgPocketService;

    if (startNumber > endNumber) {
      return `Start number (${startNumber}) cannot be greater than end number (${endNumber}). Please check your range.`;
    }

    try {
      // Step 1: Get all card IDs within the specified range
      const cardIds = await service.getCardIdsInRange(
        setKey,
        startNumber,
        endNumber,
      );

      // Step 2: Handle case where no cards exist in the range
      if (cardIds.length === 0) {
        return `No cards found in range ${setKey}-${startNumber.toString().padStart(3, '0')} to ${setKey}-${endNumber.toString().padStart(3, '0')}. Please check that the set key and range are valid.`;
      }

      // Step 3: Validate completeness - ensure all expected cards exist in database
      const expectedCount = endNumber - startNumber + 1;
      if (cardIds.length < expectedCount) {
        const missingCount = expectedCount - cardIds.length;
        return `Found only ${cardIds.length} of ${expectedCount} expected cards in range ${setKey}-${startNumber.toString().padStart(3, '0')} to ${setKey}-${endNumber.toString().padStart(3, '0')}. ${missingCount} cards are missing from this range. Please verify the range contains valid card numbers.`;
      }

      // Step 4: Bulk add all cards using upsert logic (create missing, update NOT_NEEDED→OWNED)
      const addedCards = await service.addMultipleCardsToCollection(
        cardIds,
        userId,
      );

      // Step 5: Return comprehensive feedback with collection statistics
      return await service.processCards(addedCards, userId, false, true);
    } catch (error) {
      return `Error adding cards from range ${setKey}-${startNumber.toString().padStart(3, '0')} to ${setKey}-${endNumber.toString().padStart(3, '0')}: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  },
  {
    name: 'pokemonCardRangeAdd',
    description:
      'Bulk add consecutive Pokémon TCG Pocket cards from a specific set to the collection of the user who wrote the last message in the chat. ' +
      'Provide the set key and inclusive range (startNumber to endNumber) to add multiple cards efficiently. ' +
      "This tool will add ALL cards in the specified range to the user's collection, creating new ownership records for missing cards and updating NOT_NEEDED cards to OWNED status. " +
      'Use this when users want to add many consecutive cards at once (e.g., "add cards 1-50 from set A1"). ' +
      `For single cards or non-consecutive selections, use the regular ${POKEMON_CARD_ADD_TOOL_NAME} tool instead. ` +
      'Returns detailed feedback including which cards were added and updated collection statistics.',
    schema,
  },
);
