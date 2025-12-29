import { describe, beforeEach, it, expect } from 'bun:test';
import { TelegramMessageService } from './TelegramMessageService.js';
import { MessageStorageService } from './MessageStorageService.js';
import type { BotConfig } from './ConfigInterfaces.js';
import { ConfigFake } from './Fakes/ConfigFake.js';
import { UserModel } from './generated/prisma/models/User.js';
import * as Typegram from '@telegraf/types';

// Interface for accessing private methods in tests
interface TelegramMessageServiceWithPrivates {
  getUser: (user: Typegram.User) => UserModel;
}

describe('TelegramMessageService', () => {
  let service: TelegramMessageService;
  let mockMessageStorage: MessageStorageService;
  let mockConfig: BotConfig;

  beforeEach(() => {
    mockMessageStorage = {} as MessageStorageService;
    const configFake = new ConfigFake();
    // Create a custom config with the username needed for these tests
    const primaryBot = {
      username: 'config_bot',
      telegramToken: 'fake-token',
      defaultIdentity: null,
    };
    mockConfig = {
      ...configFake,
      primaryBot,
      bots: [primaryBot],
      getBotByUsername: configFake.getBotByUsername.bind({
        ...configFake,
        primaryBot,
        bots: [primaryBot],
      }),
    };
    service = new TelegramMessageService(mockMessageStorage, mockConfig);
  });

  describe('getUser', () => {
    it('should accept config bot when Telegram API correctly marks it as bot', () => {
      const configBot: Typegram.User = {
        id: 123,
        is_bot: true, // Configured bot must be marked as bot in Telegram API
        first_name: 'ConfigBot',
        username: 'config_bot', // Same as config.primaryBot.username
      };

      const result = (
        service as unknown as TelegramMessageServiceWithPrivates
      ).getUser(configBot);

      expect(result.isBot).toBe(true);
      expect(result.username).toBe('config_bot');
      expect(result.id).toBe(BigInt(123));
      expect(result.firstName).toBe('ConfigBot');
    });

    it('should assert when config bot is not marked as bot in Telegram API', () => {
      const configBotWithWrongFlag: Typegram.User = {
        id: 123,
        is_bot: false, // This violates the invariant
        first_name: 'ConfigBot',
        username: 'config_bot', // Same as config.primaryBot.username
      };

      expect(() =>
        (service as unknown as TelegramMessageServiceWithPrivates).getUser(
          configBotWithWrongFlag,
        ),
      ).toThrow(
        'Configured bot config_bot must have isBot=true in Telegram API',
      );
    });

    it('should keep isBot=true for regular bots', () => {
      const regularBot: Typegram.User = {
        id: 456,
        is_bot: true,
        first_name: 'RegularBot',
        username: 'regular_bot',
      };

      const result = (
        service as unknown as TelegramMessageServiceWithPrivates
      ).getUser(regularBot);

      expect(result.isBot).toBe(true);
      expect(result.username).toBe('regular_bot');
      expect(result.id).toBe(BigInt(456));
    });

    it('should keep isBot=false for human users', () => {
      const humanUser: Typegram.User = {
        id: 789,
        is_bot: false,
        first_name: 'John',
        username: 'john_doe',
      };

      const result = (
        service as unknown as TelegramMessageServiceWithPrivates
      ).getUser(humanUser);

      expect(result.isBot).toBe(false);
      expect(result.username).toBe('john_doe');
      expect(result.id).toBe(BigInt(789));
    });

    it('should assert when bot has no username', () => {
      const botWithoutUsername: Typegram.User = {
        id: 999,
        is_bot: true,
        first_name: 'BotWithoutUsername',
        username: undefined, // Missing username violates invariant
      };

      expect(() =>
        (service as unknown as TelegramMessageServiceWithPrivates).getUser(
          botWithoutUsername,
        ),
      ).toThrow('Bot user 999 must have a username in Telegram API');
    });

    it('should assert when bot has empty username', () => {
      const botWithEmptyUsername: Typegram.User = {
        id: 888,
        is_bot: true,
        first_name: 'BotWithEmptyUsername',
        username: '', // Empty username violates invariant
      };

      expect(() =>
        (service as unknown as TelegramMessageServiceWithPrivates).getUser(
          botWithEmptyUsername,
        ),
      ).toThrow('Bot user 888 must have a username in Telegram API');
    });

    it('should handle optional fields correctly', () => {
      const userWithOptionalFields: Typegram.User = {
        id: 111,
        is_bot: false,
        first_name: 'MinimalUser',
        // No last_name, username, or language_code
      };

      const result = (
        service as unknown as TelegramMessageServiceWithPrivates
      ).getUser(userWithOptionalFields);

      expect(result.isBot).toBe(false);
      expect(result.firstName).toBe('MinimalUser');
      expect(result.lastName).toBeNull();
      expect(result.username).toBeNull();
      expect(result.languageCode).toBeNull();
    });
  });
});
