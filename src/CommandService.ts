import TelegramBot from "node-telegram-bot-api";
import {singleton} from "tsyringe";
import {spawn} from "child_process";
import {ReplyFunction} from "./ReplyStrategy";
import {Gpt3} from "./Gpt3";
import {OpenAIApi} from "openai";

/** Executes a command */
@singleton()
export class CommandService {
    constructor(
        private readonly telegram: TelegramBot,
        private readonly gpt3: Gpt3,
        private readonly openAi: OpenAIApi,
    ) {
    }

    /**
     * Executes a command
     *
     * @param command - The command
     * @param message - The message to reply to
     */
    execute(command: string, message: TelegramBot.Message, reply: ReplyFunction): void {
        if (command === 'info') {
            reply('Sie können mich nach dem aktuellen Status von Minecraft fragen oder mich bitten, Skycreate zu starten, zu stoppen oder zu backuppen.', message);
            return;
        }
        if (command === 'comment') {
            if (!message.reply_to_message || !message.reply_to_message.text) {
                reply('Ich würde Ihnen gerne einen Kommentar dazu abgeben, aber dazu müssen Sie mich in einer Antwort auf einen Text fragen, s’il vous plait.', message);
                return;
            }
            this.gpt3.reply(message.reply_to_message.text, (text: string) => reply(text, message));
            return;
        }
        if (command === 'complete') {
            if (!message.reply_to_message || !message.reply_to_message.text) {
                reply('Ich würde gerne fortfahren, aber dazu müssen Sie mich in einer Antwort auf einen meiner Texte darum bitten, s’il vous plait.', message);
                return;
            }
            this.gpt3.continue(message.reply_to_message.text, (text: string) => reply(text, message));
            return;
        }

        let process;
        if (command === 'startminecraft') {
            reply('Starte Skycreate …', message);
            process = spawn('/home/jannis/parmelae-bot/cmd/startminecraft');
        } else if (command === 'stopminecraft') {
            reply('Stoppe & backuppe Skycreate …', message);
            process = spawn('/home/jannis/parmelae-bot/cmd/stopminecraft');
        } else if (command === 'backupminecraft') {
            reply('Backuppe Skycreate …', message);
            process = spawn('/home/jannis/parmelae-bot/cmd/backupminecraft');
        } else if (command === 'statusminecraft') {
            reply('Prüfe Serverstatus …', message);
            process = spawn('/home/jannis/parmelae-bot/cmd/statusminecraft');
        } else {
            reply('Unbekannter Befehl', message);
        }
        if (process) {
            process.stdout.on('data', (data) => this.telegram.sendMessage(message.chat.id, data.toString()));
            process.stderr.on('data', (data) => this.telegram.sendMessage(message.chat.id, `Fehler: ${data.toString()}`));
        }
    }
}
