import TelegramBot from "node-telegram-bot-api";
import {delay, inject, singleton} from "tsyringe";
import {spawn} from "child_process";
import {TelegramService} from "./TelegramService";
import {Command, Commands} from "./Command";
import {ReplyGenerator} from "./MessageGenerators/ReplyGenerator";
import {DallEPromptGenerator} from "./MessageGenerators/DallEPromptGenerator";
import assert from "assert";
import {DallEService} from "./DallEService";
import {NotExhaustiveSwitchError} from "./NotExhaustiveSwitchError";

/** Executes a command */
@singleton()
export class CommandService {
    private isMinecraftRunning: boolean | null = null;

    constructor(
        private readonly telegram: TelegramService,
        @inject(delay(() => ReplyGenerator)) private readonly replyGenerator: ReplyGenerator,
        private readonly dallEPromptGenerator: DallEPromptGenerator,
        private readonly dallE: DallEService,
    ) {
    }

    /**
     * Executes a command
     *
     * @param command - The command
     * @param message - The message to reply to
     */
    async execute(command: Command, message: TelegramBot.Message): Promise<string> {
        if (command === Commands.Unknown) {
            return 'Dieses Kommando ist unbekannt. Ich weiss nicht, was ich tun soll.';
        }
        if (command === Commands.Info) {
            return 'Sie können mich nach dem aktuellen Status von Minecraft fragen oder mich bitten, Skycreate zu starten, zu stoppen oder zu backuppen.';
        }
        if (command === Commands.Comment) {
            if (!message.reply_to_message || !message.reply_to_message.text) {
                return 'Ich würde Ihnen gerne einen Kommentar dazu abgeben, aber dazu müssen Sie mich in einer Antwort auf einen Text fragen, s’il vous plait.';
            }

            return this.replyGenerator.generate(message.reply_to_message);
        }
        if (command === Commands.Image) {
            assert(message.text);
            const dallEPrompt = await this.dallEPromptGenerator.generate(message.text);
            const imageUrl = await this.dallE.generateImage(dallEPrompt);
            if (!imageUrl) {
                return 'Leider kann ich das Bild gerade nicht senden.';
            }
            this.telegram.replyWithImage(imageUrl, dallEPrompt, message);

            return '';
        }

        throw new NotExhaustiveSwitchError(command);
    }
}
