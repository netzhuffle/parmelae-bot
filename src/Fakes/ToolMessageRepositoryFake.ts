import { ToolMessageModel } from '../generated/prisma/models/ToolMessage.js';

/**
 * Fake implementation of ToolMessageRepository for testing.
 */
export class ToolMessageRepositoryFake {
  private toolMessages: ToolMessageModel[] = [];
  private nextId = 1;

  public storeCallArgs: {
    toolCallId: string;
    text: string;
    messageId: number;
  }[] = [];

  store(data: {
    toolCallId: string;
    text: string;
    messageId: number;
  }): Promise<void> {
    this.storeCallArgs.push(data);
    this.toolMessages.push({
      id: this.nextId++,
      toolCallId: data.toolCallId,
      text: data.text,
      messageId: data.messageId,
    });
    return Promise.resolve();
  }

  reset(): void {
    this.toolMessages = [];
    this.storeCallArgs = [];
    this.nextId = 1;
  }
}
