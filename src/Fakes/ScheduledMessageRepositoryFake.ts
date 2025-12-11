import { ScheduledMessageModel } from '../generated/prisma/models/ScheduledMessage.js';

/**
 * Fake implementation of ScheduledMessageRepository for testing.
 */
export class ScheduledMessageRepositoryFake {
  private scheduledMessages: ScheduledMessageModel[] = [];
  private nextId = 1;

  public createCallArgs: {
    sendAt: Date;
    text: string;
    chatId: bigint;
    fromId: bigint;
  }[] = [];
  public deleteCallArgs: number[] = [];
  public retrieveAllCallArgs: unknown[] = [];
  public createShouldThrow = false;
  public createError: Error | null = null;

  /** Stores a scheduled message. */
  async create(
    sendAt: Date,
    text: string,
    chatId: bigint,
    fromId: bigint,
  ): Promise<ScheduledMessageModel> {
    this.createCallArgs.push({ sendAt, text, chatId, fromId });

    if (this.createShouldThrow) {
      const error = this.createError ?? new Error('Database error');
      return Promise.reject(error);
    }

    const scheduledMessage: ScheduledMessageModel = {
      id: this.nextId++,
      chatId,
      fromId,
      sendAt,
      scheduledAt: new Date(),
      text,
    };

    this.scheduledMessages.push(scheduledMessage);
    return Promise.resolve(scheduledMessage);
  }

  /** Deletes a scheduled message. */
  async delete(id: number): Promise<ScheduledMessageModel> {
    this.deleteCallArgs.push(id);

    const index = this.scheduledMessages.findIndex((m) => m.id === id);
    if (index === -1) {
      return Promise.reject(
        new Error(`ScheduledMessage with id ${id} not found`),
      );
    }

    const message = this.scheduledMessages[index];
    this.scheduledMessages.splice(index, 1);
    return Promise.resolve(message);
  }

  /** Returns the list of all scheduled messages. */
  retrieveAll(): Promise<ScheduledMessageModel[]> {
    this.retrieveAllCallArgs.push(null);
    return Promise.resolve([...this.scheduledMessages]);
  }

  /** Test helper to add scheduled messages directly. */
  addScheduledMessage(
    message: Partial<ScheduledMessageModel>,
  ): ScheduledMessageModel {
    const fullMessage: ScheduledMessageModel = {
      id: message.id ?? this.nextId++,
      chatId: message.chatId ?? BigInt(456),
      fromId: message.fromId ?? BigInt(789),
      sendAt: message.sendAt ?? new Date(),
      scheduledAt: message.scheduledAt ?? new Date(),
      text: message.text ?? 'Test message',
    };

    this.scheduledMessages.push(fullMessage);
    return fullMessage;
  }

  reset(): void {
    this.scheduledMessages = [];
    this.nextId = 1;
    this.createCallArgs = [];
    this.deleteCallArgs = [];
    this.retrieveAllCallArgs = [];
    this.createShouldThrow = false;
    this.createError = null;
  }
}
