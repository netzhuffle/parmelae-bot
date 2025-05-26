import { injectable } from 'inversify';
import { MessageRepository } from './Repositories/MessageRepository.js';
import {
  MessageWithUserAndToolMessages,
  MessageWithUserReplyToAndToolMessages,
  MessageWithUserReplyToToolMessagesAndToolCallMessages,
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
    const messageWithToolCallMessages =
      this.expandMessageWithToolCallMessages(message);
    return this.getHistoryForMessages(
      [...messageWithToolCallMessages],
      messageCount,
    );
  }

  /** Recursively fetches older messages until enough messages are found or there are no more old messages. */
  private async getHistoryForMessages(
    messages: MessageWithUserReplyToAndToolMessages[],
    totalCount: number,
  ): Promise<MessageWithUserReplyToAndToolMessages[]> {
    if (messages.length >= totalCount) {
      return messages;
    }

    const oldestMessage = messages[0];

    // If the oldest message is a reply, then the preceding message is the message replied to.
    if (oldestMessage.replyToMessage) {
      const messageRepliedTo = await this.messageRepository.get(
        oldestMessage.replyToMessage.id,
      );
      const messageRepliedToAndToolCallMessages =
        this.expandMessageWithToolCallMessages(messageRepliedTo);
      return this.getHistoryForMessages(
        [...messageRepliedToAndToolCallMessages, ...messages],
        totalCount,
      );
    }

    // Fallback to previous message in chat if there is one.
    const precedingMessage =
      await this.messageRepository.getPreviousChatMessage(
        oldestMessage.chatId,
        oldestMessage.id,
      );
    if (precedingMessage) {
      const precedingMessageAndToolCallMessages =
        this.expandMessageWithToolCallMessages(precedingMessage);
      return this.getHistoryForMessages(
        [...precedingMessageAndToolCallMessages, ...messages],
        totalCount,
      );
    }

    // No preceding message found
    return messages;
  }

  /**
   * Expands a message to include the tool call messages it is based on in chronological order.
   * This ensures the conversation flow: user message → tool call announcements → tool responses → AI reply.
   */
  private expandMessageWithToolCallMessages(
    message: MessageWithUserReplyToToolMessagesAndToolCallMessages,
  ): MessageWithUserReplyToAndToolMessages[] {
    const expandedMessages: MessageWithUserReplyToAndToolMessages[] = [];

    // Add any tool call messages that this message is based on
    if (message.toolCallMessages.length > 0) {
      // Sort tool call messages by ID to ensure chronological order
      const sortedToolCallMessages = [...message.toolCallMessages].sort(
        (a, b) => a.id - b.id,
      );

      // Add each tool call message to the expanded list
      expandedMessages.push(...sortedToolCallMessages);
    }

    // Add the main message
    expandedMessages.push(message);

    return expandedMessages;
  }
}
