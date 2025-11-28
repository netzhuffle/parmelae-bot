import { tool } from '@langchain/core/tools';
import * as z from 'zod';
import { OwnershipStatus } from '../generated/prisma/enums.js';
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
  OWNED_CARDS_CANNOT_BE_MARKED_AS_NOT_NEEDED_MESSAGE,
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
  operation: z
    .enum(['add', 'remove', 'mark-as-not-needed'])
    .describe(
      'Operation to perform: "add" to add cards to collection (marks as owned), "remove" to remove cards from collection, or "mark-as-not-needed" to mark cards as not needed (excluded from probability calculations).',
    ),
  bulkOperation: z
    .boolean()
    .describe(
      'Whether to perform the operation on multiple cards with the exact same parameters in one tool call. Only pass true if the user specifically requested to operate on multiple cards with the exact same parameters (including name and/or ID). If false, the call will only operate on one card and ask for clarification if multiple cards match the criteria – this is usually what the user wants.',
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
      operation,
      bulkOperation,
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

    // Build search parameters based on operation
    let ownershipFilter: string | undefined;
    if (operation === 'mark-as-not-needed') {
      ownershipFilter = 'missing';
    }
    // For 'add' and 'remove', we'll search without filter and filter in memory
    // Note: searchCardsWithFallback may drop the ownership filter and return
    // cards with other ownership states, which we handle explicitly below

    const searchParams = service.buildSearchParams(
      cardName ?? null,
      setKey ?? null,
      booster ?? null,
      rarity ?? null,
      idInfo,
      userId,
      ownershipFilter,
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
          ) + OPERATION_RESULT_MESSAGE(operation)
        );
      }

      return NO_CARDS_IN_DB_MESSAGE(operation);
    }

    // Filter cards in memory based on operation
    let filteredCards = cards;
    if (operation === 'add') {
      // Filter for missing OR not_needed cards (allows upgrading not_needed to owned)
      filteredCards = cards.filter((card) => {
        const userOwnership = card.ownership.find(
          (ownership) => ownership.userId === userId,
        );
        return (
          !userOwnership || userOwnership.status === OwnershipStatus.NOT_NEEDED
        );
      });
    } else if (operation === 'remove') {
      // Filter for owned OR not_needed cards (allows removing both states)
      // Note: Partial removal is allowed - we only act on cards the user can actually remove
      filteredCards = cards.filter((card) => {
        const userOwnership = card.ownership.find(
          (ownership) => ownership.userId === userId,
        );
        return (
          userOwnership &&
          (userOwnership.status === OwnershipStatus.OWNED ||
            userOwnership.status === OwnershipStatus.NOT_NEEDED)
        );
      });
    }
    // For 'mark-as-not-needed', we initially search for missing cards.
    // Fallback may return cards with other ownership states (NOT_NEEDED, OWNED),
    // which we handle explicitly below

    // Handle no cards found after filtering
    if (filteredCards.length === 0) {
      const displayName = await service.getDisplayName(userId);
      const cardDetails = await service.formatCardsAsCsv(cards, userId);
      if (operation === 'add') {
        return NO_MATCHING_MISSING_CARDS_MESSAGE(displayName, cardDetails);
      } else if (operation === 'remove') {
        return NO_MATCHING_CARDS_IN_COLLECTION_MESSAGE(
          displayName,
          cardDetails,
        );
      }
      // For mark-as-not-needed, this shouldn't happen due to search filter
      return NO_CARDS_IN_DB_MESSAGE(operation);
    }

    // Process found cards
    if (!bulkOperation && filteredCards.length > 1) {
      return MULTIPLE_MATCHES_MESSAGE(
        await service.formatCardsAsCsv(filteredCards, userId),
      );
    }

    // Check ownership status for mark-as-not-needed operation
    if (operation === 'mark-as-not-needed') {
      // Check if any cards are owned (could happen through fallback search)
      // Note: Cards already marked as NOT_NEEDED are allowed and treated idempotently
      const displayName = await service.getDisplayName(userId);
      const ownedCards = filteredCards.filter((card) =>
        card.ownership.some(
          (ownership) =>
            ownership.userId === userId &&
            ownership.status === OwnershipStatus.OWNED,
        ),
      );

      if (ownedCards.length > 0) {
        const cardDetails = await service.formatCardsAsCsv(ownedCards, userId);
        return OWNED_CARDS_CANNOT_BE_MARKED_AS_NOT_NEEDED_MESSAGE(
          displayName,
          cardDetails,
        );
      }
    }

    // Process the cards
    return service.processCards(
      filteredCards,
      userId,
      operation,
      bulkOperation,
    );
  },
  {
    name: POKEMON_CARD_ADD_TOOL_NAME,
    description: POKEMON_CARD_ADD_TOOL_DESCRIPTION,
    schema,
  },
);
