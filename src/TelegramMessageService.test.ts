import { describe, beforeEach, it, expect } from 'bun:test';

import type * as Typegram from '@telegraf/types';

import { normalizeUsername } from './BotIdentityContext.js';
import type { BotConfig } from './ConfigInterfaces.js';
import { UserModel } from './generated/prisma/models/User.js';
import { MessageStorageService } from './MessageStorageService.js';
import { UnstoredMessageWithRelations } from './Repositories/Types.js';
import { TelegramMessageService } from './TelegramMessageService.js';

// Interface for accessing private methods in tests
interface TelegramMessageServiceWithPrivates {
  getUser: (user: Typegram.User) => UserModel;
}

describe('TelegramMessageService', () => {
  let service: TelegramMessageService;
  let mockMessageStorage: MessageStorageService;
  let storeCalls: unknown[];
  let mockConfig: BotConfig;

  beforeEach(() => {
    storeCalls = [];
    mockMessageStorage = {
      store: (message: UnstoredMessageWithRelations) => {
        storeCalls.push(message);
        return Promise.resolve(message as never);
      },
    } as unknown as MessageStorageService;
    const primaryBot = {
      username: 'config_bot',
      telegramToken: 'fake-token',
      defaultIdentity: null,
    };
    const bots = [primaryBot] as const;
    mockConfig = {
      primaryBot,
      bots,
      getBotByUsername: (username) => {
        const normalized = normalizeUsername(username);
        return bots.find((bot) => normalizeUsername(bot.username) === normalized);
      },
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

      const result = (service as unknown as TelegramMessageServiceWithPrivates).getUser(configBot);

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
        (service as unknown as TelegramMessageServiceWithPrivates).getUser(configBotWithWrongFlag),
      ).toThrow('Configured bot config_bot must have isBot=true in Telegram API');
    });

    it('should keep isBot=true for regular bots', () => {
      const regularBot: Typegram.User = {
        id: 456,
        is_bot: true,
        first_name: 'RegularBot',
        username: 'regular_bot',
      };

      const result = (service as unknown as TelegramMessageServiceWithPrivates).getUser(regularBot);

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

      const result = (service as unknown as TelegramMessageServiceWithPrivates).getUser(humanUser);

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
        (service as unknown as TelegramMessageServiceWithPrivates).getUser(botWithoutUsername),
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
        (service as unknown as TelegramMessageServiceWithPrivates).getUser(botWithEmptyUsername),
      ).toThrow('Bot user 888 must have a username in Telegram API');
    });

    it('should handle optional fields correctly', () => {
      const userWithOptionalFields: Typegram.User = {
        id: 111,
        is_bot: false,
        first_name: 'MinimalUser',
        // No last_name, username, or language_code
      };

      const result = (service as unknown as TelegramMessageServiceWithPrivates).getUser(
        userWithOptionalFields,
      );

      expect(result.isBot).toBe(false);
      expect(result.firstName).toBe('MinimalUser');
      expect(result.lastName).toBeNull();
      expect(result.username).toBeNull();
      expect(result.languageCode).toBeNull();
    });
  });

  describe('store', () => {
    it('should persist a text override instead of Telegram rendered text', async () => {
      await service.store(
        {
          message_id: 42,
          date: 1234567890,
          chat: {
            id: 123,
            type: 'private',
            first_name: 'Test',
          },
          from: {
            id: 456,
            is_bot: true,
            first_name: 'ConfigBot',
            username: 'config_bot',
          },
          text: 'Telegram rendered plain text',
        } as Typegram.Message.TextMessage,
        { textOverride: 'Original *Markdown* source' },
      );

      expect(storeCalls).toHaveLength(1);
      expect((storeCalls[0] as { text: string }).text).toBe('Original *Markdown* source');
    });

    it('should reconstruct incoming markdown source from Telegram entities', async () => {
      await service.store({
        message_id: 43,
        date: 1234567890,
        chat: {
          id: 123,
          type: 'private',
          first_name: 'Test',
        },
        from: {
          id: 456,
          is_bot: false,
          first_name: 'User',
          username: 'user',
        },
        text: 'Leider *nein*',
        entities: [
          {
            type: 'bold',
            offset: 0,
            length: 6,
          },
        ],
      } as Typegram.Message.TextMessage);

      expect(storeCalls).toHaveLength(1);
      expect((storeCalls[0] as { text: string }).text).toBe('*Leider* \\*nein\\*');
    });

    it('should summarize newer Telegram attachment fields for the agent', async () => {
      const attachmentCases: { message: Partial<Typegram.Message>; expectedText: string }[] = [
        {
          message: {
            checklist: {
              title: 'Einkauf',
              tasks: [
                { text: 'Milch', is_checked: true },
                { text: 'Brot', is_checked: false },
              ],
            },
          } as Partial<Typegram.Message>,
          expectedText: '[☑️ Checkliste: Einkauf]\n[x] Milch\n[ ] Brot',
        },
        {
          message: {
            paid_media: {
              star_count: 42,
              paid_media: [{ type: 'photo' }, { type: 'video' }],
            },
            caption: 'Premium',
          } as Partial<Typegram.Message>,
          expectedText: '[Bezahlmedien: 42 Sterne, photo, video]: Premium',
        },
        {
          message: {
            invoice: {
              title: 'Käse',
              description: 'Sehr gut',
              currency: 'CHF',
              total_amount: 1200,
            },
          } as Partial<Typegram.Message>,
          expectedText: '[Rechnung: Käse, 1200 CHF: Sehr gut]',
        },
        {
          message: {
            successful_payment: {
              currency: 'CHF',
              total_amount: 1200,
            },
          } as Partial<Typegram.Message>,
          expectedText: '[Zahlung erfolgreich: 1200 CHF]',
        },
        {
          message: {
            refunded_payment: {
              currency: 'CHF',
              total_amount: 1200,
            },
          } as Partial<Typegram.Message>,
          expectedText: '[Zahlung zurückerstattet: 1200 CHF]',
        },
        {
          message: {
            web_app_data: {
              button_text: 'Start',
              data: '{"ok":true}',
            },
          } as Partial<Typegram.Message>,
          expectedText: '[Web-App-Daten über "Start": {"ok":true}]',
        },
        {
          message: {
            story: {},
          } as Partial<Typegram.Message>,
          expectedText: '[Story]',
        },
        {
          message: {
            live_photo: {
              duration: 2,
            },
            caption: 'Moment',
          } as Partial<Typegram.Message>,
          expectedText: '[Live-Foto (2s)]: Moment',
        },
        {
          message: {
            giveaway_winners: {
              winner_count: 3,
              prize_description: 'Preis',
            },
          } as Partial<Typegram.Message>,
          expectedText: '[Giveaway-Gewinner: 3: Preis]',
        },
        {
          message: {
            gift: {
              gift: {
                sticker: {
                  emoji: '🎁',
                },
              },
            },
          } as Partial<Typegram.Message>,
          expectedText: '[Geschenk: 🎁]',
        },
      ];

      for (const [index, attachmentCase] of attachmentCases.entries()) {
        await service.store(createTelegramMessage(attachmentCase.message, index + 100));
      }

      expect(storeCalls.map((call) => (call as { text: string }).text)).toEqual(
        attachmentCases.map((attachmentCase) => attachmentCase.expectedText),
      );
    });

    it('should send video and video-note thumbnails to the agent as image attachments', async () => {
      await service.store(
        createTelegramMessage(
          {
            video: {
              file_id: 'video-file',
              file_unique_id: 'video-unique',
              width: 640,
              height: 480,
              duration: 12,
              thumbnail: {
                file_id: 'video-thumb',
                file_unique_id: 'video-thumb-unique',
                width: 320,
                height: 240,
              },
            },
            caption: 'Video caption',
          } as Partial<Typegram.Message>,
          200,
        ),
      );
      await service.store(
        createTelegramMessage(
          {
            video_note: {
              file_id: 'note-file',
              file_unique_id: 'note-unique',
              length: 240,
              duration: 5,
              thumbnail: {
                file_id: 'note-thumb',
                file_unique_id: 'note-thumb-unique',
                width: 240,
                height: 240,
              },
            },
          } as Partial<Typegram.Message>,
          201,
        ),
      );

      expect(
        storeCalls.map((call) => ({
          imageFileId: (call as { imageFileId: string | null }).imageFileId,
          text: (call as { text: string }).text,
        })),
      ).toEqual([
        {
          imageFileId: 'video-thumb',
          text: '[🎬: 12 Sekunden]: Video caption',
        },
        {
          imageFileId: 'note-thumb',
          text: '[Video-Nachricht: 5 Sekunden]',
        },
      ]);
    });
  });
});

function createTelegramMessage(fields: Partial<Typegram.Message>, messageId = 1): Typegram.Message {
  return {
    message_id: messageId,
    date: 1234567890,
    chat: {
      id: 123,
      type: 'private',
      first_name: 'Test',
    },
    from: {
      id: 456,
      is_bot: false,
      first_name: 'User',
      username: 'user',
    },
    ...fields,
  } as Typegram.Message;
}
