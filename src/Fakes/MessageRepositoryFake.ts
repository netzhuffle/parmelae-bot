import { Prisma } from '../generated/prisma/client.js';
import {
  MessageWithUserReplyToToolMessagesAndToolCallMessages,
  MessageWithUser,
  TelegramMessageWithRelations,
  UnstoredMessageWithRelations,
} from '../Repositories/Types.js';

/**
 * Fake implementation of MessageRepository for testing.
 */
export class MessageRepositoryFake {
  private messages: MessageWithUserReplyToToolMessagesAndToolCallMessages[] =
    [];
  private nextId = 1;

  public getCallArgs: number[] = [];
  public getPreviousChatMessageCallArgs: {
    chatId: bigint | number;
    beforeMessageId: number;
  }[] = [];
  public updateToolCallsCallArgs: {
    messageId: number;
    toolCalls: Prisma.JsonValue;
  }[] = [];

  get(
    id: number,
  ): Promise<MessageWithUserReplyToToolMessagesAndToolCallMessages> {
    this.getCallArgs.push(id);
    const message = this.messages.find((m) => m.id === id);
    if (!message) {
      return Promise.reject(new Error(`Message with id ${id} not found`));
    }
    return Promise.resolve(message);
  }

  getPreviousChatMessage(
    chatId: bigint | number,
    beforeMessageId: number,
  ): Promise<MessageWithUserReplyToToolMessagesAndToolCallMessages | null> {
    this.getPreviousChatMessageCallArgs.push({ chatId, beforeMessageId });

    const messagesInChat = this.messages
      .filter((m) => m.chatId === chatId && m.id < beforeMessageId)
      .sort((a, b) => b.id - a.id);

    return Promise.resolve(messagesInChat[0] ?? null);
  }

  updateToolCalls(
    messageId: number,
    toolCalls: Prisma.JsonValue,
  ): Promise<void> {
    this.updateToolCallsCallArgs.push({ messageId, toolCalls });
    const message = this.messages.find((m) => m.id === messageId);
    if (message) {
      message.toolCalls = toolCalls;
    }
    return Promise.resolve();
  }

  updateToolCallMessages(
    _finalResponseMessageId: number,
    _toolCallMessageIds: number[],
  ): Promise<void> {
    // For testing purposes, we don't need to implement the full logic
    return Promise.resolve();
  }

  addMessage(
    message: Partial<MessageWithUserReplyToToolMessagesAndToolCallMessages>,
  ): MessageWithUserReplyToToolMessagesAndToolCallMessages {
    const fullMessage: MessageWithUserReplyToToolMessagesAndToolCallMessages = {
      id: message.id ?? this.nextId++,
      telegramMessageId: message.telegramMessageId ?? 123,
      chatId: message.chatId ?? BigInt(456),
      fromId: message.fromId ?? BigInt(789),
      sentAt: message.sentAt ?? new Date(),
      editedAt: message.editedAt ?? null,
      replyToMessageId: message.replyToMessageId ?? null,
      text: message.text ?? 'Test message',
      imageFileId: message.imageFileId ?? null,
      stickerFileId: message.stickerFileId ?? null,
      toolCalls: message.toolCalls ?? null,
      messageAfterToolCallsId: message.messageAfterToolCallsId ?? null,
      from: message.from ?? {
        id: BigInt(789),
        isBot: false,
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        languageCode: 'en',
      },
      replyToMessage: message.replyToMessage ?? null,
      toolMessages: message.toolMessages ?? [],
      toolCallMessages: message.toolCallMessages ?? [],
    };

    this.messages.push(fullMessage);
    return fullMessage;
  }

  // Additional methods required by MessageRepository interface

  async store(
    _message: UnstoredMessageWithRelations,
  ): Promise<TelegramMessageWithRelations> {
    return Promise.reject(new Error('store not implemented in fake'));
  }

  async deleteOld(): Promise<MessageWithUser[]> {
    return Promise.reject(new Error('deleteOld not implemented in fake'));
  }

  reset(): void {
    this.messages = [];
    this.getCallArgs = [];
    this.getPreviousChatMessageCallArgs = [];
    this.updateToolCallsCallArgs = [];
    this.nextId = 1;
  }
}
