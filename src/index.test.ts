import { describe, test, expect } from 'bun:test';
import container from './inversify.config.js';
import { Bot } from './Bot.js';

describe('Application Startup', () => {
  test('should resolve Bot service from container', () => {
    // This test ensures that the dependency injection container
    // can successfully resolve the Bot service without throwing

    expect(() => {
      // This mirrors what happens in src/index.ts
      const bot = container.get<Bot>(Bot);

      // Verify the bot is properly instantiated
      expect(bot).toBeDefined();
      expect(bot).toBeInstanceOf(Bot);
      expect(typeof bot.start).toBe('function');
    }).not.toThrow();
  });
});
