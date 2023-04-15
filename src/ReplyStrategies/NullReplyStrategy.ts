import {ReplyStrategy} from "../ReplyStrategy";
import TelegramBot from "node-telegram-bot-api";
import {injectable} from "inversify";

/** Handles all messages by doing nothing. */
@injectable()
export class NullReplyStrategy implements ReplyStrategy {
    willHandle(_message: TelegramBot.Message): boolean {
        return true;
    }

    handle(_message: TelegramBot.Message): void {
        // Do nothing.
    }
}
