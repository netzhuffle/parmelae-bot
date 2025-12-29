import { describe, beforeEach, it, expect } from 'bun:test';
import { BotManager } from './BotManager.js';
import { Config } from './Config.js';
import { Telegraf } from 'telegraf';

describe('BotManager', () => {
  const originalEnv = { ...Bun.env };
  let config: Config;

  beforeEach(() => {
    // Reset environment to original state
    Object.keys(Bun.env).forEach((key) => {
      delete Bun.env[key];
    });
    Object.assign(Bun.env, originalEnv);

    // Set required environment variables
    Bun.env.OPENAI_API_KEY = 'test-openai-key';
    Bun.env.HELICONE_API_KEY = 'test-helicone-key';
    Bun.env.GITHUB_PERSONAL_ACCESS_TOKEN = 'test-github-token';
    Bun.env.SERPAPI_API_KEY = 'test-serpapi-key';
    Bun.env.CHAT_ALLOWLIST = '123,456';
    Bun.env.NEW_COMMITS_ANNOUNCEMENT_CHATS = '789';

    // Set primary bot
    Bun.env.USERNAME = 'primarybot';
    Bun.env.TELEGRAM_TOKEN = 'primary-token';

    config = new Config();
  });

  describe('initialization', () => {
    it('should create BotManager with primary bot', () => {
      const botManager = new BotManager(config);

      expect(botManager.getPrimaryBot()).toBeInstanceOf(Telegraf);
      expect(botManager.getAllBots()).toHaveLength(1);
    });

    it('should create BotManager with multiple bots', () => {
      Bun.env.USERNAME_2 = 'bot2';
      Bun.env.TELEGRAM_TOKEN_2 = 'token2';
      Bun.env.USERNAME_3 = 'bot3';
      Bun.env.TELEGRAM_TOKEN_3 = 'token3';

      const multiBotConfig = new Config();
      const botManager = new BotManager(multiBotConfig);

      expect(botManager.getAllBots()).toHaveLength(3);
    });
  });

  describe('getPrimaryBot', () => {
    it('should return primary bot Telegraf instance', () => {
      const botManager = new BotManager(config);

      const primaryBot = botManager.getPrimaryBot();
      expect(primaryBot).toBeInstanceOf(Telegraf);
    });

    it('should return same instance on multiple calls', () => {
      const botManager = new BotManager(config);

      const bot1 = botManager.getPrimaryBot();
      const bot2 = botManager.getPrimaryBot();

      expect(bot1).toBe(bot2);
    });
  });

  describe('getBot', () => {
    beforeEach(() => {
      Bun.env.USERNAME_2 = 'bot2';
      Bun.env.TELEGRAM_TOKEN_2 = 'token2';
      config = new Config();
    });

    it('should return bot by username (case-insensitive)', () => {
      const botManager = new BotManager(config);

      const bot1 = botManager.getBot('primarybot');
      const bot2 = botManager.getBot('PRIMARYBOT');
      const bot3 = botManager.getBot('PrimaryBot');

      expect(bot1).toBe(bot2);
      expect(bot2).toBe(bot3);
      expect(bot1).toBeInstanceOf(Telegraf);
    });

    it('should return different bots for different usernames', () => {
      const botManager = new BotManager(config);

      const primaryBot = botManager.getBot('primarybot');
      const bot2 = botManager.getBot('bot2');

      expect(primaryBot).not.toBe(bot2);
      expect(primaryBot).toBeInstanceOf(Telegraf);
      expect(bot2).toBeInstanceOf(Telegraf);
    });

    it('should throw assertion error for non-existent bot', () => {
      const botManager = new BotManager(config);

      expect(() => botManager.getBot('nonexistent')).toThrow(
        'Bot with username "nonexistent" must be configured',
      );
    });
  });

  describe('getAllBots', () => {
    it('should return all bot instances', () => {
      Bun.env.USERNAME_2 = 'bot2';
      Bun.env.TELEGRAM_TOKEN_2 = 'token2';
      const multiBotConfig = new Config();
      const botManager = new BotManager(multiBotConfig);

      const allBots = botManager.getAllBots();

      expect(allBots).toHaveLength(2);
      allBots.forEach((bot) => {
        expect(bot).toBeInstanceOf(Telegraf);
      });
    });

    it('should include primary bot in all bots', () => {
      const botManager = new BotManager(config);

      const allBots = botManager.getAllBots();
      const primaryBot = botManager.getPrimaryBot();

      expect(allBots).toContain(primaryBot);
    });
  });

  describe('getNormalizedBotUsernames', () => {
    it('should return all bot usernames (normalized)', () => {
      Bun.env.USERNAME_2 = 'Bot2';
      Bun.env.TELEGRAM_TOKEN_2 = 'token2';
      const multiBotConfig = new Config();
      const botManager = new BotManager(multiBotConfig);

      const usernames = botManager.getNormalizedBotUsernames();

      expect(usernames).toHaveLength(2);
      expect(usernames).toContain('primarybot'); // normalized
      expect(usernames).toContain('bot2'); // normalized
    });
  });

  describe('isConfiguredBot', () => {
    beforeEach(() => {
      Bun.env.USERNAME_2 = 'bot2';
      Bun.env.TELEGRAM_TOKEN_2 = 'token2';
      config = new Config();
    });

    it('should return true for configured bots (case-insensitive)', () => {
      const botManager = new BotManager(config);

      expect(botManager.isConfiguredBot('primarybot')).toBe(true);
      expect(botManager.isConfiguredBot('PRIMARYBOT')).toBe(true);
      expect(botManager.isConfiguredBot('PrimaryBot')).toBe(true);
      expect(botManager.isConfiguredBot('bot2')).toBe(true);
      expect(botManager.isConfiguredBot('BOT2')).toBe(true);
    });

    it('should return false for non-configured bots', () => {
      const botManager = new BotManager(config);

      expect(botManager.isConfiguredBot('nonexistent')).toBe(false);
    });
  });
});
