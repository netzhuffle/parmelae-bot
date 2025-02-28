import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import {
  RARITY_MAP,
  SET_KEY_VALUES,
  SET_KEY_NAMES,
  BOOSTER_VALUES,
} from '../PokemonTcgPocketService.js';
import assert from 'assert';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { getToolContext } from '../ChatGptAgentService.js';

/** Card ID regex pattern */
const CARD_ID_PATTERN = /^([A-Za-z0-9-]+)-(\d{3})$/;

const schema = z.object({
  cardName: z
    .string()
    .optional()
    .describe('Substring to search for in card names'),
  setKey: z
    .enum(SET_KEY_VALUES)
    .optional()
    .describe(
      `Set key to filter by: ${SET_KEY_VALUES.map((key) => `${key} (${SET_KEY_NAMES[key]})`).join(', ')}`,
    ),
  booster: z.enum(BOOSTER_VALUES).optional().describe('Booster to filter by'),
  cardNumber: z
    .number()
    .int()
    .optional()
    .describe('Exact card number in set to filter by'),
  cardId: z
    .string()
    .regex(CARD_ID_PATTERN)
    .optional()
    .describe('Card ID in format {set-key}-{three digit number}, e.g. A1-003'),
  rarity: z
    .enum(['♢', '♢♢', '♢♢♢', '♢♢♢♢', '☆', '☆☆', '☆☆☆', '☆☆☆☆', '♛'])
    .optional()
    .describe(
      'Card rarity symbol to filter by: ♢, ♢♢, ♢♢♢, ♢♢♢♢, ☆, ☆☆, ☆☆☆, ☆☆☆☆, or ♛. Must use ♢ instead of ♦️, ☆ instead of ⭐️, ♛ instead of 👑.',
    ),
  remove: z
    .boolean()
    .optional()
    .describe(
      'Whether to remove the card from the collection instead of adding it (default: add card)',
    ),
  bulkOperation: z
    .boolean()
    .optional()
    .describe(
      'Whether to add/remove multiple cards with one tool call. Only pass true if the user specifically requested to add/remove multiple cards with the same parameters. If not defined (or false), the call will only add one card and ask for clarification if multiple cards match the criteria.',
    ),
});

type PokemonCardAddInput = z.infer<typeof schema>;

export const pokemonCardAddTool = tool(
  async (
    {
      cardName,
      setKey,
      booster,
      cardNumber,
      cardId,
      rarity,
      remove,
      bulkOperation,
    }: PokemonCardAddInput,
    config: LangGraphRunnableConfig,
  ): Promise<string> => {
    const context = getToolContext(config);
    const userId = context.userId;
    const service = context.pokemonTcgPocketService;

    // Convert rarity symbol to enum if provided
    const rarityEnum = rarity ? RARITY_MAP[rarity] : undefined;

    // Parse card ID into set key and number if provided
    let idSetKey: string | undefined;
    let idCardNumber: number | undefined;
    if (cardId) {
      const match = CARD_ID_PATTERN.exec(cardId)!;
      idSetKey = match[1];
      idCardNumber = parseInt(match[2], 10);
    }

    // Search for matching cards
    const cards = await service.searchCards({
      cardName,
      setKey: idSetKey ?? setKey,
      booster,
      cardNumber: idCardNumber ?? cardNumber,
      rarity: rarityEnum,
      userId,
      ownershipFilter: remove ? 'owned' : 'missing',
    });

    // Validate results
    if (cards.length === 0) {
      const displayName = await service.getDisplayName(userId);

      // If no cards found, check if they exist at all
      const existingCards = await service.searchCards({
        cardName,
        setKey: idSetKey ?? setKey,
        booster,
        cardNumber: idCardNumber ?? cardNumber,
        rarity: rarityEnum,
      });

      if (existingCards.length === 0) {
        return (
          'No cards exist in the database matching these search criteria. Please verify the card details and try again. Thus no card was ' +
          (remove ? 'removed from' : 'added to') +
          ' the user’s collection.'
        );
      } else {
        const cardDetails = await service.formatCardsAsCsv(
          existingCards,
          userId,
        );
        if (remove) {
          return `No matching cards found in ${displayName}’s collection. The cards exist but ${displayName} does not own them. The following cards were found:\n${cardDetails}\nThus no card was removed from the user’s collection.`;
        } else {
          return `No matching cards found that ${displayName} is missing. The cards exist but ${displayName} already owns them. The following cards were found:\n${cardDetails}\nThus no card was added to the user’s collection.`;
        }
      }
    }

    if (!bulkOperation && cards.length > 1) {
      return (
        'Multiple matches found. Please ask the user to specify which of these cards they mean. Then call this tool again and provide its card ID:\n' +
        (await service.formatCardsAsCsv(cards, userId))
      );
    }

    // Add or remove cards
    const displayName = await service.getDisplayName(userId);
    const operation = remove ? 'removed' : 'added';
    const preposition = remove ? 'from' : 'to';

    if (cards.length > 1 && bulkOperation) {
      // Process multiple cards
      const updatedCards = await Promise.all(
        cards.map((card) =>
          remove
            ? service.removeCardFromCollection(card.id, userId)
            : service.addCardToCollection(card.id, userId),
        ),
      );

      const header = `Successfully ${operation} ${cards.length} cards ${preposition} ${displayName}’s collection:`;
      const csv = await service.formatCardsAsCsv(updatedCards, userId);
      const stats = await service.getFormattedCollectionStats(userId);
      return `${header}\n${csv}\n\nUpdated statistics of ${stats}`;
    } else {
      // Process single card
      assert(cards.length === 1);
      const card = cards[0];
      const updatedCard = remove
        ? await service.removeCardFromCollection(card.id, userId)
        : await service.addCardToCollection(card.id, userId);

      const header = `Successfully ${operation} card ${preposition} ${displayName}’s collection:`;
      const csv = await service.formatCardsAsCsv([updatedCard], userId);
      const stats = await service.getFormattedCollectionStats(userId);
      return `${header}\n${csv}\n\nUpdated statistics of ${stats}`;
    }
  },
  {
    name: 'pokemonCardAdd',
    description:
      'Add or remove Pokémon TCG Pocket cards to/from the collection of the user who wrote the last message in the chat. Returns a CSV with the card info. If a user shares an image of a Pokémon card without context in this chat (especially if it shows “new”), they likely want you to add it to their collection.',
    schema,
  },
);
