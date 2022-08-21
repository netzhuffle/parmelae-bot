import TelegramBot from "node-telegram-bot-api";
import {singleton} from "tsyringe";
import {spawn} from "child_process";
import {Gpt3Service} from "./Gpt3Service";
import {TelegramService} from "./TelegramService";

/** Executes a command */
@singleton()
export class CommandService {
    constructor(
        private readonly telegram: TelegramService,
        private readonly gpt3: Gpt3Service,
    ) {
    }

    /**
     * Executes a command
     *
     * @param command - The command
     * @param message - The message to reply to
     */
    execute(command: string, message: TelegramBot.Message): void {
        if (command === 'info') {
            this.telegram.reply('Sie können mich nach dem aktuellen Status von Minecraft fragen oder mich bitten, Skycreate zu starten, zu stoppen oder zu backuppen.', message);
            return;
        }
        if (command === 'comment') {
            if (!message.reply_to_message || !message.reply_to_message.text) {
                this.telegram.reply('Ich würde Ihnen gerne einen Kommentar dazu abgeben, aber dazu müssen Sie mich in einer Antwort auf einen Text fragen, s’il vous plait.', message);
                return;
            }
            this.gpt3.reply(message.reply_to_message.text).then((text: string) => this.telegram.reply(text, message));
            return;
        }
        if (command === 'complete') {
            if (!message.reply_to_message || !message.reply_to_message.text) {
                this.telegram.reply('Ich würde gerne fortfahren, aber dazu müssen Sie mich in einer Antwort auf einen meiner Texte darum bitten, s’il vous plait.', message);
                return;
            }
            this.gpt3.continue(message.reply_to_message.text).then((text: string) => this.telegram.reply(text, message));
            return;
        }

        let process;
        if (command === 'startminecraft') {
            this.telegram.reply('Starte Skycreate …', message);
            process = spawn('/home/jannis/parmelae-bot/cmd/startminecraft');
        } else if (command === 'stopminecraft') {
            this.telegram.reply('Stoppe & backuppe Skycreate …', message);
            process = spawn('/home/jannis/parmelae-bot/cmd/stopminecraft');
        } else if (command === 'backupminecraft') {
            this.telegram.reply('Backuppe Skycreate …', message);
            process = spawn('/home/jannis/parmelae-bot/cmd/backupminecraft');
        } else if (command === 'statusminecraft') {
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
