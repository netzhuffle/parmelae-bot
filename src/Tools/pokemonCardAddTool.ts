import { tool } from '@langchain/core/tools';
import { z } from 'zod/v4';
import { OwnershipStatus } from '@prisma/client';
import {
  SET_KEY_VALUES,
  SET_KEY_NAMES,
  BOOSTER_VALUES,
} from '../PokemonTcgPocket/PokemonTcgPocketService.js';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { getToolContext } from '../ChatGptAgentService.js';
import {
  POKEMON_CARD_ADD_TOOL_DESCRIPTION,
  CARD_ID_MISMATCH_MESSAGE,
  CARD_EXISTS_BUT_NO_MATCH_MESSAGE,
  OPERATION_RESULT_MESSAGE,
  NO_CARDS_IN_DB_MESSAGE,
  MULTIPLE_MATCHES_MESSAGE,
  NO_MATCHING_CARDS_IN_COLLECTION_MESSAGE,
  NO_MATCHING_MISSING_CARDS_MESSAGE,
} from '../PokemonTcgPocket/texts.js';
import { POKEMON_CARD_ADD_TOOL_NAME } from './toolNames.js';

const schema = z.object({
  card: z
    .string()
    .nullish()
    .describe(
      'Card name or ID in format {set-key}-{three digit number}, e.g. A1-003. If it matches the ID pattern, it will be treated as an ID; otherwise, as a card name. Pass value null instead of a string if you know neither name nor ID.',
    ),
  setKey: z
    .enum(SET_KEY_VALUES)
    .nullish()
    .describe(
      `Set key to filter by: ${SET_KEY_VALUES.map((key) => `${key} (${SET_KEY_NAMES[key]})`).join(', ')}. Pass value null instead of a string unless the user specifically asks you to filter by a set.`,
    ),
  booster: z
    .enum(BOOSTER_VALUES)
    .nullish()
    .describe(
      'Booster to filter by. Pass value null instead of a string unless you are very sure about the booster name.',
    ),
  rarity: z
    .enum(['♢', '♢♢', '♢♢♢', '♢♢♢♢', '☆', '☆☆', '☆☆☆', '☆☆☆☆', '✸', '✸✸', '♛'])
    .nullish()
    .describe(
      'Card rarity symbol to filter by: ♢, ♢♢, ♢♢♢, ♢♢♢♢, ☆, ☆☆, ☆☆☆, ☆☆☆☆, ✸, ✸✸, or ♛. Must use ♢ instead of ♦️, ☆ instead of ⭐️, ✸ instead of ✴️, and ♛ instead of 👑. Pass value null instead of a string unless you are very sure about the rarity.',
    ),
  remove: z
    .boolean()
    .describe(
      'Whether to remove the card from the collection instead of adding it (false: add card).',
    ),
  bulkOperation: z
    .boolean()
    .describe(
      'Whether to add/remove multiple cards with the exact same parameters in one tool call. Only pass true if the user specifically requested to add/remove multiple cards with the exact same parameters (including name and/or ID). If false, the call will only add one card and ask for clarification if multiple cards match the criteria – this is usually what the user wants.',
    ),
  markAsNotNeeded: z
    .boolean()
    .optional()
    .describe(
      'Whether to mark the card as "not needed" instead of owned when adding. Only applies when remove is false. If true, the card will be marked as not needed (excluded from probability calculations). If false or undefined, the card will be marked as owned.',
    ),
});

type PokemonCardAddInput = z.infer<typeof schema>;

export const pokemonCardAddTool = tool(
  async (
    {
      card,
      setKey,
      booster,
      rarity,
      remove,
      bulkOperation,
      markAsNotNeeded,
    }: PokemonCardAddInput,
    config: LangGraphRunnableConfig,
  ): Promise<string> => {
    const context = getToolContext(config);
    const userId = context.userId;
    const service = context.pokemonTcgPocketService;

    // Parse card identifier
    const { idInfo, cardName } = service.parseCardIdentifier(card);

    if (idInfo?.setKey && setKey && idInfo.setKey !== setKey) {
      return CARD_ID_MISMATCH_MESSAGE;
    }

    // Build search parameters
    const searchParams = service.buildSearchParams(
      cardName ?? null,
      setKey ?? null,
      booster ?? null,
      rarity ?? null,
      idInfo,
      userId,
      remove ? 'owned' : 'missing',
    );

    // Search for matching cards
    const { cards, idOnlyCards } = await service.searchCardsWithFallback(
      searchParams,
      idInfo,
    );

    // Handle no cards found
    if (cards.length === 0) {
      if (idOnlyCards && idOnlyCards.length > 0) {
        const cardDetails = await service.formatCardsAsCsv(idOnlyCards, userId);
        return (
          CARD_EXISTS_BUT_NO_MATCH_MESSAGE(
            idInfo!.setKey,
            idInfo!.cardNumber,
            cardDetails,
          ) + OPERATION_RESULT_MESSAGE(remove)
        );
      }

      return NO_CARDS_IN_DB_MESSAGE(remove);
    }

    // Process found cards
    if (!bulkOperation && cards.length > 1) {
      return MULTIPLE_MATCHES_MESSAGE(
        await service.formatCardsAsCsv(cards, userId),
      );
    }

    // Check ownership status
    const displayName = await service.getDisplayName(userId);
    const cardDetails = await service.formatCardsAsCsv(cards, userId);

    if (remove) {
      // For remove operation, check if user owns the cards
      const allOwned = cards.every((card) =>
        card.ownership.some((ownership) => ownership.userId === userId),
      );
      if (!allOwned) {
        return NO_MATCHING_CARDS_IN_COLLECTION_MESSAGE(
          displayName,
          cardDetails,
        );
      }
    } else {
      // For add operation, check if user doesn't own the cards or they have a different status
      const anyOwned = cards.some((card) =>
        card.ownership.some((ownership) => ownership.userId === userId),
      );
      if (anyOwned) {
        return NO_MATCHING_MISSING_CARDS_MESSAGE(displayName, cardDetails);
      }
    }

    // Process the cards (add/remove)
    const ownershipStatus =
      markAsNotNeeded && !remove
        ? OwnershipStatus.NOT_NEEDED
        : OwnershipStatus.OWNED;
    return service.processCards(
      cards,
      userId,
      remove,
      bulkOperation,
      ownershipStatus,
    );
  },
  {
    name: POKEMON_CARD_ADD_TOOL_NAME,
    description: POKEMON_CARD_ADD_TOOL_DESCRIPTION,
    schema,
  },
);
