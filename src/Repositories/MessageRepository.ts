import { Chat, Message, Prisma, PrismaClient, User } from '@prisma/client';
import { injectable } from 'inversify';
import assert from 'node:assert/strict';
import {
  MessageWithRelations,
  MessageWithUser,
  MessageWithUserReplyToToolMessagesAndToolCallMessages,
  TelegramMessage,
  TelegramMessageWithRelations,
  UnstoredMessageWithRelations,
} from './Types.js';

/** Number of milliseconds in a day */
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

/** Number of milliseconds in 7 days */
const SEVEN_DAYS_IN_MILLISECONDS = 7 * DAY_IN_MILLISECONDS;

/** Include pattern for telegram messages with telegram-specific relations */
const TELEGRAM_MESSAGE_INCLUDE = Prisma.validator<Prisma.MessageDefaultArgs>()({
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

/** Include pattern for conversation messages with full tool context */
const CONVERSATION_MESSAGE_INCLUDE =
  Prisma.validator<Prisma.MessageDefaultArgs>()({
    include: {
      from: true,
      replyToMessage: true,
      toolMessages: true,
      toolCallMessages: {
        include: {
          from: true,
          replyToMessage: true,
          toolMessages: true,
        },
      },
    },
  });

/** Repository for messages */
@injectable()
export class MessageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Returns the full message including user, reply-to, tool messages, and tool call messages relations. */
  async get(
    id: number,
  ): Promise<MessageWithUserReplyToToolMessagesAndToolCallMessages> {
    return this.prisma.message.findUniqueOrThrow({
      where: {
        id,
      },
      ...CONVERSATION_MESSAGE_INCLUDE,
    });
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
        ...TELEGRAM_MESSAGE_INCLUDE,
      });
      if (databaseMessage) {
        this.assertIsTelegramMessageWithRelations(databaseMessage);
        return databaseMessage;
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
        imageFileId: message.imageFileId,
        replyToMessage: replyToMessage,
        from: this.connectUser(message.from),
        newChatMembers: this.connectNewChatMembers(message),
      },
      ...TELEGRAM_MESSAGE_INCLUDE,
    });
    this.assertIsTelegramMessageWithRelations(databaseMessage);
    return databaseMessage;
  }

  /** Gets the previous message from a chat before the given message id, if there is any. */
  async getPreviousChatMessage(
    chatId: bigint | number,
    beforeMessageId: number,
  ): Promise<MessageWithUserReplyToToolMessagesAndToolCallMessages | null> {
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
      ...CONVERSATION_MESSAGE_INCLUDE,
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

  /**
   * Updates the toolCalls field for a message.
   * @param messageId - The ID of the message to update.
   * @param toolCalls - The tool calls JSON data to store.
   */
  async updateToolCalls(
    messageId: number,
    toolCalls: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.message.update({
      where: { id: messageId },
      data: { toolCalls },
    });
  }

  /**
   * Links a final response message to its associated tool call messages.
   * @param finalResponseMessageId - The ID of the final response message.
   * @param toolCallMessageIds - The IDs of the tool call messages to link.
   */
  async updateToolCallMessages(
    finalResponseMessageId: number,
    toolCallMessageIds: number[],
  ): Promise<void> {
    if (toolCallMessageIds.length === 0) {
      return; // No tool call messages to link
    }

    await this.prisma.message.update({
      where: { id: finalResponseMessageId },
      data: {
        toolCallMessages: {
          connect: toolCallMessageIds.map((id) => ({ id })),
        },
      },
    });
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
