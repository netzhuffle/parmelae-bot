import { MessageWithUserAndToolMessages } from '../Repositories/Types.js';

/**
 * Fake implementation of MessageHistoryService for testing.
 */
export class MessageHistoryServiceFake {
  private messages: MessageWithUserAndToolMessages[] = [];

  public getHistoryCallArgs: { toMessageId: number; messageCount: number }[] =
    [];

  getHistory(
    toMessageId: number,
    messageCount: number,
  ): Promise<MessageWithUserAndToolMessages[]> {
    this.getHistoryCallArgs.push({ toMessageId, messageCount });
    return Promise.resolve(this.messages.slice(0, messageCount));
  }

  setMessages(messages: MessageWithUserAndToolMessages[]): void {
    this.messages = messages;
  }

  private async getHistoryForMessages(
    _messageIds: number[],
  ): Promise<MessageWithUserAndToolMessages[]> {
    return Promise.reject(
      new Error('getHistoryForMessages not implemented in fake'),
    );
  }

  reset(): void {
    this.messages = [];
    this.getHistoryCallArgs = [];
  }
}
