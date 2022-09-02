import TelegramBot from "node-telegram-bot-api";
import {singleton} from "tsyringe";
import {MessageRepository} from "./Repositories/MessageRepository";

/** Handles the message database storage. */
@singleton()
export class MessageStorageService {
    constructor(private readonly messageRepository: MessageRepository) {
    }

    /** Stores a message and its author. */
    async store(message: TelegramBot.Message): Promise<void> {
        if (!message.from || !message.text) {
            // Only store messages from a user that contain text.
            return;
        }

        await this.messageRepository.store(message);
    }
}
