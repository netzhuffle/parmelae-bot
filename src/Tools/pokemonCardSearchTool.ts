import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import {
  SET_KEY_VALUES,
  SET_KEY_NAMES,
  BOOSTER_VALUES,
  OWNERSHIP_FILTER_VALUES,
} from '../PokemonTcgPocket/PokemonTcgPocketService.js';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { getToolContext } from '../ChatGptAgentService.js';
import {
  CARD_ID_MISMATCH_MESSAGE,
  NO_CARDS_FOUND_MESSAGE,
  CARD_EXISTS_BUT_NO_MATCH_MESSAGE,
  LIMITED_RESULTS_MESSAGE,
} from '../PokemonTcgPocket/texts.js';

export const POKEMON_CARD_SEARCH_TOOL_NAME = 'pokemonCardSearch';

const schema = z.object({
  card: z
    .string()
    .nullish()
    .describe(
      'Card name or ID in format {set-key}-{three digit number}, e.g. A1-003. If it matches the ID pattern, it will be treated as an ID; otherwise, as a name. Pass value null instead of a string if you know neither name nor ID.',
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
      'Booster to filter by. Pass value null instead of a string unless the user specifically asks you to filter by a booster name.',
    ),
  rarity: z
    .enum(['♢', '♢♢', '♢♢♢', '♢♢♢♢', '☆', '☆☆', '☆☆☆', '☆☆☆☆', '✸', '✸✸', '♛'])
    .nullish()
    .describe(
      'Card rarity symbol to filter by: ♢, ♢♢, ♢♢♢, ♢♢♢♢, ☆, ☆☆, ☆☆☆, ☆☆☆☆, ✸, ✸✸, or ♛. Must use ♢ instead of ♦️, ☆ instead of ⭐️, ✸ instead of ✴️, and ♛ instead of 👑. Pass value null instead of a string unless the user specifically asks you to filter by rarity.',
    ),
  ownershipFilter: z
    .enum(OWNERSHIP_FILTER_VALUES)
    .nullish()
    .describe(
      'Filter by card ownership of the user who wrote the last message: Pass value null instead of a string for all cards, pass "owned" for cards they own, pass "missing" for cards they do not own.',
    ),
});

type PokemonCardSearchInput = z.infer<typeof schema>;

export const pokemonCardSearchTool = tool(
  async (
    { card, setKey, booster, rarity, ownershipFilter }: PokemonCardSearchInput,
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
      ownershipFilter ?? undefined,
    );

    // Search for matching cards
    const { cards, idOnlyCards } = await service.searchCardsWithFallback(
      searchParams,
      idInfo,
    );

    // Handle no cards found
    if (cards.length === 0) {
      if (idOnlyCards && idOnlyCards.length > 0) {
        const csv = await service.formatCardsAsCsv(idOnlyCards, userId);
        return CARD_EXISTS_BUT_NO_MATCH_MESSAGE(
          idInfo!.setKey,
          idInfo!.cardNumber,
          csv,
        );
      }
      return NO_CARDS_FOUND_MESSAGE;
    }

    // Format results
    const csv = await service.formatCardsAsCsv(cards.slice(0, 20), userId);
    if (cards.length > 20) {
      return csv + LIMITED_RESULTS_MESSAGE(cards.length - 20, cards.length);
    }
    return csv;
  },
  {
    name: POKEMON_CARD_SEARCH_TOOL_NAME,
    description:
      'Search for and get detailed lists of Pokémon TCG Pocket cards using various filters. Pass null for filters the user did not ask you to filter by. Returns a CSV with full card information including ID, name, set, booster, and ownership status. Can search through all existing cards, through the collection of the user that last wrote a message, or through their missing cards. This is the tool to use when you need actual card names and details, not just statistics (use pokemonCardStats for numerical summaries).',
    schema,
  },
);
