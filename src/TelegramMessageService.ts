import assert from 'node:assert/strict';

import type * as Typegram from '@telegraf/types';
import { injectable, inject } from 'inversify';

import { normalizeUsername } from './BotIdentityContext.js';
import { Config } from './Config.js';
import type { BotConfig } from './ConfigInterfaces.js';
import { ChatModel } from './generated/prisma/models/Chat.js';
import { UserModel } from './generated/prisma/models/User.js';
import { MessageStorageService } from './MessageStorageService.js';
import {
  TelegramMessageWithRelations,
  UnstoredMessageWithRelations,
} from './Repositories/Types.js';
import { renderTelegramMarkdownSource } from './TelegramMarkdownSource.js';

type TelegramMessageLike = Typegram.Message | CompatibilityAttachmentMessage;

type SupportedMessage =
  | Typegram.Message.TextMessage
  | Typegram.Message.AnimationMessage
  | Typegram.Message.AudioMessage
  | Typegram.Message.ContactMessage
  | Typegram.Message.DiceMessage
  | Typegram.Message.DocumentMessage
  | Typegram.Message.GameMessage
  | Typegram.Message.LocationMessage
  | Typegram.Message.NewChatMembersMessage
  | Typegram.Message.PhotoMessage
  | Typegram.Message.PollMessage
  | Typegram.Message.StickerMessage
  | Typegram.Message.StoryMessage
  | Typegram.Message.VideoMessage
  | Typegram.Message.VideoNoteMessage
  | Typegram.Message.VoiceMessage
  | Typegram.Message.VenueMessage
  | CompatibilityAttachmentMessage;

type CompatibilityAttachmentMessage = Typegram.Message.CommonMessage &
  Partial<{
    caption: string;
    caption_entities: Typegram.MessageEntity[];
    checklist: Checklist;
    giveaway: Giveaway;
    giveaway_completed: GiveawayCompleted;
    giveaway_winners: GiveawayWinners;
    gift: GiftInfo;
    gift_upgrade_sent: GiftInfo;
    invoice: Invoice;
    live_photo: LivePhoto;
    paid_media: PaidMediaInfo;
    passport_data: unknown;
    refunded_payment: RefundedPayment;
    successful_payment: SuccessfulPayment;
    unique_gift: UniqueGiftInfo;
    web_app_data: WebAppData;
  }>;

type ImageAttachmentMessage =
  | { photo: Typegram.PhotoSize[] }
  | { sticker: { thumbnail: Typegram.PhotoSize } }
  | { video: { thumbnail: Typegram.PhotoSize } }
  | { video_note: { thumbnail: Typegram.PhotoSize } };

interface Checklist {
  title?: string;
  tasks?: {
    text?: string;
    title?: string;
    is_checked?: boolean;
  }[];
}

interface Giveaway {
  prize_description?: string;
  winner_count?: number;
}

interface GiveawayWinners {
  prize_description?: string;
  winner_count: number;
}

interface GiveawayCompleted {
  winner_count: number;
  prize_description?: string;
}

interface GiftInfo {
  gift?: {
    sticker?: {
      emoji?: string;
    };
    star_count?: number;
  };
  owned_gift_id?: string;
}

interface Invoice {
  title: string;
  description?: string;
  currency: string;
  total_amount: number;
}

interface LivePhoto {
  duration?: number;
}

interface PaidMediaInfo {
  star_count: number;
  paid_media?: { type: string }[];
}

interface RefundedPayment {
  currency: string;
  total_amount: number;
}

interface SuccessfulPayment {
  currency: string;
  total_amount: number;
}

interface UniqueGiftInfo {
  gift?: {
    title?: string;
    name?: string;
  };
}

interface WebAppData {
  data: string;
  button_text: string;
}

/** Handles incoming and outgoing Telegram messages. */
@injectable()
export class TelegramMessageService {
  constructor(
    private readonly messageStorage: MessageStorageService,
    @inject(Config) private readonly config: BotConfig,
  ) {}

  /** Stores a message sent to or coming from Telegram. */
  store(
    telegramMessage: TelegramMessageLike,
    options?: { textOverride?: string },
  ): Promise<TelegramMessageWithRelations> {
    assert(this.isSupported(telegramMessage));
    const message = this.getMessage(telegramMessage, options?.textOverride);
    return this.messageStorage.store(message);
  }

  /** Wether the message is supported. */
  isSupported(message: TelegramMessageLike): message is SupportedMessage {
    if (!message.from) {
      // Can only store messages with a sender.
      return false;
    }

    if (
      !('text' in message) &&
      !('animation' in message) &&
      !('audio' in message) &&
      !('contact' in message) &&
      !('dice' in message) &&
      !('document' in message) &&
      !('game' in message) &&
      !('checklist' in message && message.checklist) &&
      !('giveaway' in message && message.giveaway) &&
      !('giveaway_completed' in message && message.giveaway_completed) &&
      !('giveaway_winners' in message && message.giveaway_winners) &&
      !('gift' in message && message.gift) &&
      !('gift_upgrade_sent' in message && message.gift_upgrade_sent) &&
      !('invoice' in message && message.invoice) &&
      !('live_photo' in message && message.live_photo) &&
      !('location' in message) &&
      !('new_chat_members' in message && message.new_chat_members.length) &&
      !('paid_media' in message && message.paid_media) &&
      !('passport_data' in message && message.passport_data) &&
      !('photo' in message) &&
      !('poll' in message) &&
      !('refunded_payment' in message && message.refunded_payment) &&
      !('sticker' in message) &&
      !('story' in message) &&
      !('successful_payment' in message && message.successful_payment) &&
      !('unique_gift' in message && message.unique_gift) &&
      !('video' in message) &&
      !('video_note' in message) &&
      !('voice' in message) &&
      !('venue' in message) &&
      !('web_app_data' in message && message.web_app_data)
    ) {
      // Unsuported message type.
      return false;
    }

    return true;
  }

  private isStickerMessage(
    message: TelegramMessageLike,
  ): message is Typegram.Message.StickerMessage {
    return 'sticker' in message;
  }

  private isNewChatMembersMessage(
    message: TelegramMessageLike,
  ): message is Typegram.Message.NewChatMembersMessage {
    return 'new_chat_members' in message;
  }

  private getDate(unixTimestamp: number): Date {
    return new Date(unixTimestamp * 1000);
  }

  private getOptionalDate(unixTimestamp?: number): Date | null {
    return unixTimestamp ? this.getDate(unixTimestamp) : null;
  }

  private getChat(telegramChat: Typegram.Chat): ChatModel {
    return {
      id: BigInt(telegramChat.id),
      type: telegramChat.type,
      title: 'title' in telegramChat ? telegramChat.title : null,
      username: 'username' in telegramChat ? (telegramChat.username ?? null) : null,
      firstName: 'first_name' in telegramChat ? telegramChat.first_name : null,
      lastName: 'last_name' in telegramChat ? (telegramChat.last_name ?? null) : null,
    };
  }

  /**
   * Converts Telegram User to UserModel with invariant enforcement.
   *
   * **Enforced Invariants:**
   * - Configured bot (matching config.primaryBot.username) must have `is_bot=true` in Telegram API
   * - All bots must have non-empty `username` in Telegram API
   *
   * These invariants ensure bot identity can be reliably tracked across
   * message storage and conversation handling in multi-bot scenarios.
   *
   * @param telegramUser - User data from Telegram API
   * @returns UserModel for database storage
   * @throws {AssertionError} When invariants are violated
   */
  private getUser(telegramUser: Typegram.User): UserModel {
    const isBot = telegramUser.is_bot;

    // Invariant: configured bot must be marked as bot in Telegram API
    const isConfiguredBot =
      normalizeUsername(telegramUser.username ?? '') ===
      normalizeUsername(this.config.primaryBot.username);
    if (isConfiguredBot) {
      assert(
        isBot,
        `Configured bot ${this.config.primaryBot.username} must have isBot=true in Telegram API`,
      );
    }

    // Invariant: bots must have usernames in Telegram API
    if (isBot) {
      assert(
        telegramUser.username?.trim(),
        `Bot user ${telegramUser.id} must have a username in Telegram API`,
      );
    }

    return {
      id: BigInt(telegramUser.id),
      isBot,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name ?? null,
      username: telegramUser.username ?? null,
      languageCode: telegramUser.language_code ?? null,
    };
  }

  private getMessage(
    telegramMessage: SupportedMessage,
    textOverride?: string,
  ): UnstoredMessageWithRelations {
    assert(telegramMessage.from);
    const chatId = BigInt(telegramMessage.chat.id);
    const replyToMessage =
      'reply_to_message' in telegramMessage ? telegramMessage.reply_to_message : undefined;
    const editDate = 'edit_date' in telegramMessage ? telegramMessage.edit_date : undefined;
    return {
      telegramMessageId: telegramMessage.message_id,
      chatId,
      chat: this.getChat(telegramMessage.chat),
      fromId: BigInt(telegramMessage.from.id),
      from: this.getUser(telegramMessage.from),
      sentAt: this.getDate(telegramMessage.date),
      editedAt: this.getOptionalDate(editDate),
      replyToMessageId: replyToMessage?.message_id ?? null,
      replyToMessage:
        replyToMessage && this.isSupported(replyToMessage) ? this.getMessage(replyToMessage) : null,
      text: this.getMessageText(telegramMessage, textOverride),
      imageFileId: this.hasImageAttachment(telegramMessage)
        ? this.getImageFileId(telegramMessage)
        : null,
      stickerFileId: this.isStickerMessage(telegramMessage)
        ? telegramMessage.sticker.file_id
        : null,
      toolCalls: null,
      messageAfterToolCallsId: null,
      newChatMembers: this.isNewChatMembersMessage(telegramMessage)
        ? telegramMessage.new_chat_members.map((user) => ({
            messageId: telegramMessage.message_id,
            chatId,
            userId: BigInt(user.id),
            user: this.getUser(user),
          }))
        : [],
    };
  }

  private getMessageText(message: SupportedMessage, textOverride?: string): string {
    if (textOverride !== undefined) {
      return textOverride;
    }

    if ('text' in message) {
      return renderTelegramMarkdownSource(message.text, message.entities);
    }

    if ('animation' in message) {
      // Must be before message.document, because message.document is also always set for backwards compatibility.
      const animation = message.animation;
      const attachment = animation.file_name
        ? `[GIF: ${animation.file_name} (${animation.duration}s)]`
        : `[GIF: ${animation.duration} Sekunden]`;
      return message.caption
        ? `${attachment}: ${renderTelegramMarkdownSource(
            message.caption,
            message.caption_entities,
          )}`
        : attachment;
    }

    if ('audio' in message) {
      const audio = message.audio;
      let info = '';
      if (audio.performer) {
        info += `${audio.performer} – `;
      }
      if (audio.title) {
        info += audio.title;
      }
      const duration = audio.duration;
      const attachment = info ? `[♫: ${info} (${duration}s)]` : `[♫: ${duration} Sekunden]`;
      return message.caption
        ? `${attachment}: ${renderTelegramMarkdownSource(
            message.caption,
            message.caption_entities,
          )}`
        : attachment;
    }

    if ('contact' in message) {
      const contact = message.contact;
      return contact.last_name
        ? `[🙍 Kontakt: ${contact.first_name} ${contact.last_name}]`
        : `[🙍 Kontakt: ${contact.first_name}]`;
    }

    if ('dice' in message) {
      const dice = message.dice;
      const emoji = dice.emoji;
      if (emoji === '🎲') {
        return `[🎲 gewürfelt: ${dice.value}]`;
      }
      if (emoji === '🎰') {
        return dice.value !== 64
          ? '[Spiel 🎰: verloren (keine 777)]'
          : '[Spiel 🎰: gewonnen! (777)]';
      }
      const max = ['🎯', '🎳'].includes(emoji) ? 6 : 5;
      return `[Spiel ${emoji}: ${dice.value} von max. ${max} Punkten erzielt]`;
    }

    if ('document' in message) {
      // Must be after message.animation, because message.document is also always set for backwards compatibility.
      const document = message.document;
      let attachment: string;
      if (document.file_name) {
        attachment = document.mime_type
          ? `[📄: ${document.file_name} (${document.mime_type})]`
          : `[📄: ${document.file_name}]`;
      } else if (document.mime_type) {
        attachment = `[📄: ${document.mime_type}]`;
      } else {
        attachment = `[📄 Dateianhang]`;
      }
      return message.caption
        ? `${attachment}: ${renderTelegramMarkdownSource(
            message.caption,
            message.caption_entities,
          )}`
        : attachment;
    }

    if ('checklist' in message && message.checklist) {
      const checklist = message.checklist;
      const title = checklist.title ? `Checkliste: ${checklist.title}` : 'Checkliste';
      const tasks = checklist.tasks ?? [];
      if (!tasks.length) {
        return `[☑️ ${title}]`;
      }

      const taskLines = tasks.map((task) => {
        const status = task.is_checked ? 'x' : ' ';
        return `[${status}] ${task.text ?? task.title ?? '<ohne Text>'}`;
      });
      return `[☑️ ${title}]\n${taskLines.join('\n')}`;
    }

    if ('game' in message) {
      return `[Spiel: ${message.game.title}]`;
    }

    if ('giveaway' in message && message.giveaway) {
      const giveaway = message.giveaway;
      const winners = giveaway.winner_count ? `, ${giveaway.winner_count} Gewinner` : '';
      return `[Giveaway${winners}${this.formatOptionalDetail(giveaway.prize_description)}]`;
    }

    if ('giveaway_completed' in message && message.giveaway_completed) {
      const giveaway = message.giveaway_completed;
      return `[Giveaway abgeschlossen: ${giveaway.winner_count} Gewinner${this.formatOptionalDetail(
        giveaway.prize_description,
      )}]`;
    }

    if ('giveaway_winners' in message && message.giveaway_winners) {
      const winners = message.giveaway_winners;
      return `[Giveaway-Gewinner: ${winners.winner_count}${this.formatOptionalDetail(
        winners.prize_description,
      )}]`;
    }

    if ('gift' in message && message.gift) {
      return `[Geschenk${this.formatGiftDetail(message.gift)}]`;
    }

    if ('gift_upgrade_sent' in message && message.gift_upgrade_sent) {
      return `[Geschenk-Upgrade gesendet${this.formatGiftDetail(message.gift_upgrade_sent)}]`;
    }

    if ('invoice' in message && message.invoice) {
      const invoice = message.invoice;
      return `[Rechnung: ${invoice.title}, ${this.formatPaymentAmount(
        invoice.total_amount,
        invoice.currency,
      )}${this.formatOptionalDetail(invoice.description)}]`;
    }

    if ('live_photo' in message && message.live_photo) {
      const duration = message.live_photo.duration ? ` (${message.live_photo.duration}s)` : '';
      const attachment = `[Live-Foto${duration}]`;
      return message.caption
        ? `${attachment}: ${renderTelegramMarkdownSource(
            message.caption,
            message.caption_entities,
          )}`
        : attachment;
    }

    if ('new_chat_members' in message && message.new_chat_members.length) {
      const newChatMembers = message.new_chat_members;
      const names = newChatMembers.map((member) => {
        if (member.username) {
          return `@${member.username}`;
        }
        if (member.last_name) {
          return `${member.first_name} ${member.last_name}`;
        }
        return member.first_name;
      });
      if (names.length === 1) {
        return `${names[0]} tritt dem Chat bei.`;
      }
      const nameList = names.join(', ');
      return `Neue Mitglieder treten dem Chat bei: ${nameList}.`;
    }

    if ('paid_media' in message && message.paid_media) {
      const paidMedia = message.paid_media;
      const mediaTypes = paidMedia.paid_media?.map((media) => media.type).join(', ');
      const attachment = `[Bezahlmedien: ${paidMedia.star_count} Sterne${
        mediaTypes ? `, ${mediaTypes}` : ''
      }]`;
      return message.caption
        ? `${attachment}: ${renderTelegramMarkdownSource(
            message.caption,
            message.caption_entities,
          )}`
        : attachment;
    }

    if ('passport_data' in message && message.passport_data) {
      return '[Telegram-Passport-Daten]';
    }

    if ('photo' in message) {
      return message.caption ?? '';
    }

    if ('poll' in message) {
      const poll = message.poll;
      let text = poll.type === 'quiz' ? `Quizfrage: ${poll.question}` : `Umfrage: ${poll.question}`;
      for (const option of poll.options) {
        text += `\n[ ] ${option.text}`;
      }
      return text;
    }

    if ('refunded_payment' in message && message.refunded_payment) {
      const payment = message.refunded_payment;
      return `[Zahlung zurückerstattet: ${this.formatPaymentAmount(
        payment.total_amount,
        payment.currency,
      )}]`;
    }

    if ('sticker' in message) {
      if (this.hasImageAttachment(message)) {
        return '';
      }
      return message.sticker.emoji ? `[Sticker: ${message.sticker.emoji}]` : '[Sticker]';
    }

    if ('story' in message) {
      return '[Story]';
    }

    if ('successful_payment' in message && message.successful_payment) {
      const payment = message.successful_payment;
      return `[Zahlung erfolgreich: ${this.formatPaymentAmount(
        payment.total_amount,
        payment.currency,
      )}]`;
    }

    if ('unique_gift' in message && message.unique_gift) {
      const gift = message.unique_gift.gift;
      return `[Einzigartiges Geschenk${this.formatOptionalDetail(gift?.title ?? gift?.name)}]`;
    }

    if ('video' in message) {
      const attachment = `[🎬: ${message.video.duration} Sekunden]`;
      return message.caption
        ? `${attachment}: ${renderTelegramMarkdownSource(
            message.caption,
            message.caption_entities,
          )}`
        : attachment;
    }

    if ('video_note' in message) {
      return `[Video-Nachricht: ${message.video_note.duration} Sekunden]`;
    }

    if ('voice' in message) {
      const attachment = `[🎤: ${message.voice.duration} Sekunden]`;
      return message.caption
        ? `${attachment}: ${renderTelegramMarkdownSource(
            message.caption,
            message.caption_entities,
          )}`
        : attachment;
    }

    if ('venue' in message) {
      // Must be before message.location, because message.location is also always set for backwards compatibility.
      const venue = message.venue;
      const location = venue.location;
      return `[🏟️ POI: ${venue.title} (${venue.address}, lat: ${location.latitude}, lng: ${location.longitude})]`;
    }

    if ('location' in message) {
      // Must be after message.venue, because message.location is also always set for backwards compatibility.
      const location = message.location;
      return `[📍 (lat: ${location.latitude}, lng: ${location.longitude})]`;
    }

    if ('web_app_data' in message && message.web_app_data) {
      return `[Web-App-Daten über "${message.web_app_data.button_text}": ${message.web_app_data.data}]`;
    }

    throw new UnknownTelegramMessageTypeError(message);
  }

  private hasImageAttachment(
    message: SupportedMessage,
  ): message is SupportedMessage & ImageAttachmentMessage {
    if ('photo' in message && Array.isArray(message.photo) && message.photo.length) {
      return true;
    }
    if ('sticker' in message && 'thumbnail' in message.sticker) {
      return true;
    }
    if ('video' in message && message.video.thumbnail) {
      return true;
    }
    if ('video_note' in message && message.video_note.thumbnail) {
      return true;
    }

    return false;
  }

  private getImageFileId(message: ImageAttachmentMessage): string {
    if ('sticker' in message) {
      return message.sticker.thumbnail.file_id;
    }
    if ('video' in message) {
      return message.video.thumbnail.file_id;
    }
    if ('video_note' in message) {
      return message.video_note.thumbnail.file_id;
    }

    let largestPhotoSize = message.photo[0];
    for (const photoSize of message.photo) {
      if (photoSize.width * photoSize.height > largestPhotoSize.width * largestPhotoSize.height) {
        largestPhotoSize = photoSize;
      }
    }
    return largestPhotoSize.file_id;
  }

  private formatGiftDetail(giftInfo: GiftInfo): string {
    return this.formatOptionalDetail(giftInfo.gift?.sticker?.emoji ?? giftInfo.owned_gift_id);
  }

  private formatOptionalDetail(detail: string | undefined): string {
    return detail ? `: ${detail}` : '';
  }

  private formatPaymentAmount(totalAmount: number, currency: string): string {
    return `${totalAmount} ${currency}`;
  }
}

/** Error for a telegram message with unknown type. */
class UnknownTelegramMessageTypeError extends Error {
  constructor(message: TelegramMessageLike) {
    const json = JSON.stringify(message);
    super(`Unknown telegram message type: ${json}`);
  }
}
