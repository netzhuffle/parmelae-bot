import { TelegramService } from '../TelegramService.js';
import { TelegramMessageService } from '../TelegramMessageService.js';
import { Telegraf } from 'telegraf';
import * as Typegram from '@telegraf/types';
import { assert } from 'console';

export class TelegramServiceFake extends TelegramService {
  result?: {
    method: 'sendDice';
    value: number;
  };
  request?:
    | {
        method: 'sendDice';
        emoji: string;
        chatId: string;
      }
    | {
        method: 'sendImage';
        url: string;
        caption: string;
        chatId: string;
      };

  constructor() {
    super(
      undefined as unknown as Telegraf,
      undefined as unknown as TelegramMessageService,
    );
  }

  async sendDice(
    emoji: string,
    chatId: bigint,
  ): Promise<Typegram.Message.DiceMessage> {
    this.request = { method: 'sendDice', emoji, chatId: chatId.toString() };

    assert(
      this.result?.method === 'sendDice',
      'Set sendDice result before calling TelegramServiceFake sendDice',
    );

    return Promise.resolve({
      message_id: 123,
      date: 1234567890,
      chat: { id: Number(chatId), type: 'group', title: 'Test Group' },
      dice: { emoji, value: this.result!.value },
    });
  }

  async replyWithImage(
    url: string,
    caption: string,
    chatId: bigint,
  ): Promise<void> {
    this.request = {
      method: 'sendImage',
      url,
      caption,
      chatId: chatId.toString(),
    };
    return Promise.resolve();
  }

  async getFileUrl(fileId: string): Promise<string> {
    return Promise.resolve(`https://fake-telegram-file-url.com/${fileId}`);
  }
}
