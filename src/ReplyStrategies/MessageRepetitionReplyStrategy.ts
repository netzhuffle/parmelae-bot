import {ReplyStrategy} from "../ReplyStrategy";
import TelegramBot from "node-telegram-bot-api";
import {singleton} from "tsyringe";
import assert from "assert";
import {TelegramService} from "../TelegramService";
import {Sticker} from "../Sticker";

/** Repeats a message that two other users wrote. */
@singleton()
export class MessageRepetitionReplyStrategy implements ReplyStrategy {
    private lastMessage: TelegramBot.Message | null = null;

    constructor(private telegram: TelegramService) {
    }

    willHandle(message: TelegramBot.Message): boolean {
        if (this.lastMessage?.from?.first_name === message.from?.first_name) {
            // Same author: Don’t repeat.
            this.lastMessage = message;
            return false;
        }

        if (message.text && this.lastMessage?.text === message.text) {
            // Same text: Repeat.
            this.lastMessage = null;
            return true;
        }

        if (message.sticker && this.lastMessage?.sticker?.file_unique_id === message.sticker.file_unique_id) {
            // Same sticker: Repeat.
            this.lastMessage = null;
            return true;
        }

        // Different message: Don’t repeat.
        this.lastMessage = message;
        return false;
    }

    handle(message: TelegramBot.Message): void {
        if (message.text) {
            this.telegram.send(message.text, message.chat);
        } else {
            assert(message.sticker);
            this.telegram.send(new Sticker(message.sticker.file_id), message.chat);
        }
    }
}
