import assert from 'node:assert/strict';

import * as Typegram from '@telegraf/types';
import { injectable } from 'inversify';
import { Telegraf } from 'telegraf';

import { BotManager } from './BotManager.js';
import { TelegramMessage } from './Repositories/Types.js';
import { Sticker } from './Sticker.js';
import {
  containsSupportedMarkdownV2,
  hasPotentialMarkdownV2,
  isValidSupportedMarkdownV2,
  renderSupportedMarkdownV2,
} from './TelegramMarkdownV2.js';
import { TelegramMessageService } from './TelegramMessageService.js';

/** Service to interact with Telegram. */
@injectable()
export class TelegramService {
  private readonly primaryTelegraf: Telegraf;
  private readonly markdownParseMode = 'MarkdownV2' as const;

  constructor(
    private readonly botManager: BotManager,
    private readonly messageService: TelegramMessageService,
  ) {
    this.primaryTelegraf = this.botManager.getPrimaryBot();
  }

  /**
   * Display typing.
   *
   * @param chat - The chat to be typing in.
   */
  async sendTyping(chatId: bigint): Promise<void> {
    await this.primaryTelegraf.telegram.sendChatAction(chatId.toString(), 'typing');
  }

  /**
   * Send a message or sticker and stores the message in the database.
   *
   * @param message - The text or Sticker to send.
   * @param chat - The chat to send in.
   * @return The database message ID.
   */
  async send(message: string | Sticker, chatId: bigint): Promise<number> {
    const sentMessage = await this.sendWithoutStoring(message, chatId);
    const storedMessage = await this.messageService.store(sentMessage);
    return storedMessage.id;
  }

  /**
   * Send bot-authored text, using MarkdownV2 only when the message intentionally contains
   * valid supported Markdown.
   *
   * @param text - The text to send.
   * @param chatId - The chat to send in.
   * @return The database message ID.
   */
  async sendBotText(text: string, chatId: bigint): Promise<number> {
    const sentMessage = await this.sendTelegramBotText(text, chatId);
    const storedMessage = await this.messageService.store(sentMessage.message, {
      textOverride: sentMessage.storedText,
    });
    return storedMessage.id;
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
      return this.primaryTelegraf.telegram.sendSticker(chatId.toString(), message.fileId);
    } else {
      return this.primaryTelegraf.telegram.sendMessage(chatId.toString(), message);
    }
  }

  /**
   * Send bot-authored text without storing it, using MarkdownV2 only when valid.
   *
   * @param text - The text to send.
   * @param chatId - The chat to send in.
   */
  async sendBotTextWithoutStoring(
    text: string,
    chatId: bigint,
  ): Promise<Typegram.Message.TextMessage> {
    const sentMessage = await this.sendTelegramBotText(text, chatId);
    return sentMessage.message;
  }

  /**
   * Sends an animated emoji landing on a random value.
   *
   * @param emoji - The animation to base on. Must be one of “🎲”, “🎯”, “🏀”, “⚽”, “🎳”, or “🎰”.
   * @param chatId - The chat to send in.
   *
   * @return The sent message.
   */
  async sendDice(emoji: string, chatId: bigint): Promise<Typegram.Message.DiceMessage> {
    assert(['🎲', '🎯', '🏀', '⚽', '🎳', '🎰'].includes(emoji));
    const sentMessage = await this.primaryTelegraf.telegram.sendDice(chatId.toString(), {
      emoji,
    });
    await this.messageService.store(sentMessage);
    return sentMessage;
  }

  /**
   * Replies to a message.
   *
   * @param reply - The text or Sticker to send.
   * @param message - The message to reply to.
   * @return The database message ID of the reply.
   */
  async reply(reply: string | Sticker, message: TelegramMessage): Promise<number> {
    let sentMessage: Typegram.Message.TextMessage | Typegram.Message.StickerMessage;
    if (reply instanceof Sticker) {
      sentMessage = await this.primaryTelegraf.telegram.sendSticker(
        message.chatId.toString(),
        reply.fileId,
        {
          reply_parameters: {
            message_id: message.telegramMessageId,
          },
        },
      );
    } else {
      sentMessage = await this.primaryTelegraf.telegram.sendMessage(
        message.chatId.toString(),
        reply,
        {
          reply_parameters: {
            message_id: message.telegramMessageId,
          },
        },
      );
    }
    const storedMessage = await this.messageService.store(sentMessage);
    return storedMessage.id;
  }

  /**
   * Replies with bot-authored text, using MarkdownV2 only when the text intentionally contains
   * valid supported Markdown.
   *
   * @param reply - The text to send.
   * @param message - The message to reply to.
   * @return The database message ID of the reply.
   */
  async replyBotText(reply: string, message: TelegramMessage): Promise<number> {
    const sentMessage = await this.sendTelegramBotText(
      reply,
      message.chatId,
      message.telegramMessageId,
    );
    const storedMessage = await this.messageService.store(sentMessage.message, {
      textOverride: sentMessage.storedText,
    });
    return storedMessage.id;
  }

  /**
   * Replies an image to a message.
   *
   * @param url - The image URL.
   * @param caption - The image caption.
   * @param message - The message to reply to.
   */
  async replyWithImage(url: string, caption: string, chatId: bigint): Promise<void> {
    const sentMessage = await this.primaryTelegraf.telegram.sendPhoto(chatId.toString(), url, {
      caption: caption,
    });
    await this.messageService.store(sentMessage);
  }

  /** Returns the URL for a Telegram file id. */
  async getFileUrl(fileId: string): Promise<string> {
    const link = await this.primaryTelegraf.telegram.getFileLink(fileId);
    return link.href;
  }

  private async sendTelegramBotText(
    text: string,
    chatId: bigint,
    replyToMessageId?: number,
  ): Promise<{ message: Typegram.Message.TextMessage; storedText: string }> {
    const replyParameters =
      replyToMessageId === undefined
        ? undefined
        : {
            reply_parameters: {
              message_id: replyToMessageId,
            },
          };

    if (!containsSupportedMarkdownV2(text)) {
      if (hasPotentialMarkdownV2(text)) {
        console.warn(
          'MarkdownV2 was detected but failed local validation. Falling back to plaintext.',
        );
      }
      return {
        message: await this.primaryTelegraf.telegram.sendMessage(
          chatId.toString(),
          text,
          replyParameters,
        ),
        storedText: text,
      };
    }

    if (!isValidSupportedMarkdownV2(text)) {
      console.warn(
        'MarkdownV2 was detected but failed local validation. Falling back to plaintext.',
      );
      return {
        message: await this.primaryTelegraf.telegram.sendMessage(
          chatId.toString(),
          text,
          replyParameters,
        ),
        storedText: text,
      };
    }

    const renderedText = renderSupportedMarkdownV2(text);
    if (renderedText === null) {
      console.warn(
        'MarkdownV2 was detected but could not be rendered safely. Falling back to plaintext.',
      );
      return {
        message: await this.primaryTelegraf.telegram.sendMessage(
          chatId.toString(),
          text,
          replyParameters,
        ),
        storedText: text,
      };
    }

    try {
      return {
        message: await this.primaryTelegraf.telegram.sendMessage(chatId.toString(), renderedText, {
          ...replyParameters,
          parse_mode: this.markdownParseMode,
        }),
        storedText: text,
      };
    } catch (error) {
      if (!this.isTelegramMarkdownParseError(error)) {
        throw error;
      }
      console.warn('Telegram rejected MarkdownV2 message. Retrying as plaintext.');
      return {
        message: await this.primaryTelegraf.telegram.sendMessage(
          chatId.toString(),
          text,
          replyParameters,
        ),
        storedText: text,
      };
    }
  }

  private isTelegramMarkdownParseError(error: unknown): error is Error {
    return (
      error instanceof Error &&
      (error.message.includes('parse entities') ||
        error.message.includes('parse_entity') ||
        error.message.includes("can't parse entities"))
    );
  }
}
