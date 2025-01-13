import { tool } from '@langchain/core/tools';
import { getContextVariable } from '@langchain/core/context';
import { z } from 'zod';
import {
  PokemonTcgPocketService,
  RARITY_MAP,
} from '../PokemonTcgPocketService.js';
import assert from 'assert';
import { OwnershipFilter } from './pokemonCardSearchTool.js';

export const pokemonCardAddTool = tool(
  async ({
    cardName,
    setName,
    setKey,
    booster,
    cardNumber,
    cardId,
    rarity,
    remove,
    bulkOperation,
  }): Promise<string> => {
    const service =
      getContextVariable<PokemonTcgPocketService>('pokemonTcgPocket');
    assert(service instanceof PokemonTcgPocketService);
    const userId = getContextVariable<bigint>('userId');
    assert(typeof userId === 'bigint');

    // Convert rarity symbol to enum if provided
    const rarityEnum = rarity ? RARITY_MAP[rarity] : undefined;

    // Parse card ID into set key and number if provided
    let idSetKey: string | undefined;
    let idCardNumber: number | undefined;
    if (cardId) {
      const regex = /^([A-Za-z0-9-]+)-(\d{3})$/;
      const match = regex.exec(cardId);
      if (!match) {
        return 'Invalid card ID format. Expected format: {set-key}-{three digit number}, e.g. A1-003';
      }
      idSetKey = match[1];
      idCardNumber = parseInt(match[2], 10);
    }

    // Search for matching cards
    const cards = await service.searchCards({
      cardName,
      setName,
      setKey: idSetKey ?? setKey,
      booster,
      cardNumber: idCardNumber ?? cardNumber,
      rarity: rarityEnum,
      userId,
      ownershipFilter: remove ? OwnershipFilter.OWNED : OwnershipFilter.MISSING,
    });

    // Validate results
    if (cards.length === 0) {
      const displayName = await service.getDisplayName(userId);
      if (remove) {
        return `No matching cards found in ${displayName}'s collection.`;
      } else {
        return `No matching cards found that ${displayName} is missing.`;
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

      const header = `Successfully ${operation} ${cards.length} cards ${preposition} ${displayName}'s collection:`;
      const csv = await service.formatCardsAsCsv(updatedCards, userId);
      return `${header}\n${csv}`;
    } else {
      // Process single card
      assert(cards.length === 1);
      const card = cards[0];
      const updatedCard = remove
        ? await service.removeCardFromCollection(card.id, userId)
        : await service.addCardToCollection(card.id, userId);

      const header = `Successfully ${operation} card ${preposition} ${displayName}'s collection:`;
      const csv = await service.formatCardsAsCsv([updatedCard], userId);
      return `${header}\n${csv}`;
    }
  },
  {
    name: 'pokemonCardAdd',
    description:
      'Add or remove Pokémon TCG Pocket cards to/from the collection of the user who wrote the last message in the chat. Returns a CSV with the card info. If a user shares an image of a Pokémon card without context in this chat (especially if it shows "new"), they likely want you to add it to their collection.',
    schema: z.object({
      cardName: z
        .string()
        .optional()
        .describe('Substring to search for in card names'),
      setName: z
        .string()
        .optional()
        .describe('Exact set name to filter by (e.g. "Unschlagbare Gene")'),
      setKey: z
        .string()
        .optional()
        .describe('Exact set key to filter by (e.g. "A1")'),
      booster: z
        .string()
        .optional()
        .describe('Exact booster name to filter by (e.g. "Mewtu")'),
      cardNumber: z
        .number()
        .int()
        .optional()
        .describe('Exact card number in set to filter by'),
      cardId: z
        .string()
        .optional()
        .describe(
          'Card ID in format {set-key}-{three digit number}, e.g. A1-003',
        ),
      rarity: z
        .enum(['♢', '♢♢', '♢♢♢', '♢♢♢♢', '☆', '☆☆', '☆☆☆', '☆☆☆☆', '♛'])
        .optional()
        .describe(
          'Card rarity symbol to filter by: ♢, ♢♢, ♢♢♢, ♢♢♢♢, ☆, ☆☆, ☆☆☆, ☆☆☆☆, or ♛',
        ),
      remove: z
        .boolean()
        .optional()
        .describe(
          'If true, removes the card from the collection instead of adding it',
        ),
      bulkOperation: z
        .boolean()
        .optional()
        .describe(
          'If true, allows adding/removing multiple cards at once. Only pass true if the user specifically requested to add/remove multiple cards.',
        ),
    }),
  },
);
