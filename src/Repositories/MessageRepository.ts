import { Chat, Message, Prisma, PrismaClient, User } from '@prisma/client';
import { injectable } from 'inversify';
import {
  MessageWithRelations,
  MessageWithUser,
  MessageWithUserAndReplyTo,
  TelegramMessage,
  TelegramMessageWithRelations,
  UnstoredMessageWithRelations,
} from './Types';
import { assert } from 'console';

/** Number of milliseconds in a day */
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

/** Number of milliseconds in 7 days */
const SEVEN_DAYS_IN_MILLISECONDS = 7 * DAY_IN_MILLISECONDS;

/** Repository for messages */
@injectable()
export class MessageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Returns the full message including user and reply-to relations. */
  async get(id: number): Promise<MessageWithUserAndReplyTo> {
    return this.prisma.message.findUniqueOrThrow({
      where: {
        id,
      },
      include: {
        from: true,
        replyToMessage: true,
      },
    });
  }

  /** Returns the full message including all relations. */
  async getWithAllRelations(id: number): Promise<TelegramMessageWithRelations> {
    const message = await this.prisma.message.findUniqueOrThrow({
      where: {
        id,
        telegramMessageId: {
          not: null,
        },
      },
      include: {
        chat: true,
        from: true,
        replyToMessage: {
          include: {
            from: true,
          },
        },
        newChatMembers: {
          include: {
            user: true,
          },
        },
      },
    });
    this.assertIsTelegramMessageWithRelations(message);

    return message;
  }

  /** Stores a telegram message and its author. */
  async store(
    message: UnstoredMessageWithRelations,
  ): Promise<TelegramMessageWithRelations> {
    if (message.telegramMessageId !== null) {
      const databaseMessage = await this.prisma.message.findUnique({
        where: {
          telegramMessageId_chatId: {
            telegramMessageId: message.telegramMessageId,
            chatId: message.chat.id,
          },
        },
      });
      if (databaseMessage) {
        return this.getWithAllRelations(databaseMessage.id);
      }
    }

    const replyToMessage =
      message.replyToMessage && this.isTelegramMessage(message.replyToMessage)
        ? await this.connectReplyToMessage(message.replyToMessage)
        : undefined;
    const databaseMessage = await this.prisma.message.create({
      data: {
        telegramMessageId: message.telegramMessageId,
        chat: this.connectChat(message.chat),
        sentAt: message.sentAt,
        editedAt: message.editedAt,
        text: message.text,
        replyToMessage: replyToMessage,
        from: this.connectUser(message.from),
        newChatMembers: this.connectNewChatMembers(message),
      },
    });
    return this.getWithAllRelations(databaseMessage.id);
  }

  /** Gets the last message from a chat before the given message id, if there is any. */
  async getLastChatMessage(
    chatId: bigint | number,
    beforeMessageId: number,
  ): Promise<MessageWithUserAndReplyTo | null> {
    return this.prisma.message.findFirst({
      where: {
        chatId: chatId,
        id: {
          lt: beforeMessageId,
        },
      },
      orderBy: {
        id: 'desc',
      },
      include: {
        from: true,
        replyToMessage: true,
      },
    });
  }

  /**
   * Deletes and returns old messages.
   * @return The deleted messages
   */
  async deleteOld(): Promise<MessageWithUser[]> {
    const date7DaysAgo = new Date(Date.now() - SEVEN_DAYS_IN_MILLISECONDS);
    const where7DaysAgo: Prisma.MessageWhereInput = {
      sentAt: {
        lt: date7DaysAgo,
      },
    };
    const messagesToDelete = await this.prisma.message.findMany({
      where: where7DaysAgo,
      include: {
        from: true,
      },
    });
    await this.prisma.message.deleteMany({
      where: where7DaysAgo,
    });
    return messagesToDelete;
  }

  private connectChat(
    chat: Chat,
  ): Prisma.ChatCreateNestedOneWithoutMessagesInput {
    return {
      connectOrCreate: {
        where: {
          id: chat.id,
        },
        create: {
          ...chat,
        },
      },
    };
  }

  private connectUser(
    user: User,
  ): Prisma.UserCreateNestedOneWithoutMessagesInput {
    return {
      connectOrCreate: {
        where: {
          id: user.id,
        },
        create: {
          ...user,
        },
      },
    };
  }

  private connectNewChatMembers(
    message: UnstoredMessageWithRelations,
  ):
    | Prisma.ChatEntryMessagesUsersCreateNestedManyWithoutMessageInput
    | undefined {
    if (!message.newChatMembers?.length) {
      return undefined;
    }

    return {
      connectOrCreate: message.newChatMembers.map((chatEntryMessageUser) => ({
        where: {
          id: {
            messageId: chatEntryMessageUser.messageId,
            userId: chatEntryMessageUser.userId,
          },
        },
        create: {
          messageId: chatEntryMessageUser.messageId,
          user: this.connectUser(chatEntryMessageUser.user),
        },
      })),
    };
  }

  private async connectReplyToMessage(
    message: Omit<TelegramMessage, 'id'>,
  ): Promise<Prisma.MessageCreateNestedOneWithoutRepliesInput | undefined> {
    const replyToMessage = await this.prisma.message.findUnique({
      where: {
        telegramMessageId_chatId: {
          telegramMessageId: message.telegramMessageId,
          chatId: message.chatId,
        },
      },
    });

    if (!replyToMessage) {
      return undefined;
    }

    return {
      connect: {
        id: replyToMessage.id,
      },
    };
  }

  private isTelegramMessage(
    message: Omit<Message, 'id'>,
  ): message is TelegramMessage {
    return message.telegramMessageId !== null;
  }

  private assertIsTelegramMessageWithRelations(
    message: MessageWithRelations,
  ): asserts message is TelegramMessageWithRelations {
    assert(this.isTelegramMessage(message));
    assert(
      !message.replyToMessage || this.isTelegramMessage(message.replyToMessage),
    );
  }
}
