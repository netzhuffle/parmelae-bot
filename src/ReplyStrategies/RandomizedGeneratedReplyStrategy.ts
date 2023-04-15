import assert from "assert";
import TelegramBot from "node-telegram-bot-api";
import {injectable} from "inversify";
import {AllowlistedReplyStrategy} from "../AllowlistedReplyStrategy";
import {Config} from "../Config";
import {TelegramService} from "../TelegramService";
import {ReplyGenerator} from "../MessageGenerators/ReplyGenerator";

/** How likely the bot randomly replies to a message. 1 = 100%. */
const RANDOM_REPLY_PROBABILITY = 0.035;

/** Picks a message by random chance to reply with the reply generator. */
@injectable()
export class RandomizedGeneratedReplyStrategy extends AllowlistedReplyStrategy {
    constructor(
        private readonly telegram: TelegramService,
        private readonly replyGenerator: ReplyGenerator,
        config: Config,
    ) {
        super(config);
    }


    willHandleAllowlisted(message: TelegramBot.Message): boolean {
        return message.text !== undefined && Math.random() < RANDOM_REPLY_PROBABILITY;
    }

    async handle(message: TelegramBot.Message): Promise<void> {
        assert(message.text !== undefined);

        const reply = await this.replyGenerator.generate(message)
        return this.telegram.reply(reply, message);
    }
}
