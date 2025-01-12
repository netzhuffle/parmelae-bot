import { tool } from '@langchain/core/tools';
import { getContextVariable } from '@langchain/core/context';
import { z } from 'zod';
import {
  PokemonTcgPocketService,
  RARITY_MAP,
  RARITY_REVERSE_MAP,
} from '../PokemonTcgPocketService.js';
import assert from 'assert';

export const pokemonCardSearchTool = tool(
  async ({
    cardName,
    setName,
    setKey,
    booster,
    cardNumber,
    cardId,
    rarity,
  }): Promise<string> => {
    const service =
      getContextVariable<PokemonTcgPocketService>('pokemonTcgPocket');
    assert(service instanceof PokemonTcgPocketService);

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
    });

    if (cards.length === 0) {
      return 'No cards found matching the search criteria.';
    }

    // Format results as CSV
    const lines = ['ID,Name,Rarity,Set,Boosters'];
    const formattedCards = cards.slice(0, 20).map((card) => {
      const cardIdStr = `${card.set.key}-${card.number.toString().padStart(3, '0')}`;
      const rarityStr = card.rarity ? RARITY_REVERSE_MAP[card.rarity] : '';
      const boostersStr = card.boosters.length
        ? card.boosters.map((b) => b.name).join('/')
        : '';
      return `${cardIdStr},${card.name},${rarityStr},${card.set.name},${boostersStr}`;
    });
    lines.push(...formattedCards);

    let output = lines.join('\n');
    if (cards.length > 20) {
      output +=
        '\n\nThere are more cards matching the search query, limited to first 20 cards.';
    }

    return output;
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
        .describe('Exact set name to filter by (e.g. “Unschlagbare Gene”)'),
      setKey: z
        .string()
        .optional()
        .describe('Exact set key to filter by (e.g. “A1”)'),
      booster: z
        .string()
        .optional()
        .describe('Exact booster name to filter by (e.g. “Mewtu”)'),
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
    }),
  },
);
