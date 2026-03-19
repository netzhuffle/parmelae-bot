import assert from 'node:assert/strict';

import * as Typegram from '@telegraf/types';
import { injectable } from 'inversify';
import { Telegraf } from 'telegraf';

import { BotManager } from './BotManager.js';
import { TelegramMessage } from './Repositories/Types.js';
import { Sticker } from './Sticker.js';
import { FinalizableStreamingTextSink } from './StreamingTextSink.js';
import {
  containsSupportedMarkdownV2,
  escapeTelegramMarkdownV2,
  hasPotentialMarkdownV2,
  isValidSupportedMarkdownV2,
  renderSupportedMarkdownV2,
  renderSupportedTelegramDraftEntities,
  renderSupportedTelegramEntities,
} from './TelegramMarkdownV2.js';
import { TelegramMessageService } from './TelegramMessageService.js';

interface SendMessageDraftPayload {
  chat_id: string;
  draft_id: number;
  text: string;
  entities?: Typegram.MessageEntity[];
  parse_mode?: 'MarkdownV2';
}

const DRAFT_UPDATE_INTERVAL_MS = 50;

class TelegramDraftSession implements FinalizableStreamingTextSink {
  private buffer = '';
  private nextAllowedDraftUpdateAt: number | null = null;
  private queuedDraftText: string | null = null;
  private draftUpdateLoop: Promise<void> | null = null;
  private draftWaitTimeout: ReturnType<typeof setTimeout> | null = null;
  private draftWaitResolver: (() => void) | null = null;
  private draftsCanceled = false;

  constructor(
    private readonly sendDraftText: (
      chatId: bigint,
      draftId: number,
      text: string,
    ) => Promise<boolean>,
    private readonly sendFinalTextInternal: (
      text: string,
      chatId: bigint,
      replyToMessageId?: number,
    ) => Promise<number>,
    private readonly chatId: bigint,
    private readonly draftId: number,
    private readonly replyToMessageId?: number,
  ) {}

  appendText(text: string): Promise<void> {
    if (text.length === 0 || this.draftsCanceled) {
      return Promise.resolve();
    }
    this.buffer += text;
    this.queueDraftUpdate(this.buffer);
    return Promise.resolve();
  }

  async reset(): Promise<void> {
    this.buffer = '';
    this.queueDraftUpdate('…');
    await this.flushDraftUpdates();
  }

  async sendFinalText(text: string): Promise<number> {
    this.buffer = text;
    this.cancelPendingDraftUpdates();
    return this.sendFinalTextInternal(text, this.chatId, this.replyToMessageId);
  }

  private queueDraftUpdate(text: string): void {
    this.queuedDraftText = text;
    if (this.draftUpdateLoop === null) {
      this.nextAllowedDraftUpdateAt ??= Date.now() + DRAFT_UPDATE_INTERVAL_MS;
      this.draftUpdateLoop = this.runDraftUpdateLoop();
    }
  }

  private async flushDraftUpdates(): Promise<void> {
    await this.draftUpdateLoop;
  }

  private async runDraftUpdateLoop(): Promise<void> {
    while (!this.draftsCanceled && this.queuedDraftText !== null) {
      const remainingDelay = (this.nextAllowedDraftUpdateAt ?? Date.now()) - Date.now();
      if (remainingDelay > 0) {
        // oxlint-disable-next-line no-await-in-loop -- Draft updates are intentionally serialized to enforce Telegram rate limits.
        await this.waitForNextDraftSlot(remainingDelay);
      }

      if (this.draftsCanceled) {
        break;
      }
      const text = this.queuedDraftText;
      if (text === null) {
        continue;
      }
      this.queuedDraftText = null;
      // oxlint-disable-next-line no-await-in-loop -- Draft updates must be sent in order for a single draft_id.
      const didSendDraft = await this.sendDraftText(this.chatId, this.draftId, text);
      if (didSendDraft) {
        this.nextAllowedDraftUpdateAt = Date.now() + DRAFT_UPDATE_INTERVAL_MS;
      }
    }

    this.draftUpdateLoop = null;
  }

  private waitForNextDraftSlot(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
      this.draftWaitResolver = () => {
        this.draftWaitResolver = null;
        this.draftWaitTimeout = null;
        resolve();
      };
      this.draftWaitTimeout = setTimeout(() => {
        this.draftWaitResolver?.();
      }, delayMs);
    });
  }

  private cancelPendingDraftUpdates(): void {
    this.draftsCanceled = true;
    this.queuedDraftText = null;
    if (this.draftWaitTimeout !== null) {
      clearTimeout(this.draftWaitTimeout);
      this.draftWaitTimeout = null;
    }
    this.draftWaitResolver?.();
  }
}

/** Service to interact with Telegram. */
@injectable()
export class TelegramService {
  private readonly primaryTelegraf: Telegraf;
  private readonly markdownParseMode = 'MarkdownV2' as const;
  private readonly draftSupportByChatId = new Map<bigint, boolean>();
  private readonly draftRateLimitedUntilByChatId = new Map<bigint, number>();
  private nextDraftId = 1;

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
   * Send bot-authored text.
   *
   * @param text - The text to send.
   * @param chatId - The chat to send in.
   * @return The database message ID.
   */
  async sendBotText(text: string, chatId: bigint): Promise<number> {
    const sentMessage = await this.sendTelegramValidatedBotText(text, chatId);
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
   * Send bot-authored text without storing it.
   *
   * @param text - The text to send.
   * @param chatId - The chat to send in.
   */
  async sendBotTextWithoutStoring(
    text: string,
    chatId: bigint,
  ): Promise<Typegram.Message.TextMessage> {
    const sentMessage = await this.sendTelegramValidatedBotText(text, chatId);
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
   * Replies with bot-authored text.
   *
   * @param reply - The text to send.
   * @param message - The message to reply to.
   * @return The database message ID of the reply.
   */
  async replyBotText(reply: string, message: TelegramMessage): Promise<number> {
    const sentMessage = await this.sendTelegramValidatedBotText(
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
   * Creates a streaming session for model-generated text.
   *
   * Draft updates are transient and not stored. Only the final message is stored.
   */
  createModelTextSession(chatId: bigint, replyToMessageId?: number): FinalizableStreamingTextSink {
    const draftId = this.allocateDraftId();
    return new TelegramDraftSession(
      this.sendMessageDraft.bind(this),
      this.sendModelText.bind(this),
      chatId,
      draftId,
      replyToMessageId,
    );
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

  private allocateDraftId(): number {
    const draftId = this.nextDraftId;
    this.nextDraftId += 1;
    if (this.nextDraftId === 0) {
      this.nextDraftId = 1;
    }
    return draftId;
  }

  private async sendMessageDraft(chatId: bigint, draftId: number, text: string): Promise<boolean> {
    if (text.length === 0) {
      return false;
    }
    if (this.draftSupportByChatId.get(chatId) === false) {
      return false;
    }
    const rateLimitedUntil = this.draftRateLimitedUntilByChatId.get(chatId);
    if (rateLimitedUntil !== undefined && rateLimitedUntil > Date.now()) {
      return false;
    }

    const payload = this.createMessageDraftPayload(chatId, draftId, text);
    try {
      await this.sendMessageDraftPayload(payload);
      return true;
    } catch (error) {
      if (this.isTelegramRateLimitError(error)) {
        this.draftRateLimitedUntilByChatId.set(
          chatId,
          Date.now() + this.getTelegramRetryAfterMilliseconds(error),
        );
        console.warn(
          `Telegram rate limited sendMessageDraft for chat ${chatId.toString()}. Pausing draft updates temporarily.`,
          error,
        );
        return false;
      }
      if (this.isTelegramMarkdownParseError(error)) {
        return this.sendEscapedMessageDraft(payload);
      }
      this.draftSupportByChatId.set(chatId, false);
      console.warn(
        `Telegram rejected sendMessageDraft for chat ${chatId.toString()}. Falling back to final-only messages.`,
        error,
      );
      return false;
    }
  }

  private async sendModelText(
    text: string,
    chatId: bigint,
    replyToMessageId?: number,
  ): Promise<number> {
    const sentMessage = await this.sendTelegramModelText(text, chatId, replyToMessageId);
    const storedMessage = await this.messageService.store(sentMessage.message, {
      textOverride: sentMessage.storedText,
    });
    return storedMessage.id;
  }

  private async sendTelegramValidatedBotText(
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
      return {
        message: await this.primaryTelegraf.telegram.sendMessage(chatId.toString(), text, {
          ...replyParameters,
        }),
        storedText: text,
      };
    }

    assert(hasPotentialMarkdownV2(text));
    if (!isValidSupportedMarkdownV2(text)) {
      console.warn(
        'Telegram bot text contains unsupported or invalid MarkdownV2. Sending plaintext fallback.',
      );
      return {
        message: await this.primaryTelegraf.telegram.sendMessage(chatId.toString(), text, {
          ...replyParameters,
        }),
        storedText: text,
      };
    }

    const renderedText = renderSupportedMarkdownV2(text);
    assert(renderedText !== null);
    try {
      return {
        message: await this.primaryTelegraf.telegram.sendMessage(chatId.toString(), renderedText, {
          ...replyParameters,
          parse_mode: this.markdownParseMode,
        }),
        storedText: text,
      };
    } catch (error) {
      if (this.isTelegramMarkdownParseError(error)) {
        console.warn('Telegram rejected MarkdownV2 bot text. Sending plaintext fallback.', error);
        return {
          message: await this.primaryTelegraf.telegram.sendMessage(chatId.toString(), text, {
            ...replyParameters,
          }),
          storedText: text,
        };
      }
      throw error;
    }
  }

  private async sendTelegramModelText(
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

    const renderedEntities = renderSupportedTelegramEntities(text);
    if (renderedEntities !== null) {
      return {
        message: await this.primaryTelegraf.telegram.sendMessage(
          chatId.toString(),
          renderedEntities.text,
          {
            ...replyParameters,
            entities: renderedEntities.entities as Typegram.MessageEntity[],
          },
        ),
        storedText: text,
      };
    }

    const renderedText = renderSupportedMarkdownV2(text);
    if (renderedText !== null) {
      return {
        message: await this.primaryTelegraf.telegram.sendMessage(chatId.toString(), renderedText, {
          ...replyParameters,
          parse_mode: this.markdownParseMode,
        }),
        storedText: text,
      };
    }

    try {
      return {
        message: await this.primaryTelegraf.telegram.sendMessage(chatId.toString(), text, {
          ...replyParameters,
          parse_mode: this.markdownParseMode,
        }),
        storedText: text,
      };
    } catch (error) {
      if (!this.isTelegramMarkdownParseError(error)) {
        throw error;
      }

      const escapedText = escapeTelegramMarkdownV2(text);
      return {
        message: await this.primaryTelegraf.telegram.sendMessage(chatId.toString(), escapedText, {
          ...replyParameters,
          parse_mode: this.markdownParseMode,
        }),
        storedText: text,
      };
    }
  }

  private isTelegramMarkdownParseError(error: unknown): error is Error {
    return error instanceof Error && /can'?t parse entities/i.test(error.message);
  }

  private async sendMessageDraftPayload(payload: SendMessageDraftPayload): Promise<void> {
    await this.primaryTelegraf.telegram.callApi('sendMessageDraft' as never, payload as never);
  }

  private createMessageDraftPayload(
    chatId: bigint,
    draftId: number,
    text: string,
  ): SendMessageDraftPayload {
    const renderedEntities = renderSupportedTelegramDraftEntities(text);
    if (renderedEntities !== null) {
      return {
        chat_id: chatId.toString(),
        draft_id: draftId,
        text: renderedEntities.text,
        entities: renderedEntities.entities as Typegram.MessageEntity[],
      };
    }

    const renderedText = renderSupportedMarkdownV2(text);
    if (renderedText !== null) {
      return {
        chat_id: chatId.toString(),
        draft_id: draftId,
        text: renderedText,
        parse_mode: this.markdownParseMode,
      };
    }

    return {
      chat_id: chatId.toString(),
      draft_id: draftId,
      text,
      parse_mode: this.markdownParseMode,
    };
  }

  private async sendEscapedMessageDraft(payload: SendMessageDraftPayload): Promise<boolean> {
    const escapedPayload: SendMessageDraftPayload = {
      ...payload,
      text: escapeTelegramMarkdownV2(payload.text),
    };

    try {
      await this.sendMessageDraftPayload(escapedPayload);
      return true;
    } catch (error) {
      if (this.isTelegramRateLimitError(error)) {
        this.draftRateLimitedUntilByChatId.set(
          BigInt(payload.chat_id),
          Date.now() + this.getTelegramRetryAfterMilliseconds(error),
        );
        console.warn(
          `Telegram rate limited escaped sendMessageDraft for chat ${payload.chat_id}. Pausing draft updates temporarily.`,
          error,
        );
        return false;
      }
      this.draftSupportByChatId.set(BigInt(payload.chat_id), false);
      console.warn(
        `Telegram rejected escaped sendMessageDraft for chat ${payload.chat_id}. Falling back to final-only messages.`,
        error,
      );
      return false;
    }
  }

  private isTelegramRateLimitError(error: unknown): boolean {
    return this.getTelegramErrorCode(error) === 429;
  }

  private getTelegramRetryAfterMilliseconds(error: unknown): number {
    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof error.response === 'object' &&
      error.response !== null &&
      'parameters' in error.response &&
      typeof error.response.parameters === 'object' &&
      error.response.parameters !== null &&
      'retry_after' in error.response.parameters &&
      typeof error.response.parameters.retry_after === 'number'
    ) {
      return error.response.parameters.retry_after * 1000;
    }
    return 1000;
  }

  private getTelegramErrorCode(error: unknown): number | null {
    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof error.response === 'object' &&
      error.response !== null &&
      'error_code' in error.response &&
      typeof error.response.error_code === 'number'
    ) {
      return error.response.error_code;
    }
    return null;
  }
}
