import assert from "assert";
import TelegramBot from "node-telegram-bot-api";
import {singleton} from "tsyringe";
import {AllowlistedReplyStrategy} from "../AllowlistedReplyStrategy";
import {CommandService} from "../CommandService";
import {Config} from "../Config";
import {Commands} from "../Command";
import {TelegramService} from "../TelegramService";

/**
 * Comments a message (/comment command) when somebody replies with (just) the bot’s name.
 */
@singleton()
export class CommentReplyStrategy extends AllowlistedReplyStrategy {
    private readonly onlyUsernameRegex: RegExp;

    constructor(
        private readonly command: CommandService,
        config: Config,
        private readonly telegram: TelegramService,
    ) {
        super(config);
        this.onlyUsernameRegex = new RegExp(`^@\w*${this.config.username}\w*$`, 'is');
    }

    willHandleAllowlisted(message: TelegramBot.Message): boolean {
        return message.text !== undefined && this.onlyUsernameRegex.test(message.text);
    }

    handle(message: TelegramBot.Message): void {
        assert(message.text !== undefined);

        this.command.execute(Commands.Comment, message)
            .then(reply => this.telegram.reply(reply, message));
    }
}
