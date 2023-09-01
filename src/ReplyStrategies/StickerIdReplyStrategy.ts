import { injectable } from 'inversify';
import assert from 'assert';
import { PrivateChatReplyStrategy } from '../PrivateChatReplyStrategy.js';
import { TelegramService } from '../TelegramService.js';
import { TelegramMessage } from '../Repositories/Types.js';

/** Reply with a Sticker file_id when Sticker sent in private chat. */
@injectable()
export class StickerIdReplyStrategy extends PrivateChatReplyStrategy {
  constructor(private readonly telegram: TelegramService) {
    super();
  }

  willHandlePrivate(message: TelegramMessage): boolean {
    return !!message.stickerFileId;
  }

  handle(message: TelegramMessage): Promise<void> {
    assert(message.stickerFileId);
    return this.telegram.reply(
      `Sticker file_id: ${message.stickerFileId}`,
      message,
    );
  }
}
