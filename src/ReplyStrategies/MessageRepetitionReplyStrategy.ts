import { ReplyStrategy } from '../ReplyStrategy.js';
import { injectable } from 'inversify';
import { TelegramService } from '../TelegramService.js';
import { Sticker } from '../Sticker.js';
import { MessageModel } from '../generated/prisma/models/Message.js';

/** Repeats a message that two other users wrote. */
@injectable()
export class MessageRepetitionReplyStrategy implements ReplyStrategy {
  private lastMessage: MessageModel | null = null;

  constructor(private telegram: TelegramService) {}

  willHandle(message: MessageModel): boolean {
    if (this.lastMessage?.fromId === message.fromId) {
      // Same author: Don’t repeat.
      this.lastMessage = message;
      return false;
    }

    if (this.lastMessage?.text === message.text) {
      // Same text: Repeat.
      this.lastMessage = null;
      return true;
    }

    if (
      message.stickerFileId &&
      this.lastMessage?.stickerFileId === message.stickerFileId
    ) {
      // Same sticker: Repeat.
      this.lastMessage = null;
      return true;
    }

    // Different message: Don’t repeat.
    this.lastMessage = message;
    return false;
  }

  async handle(message: MessageModel): Promise<void> {
    if (message.stickerFileId) {
      await this.telegram.send(
        new Sticker(message.stickerFileId),
        message.chatId,
      );
      return;
    }

    await this.telegram.send(message.text, message.chatId);
  }
}
