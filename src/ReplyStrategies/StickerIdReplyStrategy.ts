import TelegramBot from 'node-telegram-bot-api';
import { injectable } from 'inversify';
import assert from 'assert';
import { PrivateChatReplyStrategy } from '../PrivateChatReplyStrategy';
import { TelegramService } from '../TelegramService';

/** Reply with a Sticker file_id when Sticker sent in private chat. */
@injectable()
export class StickerIdReplyStrategy extends PrivateChatReplyStrategy {
  constructor(private readonly telegram: TelegramService) {
    super();
  }

  willHandlePrivate(message: TelegramBot.Message): boolean {
    return message.sticker !== undefined;
  }

  handle(message: TelegramBot.Message): Promise<void> {
    assert(message.sticker !== undefined);

    return this.telegram.reply(
      'Sticker file_id: ' + message.sticker.file_id,
      message,
    );
  }
}
