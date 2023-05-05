import TelegramBot from 'node-telegram-bot-api';
import { injectable } from 'inversify';
import { Sticker } from './Sticker';
import { Message } from '@prisma/client';
import { MessageService } from './MessageService';
import { assert } from 'console';

/** Service to interact with Telegram. */
@injectable()
export class TelegramService {
  constructor(
    private readonly telegram: TelegramBot,
    private readonly messageService: MessageService,
  ) {}

  /**
   * Send a message or sticker.
   *
   * @param message - The text or Sticker to send.
   * @param chat - The chat to send in.
   */
  async send(message: string | Sticker, chatId: bigint): Promise<void> {
    let sentMessage: TelegramBot.Message;
    if (message instanceof Sticker) {
      sentMessage = await this.telegram.sendSticker(
        Number(chatId),
        message.fileId,
      );
    } else {
      sentMessage = await this.telegram.sendMessage(Number(chatId), message);
    }
    await this.messageService.storeSent(sentMessage);
  }

  /**
   * Sends an animated emoji landing on a random value.
   *
   * @param emoji - The animation to base on. Must be one of “🎲”, “🎯”, “🏀”, “⚽”, “🎳”, or “🎰”.
   * @param chatId - The chat to send in.
   *
   * @return The sent message.
   */
  async sendDice(emoji: string, chatId: bigint): Promise<TelegramBot.Message> {
    assert(['🎲', '🎯', '🏀', '⚽', '🎳', '🎰'].includes(emoji));
    const sentMessage = await this.telegram.sendDice(Number(chatId), {
      emoji,
    });
    await this.messageService.storeSent(sentMessage);
    return sentMessage;
  }

  /**
   * Replies to a message.
   *
   * @param reply - The text or Sticker to send.
   * @param message - The message to reply to.
   */
  async reply(reply: string | Sticker, message: Message): Promise<void> {
    let sentMessage: TelegramBot.Message;
    if (reply instanceof Sticker) {
      sentMessage = await this.telegram.sendSticker(
        Number(message.chatId),
        reply.fileId,
        {
          reply_to_message_id: message.messageId,
        },
      );
    } else {
      sentMessage = await this.telegram.sendMessage(
        Number(message.chatId),
        reply,
        { reply_to_message_id: message.messageId },
      );
    }
    await this.messageService.storeSent(sentMessage);
  }

  /**
   * Replies an image to a message.
   *
   * @param url - The image URL.
   * @param caption - The image caption.
   * @param message - The message to reply to.
   */
  async replyWithImage(
    url: string,
    caption: string,
    chatId: bigint,
  ): Promise<void> {
    const sentMessage = await this.telegram.sendPhoto(Number(chatId), url, {
      caption: caption,
    });
    await this.messageService.storeSent(sentMessage);
  }
}
