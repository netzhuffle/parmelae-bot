import assert from 'assert';
import { tool } from '@langchain/core/tools';
import { getContextVariable } from '@langchain/core/context';
import { TelegramService } from '../TelegramService.js';
import { z } from 'zod';

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

    if (dieEmoji === '🎲') {
      return `Your six sided die rolled a ${dice.value}.`;
    }
    if (dieEmoji === '🎰') {
      return dice.value !== 64
        ? 'Game 🎰: you lost (reels did not stop at 777)'
        : 'Game 🎰: you won! (Reels stopped at 777)';
    }
    const max = ['🎯', '🎳'].includes(dieEmoji) ? 6 : 5;
    return `Game ${dieEmoji}: You scored ${dice.value} out of max. ${max} points`;
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
