/**
 * Explanation texts.
 *
 * Own file because LLMs tend to mess up the ’ signs.
 */

export const SETS_STATS_EXPLANATION =
  '(♦️ is the number of different cards in the user’s collection with rarities ♢, ♢♢, ♢♢♢, and ♢♢♢♢ followed by the total of these rarities in the set, ' +
  '⭐️ is the number of different cards in the user’s collection with rarities ☆, ☆☆, and ☆☆☆, ' +
  '✴️ is the number of different cards in the user’s collection with rarities ✸ and ✸✸, ' +
  'and 👑 is the number of different cards in the user’s collection with rarity ♛. ' +
  'Promo sets don’t have rarities, thus only the number of different cards in the user’s collection is shown. ' +
  'When describing these stats to users, omit each ⭐️, ✴️, and 👑 stat that is 0 for better readability and to match the ingame format, but always show them if >=1.' +
  'If you called this tool multiple times, always show the exact numbers of the very last call, do not change any numbers as it contains the end state after all calls already.)';

export const BOOSTERS_STATS_EXPLANATION =
  '(First numbers are the collected and total number of different cards in the specific booster. ' +
  'p♢ is the probability of receiving a new card with rarity ♢, ♢♢, ♢♢♢, or ♢♢♢♢ currently missing in the user’s collection, ' +
  'and pN is the probability of receiving any new card currently missing in the user’s collection ' +
  'when opening the specific booster. These probabilities help the user decide which booster to open next to maximise their chances.' +
  'If you called this tool multiple times, always show the exact numbers of the very last call, do not change any numbers as it contains the end state after all calls already.)';
