import TelegramBot from "node-telegram-bot-api";
import {delay, inject, singleton} from "tsyringe";
import {spawn} from "child_process";
import {TelegramService} from "./TelegramService";
import {Command} from "./Command";
import {ReplyGenerator} from "./MessageGenerators/ReplyGenerator";

/** Executes a command */
@singleton()
export class CommandService {
    private isMinecraftRunning: boolean | null = null;

    constructor(
        private readonly telegram: TelegramService,
        @inject(delay(() => ReplyGenerator)) private readonly replyGenerator: ReplyGenerator,
    ) {
    }

    /**
     * Executes a command
     *
     * @param command - The command
     * @param message - The message to reply to
     */
    async execute(command: Command, message: TelegramBot.Message): Promise<string> {
        if (command === Command.Unknown) {
            return 'Dieses Kommando ist unbekannt. Ich weiss nicht, was ich tun soll.';
        }
        if (command === Command.Info) {
            return 'Sie können mich nach dem aktuellen Status von Minecraft fragen oder mich bitten, Skycreate zu starten, zu stoppen oder zu backuppen.';
        }
        if (command === Command.Comment) {
            if (!message.reply_to_message || !message.reply_to_message.text) {
                return 'Ich würde Ihnen gerne einen Kommentar dazu abgeben, aber dazu müssen Sie mich in einer Antwort auf einen Text fragen, s’il vous plait.';
            }

            return this.replyGenerator.generate(message.reply_to_message);
        }

        let reply = '';
        let process;
        if (command === Command.StartMinecraft) {
            if (this.isMinecraftRunning !== true) {
                reply = 'Starte Minecraft …';
                process = spawn('/home/jannis/parmelae-bot/cmd/startminecraft');
                this.isMinecraftRunning = true;
            }
        } else if (command === Command.StopMinecraft) {
            if (this.isMinecraftRunning !== false) {
                reply = 'Stoppe & backuppe Minecraft …';
                process = spawn('/home/jannis/parmelae-bot/cmd/stopminecraft');
                this.isMinecraftRunning = false;
            }
        } else if (command === Command.BackupMinecraft) {
            reply = 'Backuppe Minecraft …';
            process = spawn('/home/jannis/parmelae-bot/cmd/backupminecraft');
        } else if (command === Command.StatusMinecraft) {
            reply = 'Prüfe Minecraft-Status …';
            process = spawn('/home/jannis/parmelae-bot/cmd/statusminecraft');
        } else {
            return 'Unbekannter Befehl';
        }
        if (process) {
            process.stdout.on('data', (data) => this.telegram.send(data.toString(), message.chat));
            process.stderr.on('data', (data) => this.telegram.send(`Fehler: ${data.toString()}`, message.chat));
            process.on('error', error => {
                console.error(error);
            });
        }

        return reply;
    }
}
