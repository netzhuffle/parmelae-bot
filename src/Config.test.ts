import { describe, beforeEach, it, expect } from 'bun:test';
import { Config } from './Config.js';

describe('Config', () => {
  const originalEnv = { ...Bun.env };

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
  });

  describe('primary bot configuration', () => {
    it('should parse primary bot from USERNAME and TELEGRAM_TOKEN', () => {
      Bun.env.USERNAME = 'testbot';
      Bun.env.TELEGRAM_TOKEN = 'test-token';

      const config = new Config();

      expect(config.primaryBot.username).toBe('testbot');
      expect(config.primaryBot.telegramToken).toBe('test-token');
      expect(config.primaryBot.defaultIdentity).toBeNull();
      expect(config.bots).toHaveLength(1);
      expect(config.bots[0]).toBe(config.primaryBot);
    });

    it('should parse primary bot with DEFAULT_IDENTITY', () => {
      Bun.env.USERNAME = 'testbot';
      Bun.env.TELEGRAM_TOKEN = 'test-token';
      Bun.env.DEFAULT_IDENTITY = 'Schi Parmelä';

      const config = new Config();

      expect(config.primaryBot.username).toBe('testbot');
      expect(config.primaryBot.telegramToken).toBe('test-token');
      expect(config.primaryBot.defaultIdentity).toBe('Schi Parmelä');
    });

    it('should throw error if USERNAME is set but TELEGRAM_TOKEN is missing', () => {
      delete Bun.env.TELEGRAM_TOKEN; // Ensure it's not set
      Bun.env.USERNAME = 'testbot';

      expect(() => new Config()).toThrow(
        'Primary bot requires both USERNAME and TELEGRAM_TOKEN to be set',
      );
    });

    it('should throw error if TELEGRAM_TOKEN is set but USERNAME is missing', () => {
      delete Bun.env.USERNAME; // Ensure it's not set
      Bun.env.TELEGRAM_TOKEN = 'test-token';

      expect(() => new Config()).toThrow(
        'Primary bot requires both USERNAME and TELEGRAM_TOKEN to be set',
      );
    });

    it('should throw error if no bots are configured', () => {
      delete Bun.env.USERNAME; // Ensure it's not set
      delete Bun.env.TELEGRAM_TOKEN; // Ensure it's not set

      expect(() => new Config()).toThrow('At least one bot must be configured');
    });
  });

  describe('additional bot configuration', () => {
    beforeEach(() => {
      Bun.env.USERNAME = 'primarybot';
      Bun.env.TELEGRAM_TOKEN = 'primary-token';
    });

    it('should parse additional bots from numbered environment variables', () => {
      Bun.env.USERNAME_2 = 'bot2';
      Bun.env.TELEGRAM_TOKEN_2 = 'token2';
      Bun.env.USERNAME_3 = 'bot3';
      Bun.env.TELEGRAM_TOKEN_3 = 'token3';

      const config = new Config();

      expect(config.bots).toHaveLength(3);
      expect(config.bots[0].username).toBe('primarybot');
      expect(config.bots[1].username).toBe('bot2');
      expect(config.bots[2].username).toBe('bot3');
    });

    it('should parse additional bots with DEFAULT_IDENTITY', () => {
      Bun.env.USERNAME_2 = 'bot2';
      Bun.env.TELEGRAM_TOKEN_2 = 'token2';
      Bun.env.DEFAULT_IDENTITY_2 = 'Emulator';

      const config = new Config();

      expect(config.bots[1].defaultIdentity).toBe('Emulator');
    });

    it('should throw error if USERNAME_2 is set but TELEGRAM_TOKEN_2 is missing', () => {
      Bun.env.USERNAME_2 = 'bot2';
      // TELEGRAM_TOKEN_2 not set

      expect(() => new Config()).toThrow(
        'Bot 2 requires both USERNAME_2 and TELEGRAM_TOKEN_2 to be set',
      );
    });

    it('should throw error if TELEGRAM_TOKEN_2 is set but USERNAME_2 is missing', () => {
      Bun.env.TELEGRAM_TOKEN_2 = 'token2';
      // USERNAME_2 not set

      expect(() => new Config()).toThrow(
        'Bot 2 requires both USERNAME_2 and TELEGRAM_TOKEN_2 to be set',
      );
    });

    it('should support up to 9 bots', () => {
      for (let i = 2; i <= 9; i++) {
        Bun.env[`USERNAME_${i}`] = `bot${i}`;
        Bun.env[`TELEGRAM_TOKEN_${i}`] = `token${i}`;
      }

      const config = new Config();

      expect(config.bots).toHaveLength(9);
      expect(config.bots[8].username).toBe('bot9');
    });
  });

  describe('duplicate username validation', () => {
    beforeEach(() => {
      Bun.env.USERNAME = 'testbot';
      Bun.env.TELEGRAM_TOKEN = 'test-token';
    });

    it('should throw error for duplicate usernames (case-insensitive)', () => {
      Bun.env.USERNAME_2 = 'TestBot'; // Same as primary but different case
      Bun.env.TELEGRAM_TOKEN_2 = 'token2'; // Required for bot 2

      expect(() => new Config()).toThrow('Duplicate bot username: TestBot');
    });

    it('should throw error for duplicate usernames in additional bots', () => {
      Bun.env.USERNAME_2 = 'bot2';
      Bun.env.TELEGRAM_TOKEN_2 = 'token2';
      Bun.env.USERNAME_3 = 'BOT2'; // Duplicate of bot2
      Bun.env.TELEGRAM_TOKEN_3 = 'token3'; // Required for bot 3

      expect(() => new Config()).toThrow('Duplicate bot username: BOT2');
    });
  });

  describe('getBotByUsername', () => {
    beforeEach(() => {
      Bun.env.USERNAME = 'primarybot';
      Bun.env.TELEGRAM_TOKEN = 'primary-token';
      Bun.env.USERNAME_2 = 'bot2';
      Bun.env.TELEGRAM_TOKEN_2 = 'token2';
    });

    it('should find bot by username (case-insensitive)', () => {
      const config = new Config();

      expect(config.getBotByUsername('primarybot')).toBe(config.primaryBot);
      expect(config.getBotByUsername('PRIMARYBOT')).toBe(config.primaryBot);
      expect(config.getBotByUsername('PrimaryBot')).toBe(config.primaryBot);
    });

    it('should find additional bots by username', () => {
      const config = new Config();

      const bot2 = config.getBotByUsername('bot2');
      expect(bot2).toBeDefined();
      expect(bot2?.username).toBe('bot2');
    });

    it('should return undefined for non-existent bot', () => {
      const config = new Config();

      expect(config.getBotByUsername('nonexistent')).toBeUndefined();
    });
  });

  describe('backwards compatibility', () => {
    it('should work with only primary bot (single bot setup)', () => {
      Bun.env.USERNAME = 'testbot';
      Bun.env.TELEGRAM_TOKEN = 'test-token';

      const config = new Config();

      expect(config.primaryBot.username).toBe('testbot');
      expect(config.bots).toHaveLength(1);
      expect(config.bots[0]).toBe(config.primaryBot);
    });
  });
});
