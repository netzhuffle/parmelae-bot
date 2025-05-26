import { injectable } from 'inversify';
import { MessageStorageService } from './MessageStorageService.js';
import { Chat, User } from '@prisma/client';
import assert from 'assert';
import {
  TelegramMessageWithRelations,
  UnstoredMessageWithRelations,
} from './Repositories/Types.js';
import * as Typegram from '@telegraf/types';

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
  | Typegram.Message.VideoMessage
  | Typegram.Message.VoiceMessage
  | Typegram.Message.VenueMessage;

type ImageAttachmentMessage =
  | { photo: Typegram.PhotoSize[] }
  | { sticker: { thumbnail: Typegram.PhotoSize } };

/** Handles incoming and outgoing Telegram messages. */
@injectable()
export class TelegramMessageService {
  constructor(private readonly messageStorage: MessageStorageService) {}

  /** Stores a message sent to or coming from Telegram. */
  store(
    telegramMessage: SupportedMessage,
  ): Promise<TelegramMessageWithRelations> {
    assert(this.isSupported(telegramMessage));
    const message = this.getMessage(telegramMessage);
    return this.messageStorage.store(message);
  }

  /** Wether the message is supported. */
  isSupported(message: Typegram.Message): message is SupportedMessage {
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
      !('location' in message) &&
      !('new_chat_members' in message && message.new_chat_members.length) &&
      !('photo' in message) &&
      !('poll' in message) &&
      !('sticker' in message) &&
      !('video' in message) &&
      !('voice' in message) &&
      !('venue' in message)
    ) {
      // Unsuported message type.
      return false;
    }

    return true;
  }

  private isStickerMessage(
    message: Typegram.Message,
  ): message is Typegram.Message.StickerMessage {
    return 'sticker' in message;
  }

  private isNewChatMembersMessage(
    message: Typegram.Message,
  ): message is Typegram.Message.NewChatMembersMessage {
    return 'new_chat_members' in message;
  }

  private getDate(unixTimestamp: number): Date {
    return new Date(unixTimestamp * 1000);
  }

  private getOptionalDate(unixTimestamp?: number): Date | null {
    return unixTimestamp ? this.getDate(unixTimestamp) : null;
  }

  private getChat(telegramChat: Typegram.Chat): Chat {
    return {
      id: BigInt(telegramChat.id),
      type: telegramChat.type,
      title: 'title' in telegramChat ? telegramChat.title : null,
      username:
        'username' in telegramChat ? (telegramChat.username ?? null) : null,
      firstName: 'first_name' in telegramChat ? telegramChat.first_name : null,
      lastName:
        'last_name' in telegramChat ? (telegramChat.last_name ?? null) : null,
    };
  }

  private getUser(telegramUser: Typegram.User): User {
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
    telegramMessage: SupportedMessage,
  ): UnstoredMessageWithRelations {
    assert(telegramMessage.from);
    const chatId = BigInt(telegramMessage.chat.id);
    const replyToMessage =
      'reply_to_message' in telegramMessage
        ? telegramMessage.reply_to_message
        : undefined;
    const editDate =
      'edit_date' in telegramMessage ? telegramMessage.edit_date : undefined;
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
        replyToMessage && this.isSupported(replyToMessage)
          ? this.getMessage(replyToMessage)
          : null,
      text: this.getMessageText(telegramMessage),
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

  private getMessageText(message: SupportedMessage): string {
    if ('text' in message) {
      return message.text;
    }

    if ('animation' in message) {
      // Must be before message.document, because message.document is also always set for backwards compatibility.
      const animation = message.animation;
      const attachment = animation.file_name
        ? `[GIF: ${animation.file_name} (${animation.duration}s)]`
        : `[GIF: ${animation.duration} Sekunden]`;
      return message.caption ? `${attachment}: ${message.caption}` : attachment;
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
      const attachment = info
        ? `[♫: ${info} (${duration}s)]`
        : `[♫: ${duration} Sekunden]`;
      return message.caption ? `${attachment}: ${message.caption}` : attachment;
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
      return message.caption ? `${attachment}: ${message.caption}` : attachment;
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

    if ('photo' in message) {
      return message.caption ?? '';
    }

    if ('poll' in message) {
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

    if ('sticker' in message) {
      if (this.hasImageAttachment(message)) {
        return '';
      }
      return message.sticker.emoji
        ? `[Sticker: ${message.sticker.emoji}]`
        : '[Sticker]';
    }

    if ('video' in message) {
      const attachment = `[🎬: ${message.video.duration} Sekunden]`;
      return message.caption ? `${attachment}: ${message.caption}` : attachment;
    }

    if ('voice' in message) {
      const attachment = `[🎤: ${message.voice.duration} Sekunden]`;
      return message.caption ? `${attachment}: ${message.caption}` : attachment;
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

    throw new UnknownTelegramMessageTypeError(message);
  }

  private hasImageAttachment(
    message: SupportedMessage,
  ): message is SupportedMessage & ImageAttachmentMessage {
    if (
      'photo' in message &&
      Array.isArray(message.photo) &&
      message.photo.length
    ) {
      return true;
    }
    if ('sticker' in message && 'thumbnail' in message.sticker) {
      return true;
    }

    return false;
  }

  private getImageFileId(message: ImageAttachmentMessage): string {
    if ('sticker' in message) {
      return message.sticker.thumbnail.file_id;
    }

    let largestPhotoSize = message.photo[0];
    for (const photoSize of message.photo) {
      if (
        photoSize.width * photoSize.height >
        largestPhotoSize.width * largestPhotoSize.height
      ) {
        largestPhotoSize = photoSize;
      }
    }
    return largestPhotoSize.file_id;
  }
}

/** Error for a telegram message with unknown type. */
class UnknownTelegramMessageTypeError extends Error {
  constructor(message: Typegram.Message) {
    const json = JSON.stringify(message);
    super(`Unknown telegram message type: ${json}`);
  }
}
