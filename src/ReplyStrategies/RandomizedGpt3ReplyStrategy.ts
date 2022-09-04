import assert from "assert";
import TelegramBot from "node-telegram-bot-api";
import {inject, singleton} from "tsyringe";
import {AllowlistedReplyStrategy} from "../AllowlistedReplyStrategy";
import {Config} from "../Config";
import {Gpt3Service} from "../Gpt3Service";
import {TelegramService} from "../TelegramService";

/** How likely the bot randomly replies to a message. 1 = 100%. */
const RANDOM_REPLY_PROBABILITY = 0.035;

/** Picks a message by random chance to reply with GPT-3. */
@singleton()
export class RandomizedGpt3ReplyStrategy extends AllowlistedReplyStrategy {
    constructor(
        private readonly telegram: TelegramService,
        private readonly gpt3: Gpt3Service,
        @inject('Config') config: Config,
    ) {
        super(config);
    }


    willHandleAllowlisted(message: TelegramBot.Message): boolean {
        return message.text !== undefined && Math.random() < RANDOM_REPLY_PROBABILITY;
    }

    handle(message: TelegramBot.Message): void {
        assert(message.text !== undefined);

        this.gpt3.reply(message)
            .then((text: string) => this.telegram.reply(text, message));
    }
}
