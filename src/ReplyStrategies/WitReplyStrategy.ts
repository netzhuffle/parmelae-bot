import assert from "assert";
import TelegramBot from "node-telegram-bot-api";
import {Wit} from "node-wit";
import {inject, singleton} from "tsyringe";
import {AllowlistedReplyStrategy} from "../AllowlistedReplyStrategy";
import {CommandService} from "../CommandService";
import {Config} from "../Config";
import {Gpt3Service} from "../Gpt3Service";
import {TelegramService} from "../TelegramService";
import {Command} from "../Command";

/** Maximum number of characters wit.ai allows in messages. */
const MAXIMUM_WIT_MESSAGE_LENGTH = 280;

/**
 * Handles messages mentioning the bot in allowlisted chats by sending them to Wit for handling.
 *
 * Wit will decide if the message can be executed as a program or should be sent to GPT-3 to generate a reply.
 */
@singleton()
export class WitReplyStrategy extends AllowlistedReplyStrategy {
    constructor(
        private readonly telegram: TelegramService,
        private readonly wit: Wit,
        private readonly commandService: CommandService,
        private readonly gpt3: Gpt3Service,
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

        const witMessage = message.text.replaceAll(`@${this.config.username}`, 'Herr Parmelä');
        if (witMessage.length > MAXIMUM_WIT_MESSAGE_LENGTH) {
            // Skip wit.ai and just assume no intent (out of context for wit.ai).
            this.fallbackToGpt3(message);
        }

        this.wit.message(witMessage, {}).then(data => {
            const intents = data.intents;
            if (intents && intents[0]) {
                const intent = intents[0].name;
                const command = this.getCommand(intent);
                this.commandService.execute(command, message);
            } else {
                // No intent matched, fallback to GPT-3 reply.
                this.fallbackToGpt3(message);
            }
        });
    }

    private getCommand(command: string): Command {
        switch (command) {
            case 'info':
                return Command.Info;
            case 'comment':
                return Command.Comment;
            case 'completed':
                return Command.Complete;
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

    private fallbackToGpt3(message: TelegramBot.Message): void {
        this.gpt3.reply(message)
            .then((text: string) => this.telegram.reply(text, message));
    }
}
