import assert from 'assert';

import { injectable } from 'inversify';

import { PrivateChatReplyStrategy } from '../PrivateChatReplyStrategy.js';
import { TelegramMessage } from '../Repositories/Types.js';
import { TelegramService } from '../TelegramService.js';

/** Reply with a Sticker file_id when Sticker sent in private chat. */
@injectable()
export class StickerIdReplyStrategy extends PrivateChatReplyStrategy {
  constructor(private readonly telegram: TelegramService) {
    super();
  }

  willHandlePrivate(message: TelegramMessage): boolean {
    return !!message.stickerFileId;
  }

  async handle(message: TelegramMessage): Promise<void> {
    assert(message.stickerFileId);
    await this.telegram.replyBotText(`Sticker file_id: ${message.stickerFileId}`, message);
  }
}
