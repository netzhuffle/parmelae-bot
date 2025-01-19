import { tool } from '@langchain/core/tools';
import { getContextVariable } from '@langchain/core/context';
import { z } from 'zod';
import {
  PokemonTcgPocketService,
  RARITY_MAP,
} from '../PokemonTcgPocketService.js';
import assert from 'assert';

/** Filter for card ownership */
export enum OwnershipFilter {
  ALL = 'all',
  OWNED = 'owned',
  MISSING = 'missing',
}

export const pokemonCardSearchTool = tool(
  async ({
    cardName,
    setName,
    setKey,
    booster,
    cardNumber,
    cardId,
    rarity,
    ownershipFilter,
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

    const cards = await service.searchCards({
      cardName,
      setName,
      setKey: idSetKey ?? setKey,
      booster,
      cardNumber: idCardNumber ?? cardNumber,
      rarity: rarityEnum,
      userId: ownershipFilter !== undefined ? userId : undefined,
      ownershipFilter,
    });

    // Validate results
    if (cards.length === 0) {
      return 'No cards found matching the search criteria.';
    }

    // Format results
    const csv = await service.formatCardsAsCsv(cards.slice(0, 20), userId);
    if (cards.length > 20) {
      return (
        csv +
        `\n\nLimited list above to first 20 cards to save token usage. Tell the user there are ${cards.length - 20} additional cards matching the search query (${cards.length} total).`
      );
    }
    return csv;
  },
  {
    name: 'pokemonCardSearch',
    description:
      'Search for Pokémon TCG Pocket cards using various filters. Returns a CSV with all card infos.',
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
          'Card rarity symbol to filter by: ♢, ♢♢, ♢♢♢, ♢♢♢♢, ☆, ☆☆, ☆☆☆, ☆☆☆☆, or ♛. Must use ♢ instead of ♦️, ☆ instead of ⭐️, ♛ instead of 👑.',
        ),
      ownershipFilter: z
        .nativeEnum(OwnershipFilter)
        .optional()
        .describe(
          'Filter by card ownership of the user who wrote the last message: "all" (default) for all cards, "owned" for cards they own, "missing" for cards they do not own',
        ),
    }),
  },
);
