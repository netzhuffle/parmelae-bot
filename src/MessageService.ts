import { injectable } from 'inversify';
import TelegramBot from 'node-telegram-bot-api';
import { MessageStorageService } from './MessageStorageService';
import { Chat, User } from '@prisma/client';
import assert from 'assert';
import { MessageWithRelations } from './Repositories/Types';

/** Handles Telegram messages. */
@injectable()
export class MessageService {
  constructor(private readonly messageStorage: MessageStorageService) {}

  /**
   * Stores and returns a new message coming from Telegram.
   */
  async storeIncoming(
    telegramMessage: TelegramBot.Message,
  ): Promise<MessageWithRelations | null> {
    if (!telegramMessage.from || !this.isSupported(telegramMessage)) {
      return null;
    }

    const message = this.getMessage(telegramMessage);
    await this.messageStorage.store(message);
    return message;
  }

  /**
   * Stores a message sent to Telegram.
   */
  async storeSent(telegramMessage: TelegramBot.Message): Promise<void> {
    assert(telegramMessage.from && this.isSupported(telegramMessage));

    const message = this.getMessage(telegramMessage);
    return this.messageStorage.store(message);
  }

  /** Whether a telegram message is supported by the bot. */
  private isSupported(message: TelegramBot.Message): boolean {
    if (!message.from) {
      // Can only store messages with a sender.
      return false;
    }

    if (
      !message.text &&
      !message.animation &&
      !message.audio &&
      !message.contact &&
      !message.dice &&
      !message.document &&
      !message.game &&
      !message.location &&
      !message.new_chat_members?.length &&
      !message.photo &&
      !message.poll &&
      !message.sticker &&
      !message.video &&
      !message.voice &&
      !message.venue
    ) {
      // Unsuported message type.
      return false;
    }

    return true;
  }

  private getDate(unixTimestamp: number): Date {
    return new Date(unixTimestamp * 1000);
  }

  private getOptionalDate(unixTimestamp?: number): Date | null {
    return unixTimestamp ? this.getDate(unixTimestamp) : null;
  }

  private getChat(telegramChat: TelegramBot.Chat): Chat {
    return {
      id: BigInt(telegramChat.id),
      type: telegramChat.type,
      title: telegramChat.title ?? null,
      username: telegramChat.username ?? null,
      firstName: telegramChat.first_name ?? null,
      lastName: telegramChat.last_name ?? null,
    };
  }

  private getUser(telegramUser: TelegramBot.User): User {
    return {
      id: BigInt(telegramUser.id),
      isBot: telegramUser.is_bot,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name ?? null,
      username: telegramUser.username ?? null,
      languageCode: telegramUser.language_code ?? null,
    };
  }

  private getMessage(
    telegramMessage: TelegramBot.Message,
  ): MessageWithRelations {
    assert(telegramMessage.from);
    const chatId = BigInt(telegramMessage.chat.id);
    const replyToMessage = telegramMessage.reply_to_message;
    return {
      messageId: telegramMessage.message_id,
      chatId,
      chat: this.getChat(telegramMessage.chat),
      fromId: BigInt(telegramMessage.from.id),
      from: this.getUser(telegramMessage.from),
      sentAt: this.getDate(telegramMessage.date),
      editedAt: this.getOptionalDate(telegramMessage.edit_date),
      replyToMessageId: replyToMessage ? replyToMessage.message_id : null,
      replyToMessageChatId: replyToMessage
        ? BigInt(replyToMessage.chat.id)
        : null,
      replyToMessage: replyToMessage ? this.getMessage(replyToMessage) : null,
      text: this.getMessageText(telegramMessage),
      stickerFileId: telegramMessage.sticker?.file_id ?? null,
      newChatMembers: telegramMessage.new_chat_members
        ? telegramMessage.new_chat_members.map((user) => ({
            messageId: telegramMessage.message_id,
            chatId,
            userId: BigInt(user.id),
            user: this.getUser(user),
          }))
        : [],
    };
  }

  private getMessageText(message: TelegramBot.Message): string {
    if (message.text) {
      return message.text;
    }

    if (message.animation) {
      // Must be before message.document, because message.document is also always set for backwards compatibility.
      const animation = message.animation;
      const attachment = animation.file_name
        ? `[GIF: ${animation.file_name} (${animation.duration}s)]`
        : `[GIF: ${animation.duration} Sekunden]`;
      return message.caption ? `${attachment}: ${message.caption}` : attachment;
    }

    if (message.audio) {
      const audio = message.audio;
      let info = '';
      if (audio.performer) {
        info += `${audio.performer} – `;
      }
      if (audio.title) {
        info += audio.title;
      }
      const duration = audio.duration;
      const attachment = info
        ? `[♫: ${info} (${duration}s)]`
        : `[♫: ${duration} Sekunden]`;
      return message.caption ? `${attachment}: ${message.caption}` : attachment;
    }

    if (message.contact) {
      const contact = message.contact;
      return contact.last_name
        ? `[🙍 Kontakt: ${contact.first_name} ${contact.last_name}]`
        : `[🙍 Kontakt: ${contact.first_name}]`;
    }

    if (message.dice) {
      const dice = message.dice;
      return `[${dice.emoji}: ${dice.value}]`;
    }

    if (message.document) {
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
      return message.caption ? `${attachment}: ${message.caption}` : attachment;
    }

    if (message.new_chat_members?.length) {
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

    if (message.photo) {
      return message.caption ? `📸: ${message.caption}` : '📸';
    }

    if (message.poll) {
      const poll = message.poll;
      let text =
        poll.type === 'quiz'
          ? `Quizfrage: ${poll.question}`
          : `Umfrage: ${poll.question}`;
      for (const option of poll.options) {
        text += `\n[ ] ${option.text}`;
      }
      return text;
    }

    if (message.sticker) {
      return message.sticker.emoji
        ? `[Sticker: ${message.sticker.emoji}]`
        : '[Sticker]';
    }

    if (message.video) {
      const attachment = `[🎬: ${message.video.duration} Sekunden]`;
      return message.caption ? `${attachment}: ${message.caption}` : attachment;
    }

    if (message.voice) {
      const attachment = `[🎤: ${message.voice.duration} Sekunden]`;
      return message.caption ? `${attachment}: ${message.caption}` : attachment;
    }

    if (message.venue) {
      // Must be before message.location, because message.location is also always set for backwards compatibility.
      const venue = message.venue;
      const location = venue.location;
      return `[🏟️ Venue: ${venue.title} (${venue.address}, lat: ${location.latitude}, lng: ${location.longitude})]`;
    }

    if (message.location) {
      // Must be after message.venue, because message.location is also always set for backwards compatibility.
      const location = message.location;
      return `[📍 (lat: ${location.latitude}, lng: ${location.longitude})]`;
    }

    throw new UnknownTelegramMessageTypeError(message);
  }
}

/** Error for a telegram message with unknown type. */
class UnknownTelegramMessageTypeError extends Error {
  constructor(message: TelegramBot.Message) {
    const json = JSON.stringify(message);
    super(`Unknown telegram message type: ${json}`);
  }
}
