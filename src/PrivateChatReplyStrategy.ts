import {ReplyFunction, ReplyStrategy} from "./ReplyStrategy";
import TelegramBot from "node-telegram-bot-api";

/** Abstract ReplyStrategy for private chats only */
export abstract class PrivateChatReplyStrategy implements ReplyStrategy {
    willHandle(message: TelegramBot.Message): boolean {
        if (message.chat.type !== 'private') {
            return false;
        }

        return this.willHandlePrivate(message);
    }

    /**
     * Whether the strategy will handle the message in a private chat.
     *
     * Will only be called if no other strategy handled the message before and if the message is in a private chat with
     * the bot.
     */
    abstract willHandlePrivate(message: TelegramBot.Message): boolean;

    abstract handle(message: TelegramBot.Message, reply: ReplyFunction): void;
}
