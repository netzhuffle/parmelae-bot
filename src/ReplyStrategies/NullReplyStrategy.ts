import {ReplyStrategy} from "../ReplyStrategy";
import TelegramBot from "node-telegram-bot-api";
import {singleton} from "tsyringe";

/** Handles all messages by doing nothing. */
@singleton()
export class NullReplyStrategy implements ReplyStrategy {
    willHandle(_message: TelegramBot.Message): boolean {
        return true;
    }

    handle(_message: TelegramBot.Message): void {
        // Do nothing.
    }
}
