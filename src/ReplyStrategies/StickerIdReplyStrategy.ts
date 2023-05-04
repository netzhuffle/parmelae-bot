import { injectable } from 'inversify';
import assert from 'assert';
import { PrivateChatReplyStrategy } from '../PrivateChatReplyStrategy';
import { TelegramService } from '../TelegramService';
import { Message } from '@prisma/client';

/** Reply with a Sticker file_id when Sticker sent in private chat. */
@injectable()
export class StickerIdReplyStrategy extends PrivateChatReplyStrategy {
  constructor(private readonly telegram: TelegramService) {
    super();
  }

  willHandlePrivate(message: Message): boolean {
    return !!message.stickerFileId;
  }

  handle(message: Message): Promise<void> {
    assert(message.stickerFileId);
    return this.telegram.reply(
      `Sticker file_id: ${message.stickerFileId}`,
      message,
    );
  }
}
