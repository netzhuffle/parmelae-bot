import TelegramBot from "node-telegram-bot-api";
import {singleton} from "tsyringe";
import {spawn} from "child_process";
import {TelegramService} from "./TelegramService";
import {Command} from "./Command";
import {ReplyGenerator} from "./MessageGenerators/ReplyGenerator";

/** Executes a command */
@singleton()
export class CommandService {
    constructor(
        private readonly telegram: TelegramService,
        private readonly replyGenerator: ReplyGenerator,
    ) {
    }

    /**
     * Executes a command
     *
     * @param command - The command
     * @param message - The message to reply to
     */
    execute(command: Command, message: TelegramBot.Message): void {
        if (command === Command.Unknown) {
            this.telegram.reply('Dieses Kommando ist unbekannt. Ich weiss nicht, was ich tun soll.', message);
            return;
        }
        if (command === Command.Info) {
            this.telegram.reply('Sie können mich nach dem aktuellen Status von Minecraft fragen oder mich bitten, Skycreate zu starten, zu stoppen oder zu backuppen.', message);
            return;
        }
        if (command === Command.Comment) {
            if (!message.reply_to_message || !message.reply_to_message.text) {
                this.telegram.reply('Ich würde Ihnen gerne einen Kommentar dazu abgeben, aber dazu müssen Sie mich in einer Antwort auf einen Text fragen, s’il vous plait.', message);
                return;
            }
            this.replyGenerator.generate(message.reply_to_message).then((text: string) => this.telegram.reply(text, message));
            return;
        }

        let process;
        if (command === Command.StartMinecraft) {
            this.telegram.reply('Starte Skycreate …', message);
            process = spawn('/home/jannis/parmelae-bot/cmd/startminecraft');
        } else if (command === Command.StopMinecraft) {
            this.telegram.reply('Stoppe & backuppe Skycreate …', message);
            process = spawn('/home/jannis/parmelae-bot/cmd/stopminecraft');
        } else if (command === Command.BackupMinecraft) {
            this.telegram.reply('Backuppe Skycreate …', message);
            process = spawn('/home/jannis/parmelae-bot/cmd/backupminecraft');
        } else if (command === Command.StatusMinecraft) {
            this.telegram.reply('Prüfe Serverstatus …', message);
            process = spawn('/home/jannis/parmelae-bot/cmd/statusminecraft');
        } else {
            this.telegram.reply('Unbekannter Befehl', message);
        }
        if (process) {
            process.stdout.on('data', (data) => this.telegram.send(data.toString(), message.chat));
            process.stderr.on('data', (data) => this.telegram.send(`Fehler: ${data.toString()}`, message.chat));
        }
    }
}
