import TelegramBot from 'node-telegram-bot-api';
import { injectable } from 'inversify';
import { Sticker } from './Sticker';
import { Message } from '@prisma/client';
import { MessageService } from './MessageService';

/** Service to interact with Telegram */
@injectable()
export class TelegramService {
  constructor(
    private readonly telegram: TelegramBot,
    private readonly messageService: MessageService,
  ) {}

  /**
   * Send a message or sticker
   *
   * @param message - The text or Sticker to send
   * @param chat - The chat to send in
   */
  async send(message: string | Sticker, chatId: bigint): Promise<void> {
    if (message instanceof Sticker) {
      await this.telegram.sendSticker(Number(chatId), message.fileId);
    } else {
      const sentMessage = await this.telegram.sendMessage(
        Number(chatId),
        message,
      );
      await this.messageService.storeSent(sentMessage);
    }
  }

  /**
   * Replies to a message
   *
   * @param reply - The text or Sticker to send
   * @param message - The message to reply to
   */
  async reply(reply: string | Sticker, message: Message): Promise<void> {
    if (reply instanceof Sticker) {
      await this.telegram.sendSticker(Number(message.chatId), reply.fileId, {
        reply_to_message_id: message.messageId,
      });
    } else {
      const sentMessage = await this.telegram.sendMessage(
        Number(message.chatId),
        reply,
        { reply_to_message_id: message.messageId },
      );
      await this.messageService.storeSent(sentMessage);
    }
  }

  /**
   * Replies an image to a message
   *
   * @param url - The image URL
   * @param caption - The image caption
   * @param message - The message to reply to
   */
  async replyWithImage(
    url: string,
    caption: string,
    message: Message,
  ): Promise<void> {
    await this.telegram.sendPhoto(Number(message.chatId), url, {
      caption: caption,
      reply_to_message_id: message.messageId,
    });
  }
}
