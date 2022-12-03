import assert from "assert";
import TelegramBot from "node-telegram-bot-api";
import {inject, singleton} from "tsyringe";
import {AllowlistedReplyStrategy} from "../AllowlistedReplyStrategy";
import {Config} from "../Config";
import {TelegramService} from "../TelegramService";
import {ReplyGenerator} from "../MessageGenerators/ReplyGenerator";

/**
 * Handles messages mentioning or replying to the bot in allowlisted chats by sending them to GPT-3 for handling.
 */
@singleton()
export class BotMentionReplyStrategy extends AllowlistedReplyStrategy {
    constructor(
        private readonly telegram: TelegramService,
        private readonly replyGenerator: ReplyGenerator,
        @inject('Config') config: Config,
    ) {
        super(config);
    }

    willHandleAllowlisted(message: TelegramBot.Message): boolean {
        if (message.text === undefined) {
            return false;
        }

        return message.text.includes(`@${this.config.username}`) || message.reply_to_message?.from?.username === this.config.username;
    }

    handle(message: TelegramBot.Message): void {
        assert(message.text !== undefined);

        this.replyGenerator.generate(message)
            .then((text: string) => this.telegram.send(text, message.chat));
    }
}
