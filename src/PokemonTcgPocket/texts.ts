/**
 * Explanation texts.
 *
 * Own file because LLMs tend to mess up the ’ signs.
 */

export const SETS_STATS_EXPLANATION =
  '(♦️ is the number of different cards in the user’s collection with rarities ♢, ♢♢, ♢♢♢, and ♢♢♢♢ followed by the total of these rarities in the set after the slash, ' +
  '⭐️ is the number of different cards in the user’s collection with rarities ☆, ☆☆, and ☆☆☆, ' +
  '✴️ for rarities ✸ and ✸✸, and 👑 for rarity ♛. ' +
  'The numbers for ⭐️, ✴️, and 👑 are only shown if the user owns at least one card with the respective rarity (and not all sets have ✴️ cards). ' +
  'Promo sets don’t have rarities, thus only the number of different cards in the user’s collection is shown. ' +
  'If you called this tool multiple times, always show the exact numbers of the very last call, do not change any numbers as it contains the end state after all calls already.)';

export const BOOSTERS_STATS_EXPLANATION =
  '(Numbers divided by “/” are the collected and total number of different cards in the specific booster. ' +
  '♢–♢♢♢♢ shows progress and probability (p%) for diamond rarities (♢, ♢♢, ♢♢♢, ♢♢♢♢), ' +
  '♢–☆ shows progress and probability for tradable cards (diamonds + one-star ☆), ' +
  'and ♢–♛ shows overall progress and probability for all rarities. ' +
  'These probabilities help the user decide which booster to open next to maximise their chances. ' +
  'If you called this tool multiple times, always show the exact numbers of the very last call, do not change any numbers as it contains the end state after all calls already.)';

// Tool messages
export const CARD_ID_MISMATCH_MESSAGE =
  'Card ID and set key do not match. Please ask the user which one is incorrect.';
export const NO_CARDS_FOUND_MESSAGE =
  'No cards found matching the search criteria.';
export const CARD_EXISTS_BUT_NO_MATCH_MESSAGE = (
  setKey: string,
  cardNumber: number,
  csv: string,
) =>
  `Card with ID ${setKey}-${cardNumber.toString().padStart(3, '0')} exists but does not match the additional search criteria:\n${csv}`;

// Additional messages
export const LIMITED_RESULTS_MESSAGE = (
  additionalCount: number,
  totalCount: number,
) =>
  `\n\nLimited list above to first 20 cards to save token usage. Tell the user there are ${additionalCount} additional cards matching the search query (${totalCount} total).`;

export const NO_CARDS_IN_DB_MESSAGE = (remove: boolean) =>
  `No cards exist in the database matching these search criteria. Please verify the card details and try again. Thus no card was ${
    remove ? 'removed from' : 'added to'
  } the user’s collection.`;

export const NO_MATCHING_CARDS_IN_COLLECTION_MESSAGE = (
  displayName: string,
  cardDetails: string,
) =>
  `No matching cards found in ${displayName}’s collection. The cards exist but ${displayName} does not own them. The following cards were found:\n${cardDetails}\nThus no card was removed from the user’s collection.`;

export const NO_MATCHING_MISSING_CARDS_MESSAGE = (
  displayName: string,
  cardDetails: string,
) =>
  `No matching cards found that ${displayName} is missing. The cards exist but ${displayName} already owns them. The following cards were found:\n${cardDetails}\nThus no card was added to the user’s collection.`;

export const BULK_OPERATION_WARNING_MESSAGE = (
  header: string,
  csv: string,
  stats: string,
) =>
  `${header}\n${csv}\nIf these aren’t the cards the user was asking for, you passed the wrong parameters. If so, please inform the user about your mistake and let them decide what to do.\n\nUpdated statistics of ${stats}`;

export const POKEMON_CARD_ADD_TOOL_DESCRIPTION =
  'Add or remove Pokémon TCG Pocket cards to/from the collection of the user who wrote the last message in the chat. Returns a CSV with the card info. If a user shares an image of a Pokémon card without context in this chat (especially if it shows “new”), they likely want you to add it to their collection. Generally pass null to filters the user did not tell you to filter by and make sure to only add/remove 1 card unless the user explictly asks you to add/remove multiple cards – there is no undo!';

// Card operation messages
export const MULTIPLE_MATCHES_MESSAGE = (csv: string) =>
  'Multiple matches found. Please ask the user to specify which of these cards they mean. Then call this tool again and provide its card ID:\n' +
  csv;

export const BULK_OPERATION_HEADER_MESSAGE = (
  operation: string,
  count: number,
  preposition: string,
  displayName: string,
) =>
  `Successfully ${operation} ${count} cards ${preposition} ${displayName}’s collection:`;

export const SINGLE_OPERATION_HEADER_MESSAGE = (
  operation: string,
  preposition: string,
  displayName: string,
) =>
  `Successfully ${operation} card ${preposition} ${displayName}’s collection:`;

export const UPDATED_STATS_MESSAGE = (stats: string) =>
  `\n\nUpdated statistics (after the change) of ${stats}`;

export const OPERATION_RESULT_MESSAGE = (remove: boolean) =>
  `\n\nThus no card was ${remove ? 'removed from' : 'added to'} the user’s collection.`;
