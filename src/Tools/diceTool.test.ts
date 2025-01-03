import { diceTool } from './diceTool.js';
import { TelegramServiceFake } from '../Fakes/TelegramServiceFake.js';
import { getContextVariable } from '@langchain/core/context';

jest.mock('@langchain/core/context', () => ({
  getContextVariable: jest.fn(),
}));

describe('diceTool', () => {
  let telegramFake: TelegramServiceFake;

  beforeEach(() => {
    telegramFake = new TelegramServiceFake();
    (getContextVariable as jest.Mock).mockImplementation((key: string) => {
      if (key === 'telegram') return telegramFake;
      if (key === 'chatId') return BigInt(123456789);
      return undefined;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('regular die (🎲)', () => {
    it('should return the correct result for a six-sided die', async () => {
      telegramFake.result = { method: 'sendDice', value: 4 };

      const result = (await diceTool.invoke({ dieEmoji: '🎲' })) as string;

      expect(telegramFake.request).toEqual({
        method: 'sendDice',
        emoji: '🎲',
        chatId: '123456789',
      });
      expect(result).toBe('Your six sided die rolled a 4.');
    });
  });

  describe('darts (🎯)', () => {
    it('should return the correct result for a dart game', async () => {
      telegramFake.result = { method: 'sendDice', value: 5 };

      const result = (await diceTool.invoke({ dieEmoji: '🎯' })) as string;

      expect(telegramFake.request).toEqual({
        method: 'sendDice',
        emoji: '🎯',
        chatId: '123456789',
      });
      expect(result).toBe('Game 🎯: You scored 5 out of max. 6 points');
    });
  });

  describe('basketball (🏀)', () => {
    it('should return the correct result for a basketball game', async () => {
      telegramFake.result = { method: 'sendDice', value: 4 };

      const result = (await diceTool.invoke({ dieEmoji: '🏀' })) as string;

      expect(telegramFake.request).toEqual({
        method: 'sendDice',
        emoji: '🏀',
        chatId: '123456789',
      });
      expect(result).toBe('Game 🏀: You scored 4 out of max. 5 points');
    });
  });

  describe('soccer (⚽️)', () => {
    it('should return the correct result for a soccer game', async () => {
      telegramFake.result = { method: 'sendDice', value: 3 };

      const result = (await diceTool.invoke({ dieEmoji: '⚽' })) as string;

      expect(telegramFake.request).toEqual({
        method: 'sendDice',
        emoji: '⚽',
        chatId: '123456789',
      });
      expect(result).toBe('Game ⚽: You scored 3 out of max. 5 points');
    });
  });

  describe('bowling (🎳)', () => {
    it('should return the correct result for a bowling game', async () => {
      telegramFake.result = { method: 'sendDice', value: 6 };

      const result = (await diceTool.invoke({ dieEmoji: '🎳' })) as string;

      expect(telegramFake.request).toEqual({
        method: 'sendDice',
        emoji: '🎳',
        chatId: '123456789',
      });
      expect(result).toBe('Game 🎳: You scored 6 out of max. 6 points');
    });
  });

  describe('slot machine (🎰)', () => {
    it('should return the correct result for a slot machine win', async () => {
      telegramFake.result = { method: 'sendDice', value: 64 };

      const result = (await diceTool.invoke({ dieEmoji: '🎰' })) as string;

      expect(telegramFake.request).toEqual({
        method: 'sendDice',
        emoji: '🎰',
        chatId: '123456789',
      });
      expect(result).toBe('Game 🎰: you won! (Reels stopped at 777)');
    });

    it('should return the correct result for a slot machine loss', async () => {
      telegramFake.result = { method: 'sendDice', value: 32 };

      const result = (await diceTool.invoke({ dieEmoji: '🎰' })) as string;

      expect(telegramFake.request).toEqual({
        method: 'sendDice',
        emoji: '🎰',
        chatId: '123456789',
      });
      expect(result).toBe('Game 🎰: you lost (reels did not stop at 777)');
    });
  });
});
