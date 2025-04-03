import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import {
  RARITY_MAP,
  SET_KEY_VALUES,
  SET_KEY_NAMES,
  BOOSTER_VALUES,
  PokemonTcgPocketService,
} from '../PokemonTcgPocket/PokemonTcgPocketService.js';
import assert from 'node:assert/strict';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { getToolContext } from '../ChatGptAgentService.js';
import { PokemonCardWithRelations } from '../PokemonTcgPocket/Repositories/Types.js';
import {
  CARD_ID_MISMATCH_MESSAGE,
  CARD_EXISTS_BUT_NO_MATCH_MESSAGE,
  NO_CARDS_IN_DB_MESSAGE,
  NO_MATCHING_CARDS_IN_COLLECTION_MESSAGE,
  NO_MATCHING_MISSING_CARDS_MESSAGE,
  BULK_OPERATION_WARNING_MESSAGE,
  POKEMON_CARD_ADD_TOOL_DESCRIPTION,
  MULTIPLE_MATCHES_MESSAGE,
  BULK_OPERATION_HEADER_MESSAGE,
  SINGLE_OPERATION_HEADER_MESSAGE,
  UPDATED_STATS_MESSAGE,
  OPERATION_RESULT_MESSAGE,
} from '../PokemonTcgPocket/texts.js';

/** Card ID regex pattern */
const CARD_ID_PATTERN = /^([A-Za-z0-9-]+)-(\d{3})$/;

const schema = z.object({
  card: z
    .string()
    .nullish()
    .describe(
      'Card name or ID in format {set-key}-{three digit number}, e.g. A1-003. If it matches the ID pattern, it will be treated as an ID; otherwise, as a card name. Pass null instead of a string if you know neither name nor ID.',
    ),
  setKey: z
    .enum(SET_KEY_VALUES)
    .nullish()
    .describe(
      `Set key to filter by: ${SET_KEY_VALUES.map((key) => `${key} (${SET_KEY_NAMES[key]})`).join(', ')}. Pass null unless the user specifically asks you to filter by a set.`,
    ),
  booster: z
    .enum(BOOSTER_VALUES)
    .nullish()
    .describe(
      'Booster to filter by. Pass null unless you are very sure about the booster name.',
    ),
  rarity: z
    .enum(['♢', '♢♢', '♢♢♢', '♢♢♢♢', '☆', '☆☆', '☆☆☆', '☆☆☆☆', '✸', '✸✸', '♛'])
    .nullish()
    .describe(
      'Card rarity symbol to filter by: ♢, ♢♢, ♢♢♢, ♢♢♢♢, ☆, ☆☆, ☆☆☆, ☆☆☆☆, ✸, ✸✸, or ♛. Must use ♢ instead of ♦️, ☆ instead of ⭐️, ✸ instead of ✴️, and ♛ instead of 👑. Pass null unless you are very sure about the rarity.',
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
});

type PokemonCardAddInput = z.infer<typeof schema>;

interface CardIdInfo {
  setKey: string;
  cardNumber: number;
}

function parseCardId(cardId: string): CardIdInfo {
  const match = CARD_ID_PATTERN.exec(cardId)!;
  return {
    setKey: match[1],
    cardNumber: parseInt(match[2], 10),
  };
}

function buildSearchParams(
  cardName: string | null,
  setKey: string | null,
  booster: string | null,
  rarity: string | null,
  idInfo?: CardIdInfo,
  userId?: bigint,
  ownershipFilter?: string,
): Record<string, unknown> {
  const searchParams: Record<string, unknown> = {};

  if (cardName) searchParams.cardName = cardName;
  if (idInfo?.setKey ?? setKey) searchParams.setKey = idInfo?.setKey ?? setKey;
  if (booster) searchParams.booster = booster;
  if (idInfo?.cardNumber) searchParams.cardNumber = idInfo?.cardNumber;
  if (rarity) searchParams.rarity = RARITY_MAP[rarity];
  if (userId) searchParams.userId = userId;
  if (ownershipFilter) searchParams.ownershipFilter = ownershipFilter;

  return searchParams;
}

async function handleNoCardsFound(
  service: PokemonTcgPocketService,
  userId: bigint,
  searchParams: Record<string, unknown>,
  remove: boolean,
  idInfo?: CardIdInfo,
): Promise<string> {
  const displayName = await service.getDisplayName(userId);

  // Search if the cards would exist without the ownership filter
  const existingCards = await service.searchCards(searchParams);

  if (existingCards.length === 0) {
    // If we have a card ID and still no results, try searching with just the ID
    if (idInfo) {
      const idOnlyCards = await service.searchCards({
        setKey: idInfo.setKey,
        cardNumber: idInfo.cardNumber,
      });

      if (idOnlyCards.length > 0) {
        const cardDetails = await service.formatCardsAsCsv(idOnlyCards, userId);
        return (
          CARD_EXISTS_BUT_NO_MATCH_MESSAGE(
            idInfo.setKey,
            idInfo.cardNumber,
            cardDetails,
          ) + OPERATION_RESULT_MESSAGE(remove)
        );
      }
    }

    return NO_CARDS_IN_DB_MESSAGE(remove);
  }

  const cardDetails = await service.formatCardsAsCsv(existingCards, userId);
  if (remove) {
    return NO_MATCHING_CARDS_IN_COLLECTION_MESSAGE(displayName, cardDetails);
  }
  return NO_MATCHING_MISSING_CARDS_MESSAGE(displayName, cardDetails);
}

async function processCards(
  service: PokemonTcgPocketService,
  userId: bigint,
  cards: PokemonCardWithRelations[],
  remove: boolean,
  bulkOperation: boolean,
): Promise<string> {
  const displayName = await service.getDisplayName(userId);
  const operation = remove ? 'removed' : 'added';
  const preposition = remove ? 'from' : 'to';

  if (!bulkOperation && cards.length > 1) {
    return MULTIPLE_MATCHES_MESSAGE(
      await service.formatCardsAsCsv(cards, userId),
    );
  }

  if (cards.length > 1 && bulkOperation) {
    const updatedCards = await Promise.all(
      cards.map((card) =>
        remove
          ? service.removeCardFromCollection(card.id, userId)
          : service.addCardToCollection(card.id, userId),
      ),
    );

    const header = BULK_OPERATION_HEADER_MESSAGE(
      operation,
      cards.length,
      preposition,
      displayName,
    );
    const csv = await service.formatCardsAsCsv(updatedCards, userId);
    const stats = await service.getFormattedCollectionStats(userId);
    return BULK_OPERATION_WARNING_MESSAGE(header, csv, stats);
  }

  // Process single card
  assert(cards.length === 1);
  const card = cards[0];
  const updatedCard = remove
    ? await service.removeCardFromCollection(card.id, userId)
    : await service.addCardToCollection(card.id, userId);

  const header = SINGLE_OPERATION_HEADER_MESSAGE(
    operation,
    preposition,
    displayName,
  );
  const csv = await service.formatCardsAsCsv([updatedCard], userId);
  const stats = await service.getFormattedCollectionStats(userId);
  return `${header}\n${csv}${UPDATED_STATS_MESSAGE(stats)}`;
}

export const pokemonCardAddTool = tool(
  async (
    {
      card,
      setKey,
      booster,
      rarity,
      remove,
      bulkOperation,
    }: PokemonCardAddInput,
    config: LangGraphRunnableConfig,
  ): Promise<string> => {
    const context = getToolContext(config);
    const userId = context.userId;
    const service = context.pokemonTcgPocketService;

    // Determine if card is an ID or name
    const idInfo =
      card && CARD_ID_PATTERN.test(card) ? parseCardId(card) : undefined;
    const cardName = idInfo ? null : card;

    if (idInfo?.setKey && setKey && idInfo.setKey !== setKey) {
      return CARD_ID_MISMATCH_MESSAGE;
    }

    // Build search parameters
    const searchParams = buildSearchParams(
      cardName ?? null,
      setKey ?? null,
      booster ?? null,
      rarity ?? null,
      idInfo,
      userId,
      remove ? 'owned' : 'missing',
    );

    // Search for matching cards
    const cards = await service.searchCards(searchParams);

    // Handle no cards found
    if (cards.length === 0) {
      const baseParams = buildSearchParams(
        cardName ?? null,
        setKey ?? null,
        booster ?? null,
        rarity ?? null,
        idInfo,
      );
      return handleNoCardsFound(service, userId, baseParams, remove, idInfo);
    }

    // Process found cards
    return processCards(service, userId, cards, remove, bulkOperation);
  },
  {
    name: 'pokemonCardAdd',
    description: POKEMON_CARD_ADD_TOOL_DESCRIPTION,
    schema,
  },
);
