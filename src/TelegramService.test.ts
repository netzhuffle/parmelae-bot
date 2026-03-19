import { beforeEach, describe, expect, it, spyOn } from 'bun:test';

import { BotManagerFake } from './Fakes/BotManagerFake.js';
import { ConfigFake } from './Fakes/ConfigFake.js';
import { TelegrafStub } from './Fakes/TelegrafStub.js';
import { TelegramMessage } from './Repositories/Types.js';
import { TelegramService } from './TelegramService.js';

describe('TelegramService bot text formatting', () => {
  let service: TelegramService;
  let telegrafStub: TelegrafStub;
  let storeCalls: { message_id: number; text?: string }[];
  let messageService: {
    store: (
      message: { message_id: number; text?: string },
      options?: { textOverride?: string },
    ) => Promise<{ id: number }>;
  };

  beforeEach(() => {
    const config = new ConfigFake();
    const botManager = new BotManagerFake(config);
    telegrafStub = botManager.getPrimaryBot() as unknown as TelegrafStub;
    storeCalls = [];
    messageService = {
      store: async (message, options) => {
        storeCalls.push({ ...message, text: options?.textOverride ?? message.text });
        return { id: 123 };
      },
    };
    service = new TelegramService(
      botManager,
      messageService as unknown as import('./TelegramMessageService.js').TelegramMessageService,
    );
  });

  it('sends plaintext when no markdown is present', async () => {
    await service.sendBotText('Guten Tag miteinander', BigInt(123));

    expect(telegrafStub.sendMessageCalls).toHaveLength(1);
    expect(telegrafStub.sendMessageCalls[0]?.options?.parse_mode).toBeUndefined();
  });

  it('sends rendered MarkdownV2 when supported markdown is present', async () => {
    await service.sendBotText('Gerne. *Guten Tag*.', BigInt(123));

    expect(telegrafStub.sendMessageCalls).toHaveLength(1);
    expect(telegrafStub.sendMessageCalls[0]?.options?.parse_mode).toBe('MarkdownV2');
    expect(telegrafStub.sendMessageCalls[0]?.text).toBe('Gerne\\. *Guten Tag*\\.');
    expect(storeCalls[0]?.text).toBe('Gerne. *Guten Tag*.');
  });

  it('sends full MarkdownV2 features including mentions and date-time links', async () => {
    await service.sendBotText(
      '**>Hinweis\n>mit __Unterstreichung__||\n![morgen](tg://time?unix=1647531900&format=t)\n[Hans](tg://user?id=123456789)',
      BigInt(123),
    );

    expect(telegrafStub.sendMessageCalls).toHaveLength(1);
    expect(telegrafStub.sendMessageCalls[0]?.options?.parse_mode).toBe('MarkdownV2');
    expect(telegrafStub.sendMessageCalls[0]?.text).toBe(
      '**>Hinweis\n>mit __Unterstreichung__||\n![morgen](tg://time?unix=1647531900&format=t)\n[Hans](tg://user?id=123456789)',
    );
  });

  it('falls back to plaintext when markdown is locally invalid', async () => {
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => undefined);

    await service.sendBotText('*Guten Tag', BigInt(123));

    expect(telegrafStub.sendMessageCalls).toHaveLength(1);
    expect(telegrafStub.sendMessageCalls[0]?.options?.parse_mode).toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('retries as plaintext when Telegram rejects markdown', async () => {
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => undefined);
    telegrafStub.sendMessageErrors.push(new Error("Bad Request: can't parse entities"));

    await service.sendBotText('*Guten Tag*', BigInt(123));

    expect(telegrafStub.sendMessageCalls).toHaveLength(2);
    expect(telegrafStub.sendMessageCalls[0]?.options?.parse_mode).toBe('MarkdownV2');
    expect(telegrafStub.sendMessageCalls[1]?.options?.parse_mode).toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('rethrows unrelated Telegram send errors', async () => {
    telegrafStub.sendMessageErrors.push(new Error('Bad Request: chat not found'));

    try {
      await service.sendBotText('*Guten Tag*', BigInt(123));
      expect.unreachable('Expected sendBotText to throw for unrelated Telegram errors.');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('chat not found');
    }
  });

  it('uses reply parameters for bot reply markdown sends', async () => {
    await service.replyBotText('*Guten Tag*', {
      chatId: BigInt(123),
      telegramMessageId: 777,
    } as TelegramMessage);

    expect(telegrafStub.sendMessageCalls).toHaveLength(1);
    expect(telegrafStub.sendMessageCalls[0]?.options).toEqual({
      parse_mode: 'MarkdownV2',
      reply_parameters: {
        message_id: 777,
      },
    });
    expect(storeCalls[0]?.text).toBe('*Guten Tag*');
  });
});
