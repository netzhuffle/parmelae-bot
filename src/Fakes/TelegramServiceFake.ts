import { TelegramService } from '../TelegramService.js';
import { TelegramMessageService } from '../TelegramMessageService.js';
import { BotManagerFake } from './BotManagerFake.js';
import { ConfigFake } from './ConfigFake.js';
import * as Typegram from '@telegraf/types';
import assert from 'node:assert/strict';

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
  public sendCallArgs: {
    message: string | import('../Sticker.js').Sticker;
    chatId: bigint;
  }[] = [];
  public sendReturnData: number[] = [];
  public sendShouldThrow = false;
  public sendError: Error | null = null;

  constructor() {
    const configFake = new ConfigFake();
    const botManagerFake = new BotManagerFake(configFake);
    super(botManagerFake, undefined as unknown as TelegramMessageService);
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
      dice: { emoji, value: this.result.value },
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

  async send(
    message: string | import('../Sticker.js').Sticker,
    chatId: bigint,
  ): Promise<number> {
    this.sendCallArgs.push({ message, chatId });

    if (this.sendShouldThrow) {
      const error = this.sendError ?? new Error('Send failed');
      return Promise.reject(error);
    }

    const returnValue = this.sendReturnData.shift() ?? 123;
    return Promise.resolve(returnValue);
  }

  reset(): void {
    this.sendCallArgs = [];
    this.sendReturnData = [];
    this.sendShouldThrow = false;
    this.sendError = null;
    this.request = undefined;
    this.result = undefined;
  }
}
