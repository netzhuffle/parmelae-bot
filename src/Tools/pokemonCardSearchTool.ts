import { tool } from '@langchain/core/tools';
import { getContextVariable } from '@langchain/core/context';
import { z } from 'zod';
import {
  PokemonTcgPocketService,
  RARITY_MAP,
  SET_KEY_VALUES,
  SET_KEY_NAMES,
  BOOSTER_VALUES,
  OWNERSHIP_FILTER_VALUES,
} from '../PokemonTcgPocketService.js';
import assert from 'assert';

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
  ownershipFilter: z
    .enum(OWNERSHIP_FILTER_VALUES)
    .optional()
    .describe(
      'Filter by card ownership of the user who wrote the last message: "all" (default) for all cards, "owned" for cards they own, "missing" for cards they do not own',
    ),
});

type PokemonCardSearchInput = z.infer<typeof schema>;

export const pokemonCardSearchTool = tool(
  async ({
    cardName,
    setKey,
    booster,
    cardNumber,
    cardId,
    rarity,
    ownershipFilter,
  }: PokemonCardSearchInput): Promise<string> => {
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
      const match = CARD_ID_PATTERN.exec(cardId)!;
      idSetKey = match[1];
      idCardNumber = parseInt(match[2], 10);
    }

    const cards = await service.searchCards({
      cardName,
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
      'Search for and get detailed lists of Pokémon TCG Pocket cards using various filters. Returns a CSV with full card information including ID, name, set, booster, and ownership status. Can search through all existing cards, through the collection of the user that last wrote a message, or through their missing cards. This is the tool to use when you need actual card names and details, not just statistics (use pokemonCardStats for numerical summaries).',
    schema,
  },
);
