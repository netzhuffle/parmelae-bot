import {ReplyFunction, ReplyStrategy} from "../ReplyStrategy";
import TelegramBot from "node-telegram-bot-api";
import {OneLiners} from "../OneLiners";
import {singleton} from "tsyringe";
import assert from "assert";

/** Welcomes new chat members. */
@singleton()
export class NewMembersReplyStrategy implements ReplyStrategy {
    private readonly oneLiners: OneLiners;

    constructor(oneLiners: OneLiners) {
        this.oneLiners = oneLiners;
    }

    willHandle(message: TelegramBot.Message): boolean {
        if (message.new_chat_members === undefined) {
            return false;
        }

        return message.new_chat_members.length >= 1;
    }

    handle(message: TelegramBot.Message, reply: ReplyFunction): void {
        assert(message.new_chat_members);
        
        message.new_chat_members.forEach(user => {
            const randomMessage = this.oneLiners.getRandomMessage(user.first_name);
            reply(randomMessage, message);
        });
    }
}
