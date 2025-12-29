import * as Typegram from '@telegraf/types';

/**
 * Lightweight stub for Telegraf instances in tests.
 * Implements only the methods actually used by the codebase.
 */
export class TelegrafStub {
  public readonly telegram: {
    sendChatAction: (chatId: string, action: string) => Promise<boolean>;
    sendSticker: (
      chatId: string,
      fileId: string,
      options?: { reply_to_message_id?: number },
    ) => Promise<Typegram.Message.StickerMessage>;
    sendMessage: (
      chatId: string,
      text: string,
      options?: { reply_to_message_id?: number },
    ) => Promise<Typegram.Message.TextMessage>;
    sendDice: (
      chatId: string,
      options?: { emoji?: string; reply_to_message_id?: number },
    ) => Promise<Typegram.Message.DiceMessage>;
    sendPhoto: (
      chatId: string,
      url: string,
      options?: { caption?: string; reply_to_message_id?: number },
    ) => Promise<Typegram.Message.PhotoMessage>;
    getFileLink: (fileId: string) => Promise<URL>;
    getMyName: () => Promise<{ name: string }>;
  };

  constructor() {
    const privateChat: Typegram.Chat.PrivateChat = {
      id: 0,
      type: 'private',
      first_name: 'Test',
    };

    this.telegram = {
      sendChatAction: async () => {
        return await Promise.resolve(true);
      },
      sendSticker: async () => {
        return await Promise.resolve({
          message_id: 0,
          date: 0,
          chat: privateChat,
          sticker: {
            file_id: '',
            file_unique_id: '',
            type: 'regular',
            width: 0,
            height: 0,
            is_animated: false,
            is_video: false,
          },
        } as Typegram.Message.StickerMessage);
      },
      sendMessage: async () => {
        return await Promise.resolve({
          message_id: 0,
          date: 0,
          chat: privateChat,
          text: '',
        } as Typegram.Message.TextMessage);
      },
      sendDice: async () => {
        return await Promise.resolve({
          message_id: 0,
          date: 0,
          chat: privateChat,
          dice: { emoji: '🎲', value: 1 },
        } as Typegram.Message.DiceMessage);
      },
      sendPhoto: async () => {
        return await Promise.resolve({
          message_id: 0,
          date: 0,
          chat: privateChat,
          photo: [],
        } as Typegram.Message.PhotoMessage);
      },
      getFileLink: async () => {
        return await Promise.resolve(
          new URL('https://fake-telegram-file-url.com/'),
        );
      },
      getMyName: async () => {
        return await Promise.resolve({ name: 'testbot' });
      },
    };
  }

  // Event listener methods (no-op in tests)
  on(): this {
    return this;
  }

  catch(): this {
    return this;
  }

  launch(): Promise<void> {
    return Promise.resolve();
  }
}
