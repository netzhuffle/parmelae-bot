import assert from "assert";
import TelegramBot from "node-telegram-bot-api";
import { injectable } from "inversify";
import { AllowlistedReplyStrategy } from "../AllowlistedReplyStrategy";
import { Config } from "../Config";
import { TelegramService } from "../TelegramService";
import { ReplyGenerator } from "../MessageGenerators/ReplyGenerator";

/**
 * Handles messages mentioning or replying to the bot in allowlisted chats.
 */
@injectable()
export class BotMentionReplyStrategy extends AllowlistedReplyStrategy {
    constructor(
        private readonly telegram: TelegramService,
        private readonly replyGenerator: ReplyGenerator,
        config: Config,
    ) {
        super(config);
    }

    willHandleAllowlisted(message: TelegramBot.Message): boolean {
        if (message.text === undefined) {
            return false;
        }

        return message.text.includes(`@${this.config.username}`) || message.reply_to_message?.from?.username === this.config.username;
    }

    async handle(message: TelegramBot.Message): Promise<void> {
        assert(message.text !== undefined);

        const text = await this.replyGenerator.generate(message);
        return this.telegram.send(text, message.chat);
    }
}
