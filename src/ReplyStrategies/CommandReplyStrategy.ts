import {ReplyFunction, ReplyStrategy} from "../ReplyStrategy";
import TelegramBot from "node-telegram-bot-api";
import {inject, singleton} from "tsyringe";
import assert from "assert";
import {AllowlistedReplyStrategy} from "../AllowlistedReplyStrategy";
import {CommandService} from "../CommandService";
import {Config} from "../Config";

/** Regex matching the command name. */
const COMMAND_NAME = /^\/(.*)@/;

/** Executes commands written as /xyz@BotName in allowlisted chats. */
@singleton()
export class CommandReplyStrategy extends AllowlistedReplyStrategy {
    constructor(
        private readonly commandService: CommandService,
        @inject('Config') config: Config,
    ) {
        super(config);
    }

    willHandleAllowlisted(message: TelegramBot.Message): boolean {
        return message.text !== undefined && COMMAND_NAME.test(message.text);
    }

    handle(message: TelegramBot.Message, reply: ReplyFunction) {
        assert(message.text !== undefined);

        const commandMatches = message.text.match(COMMAND_NAME);
        assert(commandMatches && commandMatches.length >= 2);

        this.commandService.execute(commandMatches[1], message, reply);
    }
}
