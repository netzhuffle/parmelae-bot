import TelegramBot from "node-telegram-bot-api";
import {inject, singleton} from "tsyringe";
import assert from "assert";
import {AllowlistedReplyStrategy} from "../AllowlistedReplyStrategy";
import {CommandService} from "../CommandService";
import {Config} from "../Config";
import {Command} from "../Command";
import {TelegramService} from "../TelegramService";

/** Regex matching the command name. */
const COMMAND_NAME = /^\/(.*)@/;

/** Executes commands written as /xyz@BotName in allowlisted chats. */
@singleton()
export class CommandReplyStrategy extends AllowlistedReplyStrategy {
    constructor(
        private readonly command: CommandService,
        config: Config,
        private readonly telegram: TelegramService,
    ) {
        super(config);
    }

    willHandleAllowlisted(message: TelegramBot.Message): boolean {
        return message.text !== undefined && COMMAND_NAME.test(message.text);
    }

    handle(message: TelegramBot.Message) {
        assert(message.text !== undefined);

        const commandMatches = message.text.match(COMMAND_NAME);
        assert(commandMatches && commandMatches.length >= 2);
        const command = this.getCommand(commandMatches[1]);

        this.command.execute(command, message)
            .then(reply => this.telegram.reply(reply, message));
    }

    private getCommand(command: string): Command {
        switch (command) {
            case 'info':
                return Command.Info;
            case 'comment':
                return Command.Comment;
            case 'startminecraft':
                return Command.StartMinecraft;
            case 'stopminecraft':
                return Command.StopMinecraft;
            case 'backupminecraft':
                return Command.BackupMinecraft;
            case 'statusminecraft':
                return Command.StatusMinecraft;
            default:
                return Command.Unknown;
        }
    }
}
