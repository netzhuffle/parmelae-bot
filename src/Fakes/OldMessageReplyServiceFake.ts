import { MessageWithUser } from '../Repositories/Types.js';

/**
 * Fake implementation of OldMessageReplyService for testing.
 */
export class OldMessageReplyServiceFake {
  public replyCallArgs: MessageWithUser[][] = [];

  /**
   * Replies to random old messages with a certain probability.
   *
   * Not more than 1 message per chat receives a reply.
   * @param oldMessages List of old messages
   */
  async reply(oldMessages: MessageWithUser[]): Promise<void> {
    this.replyCallArgs.push(oldMessages);
    return Promise.resolve();
  }

  reset(): void {
    this.replyCallArgs = [];
  }
}
