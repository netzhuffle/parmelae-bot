import TelegramBot from "node-telegram-bot-api";
import {singleton} from "tsyringe";
import {MessageRepository} from "./Repositories/MessageRepository";
import {MessageWithUser, MessageWithUserAndReplyToMessage} from "./Repositories/Types";

/** Finds the conversation history. */
@singleton()
export class MessageHistoryService {
    constructor(private readonly messageRepository: MessageRepository) {
    }

    /**
     * Returns the message and 9 preceding messages.
     *
     * Preceding message is the message replied to, or if it is not a reply, then the message last written before in the
     * same chat, if there is one.
     * @param toMessage - The message to find history to. Must be stored in the database.
     * @return History, from oldest to newest, including the message requested the history for.
     */
    async getHistory(toMessage: TelegramBot.Message): Promise<MessageWithUser[]> {
        const message = await this.messageRepository.get(toMessage);
        return this.getHistoryForMessages([message]);
    }

    /** Recursively fetches older messages until 10 messages are found or there are no more old messages. */
    private async getHistoryForMessages(messages: MessageWithUserAndReplyToMessage[]): Promise<MessageWithUser[]> {
        if (messages.length >= 10) {
            return messages;
        }

        const oldestMessage = messages[0];

        // If the oldest message is a reply, then the preceding message is the message replied to.
        if (oldestMessage.replyToMessage) {
            const messageRepliedTo = await this.messageRepository.get(oldestMessage.replyToMessage);
            return this.getHistoryForMessages([
                messageRepliedTo,
                ...messages,
            ]);
        }

        // Fallback to last message in chat if there is one.
        const precedingMessage = await this.messageRepository.getLastChatMessage(oldestMessage.chatId, oldestMessage.messageId);
        if (precedingMessage) {
            return this.getHistoryForMessages([
                precedingMessage,
                ...messages,
            ]);
        }

        // No preceding message found
        return messages;
    }
}
