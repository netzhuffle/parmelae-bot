import assert from "assert";
import TelegramBot from "node-telegram-bot-api";
import {singleton} from "tsyringe";
import {MessageRepository} from "./Repositories/MessageRepository";
import {MessageWithUser} from "./Repositories/Types";

/** Finds the conversation history. */
@singleton()
export class MessageHistoryService {
    constructor(private readonly messageRepository: MessageRepository) {
    }

    /**
     * Returns the message and its preceding message.
     *
     * Preceding message is the message replied to, or if it is not a reply, then the message last written before in the
     * same chat, if there is one.
     * @param toMessage - The message to find history to. Must be stored in the database.
     * @return History, from oldest to newest, including the message requested the history for.
     */
    async getHistory(toMessage: TelegramBot.Message): Promise<MessageWithUser[]> {
        const message = await this.messageRepository.get(toMessage);
        assert(message);

        if (message.replyToMessage) {
            // Preceding message is the message replied to.
            return [
                message.replyToMessage,
                message,
            ];
        }

        // Fallback to last message in chat if there is one.
        const lastMessage = await this.messageRepository.getLastChatMessage(toMessage.chat.id, [toMessage.message_id]);
        if (lastMessage) {
            return [
                lastMessage,
                message,
            ];
        }

        // No preceding message found
        return [
            message,
        ];
    }
}
