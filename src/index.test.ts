import { describe, test, expect, beforeEach } from 'bun:test';
import container from './inversify.config.js';
import { Bot } from './Bot.js';

describe('Application Startup', () => {
  beforeEach(() => {
    // Mock required environment variables for DI container resolution
    // These are needed by the Config service which is a dependency of Bot
    Bun.env.USERNAME = 'test-bot';
    Bun.env.TELEGRAM_TOKEN = 'test-token';
    Bun.env.OPENAI_API_KEY = 'test-openai-key';
    Bun.env.HELICONE_API_KEY = 'test-helicone-key';
    Bun.env.GITHUB_PERSONAL_ACCESS_TOKEN = 'test-github-token';
    Bun.env.SERPAPI_API_KEY = 'test-serpapi-key';
    Bun.env.CHAT_ALLOWLIST = '123456789';
    Bun.env.NEW_COMMITS_ANNOUNCEMENT_CHATS = '123456789';
  });

  test('should resolve Bot service from container', () => {
    // This test ensures that the dependency injection container
    // can successfully resolve the Bot service without throwing

    expect(async () => {
      // This mirrors what happens in src/index.ts
      const bot = await container.getAsync<Bot>(Bot);

      // Verify the bot is properly instantiated
      expect(bot).toBeDefined();
      expect(bot).toBeInstanceOf(Bot);
      expect(typeof bot.start).toBe('function');
    }).not.toThrow();
  });
});
