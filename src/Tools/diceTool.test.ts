import { diceTool } from './diceTool.js';
import { TelegramServiceFake } from '../Fakes/TelegramServiceFake.js';
import { createTestToolConfig, ToolContext } from '../ChatGptAgentService.js';

const TEST_CHAT_ID = '123456789';
const BASE_TELEGRAM_REQUEST = {
  method: 'sendDice',
  chatId: TEST_CHAT_ID,
};

describe('diceTool', () => {
  let telegramFake: TelegramServiceFake;
  let config: { configurable: ToolContext };

  beforeEach(() => {
    telegramFake = new TelegramServiceFake();
    config = createTestToolConfig({
      chatId: BigInt(TEST_CHAT_ID),
      telegramService: telegramFake,
    });
  });

  describe('die (🎲)', () => {
    it.each([1, 2, 3, 4, 5, 6])(
      'should handle die value %i correctly',
      async (value) => {
        telegramFake.result = { method: 'sendDice', value };
        const result = await diceTool.invoke({ type: '🎲' }, config);
        expect(result).toBe(`Your six sided die rolled a ${value}.`);
      },
    );

    it('should send correct emoji to Telegram', async () => {
      telegramFake.result = { method: 'sendDice', value: 1 };
      await diceTool.invoke({ type: '🎲' }, config);
      expect(telegramFake.request).toEqual({
        ...BASE_TELEGRAM_REQUEST,
        emoji: '🎲',
      });
    });
  });

  describe('games', () => {
    describe('darts (🎯)', () => {
      it('returns score 2/5 for value 3', async () => {
        telegramFake.result = { method: 'sendDice', value: 3 };
        const result = await diceTool.invoke({ type: '🎯' }, config);
        expect(telegramFake.request).toEqual({
          ...BASE_TELEGRAM_REQUEST,
          emoji: '🎯',
        });
        expect(result).toBe('Game 🎯: You scored 2 out of max. 5 points.');
      });

      it('shows "Missed!" when scoring 0/5', async () => {
        telegramFake.result = { method: 'sendDice', value: 1 };
        const result = await diceTool.invoke({ type: '🎯' }, config);
        expect(result).toBe(
          'Game 🎯: You scored 0 out of max. 5 points. Missed!',
        );
      });

      it('shows "Bullseye!" when scoring 5/5', async () => {
        telegramFake.result = { method: 'sendDice', value: 6 };
        const result = await diceTool.invoke({ type: '🎯' }, config);
        expect(result).toBe(
          'Game 🎯: You scored 5 out of max. 5 points. Bullseye!',
        );
      });
    });

    describe('basketball (🏀)', () => {
      const cases = [
        { value: 1, expected: 'Game 🏀: Missed!' },
        { value: 2, expected: 'Game 🏀: Hit the rim and missed!' },
        {
          value: 3,
          expected: 'Game 🏀: Stuck between the basket rim and the backboard!',
        },
        { value: 4, expected: 'Game 🏀: Barely in!' },
        { value: 5, expected: 'Game 🏀: Perfect goal!' },
      ];

      it.each(cases)(
        'should return correct message for value $value',
        async ({ value, expected }) => {
          telegramFake.result = { method: 'sendDice', value };
          const result = await diceTool.invoke({ type: '🏀' }, config);
          expect(result).toBe(expected);
        },
      );

      it('should send correct emoji to Telegram', async () => {
        telegramFake.result = { method: 'sendDice', value: 1 };
        await diceTool.invoke({ type: '🏀' }, config);
        expect(telegramFake.request).toEqual({
          ...BASE_TELEGRAM_REQUEST,
          emoji: '🏀',
        });
      });
    });

    describe('soccer (⚽️)', () => {
      const cases = [
        { value: 1, expected: 'Game ⚽: Missed!' },
        { value: 2, expected: 'Game ⚽: Hit the goalpost and missed!' },
        { value: 3, expected: 'Game ⚽: Goal (right in the middle)!' },
        {
          value: 4,
          expected: 'Game ⚽: Tricky goal (hit both sideposts and went in)!',
        },
        {
          value: 5,
          expected: 'Game ⚽: Perfect corner goal and hard to catch!',
        },
      ];

      it.each(cases)(
        'should return correct message for value $value',
        async ({ value, expected }) => {
          telegramFake.result = { method: 'sendDice', value };
          const result = await diceTool.invoke({ type: '⚽' }, config);
          expect(result).toBe(expected);
        },
      );

      it('should send correct emoji to Telegram', async () => {
        telegramFake.result = { method: 'sendDice', value: 1 };
        await diceTool.invoke({ type: '⚽' }, config);
        expect(telegramFake.request).toEqual({
          ...BASE_TELEGRAM_REQUEST,
          emoji: '⚽',
        });
      });
    });

    describe('bowling (🎳)', () => {
      it('should return the correct result for a bowling game', async () => {
        telegramFake.result = { method: 'sendDice', value: 2 };

        const result = await diceTool.invoke({ type: '🎳' }, config);

        expect(telegramFake.request).toEqual({
          ...BASE_TELEGRAM_REQUEST,
          emoji: '🎳',
        });
        expect(result).toBe('Game 🎳: You knocked down 1 of the 6 pins.');
      });

      it('should handle a miss', async () => {
        telegramFake.result = { method: 'sendDice', value: 1 };
        const result = await diceTool.invoke({ type: '🎳' }, config);
        expect(result).toBe('Game 🎳: You knocked down 0 of the 6 pins.');
      });

      it('should handle a strike', async () => {
        telegramFake.result = { method: 'sendDice', value: 6 };
        const result = await diceTool.invoke({ type: '🎳' }, config);
        expect(result).toBe(
          'Game 🎳: You knocked down 6 of the 6 pins. Strike!',
        );
      });

      it('should handle a regular hit', async () => {
        telegramFake.result = { method: 'sendDice', value: 3 };
        const result = await diceTool.invoke({ type: '🎳' }, config);
        expect(result).toBe('Game 🎳: You knocked down 3 of the 6 pins.');
      });
    });

    describe('slot machine (🎰)', () => {
      it('should return the correct result for a slot machine win', async () => {
        telegramFake.result = { method: 'sendDice', value: 64 };

        const result = await diceTool.invoke({ type: '🎰' }, config);

        expect(telegramFake.request).toEqual({
          ...BASE_TELEGRAM_REQUEST,
          emoji: '🎰',
        });
        expect(result).toBe('Game 🎰: Jackpot! (Reels stopped at 777)');
      });

      it('should return the correct result for a slot machine loss', async () => {
        telegramFake.result = { method: 'sendDice', value: 32 };

        const result = await diceTool.invoke({ type: '🎰' }, config);

        expect(telegramFake.request).toEqual({
          ...BASE_TELEGRAM_REQUEST,
          emoji: '🎰',
        });
        expect(result).toBe('Game 🎰: you lost (reels did not stop at 777)');
      });
    });
  });
});
