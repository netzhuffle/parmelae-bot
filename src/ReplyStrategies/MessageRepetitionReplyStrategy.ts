import {ReplyFunction, ReplyStrategy} from "../ReplyStrategy";
import TelegramBot from "node-telegram-bot-api";
import {OneLiners} from "../OneLiners";
import {singleton} from "tsyringe";
import assert from "assert";

/** Repeats a message that two other users wrote. */
@singleton()
export class MessageRepetitionReplyStrategy implements ReplyStrategy {
    private lastMessage: TelegramBot.Message | null = null;

    constructor(private telegram: TelegramBot) {
    }

    willHandle(message: TelegramBot.Message): boolean {
        if (message.text !== undefined) {
            if (this.lastMessage?.text === message.text && this.lastMessage.from?.first_name !== message.from?.first_name) {
                this.lastMessage = null;

                return true;
            }
            this.lastMessage = message;
        }

        return false;
    }

    handle(message: TelegramBot.Message, reply: ReplyFunction): void {
        assert(message.text !== undefined);

        this.telegram.sendMessage(message.chat.id, message.text);
    }
}
