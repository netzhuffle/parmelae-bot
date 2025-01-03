import { TelegramService } from '../TelegramService.js';
import { TelegramMessageService } from '../TelegramMessageService.js';
import { Telegraf } from 'telegraf';
import * as Typegram from '@telegraf/types';
import { assert } from 'console';

export class TelegramServiceFake extends TelegramService {
  result?: { method: 'sendDice'; value: number };
  request?: { method: 'sendDice'; emoji: string; chatId: string };

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
      typeof this.result === 'object',
      'Set result before calling TelegramServiceFake sendDice',
    );
    assert(
      this.result!.method === 'sendDice',
      'Set sendDice result before calling TelegramServiceFake sendDice',
    );

    return Promise.resolve({
      message_id: 123,
      date: 1234567890,
      chat: { id: Number(chatId), type: 'group', title: 'Test Group' },
      dice: {
        emoji: emoji,
        value: this.result!.value,
      },
    });
  }
}
