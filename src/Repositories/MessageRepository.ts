import { Chat, Message, Prisma, PrismaClient, User } from '@prisma/client';
import { injectable } from 'inversify';
import {
  MessageWithRelations,
  MessageWithUser,
  MessageWithUserAndReplyTo,
} from './Types';

/** Number of milliseconds in a day */
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

/** Number of milliseconds in 7 days */
const SEVEN_DAYS_IN_MILLISECONDS = 7 * DAY_IN_MILLISECONDS;

/** Repository for messages */
@injectable()
export class MessageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Returns the full message including relations.
   *
   * The message must be in the database.
   */
  async get(message: Message): Promise<MessageWithUserAndReplyTo> {
    return this.prisma.message.findUniqueOrThrow({
      where: {
        id: this.getMessageId(message),
      },
      include: {
        from: true,
        replyToMessage: true,
      },
    });
  }

  /** Stores a message and its author. */
  async store(message: MessageWithRelations): Promise<void> {
    const databaseMessage = await this.prisma.message.findUnique({
      where: {
        id: this.getMessageId(message),
      },
    });
    if (databaseMessage) {
      // Message already stored.
      return;
    }

    const replyToMessage = message.replyToMessage
      ? await this.connectReplyToMessage(message.replyToMessage)
      : undefined;
    await this.prisma.message.create({
      data: {
        messageId: message.messageId,
        chat: this.connectChat(message.chat),
        sentAt: message.sentAt,
        editedAt: message.editedAt,
        text: message.text,
        replyToMessage: replyToMessage,
        from: this.connectUser(message.from),
        newChatMembers: this.connectNewChatMembers(message),
      },
    });
  }

  /** Gets the last message from a chat before the given messageId, if there is any. */
  async getLastChatMessage(
    chatId: bigint | number,
    beforeMessageId: number,
  ): Promise<MessageWithUserAndReplyTo | null> {
    // Assumes that messageIds in the same chat are always increasing.
    return this.prisma.message.findFirst({
      where: {
        chatId: chatId,
        messageId: {
          lt: beforeMessageId,
        },
      },
      orderBy: {
        messageId: 'desc',
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

  private getMessageId(message: Message): Prisma.MessageIdCompoundUniqueInput {
    return {
      messageId: message.messageId,
      chatId: message.chatId,
    };
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
    message: MessageWithRelations,
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
            chatId: chatEntryMessageUser.chatId,
            userId: chatEntryMessageUser.userId,
          },
        },
        create: {
          messageId: chatEntryMessageUser.messageId,
          chatId: chatEntryMessageUser.chatId,
          user: this.connectUser(chatEntryMessageUser.user),
        },
      })),
    };
  }

  private async connectReplyToMessage(
    message: Message,
  ): Promise<Prisma.MessageCreateNestedOneWithoutRepliesInput | undefined> {
    // Querying to make sure the message replied to exists in the database.
    const replyToMessage = await this.prisma.message.findUnique({
      where: {
        id: this.getMessageId(message),
      },
    });

    if (!replyToMessage) {
      return undefined;
    }

    return {
      connect: {
        id: this.getMessageId(replyToMessage),
      },
    };
  }
}
