import { injectable } from 'inversify';
import { MessageRepository } from './Repositories/MessageRepository.js';
import {
  MessageWithUserAndToolMessages,
  MessageWithUserReplyToAndToolMessages,
} from './Repositories/Types.js';

/** Finds the conversation history. */
@injectable()
export class MessageHistoryService {
  constructor(private readonly messageRepository: MessageRepository) {}

  /**
   * Returns the message and a specified number of preceding messages.
   *
   * Preceding message is the message replied to, or if it is not a reply, then the message last written before in the
   * same chat, if there is one.
   * @param toMessageId - The message id to find history to.
   * @param messageCount - The number of messages to return.
   * @return History, from oldest to newest, including the message requested the history for.
   */
  async getHistory(
    toMessageId: number,
    messageCount: number,
  ): Promise<MessageWithUserAndToolMessages[]> {
    const message = await this.messageRepository.get(toMessageId);
    return this.getHistoryForMessages([message], messageCount);
  }

  /** Recursively fetches older messages until enough messages are found or there are no more old messages. */
  private async getHistoryForMessages(
    messages: MessageWithUserReplyToAndToolMessages[],
    totalCount: number,
  ): Promise<MessageWithUserAndToolMessages[]> {
    if (messages.length >= totalCount) {
      return messages;
    }

    const oldestMessage = messages[0];

    // If the oldest message is a reply, then the preceding message is the message replied to.
    if (oldestMessage.replyToMessage) {
      const messageRepliedTo = await this.messageRepository.get(
        oldestMessage.replyToMessage.id,
      );
      return this.getHistoryForMessages(
        [messageRepliedTo, ...messages],
        totalCount,
      );
    }

    // Fallback to last message in chat if there is one.
    const precedingMessage = await this.messageRepository.getLastChatMessage(
      oldestMessage.chatId,
      oldestMessage.id,
    );
    if (precedingMessage) {
      return this.getHistoryForMessages(
        [precedingMessage, ...messages],
        totalCount,
      );
    }

    // No preceding message found
    return messages;
  }
}
