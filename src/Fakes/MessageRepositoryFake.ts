import { PrismaClient, Prisma } from '@prisma/client';
import {
  MessageWithUserReplyToAndToolMessages,
  MessageWithUser,
  TelegramMessageWithRelations,
  UnstoredMessageWithRelations,
} from '../Repositories/Types.js';

/**
 * Fake implementation of MessageRepository for testing.
 */
export class MessageRepositoryFake {
  private readonly prisma = {} as PrismaClient;
  private messages: MessageWithUserReplyToAndToolMessages[] = [];
  private nextId = 1;

  public getCallArgs: number[] = [];
  public getLastChatMessageCallArgs: {
    chatId: bigint | number;
    beforeMessageId: number;
  }[] = [];
  public updateToolCallsCallArgs: {
    messageId: number;
    toolCalls: Prisma.JsonValue;
  }[] = [];

  get(id: number): Promise<MessageWithUserReplyToAndToolMessages> {
    this.getCallArgs.push(id);
    const message = this.messages.find((m) => m.id === id);
    if (!message) {
      throw new Error(`Message with id ${id} not found`);
    }
    return Promise.resolve(message);
  }

  getLastChatMessage(
    chatId: bigint | number,
    beforeMessageId: number,
  ): Promise<MessageWithUserReplyToAndToolMessages | null> {
    this.getLastChatMessageCallArgs.push({ chatId, beforeMessageId });

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

  addMessage(
    message: Partial<MessageWithUserReplyToAndToolMessages>,
  ): MessageWithUserReplyToAndToolMessages {
    const fullMessage: MessageWithUserReplyToAndToolMessages = {
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
    };

    this.messages.push(fullMessage);
    return fullMessage;
  }

  // Additional methods required by MessageRepository interface
  async getWithAllRelations(
    _id: number,
  ): Promise<TelegramMessageWithRelations> {
    return Promise.reject(
      new Error('getWithAllRelations not implemented in fake'),
    );
  }

  async store(
    _message: UnstoredMessageWithRelations,
  ): Promise<TelegramMessageWithRelations> {
    return Promise.reject(new Error('store not implemented in fake'));
  }

  async deleteOld(): Promise<MessageWithUser[]> {
    return Promise.reject(new Error('deleteOld not implemented in fake'));
  }

  // Private methods required by MessageRepository interface
  private connectChat(): unknown {
    throw new Error('connectChat not implemented in fake');
  }

  private connectUser(): unknown {
    throw new Error('connectUser not implemented in fake');
  }

  private connectNewChatMembers(): unknown {
    throw new Error('connectNewChatMembers not implemented in fake');
  }

  private async connectReplyToMessage(
    _toolCallArgs: unknown,
  ): Promise<unknown> {
    return Promise.reject(
      new Error('connectReplyToMessage not implemented in fake'),
    );
  }

  private isTelegramMessage(): boolean {
    throw new Error('isTelegramMessage not implemented in fake');
  }

  private assertIsTelegramMessageWithRelations(): void {
    throw new Error(
      'assertIsTelegramMessageWithRelations not implemented in fake',
    );
  }

  reset(): void {
    this.messages = [];
    this.getCallArgs = [];
    this.getLastChatMessageCallArgs = [];
    this.updateToolCallsCallArgs = [];
    this.nextId = 1;
  }
}
