import { injectable } from 'inversify';
import { Sticker } from './Sticker';
import { Message } from '@prisma/client';
import { MessageService } from './MessageService';
import { assert } from 'console';
import { Telegraf } from 'telegraf';
import * as Typegram from 'telegraf/typings/core/types/typegram';

/** Service to interact with Telegram. */
@injectable()
export class TelegramService {
  constructor(
    private readonly telegraf: Telegraf,
    private readonly messageService: MessageService,
  ) {}

  /**
   * Send a message or sticker and stores the message in the database.
   *
   * @param message - The text or Sticker to send.
   * @param chat - The chat to send in.
   */
  async send(message: string | Sticker, chatId: bigint): Promise<void> {
    const sentMessage = await this.sendWithoutStoring(message, chatId);
    await this.messageService.storeSent(sentMessage);
  }

  /**
   * Send a message or sticker and without storing in the database.
   *
   * @param message - The text or Sticker to send.
   * @param chat - The chat to send in.
   */
  async sendWithoutStoring(
    message: string | Sticker,
    chatId: bigint,
  ): Promise<Typegram.Message.StickerMessage | Typegram.Message.TextMessage> {
    if (message instanceof Sticker) {
      return this.telegraf.telegram.sendSticker(
        chatId.toString(),
        message.fileId,
      );
    } else {
      return this.telegraf.telegram.sendMessage(chatId.toString(), message);
    }
  }

  /**
   * Sends an animated emoji landing on a random value.
   *
   * @param emoji - The animation to base on. Must be one of “🎲”, “🎯”, “🏀”, “⚽”, “🎳”, or “🎰”.
   * @param chatId - The chat to send in.
   *
   * @return The sent message.
   */
  async sendDice(
    emoji: string,
    chatId: bigint,
  ): Promise<Typegram.Message.DiceMessage> {
    assert(['🎲', '🎯', '🏀', '⚽', '🎳', '🎰'].includes(emoji));
    const sentMessage = await this.telegraf.telegram.sendDice(
      chatId.toString(),
      {
        emoji,
      },
    );
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
    let sentMessage:
      | Typegram.Message.TextMessage
      | Typegram.Message.StickerMessage;
    if (reply instanceof Sticker) {
      sentMessage = await this.telegraf.telegram.sendSticker(
        message.chatId.toString(),
        reply.fileId,
        {
          reply_to_message_id: message.messageId,
        },
      );
    } else {
      sentMessage = await this.telegraf.telegram.sendMessage(
        message.chatId.toString(),
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
    const sentMessage = await this.telegraf.telegram.sendPhoto(
      chatId.toString(),
      url,
      {
        caption: caption,
      },
    );
    await this.messageService.storeSent(sentMessage);
  }
}
