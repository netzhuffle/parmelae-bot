import assert from 'node:assert/strict';

import type * as Typegram from '@telegraf/types';
import { injectable } from 'inversify';
import { Telegraf } from 'telegraf';

import { BotManager } from './BotManager.js';
import { TelegramMessage } from './Repositories/Types.js';
import { Sticker } from './Sticker.js';
import { FinalizableStreamingTextSink } from './StreamingTextSink.js';
import {
  containsSupportedMarkdownV2,
  escapeTelegramMarkdownV2FallbackText,
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

const INITIAL_DRAFT_UPDATE_INTERVAL_MS = 30;
const DRAFT_UPDATE_INTERVAL_STEP_MS = 15;
const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;
const PHOTO_UPLOAD_RETRY_DELAYS_MS = [250, 1000] as const;
const EMPTY_MODEL_RESPONSE_FALLBACK_TEXT =
  'Ich habe gerade keine Antwort erzeugen können. Bitte versuchen Sie es noch einmal.';

/** Signals that Telegram delivery failed after generation and must not replay the agent turn. */
export class TelegramDeliveryError extends Error {
  constructor(message: string, cause: unknown) {
    super(message, { cause });
    this.name = 'TelegramDeliveryError';
  }
}

class TelegramApiError extends Error {
  constructor(
    readonly response: {
      description: string;
      error_code: number;
      parameters?: { retry_after?: number };
    },
  ) {
    super(`${response.error_code}: ${response.description}`);
    this.name = 'TelegramApiError';
  }
}

class TelegramDraftSession implements FinalizableStreamingTextSink {
  private buffer = '';
  private nextAllowedDraftUpdateAt: number | null = null;
  private queuedDraftText: string | null = null;
  private draftUpdateLoop: Promise<void> | null = null;
  private draftWaitTimeout: ReturnType<typeof setTimeout> | null = null;
  private draftWaitResolver: (() => void) | null = null;
  private draftsCanceled = false;
  private sentDraftCount = 0;

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
      this.nextAllowedDraftUpdateAt ??= Date.now() + this.getNextDraftDelayMs();
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
        this.sentDraftCount += 1;
        this.nextAllowedDraftUpdateAt = Date.now() + this.getNextDraftDelayMs();
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

  private getNextDraftDelayMs(): number {
    return INITIAL_DRAFT_UPDATE_INTERVAL_MS + this.sentDraftCount * DRAFT_UPDATE_INTERVAL_STEP_MS;
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

  /** Display photo upload status while a generated image is being created. */
  async sendUploadPhoto(chatId: bigint): Promise<void> {
    await this.primaryTelegraf.telegram.sendChatAction(chatId.toString(), 'upload_photo');
  }

  /** Starts Telegram's transient photo-upload status and returns a cleanup callback. */
  startUploadPhotoStatus(chatId: bigint): () => void {
    void this.sendUploadPhoto(chatId).catch((error: unknown) => {
      console.warn('Telegram upload_photo status update failed.', {
        chatId: chatId.toString(),
        error,
      });
    });
    const interval = setInterval(() => {
      void this.sendUploadPhoto(chatId).catch((error: unknown) => {
        console.warn('Telegram upload_photo status update failed.', {
          chatId: chatId.toString(),
          error,
        });
      });
    }, 4000);

    return () => {
      clearInterval(interval);
    };
  }

  /** Keeps Telegram's transient photo-upload status visible while the task is running. */
  async withUploadPhotoStatus<Result>(
    chatId: bigint,
    task: () => Promise<Result>,
  ): Promise<Result> {
    const stopUploadPhotoStatus = this.startUploadPhotoStatus(chatId);

    try {
      return await task();
    } finally {
      stopUploadPhotoStatus();
    }
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
   * @param url - The image URL or data URL.
   * @param caption - The image caption.
   * @param message - The message to reply to.
   */
  async replyWithImage(url: string, caption: string, chatId: bigint): Promise<void> {
    const sentMessage = await this.sendPhotoWithRetry(url, caption, chatId);
    await this.messageService.store(sentMessage);
  }

  private async sendPhotoWithRetry(
    url: string,
    caption: string,
    chatId: bigint,
  ): Promise<Typegram.Message.PhotoMessage> {
    const photo = this.getPhotoInput(url);

    for (let attempt = 0; ; attempt += 1) {
      try {
        // oxlint-disable-next-line no-await-in-loop -- Each retry must wait for the preceding Telegram upload attempt.
        return await this.sendPhoto(photo, caption, chatId);
      } catch (error) {
        const retryDelay = PHOTO_UPLOAD_RETRY_DELAYS_MS[attempt];
        if (retryDelay === undefined || !this.isTransientTelegramDeliveryError(error)) {
          throw new TelegramDeliveryError(
            'Could not send the generated image to Telegram.',
            this.sanitizeTelegramTransportError(error),
          );
        }

        console.warn('Telegram photo upload failed transiently. Retrying the upload.', {
          chatId: chatId.toString(),
          attempt: attempt + 1,
          errorCode: this.getErrorCode(error),
        });
        // oxlint-disable-next-line no-await-in-loop -- Backoff is required between serialized Telegram upload retries.
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  private async sendPhoto(
    photo: string | { source: Buffer; filename: string },
    caption: string,
    chatId: bigint,
  ): Promise<Typegram.Message.PhotoMessage> {
    if (typeof photo === 'string') {
      return await this.primaryTelegraf.telegram.sendPhoto(chatId.toString(), photo, { caption });
    }

    const formData = new FormData();
    formData.set('chat_id', chatId.toString());
    formData.set('caption', caption);
    formData.set('photo', new Blob([photo.source]), photo.filename);

    const telegram = this.primaryTelegraf.telegram;
    const apiUrl = new URL(
      `./${telegram.options.apiMode}${telegram.token}${telegram.options.testEnv ? '/test' : ''}/sendPhoto`,
      telegram.options.apiRoot,
    );
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
    });
    const payload: unknown = await response.json();
    if (!this.isSuccessfulTelegramPhotoResponse(payload)) {
      throw new TelegramApiError(this.getTelegramApiErrorResponse(payload, response.status));
    }
    return payload.result;
  }

  private isSuccessfulTelegramPhotoResponse(
    payload: unknown,
  ): payload is { ok: true; result: Typegram.Message.PhotoMessage } {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'ok' in payload &&
      payload.ok === true &&
      'result' in payload
    );
  }

  private getTelegramApiErrorResponse(
    payload: unknown,
    status: number,
  ): { description: string; error_code: number; parameters?: { retry_after?: number } } {
    if (
      typeof payload === 'object' &&
      payload !== null &&
      'error_code' in payload &&
      typeof payload.error_code === 'number' &&
      'description' in payload &&
      typeof payload.description === 'string'
    ) {
      return payload as {
        description: string;
        error_code: number;
        parameters?: { retry_after?: number };
      };
    }
    return {
      error_code: status,
      description: `Unexpected Telegram response with HTTP status ${status}`,
    };
  }

  private sanitizeTelegramTransportError(error: unknown): Error {
    const message =
      error instanceof Error
        ? error.message.replace(/\/bot\d+:[^/]+\//gu, '/bot<redacted>/')
        : 'Unknown Telegram transport error';
    return Object.assign(new Error(message), { code: this.getErrorCode(error) });
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

  private getPhotoInput(url: string): string | { source: Buffer; filename: string } {
    const dataUrl = this.parseImageDataUrl(url);
    if (!dataUrl) {
      return url;
    }

    return {
      source: Buffer.from(dataUrl.base64, 'base64'),
      filename: `generated-image.${dataUrl.extension}`,
    };
  }

  private parseImageDataUrl(url: string): { base64: string; extension: string } | null {
    const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/u.exec(url);
    if (!match) {
      return null;
    }

    const [, mimeType, base64] = match;
    if (!mimeType || !base64) {
      return null;
    }

    return {
      base64,
      extension: this.getImageExtension(mimeType),
    };
  }

  private getImageExtension(mimeType: string): string {
    switch (mimeType) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      default:
        return 'png';
    }
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
    const sendableText = this.getSendableModelText(text, chatId, replyToMessageId);
    const sentMessage = await this.sendTelegramModelText(sendableText, chatId, replyToMessageId);
    const storedMessage = await this.messageService.store(sentMessage.message, {
      textOverride: sentMessage.storedText,
    });
    return storedMessage.id;
  }

  private getSendableModelText(text: string, chatId: bigint, replyToMessageId?: number): string {
    if (text.trim().length > 0) {
      return text;
    }

    console.warn('Model-authored Telegram text was empty. Sending fallback text instead.', {
      chatId: chatId.toString(),
      replyToMessageId,
    });
    return EMPTY_MODEL_RESPONSE_FALLBACK_TEXT;
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
      const message = await this.primaryTelegraf.telegram.sendMessage(
        chatId.toString(),
        renderedEntities.text,
        {
          ...replyParameters,
          entities: renderedEntities.entities as Typegram.MessageEntity[],
        },
      );
      return {
        message,
        storedText: text,
      };
    }

    const renderedText = renderSupportedMarkdownV2(text);
    if (renderedText !== null) {
      const message = await this.primaryTelegraf.telegram.sendMessage(
        chatId.toString(),
        renderedText,
        {
          ...replyParameters,
          parse_mode: this.markdownParseMode,
        },
      );
      return {
        message,
        storedText: text,
      };
    }

    try {
      const message = await this.primaryTelegraf.telegram.sendMessage(chatId.toString(), text, {
        ...replyParameters,
        parse_mode: this.markdownParseMode,
      });
      return {
        message,
        storedText: text,
      };
    } catch (error) {
      if (!this.isTelegramMarkdownParseError(error)) {
        throw error;
      }

      const escapedText = escapeTelegramMarkdownV2FallbackText(text);
      const message = await this.primaryTelegraf.telegram.sendMessage(
        chatId.toString(),
        escapedText,
        {
          ...replyParameters,
          parse_mode: this.markdownParseMode,
        },
      );
      return {
        message,
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
      return this.trimDraftPayloadToMaxLength({
        chat_id: chatId.toString(),
        draft_id: draftId,
        text: renderedEntities.text,
        entities: renderedEntities.entities as Typegram.MessageEntity[],
      });
    }

    const renderedText = renderSupportedMarkdownV2(text);
    if (renderedText !== null) {
      return this.trimDraftPayloadToMaxLength({
        chat_id: chatId.toString(),
        draft_id: draftId,
        text: renderedText,
        parse_mode: this.markdownParseMode,
      });
    }

    return this.trimDraftPayloadToMaxLength({
      chat_id: chatId.toString(),
      draft_id: draftId,
      text,
      parse_mode: this.markdownParseMode,
    });
  }

  private trimDraftPayloadToMaxLength(payload: SendMessageDraftPayload): SendMessageDraftPayload {
    if (payload.text.length <= TELEGRAM_MAX_MESSAGE_LENGTH) {
      return payload;
    }

    const start = payload.text.length - TELEGRAM_MAX_MESSAGE_LENGTH;
    if (payload.entities !== undefined) {
      return {
        ...payload,
        text: payload.text.slice(start),
        entities: payload.entities
          .filter(
            (entity) =>
              entity.offset >= start && entity.offset + entity.length <= payload.text.length,
          )
          .map((entity) => Object.assign({}, entity, { offset: entity.offset - start })),
      };
    }

    return {
      ...payload,
      text: payload.text.slice(start),
    };
  }

  private async sendEscapedMessageDraft(payload: SendMessageDraftPayload): Promise<boolean> {
    const escapedPayload: SendMessageDraftPayload = {
      ...payload,
      text: escapeTelegramMarkdownV2FallbackText(payload.text),
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

  private isTransientTelegramDeliveryError(error: unknown): boolean {
    const errorCode = this.getErrorCode(error);
    return (
      errorCode === 'ECONNRESET' ||
      errorCode === 'ECONNREFUSED' ||
      errorCode === 'ETIMEDOUT' ||
      errorCode === 'EPIPE' ||
      this.getTelegramErrorCode(error) === 429 ||
      (this.getTelegramErrorCode(error) ?? 0) >= 500
    );
  }

  private getErrorCode(error: unknown): string | number | null {
    if (typeof error !== 'object' || error === null) {
      return null;
    }
    if ('code' in error && (typeof error.code === 'string' || typeof error.code === 'number')) {
      return error.code;
    }
    if ('cause' in error) {
      return this.getErrorCode(error.cause);
    }
    return null;
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
