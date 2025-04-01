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

/** Card ID regex pattern */
const CARD_ID_PATTERN = /^([A-Za-z0-9-]+)-(\d{3})$/;

const schema = z.object({
  card: z
    .string()
    .nullish()
    .describe(
      'Card name or ID in format {set-key}-{three digit number}, e.g. A1-003. If it matches the ID pattern, it will be treated as an ID; otherwise, as a name. Pass null if you know neither name nor ID.',
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
    .enum(['♢', '♢♢', '♢♢♢', '♢♢♢♢', '☆', '☆☆', '☆☆☆', '☆☆☆☆', '♛'])
    .nullish()
    .describe(
      'Card rarity symbol to filter by: ♢, ♢♢, ♢♢♢, ♢♢♢♢, ☆, ☆☆, ☆☆☆, ☆☆☆☆, or ♛. Must use ♢ instead of ♦️, ☆ instead of ⭐️, ♛ instead of 👑. Pass null unless you are very sure about the rarity.',
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
): Promise<string> {
  const displayName = await service.getDisplayName(userId);
  const existingCards = await service.searchCards(searchParams);

  if (existingCards.length === 0) {
    return (
      'No cards exist in the database matching these search criteria. Please verify the card details and try again. Thus no card was ' +
      (remove ? 'removed from' : 'added to') +
      ' the user’s collection.'
    );
  }

  const cardDetails = await service.formatCardsAsCsv(existingCards, userId);
  if (remove) {
    return `No matching cards found in ${displayName}’s collection. The cards exist but ${displayName} does not own them. The following cards were found:\n${cardDetails}\nThus no card was removed from the user’s collection.`;
  }
  return `No matching cards found that ${displayName} is missing. The cards exist but ${displayName} already owns them. The following cards were found:\n${cardDetails}\nThus no card was added to the user’s collection.`;
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
    return (
      'Multiple matches found. Please ask the user to specify which of these cards they mean. Then call this tool again and provide its card ID:\n' +
      (await service.formatCardsAsCsv(cards, userId))
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

    const header = `Successfully ${operation} ${cards.length} cards ${preposition} ${displayName}'s collection:`;
    const csv = await service.formatCardsAsCsv(updatedCards, userId);
    const stats = await service.getFormattedCollectionStats(userId);
    return `${header}\n${csv}\n\nUpdated statistics of ${stats}`;
  }

  // Process single card
  assert(cards.length === 1);
  const card = cards[0];
  const updatedCard = remove
    ? await service.removeCardFromCollection(card.id, userId)
    : await service.addCardToCollection(card.id, userId);

  const header = `Successfully ${operation} card ${preposition} ${displayName}'s collection:`;
  const csv = await service.formatCardsAsCsv([updatedCard], userId);
  const stats = await service.getFormattedCollectionStats(userId);
  return `${header}\n${csv}\n\nUpdated statistics of ${stats}`;
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
      return handleNoCardsFound(service, userId, baseParams, remove);
    }

    // Process found cards
    return processCards(service, userId, cards, remove, bulkOperation);
  },
  {
    name: 'pokemonCardAdd',
    description:
      'Add or remove Pokémon TCG Pocket cards to/from the collection of the user who wrote the last message in the chat. Returns a CSV with the card info. If a user shares an image of a Pokémon card without context in this chat (especially if it shows “new”), they likely want you to add it to their collection. Generally pass null to filters the user did not tell you to filter by and make sure to only add/remove 1 card unless the user explictly asks you to add/remove multiple cards – there is no undo!',
    schema,
  },
);
