import assert from 'assert';
import { tool } from '@langchain/core/tools';
import { getContextVariable } from '@langchain/core/context';
import { TelegramService } from '../TelegramService.js';
import { z } from 'zod';
import { NotExhaustiveSwitchError } from '../NotExhaustiveSwitchError.js';

function handleDie(value: number): string {
  return `Your six sided die rolled a ${value}.`;
}

function handleSlotMachine(value: number): string {
  return value !== 64
    ? 'Game 🎰: you lost (reels did not stop at 777)'
    : 'Game 🎰: Jackpot! (Reels stopped at 777)';
}

function handleBowling(value: number): string {
  let score = value;
  if (value <= 2) {
    score--;
  }
  const comment = score === 6 ? 'Strike!' : '';
  return `Game 🎳: You knocked down ${score} of the 6 pins. ${comment}`.trimEnd();
}

function handleDarts(value: number): string {
  const score = value - 1;
  const comment = score === 0 ? 'Missed!' : score === 5 ? 'Bullseye!' : '';
  return `Game 🎯: You scored ${score} out of max. 5 points. ${comment}`.trimEnd();
}

function handleBasketball(value: number): string {
  if (value === 1) return 'Game 🏀: Missed!';
  if (value === 2) return 'Game 🏀: Hit the rim and missed!';
  if (value === 3)
    return 'Game 🏀: Stuck between the basket rim and the backboard!';
  if (value === 4) return 'Game 🏀: Barely in!';
  return 'Game 🏀: Perfect goal!';
}

function handleSoccer(value: number): string {
  if (value === 1) return 'Game ⚽: Missed!';
  if (value === 2) return 'Game ⚽: Hit the goalpost and missed!';
  if (value === 3) return 'Game ⚽: Goal (right in the middle)!';
  if (value === 4)
    return 'Game ⚽: Tricky goal (hit both sideposts and went in)!';
  return 'Game ⚽: Perfect corner goal and hard to catch!';
}

export const diceTool = tool(
  async ({ dieEmoji }): Promise<string> => {
    const telegram = getContextVariable<TelegramService>('telegram');
    assert(telegram instanceof TelegramService);
    const chatId = getContextVariable<string>('chatId');
    assert(typeof chatId === 'bigint');

    const result = await telegram.sendDice(dieEmoji, chatId);
    const dice = result.dice;
    if (!dice) {
      return 'Error: Telegram could not determine a random result';
    }

    switch (dieEmoji) {
      case '🎲':
        return handleDie(dice.value);
      case '🎰':
        return handleSlotMachine(dice.value);
      case '🎳':
        return handleBowling(dice.value);
      case '🎯':
        return handleDarts(dice.value);
      case '🏀':
        return handleBasketball(dice.value);
      case '⚽':
        return handleSoccer(dice.value);
      default:
        throw new NotExhaustiveSwitchError(dieEmoji);
    }
  },
  {
    name: 'dice',
    description:
      'Throw a die in the telegram chat. Will be displayed as an emoji with a random value to users. This tools returns your random value.',
    schema: z.object({
      dieEmoji: z
        .enum(['🎲', '🎯', '🏀', '⚽', '🎳', '🎰'])
        .describe(
          'The emoji on which the animation is based: "🎲" (default), "🎯", "🎳", "🏀", "⚽", or "🎰".',
        ),
    }),
  },
);
