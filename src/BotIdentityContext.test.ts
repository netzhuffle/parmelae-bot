import { describe, it, expect } from 'bun:test';
import {
  BotIdentityContext,
  validateBotIdentityContext,
  normalizeUsername,
} from './BotIdentityContext.js';

describe('BotIdentityContext', () => {
  describe('validateBotIdentityContext', () => {
    it('should accept valid bot identity context', () => {
      const validContext: BotIdentityContext = { username: 'test_bot' };

      expect(() => validateBotIdentityContext(validContext)).not.toThrow();
    });

    it('should throw for empty username', () => {
      const invalidContext: BotIdentityContext = { username: '' };

      expect(() => validateBotIdentityContext(invalidContext)).toThrow(
        'BotIdentityContext.username must be non-empty',
      );
    });

    it('should throw for whitespace-only username', () => {
      const invalidContext: BotIdentityContext = { username: '   ' };

      expect(() => validateBotIdentityContext(invalidContext)).toThrow(
        'BotIdentityContext.username must be non-empty',
      );
    });

    it('should accept username with valid characters', () => {
      const validContext: BotIdentityContext = { username: 'my_bot_123' };

      expect(() => validateBotIdentityContext(validContext)).not.toThrow();
    });
  });

  describe('normalizeUsername', () => {
    it('should convert username to lowercase', () => {
      expect(normalizeUsername('TestBot')).toBe('testbot');
      expect(normalizeUsername('TEST_BOT')).toBe('test_bot');
    });

    it('should trim whitespace', () => {
      expect(normalizeUsername('  testbot  ')).toBe('testbot');
      expect(normalizeUsername('\ttestbot\n')).toBe('testbot');
    });

    it('should handle empty and whitespace-only strings', () => {
      expect(normalizeUsername('')).toBe('');
      expect(normalizeUsername('   ')).toBe('');
    });

    it('should handle mixed case and whitespace', () => {
      expect(normalizeUsername('  TestBot_123  ')).toBe('testbot_123');
    });
  });
});
