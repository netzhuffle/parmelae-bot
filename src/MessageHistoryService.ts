import { injectable } from 'inversify';
import { MessageRepository } from './Repositories/MessageRepository.js';
import {
  MessageWithUser,
  MessageWithUserAndReplyTo,
} from './Repositories/Types.js';

/** Finds the conversation history. */
@injectable()
export class MessageHistoryService {
  constructor(private readonly messageRepository: MessageRepository) {}

  /**
   * Returns the message and 9 preceding messages.
   *
   * Preceding message is the message replied to, or if it is not a reply, then the message last written before in the
   * same chat, if there is one.
   * @param toMessageId - The message id to find history to.
   * @return History, from oldest to newest, including the message requested the history for.
   */
  async getHistory(toMessageId: number): Promise<MessageWithUser[]> {
    const message = await this.messageRepository.get(toMessageId);
    return this.getHistoryForMessages([message]);
  }

  /** Recursively fetches older messages until 10 messages are found or there are no more old messages. */
  private async getHistoryForMessages(
    messages: MessageWithUserAndReplyTo[],
  ): Promise<MessageWithUser[]> {
    if (messages.length >= 10) {
      return messages;
    }

    const oldestMessage = messages[0];

    // If the oldest message is a reply, then the preceding message is the message replied to.
    if (oldestMessage.replyToMessage) {
      const messageRepliedTo = await this.messageRepository.get(
        oldestMessage.replyToMessage.id,
      );
      return this.getHistoryForMessages([messageRepliedTo, ...messages]);
    }

    // Fallback to last message in chat if there is one.
    const precedingMessage = await this.messageRepository.getLastChatMessage(
      oldestMessage.chatId,
      oldestMessage.id,
    );
    if (precedingMessage) {
      return this.getHistoryForMessages([precedingMessage, ...messages]);
    }

    // No preceding message found
    return messages;
  }
}
