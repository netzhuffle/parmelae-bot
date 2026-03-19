import { afterEach, beforeEach, describe, expect, it, jest, spyOn } from 'bun:test';

import { BotManagerFake } from './Fakes/BotManagerFake.js';
import { ConfigFake } from './Fakes/ConfigFake.js';
import { TelegrafStub } from './Fakes/TelegrafStub.js';
import { TelegramService } from './TelegramService.js';

async function advanceTimersByTime(milliseconds: number): Promise<void> {
  jest.advanceTimersByTime(milliseconds);
  await Promise.resolve();
  await Promise.resolve();
}

describe('TelegramService model-authored text', () => {
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
    jest.useFakeTimers();
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

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends one draft update per streamed token chunk', async () => {
    const session = service.createModelTextSession(BigInt(123));

    await session.appendText('*Hallo');
    await advanceTimersByTime(0);
    expect(telegrafStub.callApiCalls).toEqual([]);
    await advanceTimersByTime(300);
    await session.appendText(' Welt*');
    await advanceTimersByTime(300);

    expect(telegrafStub.callApiCalls).toEqual([
      {
        apiMethod: 'sendMessageDraft',
        payload: {
          chat_id: '123',
          draft_id: 1,
          parse_mode: 'MarkdownV2',
          text: '*Hallo',
        },
      },
      {
        apiMethod: 'sendMessageDraft',
        payload: {
          chat_id: '123',
          draft_id: 1,
          text: 'Hallo Welt',
          entities: [
            {
              type: 'bold',
              offset: 0,
              length: 10,
            },
          ],
        },
      },
    ]);
    expect(storeCalls).toHaveLength(0);
  });

  it('stores only the final message after draft streaming', async () => {
    const session = service.createModelTextSession(BigInt(123), 777);

    await session.appendText('*Hallo');
    await advanceTimersByTime(0);
    await advanceTimersByTime(300);
    const storedId = await session.sendFinalText('*Hallo Welt*');

    expect(storedId).toBe(123);
    expect(telegrafStub.callApiCalls).toEqual([
      {
        apiMethod: 'sendMessageDraft',
        payload: {
          chat_id: '123',
          draft_id: 1,
          parse_mode: 'MarkdownV2',
          text: '*Hallo',
        },
      },
    ]);
    expect(telegrafStub.sendMessageCalls[0]).toEqual({
      chatId: '123',
      text: 'Hallo Welt',
      options: {
        entities: [
          {
            type: 'bold',
            offset: 0,
            length: 10,
          },
        ],
        reply_parameters: {
          message_id: 777,
        },
      },
    });
    expect(storeCalls).toHaveLength(1);
    expect(storeCalls[0]).toEqual(
      expect.objectContaining({
        message_id: 0,
        text: '*Hallo Welt*',
      }),
    );
  });

  it('sends the final message immediately without waiting for the next draft slot', async () => {
    const session = service.createModelTextSession(BigInt(123));

    await session.appendText('Hallo');
    await advanceTimersByTime(0);
    expect(telegrafStub.callApiCalls).toEqual([]);
    await session.appendText(' Welt');
    const storedId = await session.sendFinalText('Hallo Welt!');

    expect(storedId).toBe(123);
    expect(telegrafStub.callApiCalls).toEqual([]);
    expect(telegrafStub.sendMessageCalls).toEqual([
      {
        chatId: '123',
        text: 'Hallo Welt!',
        options: {
          parse_mode: 'MarkdownV2',
        },
      },
    ]);
  });

  it('falls back to final-only sending when drafts are rejected', async () => {
    spyOn(console, 'warn').mockImplementation(() => undefined);
    telegrafStub.callApiErrors.push(new Error('Bad Request: method not available'));
    const session = service.createModelTextSession(BigInt(123));

    await session.appendText('*Hallo');
    await advanceTimersByTime(0);
    await advanceTimersByTime(300);
    await session.appendText(' Welt*');
    await session.sendFinalText('*Hallo Welt*');

    expect(telegrafStub.callApiCalls).toHaveLength(1);
    expect(telegrafStub.sendMessageCalls).toEqual([
      {
        chatId: '123',
        text: 'Hallo Welt',
        options: {
          entities: [
            {
              type: 'bold',
              offset: 0,
              length: 10,
            },
          ],
        },
      },
    ]);
    expect(storeCalls).toHaveLength(1);
    expect(storeCalls[0]).toEqual(
      expect.objectContaining({
        message_id: 0,
        text: '*Hallo Welt*',
      }),
    );
  });

  it('retries draft updates with escaped MarkdownV2 when Telegram rejects raw markdown', async () => {
    spyOn(console, 'warn').mockImplementation(() => undefined);
    telegrafStub.callApiErrors.push(new Error("Bad Request: can't parse entities"));
    const session = service.createModelTextSession(BigInt(123));

    await session.appendText('*Hallo');
    await advanceTimersByTime(0);
    await advanceTimersByTime(300);

    expect(telegrafStub.callApiCalls).toEqual([
      {
        apiMethod: 'sendMessageDraft',
        payload: {
          chat_id: '123',
          draft_id: 1,
          parse_mode: 'MarkdownV2',
          text: '*Hallo',
        },
      },
      {
        apiMethod: 'sendMessageDraft',
        payload: {
          chat_id: '123',
          draft_id: 1,
          parse_mode: 'MarkdownV2',
          text: '\\*Hallo',
        },
      },
    ]);
  });

  it('retries final model sends with escaped MarkdownV2 when Telegram rejects raw markdown', async () => {
    telegrafStub.sendMessageErrors.push(new Error("Bad Request: can't parse entities"));
    const session = service.createModelTextSession(BigInt(123));

    await session.sendFinalText('a-b');

    expect(telegrafStub.sendMessageCalls).toEqual([
      {
        chatId: '123',
        text: 'a-b',
        options: {
          parse_mode: 'MarkdownV2',
        },
      },
      {
        chatId: '123',
        text: 'a\\-b',
        options: {
          parse_mode: 'MarkdownV2',
        },
      },
    ]);
    expect(storeCalls).toHaveLength(1);
    expect(storeCalls[0]).toEqual(
      expect.objectContaining({
        message_id: 0,
        text: 'a-b',
      }),
    );
  });

  it('uses Telegram entities for supported markdown so plain punctuation stays intact', async () => {
    const session = service.createModelTextSession(BigInt(123));

    await session.sendFinalText('*Kurze Lagebeurteilung*\n\n__Praktischer Nutzen__:\n- kurz');

    expect(telegrafStub.sendMessageCalls).toEqual([
      {
        chatId: '123',
        text: 'Kurze Lagebeurteilung\n\nPraktischer Nutzen:\n- kurz',
        options: {
          entities: [
            {
              type: 'bold',
              offset: 0,
              length: 21,
            },
            {
              type: 'underline',
              offset: 23,
              length: 18,
            },
          ],
        },
      },
    ]);
    expect(storeCalls).toHaveLength(1);
    expect(storeCalls[0]).toEqual(
      expect.objectContaining({
        message_id: 0,
        text: '*Kurze Lagebeurteilung*\n\n__Praktischer Nutzen__:\n- kurz',
      }),
    );
  });

  it('uses Telegram entities for mixed formatting without escaping plain punctuation', async () => {
    const session = service.createModelTextSession(BigInt(123));

    await session.sendFinalText(
      '*Kurze Lagebeurteilung*\n\nIch halte fest: Wer sauber kommuniziert, spart am Ende Zeit\\.\n\n__Praktischer Nutzen__: Wenn Sie möchten, schreibe ich Ihnen als Nächstes etwas *noch länger*\\.\n\n> Ein guter Text ist wie ein guter Käse\\.',
    );

    expect(telegrafStub.sendMessageCalls).toEqual([
      {
        chatId: '123',
        text: 'Kurze Lagebeurteilung\n\nIch halte fest: Wer sauber kommuniziert, spart am Ende Zeit.\n\nPraktischer Nutzen: Wenn Sie möchten, schreibe ich Ihnen als Nächstes etwas noch länger.\n\n Ein guter Text ist wie ein guter Käse.',
        options: {
          entities: [
            {
              type: 'bold',
              offset: 0,
              length: 21,
            },
            {
              type: 'underline',
              offset: 85,
              length: 18,
            },
            {
              type: 'bold',
              offset: 161,
              length: 11,
            },
            {
              type: 'blockquote',
              offset: 175,
              length: 39,
            },
          ],
        },
      },
    ]);
    expect(storeCalls).toHaveLength(1);
    expect(storeCalls[0]).toEqual(
      expect.objectContaining({
        message_id: 0,
        text: '*Kurze Lagebeurteilung*\n\nIch halte fest: Wer sauber kommuniziert, spart am Ende Zeit\\.\n\n__Praktischer Nutzen__: Wenn Sie möchten, schreibe ich Ihnen als Nächstes etwas *noch länger*\\.\n\n> Ein guter Text ist wie ein guter Käse\\.',
      }),
    );
  });

  it('resets the draft content when requested', async () => {
    const session = service.createModelTextSession(BigInt(123));

    await session.appendText('*Hallo');
    await advanceTimersByTime(0);
    await advanceTimersByTime(300);
    const resetPromise = session.reset();
    await advanceTimersByTime(300);
    await resetPromise;
    await session.appendText('Neu');
    await advanceTimersByTime(300);

    expect(telegrafStub.callApiCalls).toEqual([
      {
        apiMethod: 'sendMessageDraft',
        payload: {
          chat_id: '123',
          draft_id: 1,
          parse_mode: 'MarkdownV2',
          text: '*Hallo',
        },
      },
      {
        apiMethod: 'sendMessageDraft',
        payload: {
          chat_id: '123',
          draft_id: 1,
          parse_mode: 'MarkdownV2',
          text: '…',
        },
      },
      {
        apiMethod: 'sendMessageDraft',
        payload: {
          chat_id: '123',
          draft_id: 1,
          parse_mode: 'MarkdownV2',
          text: 'Neu',
        },
      },
    ]);
  });

  it('uses expandable blockquotes for trailing draft quotes', async () => {
    const session = service.createModelTextSession(BigInt(123));

    await session.appendText('> Zitat');
    await advanceTimersByTime(300);

    expect(telegrafStub.callApiCalls).toEqual([
      {
        apiMethod: 'sendMessageDraft',
        payload: {
          chat_id: '123',
          draft_id: 1,
          text: ' Zitat',
          entities: [
            {
              type: 'expandable_blockquote',
              offset: 0,
              length: 6,
            },
          ],
        },
      },
    ]);
  });

  it('switches draft blockquotes back to normal once later text ends the quote', async () => {
    const session = service.createModelTextSession(BigInt(123));

    await session.appendText('> Zitat');
    await advanceTimersByTime(300);
    await session.appendText('\n\nNachtrag');
    await advanceTimersByTime(300);

    expect(telegrafStub.callApiCalls).toEqual([
      {
        apiMethod: 'sendMessageDraft',
        payload: {
          chat_id: '123',
          draft_id: 1,
          text: ' Zitat',
          entities: [
            {
              type: 'expandable_blockquote',
              offset: 0,
              length: 6,
            },
          ],
        },
      },
      {
        apiMethod: 'sendMessageDraft',
        payload: {
          chat_id: '123',
          draft_id: 1,
          text: ' Zitat\n\nNachtrag',
          entities: [
            {
              type: 'blockquote',
              offset: 0,
              length: 6,
            },
          ],
        },
      },
    ]);
  });
});
