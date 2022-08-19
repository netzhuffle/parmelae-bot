import assert from "assert";
import TelegramBot from "node-telegram-bot-api";
import { Wit } from "node-wit";
import {inject, singleton } from "tsyringe";
import { AllowlistedReplyStrategy } from "../AllowlistedReplyStrategy";
import { CommandService } from "../CommandService";
import { Config } from "../Config";
import { Gpt3 } from "../Gpt3";
import { ReplyFunction } from "../ReplyStrategy";

/**
 * Handles messages mentioning the bot in allowlisted chats by sending them to Wit for handling.
 *
 * Wit will decide if the message can be executed as a program or should be sent to GPT-3 to generate a reply.
 */
@singleton()
export class WitReplyStrategy extends AllowlistedReplyStrategy {
    private readonly usernameRegex: RegExp;

    constructor(
        private readonly wit: Wit,
        private readonly commandService: CommandService,
        private readonly gpt3: Gpt3,
        @inject('Config') config: Config,
        ) {
        super(config);
        this.usernameRegex = new RegExp(`^(.*)@${this.config.username}(.*)$`, 'is');
    }

    willHandleAllowlisted(message: TelegramBot.Message): boolean {
        return message.text !== undefined && this.usernameRegex.test(message.text);
    }

    handle(message: TelegramBot.Message, reply: ReplyFunction): void {
        assert(message.text !== undefined);

        const matches = message.text.match(this.usernameRegex);
        assert(matches !== null);
        assert(matches.length === 3);
        const [, part1, part2] = matches;

        let witMessage = part1 + part2;
        if (part1.endsWith(' ')) {
            witMessage = part1.substring(0, part1.length - 1) + part2;
        }
        this.wit.message(witMessage, {}).then(data => {
            const intents = data.intents;
            if (intents && intents[0]) {
                const intent = intents[0].name;
                this.commandService.execute(intent, message, reply.bind(this));
            } else {
                this.gpt3.replyCheaper(witMessage, (text: string) => reply(text, message));
            }
        });
    }
}
