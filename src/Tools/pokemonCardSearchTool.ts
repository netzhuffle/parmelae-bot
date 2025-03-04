import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import {
  RARITY_MAP,
  SET_KEY_VALUES,
  SET_KEY_NAMES,
  BOOSTER_VALUES,
  OWNERSHIP_FILTER_VALUES,
  PokemonTcgPocketService,
} from '../PokemonTcgPocketService.js';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { getToolContext } from '../ChatGptAgentService.js';
import { PokemonCardWithRelations } from '../Repositories/Types.js';

export const POKEMON_CARD_SEARCH_TOOL_NAME = 'pokemonCardSearch';

/** Card ID regex pattern */
const CARD_ID_PATTERN = /^([A-Za-z0-9-]+)-(\d{3})$/;

const schema = z.object({
  cardName: z
    .string()
    .nullable()
    .describe(
      'Substring to search for in card names (do not pass an ID here), null to ignore this filter. Must be null if cardId is not null',
    ),
  setKey: z
    .enum(SET_KEY_VALUES)
    .nullable()
    .describe(
      `Set key to filter by: ${SET_KEY_VALUES.map((key) => `${key} (${SET_KEY_NAMES[key]})`).join(', ')}. Pass null unless the user specifically asks you to filter by a set`,
    ),
  booster: z.enum(BOOSTER_VALUES).nullable().describe('Booster to filter by'),
  cardId: z
    .string()
    .regex(CARD_ID_PATTERN)
    .nullable()
    .describe(
      'Card ID in format {set-key}-{three digit number}, e.g. A1-003. If the user wants to search a card by ID, you likely do want to set the other filters to null to not create conflicting information. Null to ignore this filter',
    ),
  rarity: z
    .enum(['♢', '♢♢', '♢♢♢', '♢♢♢♢', '☆', '☆☆', '☆☆☆', '☆☆☆☆', '♛'])
    .nullable()
    .describe(
      'Card rarity symbol to filter by: ♢, ♢♢, ♢♢♢, ♢♢♢♢, ☆, ☆☆, ☆☆☆, ☆☆☆☆, or ♛. Must use ♢ instead of ♦️, ☆ instead of ⭐️, ♛ instead of 👑. Null to ignore this filter',
    ),
  ownershipFilter: z
    .enum(OWNERSHIP_FILTER_VALUES)
    .nullable()
    .describe(
      'Filter by card ownership of the user who wrote the last message: null for all cards, "owned" for cards they own, "missing" for cards they do not own',
    ),
});

type PokemonCardSearchInput = z.infer<typeof schema>;

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
  if (userId && ownershipFilter) {
    searchParams.userId = userId;
    searchParams.ownershipFilter = ownershipFilter;
  }

  return searchParams;
}

async function formatSearchResults(
  service: PokemonTcgPocketService,
  cards: PokemonCardWithRelations[],
  userId: bigint,
): Promise<string> {
  if (cards.length === 0) {
    return 'No cards found matching the search criteria.';
  }

  const csv = await service.formatCardsAsCsv(cards.slice(0, 20), userId);
  if (cards.length > 20) {
    return (
      csv +
      `\n\nLimited list above to first 20 cards to save token usage. Tell the user there are ${cards.length - 20} additional cards matching the search query (${cards.length} total).`
    );
  }
  return csv;
}

export const pokemonCardSearchTool = tool(
  async (
    {
      cardName,
      setKey,
      booster,
      cardId,
      rarity,
      ownershipFilter,
    }: PokemonCardSearchInput,
    config: LangGraphRunnableConfig,
  ): Promise<string> => {
    const context = getToolContext(config);
    const userId = context.userId;
    const service = context.pokemonTcgPocketService;

    // Parse card ID if provided
    const idInfo = cardId ? parseCardId(cardId) : undefined;

    // Build search parameters
    const searchParams = buildSearchParams(
      cardName,
      setKey,
      booster,
      rarity,
      idInfo,
      userId,
      ownershipFilter ?? undefined,
    );

    // Search and format results
    const cards = await service.searchCards(searchParams);
    return formatSearchResults(service, cards, userId);
  },
  {
    name: POKEMON_CARD_SEARCH_TOOL_NAME,
    description:
      'Search for and get detailed lists of Pokémon TCG Pocket cards using various filters. Pass null for filters the user did not ask you to filter by. Returns a CSV with full card information including ID, name, set, booster, and ownership status. Can search through all existing cards, through the collection of the user that last wrote a message, or through their missing cards. This is the tool to use when you need actual card names and details, not just statistics (use pokemonCardStats for numerical summaries).',
    schema,
  },
);
