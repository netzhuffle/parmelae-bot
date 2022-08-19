import {ReplyFunction, ReplyStrategy} from "./ReplyStrategy";
import TelegramBot from "node-telegram-bot-api";
import {Config} from "./Config";
import { inject } from "tsyringe";

/** Abstract ReplyStrategy for allowlisted chats and allowlisted private message senders only */
export abstract class AllowlistedReplyStrategy implements ReplyStrategy {
    constructor(@inject('Config') protected readonly config: Config) {
    }

    willHandle(message: TelegramBot.Message): boolean {
        if (message.chat.type === 'private' && message.from && !this.config.senderAllowlist.includes(message.from.id)) {
            return false;
        }

        if (message.chat.type !== 'private' && !this.config.chatAllowlist.includes(message.chat.id)) {
            return false;
        }

        return this.willHandleAllowlisted(message);
    }

    /**
     * Whether the strategy will handle the message in an allowlisted chat or allowlisted private message sender.
     *
     * Will only be called if no other strategy handled the message before and if the message is in an allowlisted chat
     * or if the private message sender is allowlisted.
     */
    abstract willHandleAllowlisted(message: TelegramBot.Message): boolean;

    abstract handle(message: TelegramBot.Message, reply: ReplyFunction): void;
}
