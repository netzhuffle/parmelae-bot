'use strict';

import {Sticker} from './Sticker';
import TelegramBot from "node-telegram-bot-api";
import {spawn} from "child_process";
import {Wit} from "node-wit";
import {OpenAIApi} from "openai";
import assert from "assert";

/**
 * The most helpful bot in the world
 */
export class Bot {
    /** The chance how often the bot flames back on a message (1 = 100 %) */
    private readonly flameRate: number;
    /** The username, as soon as its available */
    private username: string | null = null;
    /** The last sent message */
    private lastMessage: TelegramBot.Message | null = null;

    private readonly oneLiners: any;
    private readonly triggers: any;
    private readonly nicknames: any;
    private readonly gpt3: any;
    private readonly telegram: TelegramBot;
    private readonly wit: Wit;
    private readonly openAi: OpenAIApi;

    /**
     * Constructs the flame bot
     * @param {number} flameRate - The chance how often the bot flames back on a message (1 = 100 %)
     * @param oneLiners
     * @param triggers
     * @param nicknames
     * @param gpt3
     * @param telegram
     * @param wit
     * @param openAi
     */
    constructor(flameRate: number, oneLiners: any, triggers: any, nicknames: any, gpt3: any, telegram: TelegramBot, wit: Wit, openAi: OpenAIApi) {
        this.flameRate = flameRate;
        this.oneLiners = oneLiners;
        this.triggers = triggers;
        this.nicknames = nicknames;
        this.gpt3 = gpt3;
        this.telegram = telegram;
        this.wit = wit;
        this.openAi = openAi;
        this.username = null;
    }

    /**
     * Sets the handler to listen to messages
     */
    start(): void {
        this.telegram.getMe().then((me) => {
            this.username = me.username ?? null;
            this.telegram.on('message', (message) => {
                this.handleMessage(message);
            });
        }).catch(console.log);
        this.telegram.on('polling_error', console.log);
    }

    /**
     * Replies with an insult
     *
     * @param message - The message to reply to
     * @param user - The user to insult
     */
    replyRandomInsult(message: TelegramBot.Message, user: TelegramBot.User): void {
        const insult = this.oneLiners.getRandomInsult(user.first_name);
        this.reply(insult, message);
    }

    /**
     * Replies to a message
     *
     * @param reply - The text or Sticker to send
     * @param message - The message to reply to
     */
    reply(reply: string | Sticker, message: TelegramBot.Message): void {
        if (reply instanceof Sticker) {
            const stickerFileId = reply.fileId;
            this.telegram.sendSticker(message.chat.id, stickerFileId, {reply_to_message_id: message.message_id});
        } else {
            this.telegram.sendMessage(message.chat.id, reply, {reply_to_message_id: message.message_id});
        }
    }

    /**
     * Handles new messages and replies with insults if necessary
     *
     * @param message - The message to reply to
     */
    handleMessage(message: TelegramBot.Message): void {
        assert(this.username);

        // To find a sticker id: Send it to the bot in private chat
        if (message.chat.type === 'private' && message.sticker) {
            this.reply('Sticker file_id: ' + message.sticker.file_id, message);
            return;
        }

        if (message.new_chat_members) {
            message.new_chat_members.forEach(member => {
                this.replyRandomInsult(message, member);
            });
            return;
        }

        if (message.text) {
            if ((message.chat.id === -1001736687780 || message.from?.id === 48001795 && message.chat.type === 'private') && message.text.includes(this.username)) {
                this.handleUsernameMessage(message);
                return;
            }

            if (message.chat.id !== -1001736687780 && message.text.startsWith('/') && message.text.includes(this.username)) {
                this.reply('Entschuldigen Sie, ich höre nur im Schi-Parmelä-Chat auf Kommandos.', message);
                return;
            }

            if (this.lastMessage && this.lastMessage.text === message.text && this.lastMessage.from?.first_name !== message.from?.first_name) {
                this.telegram.sendMessage(message.chat.id, message.text);
                this.lastMessage = null;
            } else {
                /**
                 * The last message
                 * @type {Object}
                 */
                this.lastMessage = message;
            }

            const triggersMatches = this.triggers.search(message.text);
            triggersMatches.forEach((triggersMatch: string | Sticker) => {
                if (triggersMatch) {
                    this.reply(triggersMatch, message);
                }
            });

            if (/<Spitzname>/i.test(message.text)) {
                this.reply(this.nicknames.getNickname(), message);
                return;
            }

            if (Math.random() < this.flameRate && !message.text.startsWith('/') && message.text.length < 400 && message.chat.id === -1001736687780 || message.from?.id === 48001795 && message.chat.type === 'private') {
                this.gpt3.reply(message.text, (text: string) => this.reply(text, message), this.openAi);
                return;
            }
        }

        if (message.sticker) {
            if (this.lastMessage && this.lastMessage.sticker && this.lastMessage.sticker.file_id === message.sticker.file_id && this.lastMessage.from?.first_name !== message.from?.first_name) {
                this.telegram.sendSticker(message.chat.id, message.sticker.file_id);
                this.lastMessage = null;
            } else {
                this.lastMessage = message;
            }
        }

        if (message.from && Math.random() < this.flameRate / 100) {
            this.replyRandomInsult(message, message.from);
        }
    }

    /**
     * Handles a message containing the bots name
     * @param message Telegram message
     */
    handleUsernameMessage(message: TelegramBot.Message): void {
        if (message.text?.startsWith('/')) {
            const commandMatches = message.text.match(/^\/(.*)@/);
            assert(commandMatches && commandMatches.length >= 2);
            this.handleCommand(commandMatches[1], message);
            return;
        }
        const usernameRegex = new RegExp(`^(.*)@${this.username}(.*)$`, 'is');
        const matches = message.text?.match(usernameRegex);
        if (matches) {
            const [, part1, part2] = matches;
            let witMessage = part1 + part2;
            if (part1.endsWith(' ')) {
                witMessage = part1.substring(0, part1.length - 1) + part2;
            }
            this.wit.message(witMessage, {}).then(data => {
                const intents = data.intents;
                if (intents && intents[0]) {
                    const intent = intents[0].name;
                    this.handleCommand(intent, message);
                } else {
                    this.gpt3.replyCheaper(witMessage, (text: string) => this.reply(text, message), this.openAi);
                }
            });
        }
    }

    /**
     * Handles a command
     *
     * @param command - The command
     * @param message - The message to reply to
     */
    handleCommand(command: string, message: TelegramBot.Message): void {
        if (command === 'info') {
            this.reply('Sie können mich nach dem aktuellen Status von Minecraft fragen oder mich bitten, Skycreate zu starten, zu stoppen oder zu backuppen.', message);
            return;
        }
        if (command === 'comment') {
            if (!message.reply_to_message || !message.reply_to_message.text) {
                this.reply('Ich würde Ihnen gerne einen Kommentar dazu abgeben, aber dazu müssen Sie mich in einer Antwort auf einen Text fragen, s’il vous plait.', message);
                return;
            }
            this.gpt3.reply(message.reply_to_message.text, (text: string) => this.reply(text, message), this.openAi);
            return;
        }
        if (command === 'complete') {
            if (!message.reply_to_message || !message.reply_to_message.text) {
                this.reply('Ich würde gerne fortfahren, aber dazu müssen Sie mich in einer Antwort auf einen meiner Texte darum bitten, s’il vous plait.', message);
                return;
            }
            this.gpt3.continue(message.reply_to_message.text, (text: string) => this.reply(text, message), this.openAi);
            return;
        }

        let process;
        if (command === 'startminecraft') {
            this.reply('Starte Skycreate …', message);
            process = spawn('/home/jannis/telegram-nachtchad-bot/cmd/startminecraft');
        } else if (command === 'stopminecraft') {
            this.reply('Stoppe & backuppe Skycreate …', message);
            process = spawn('/home/jannis/telegram-nachtchad-bot/cmd/stopminecraft');
        } else if (command === 'backupminecraft') {
            this.reply('Backuppe Skycreate …', message);
            process = spawn('/home/jannis/telegram-nachtchad-bot/cmd/backupminecraft');
        } else if (command === 'statusminecraft') {
            this.reply('Prüfe Serverstatus …', message);
            process = spawn('/home/jannis/telegram-nachtchad-bot/cmd/statusminecraft');
        } else {
            this.reply('Unbekannter Befehl', message);
        }
        if (process) {
            process.stdout.on('data', (data) => this.telegram.sendMessage(message.chat.id, data.toString()));
            process.stderr.on('data', (data) => this.telegram.sendMessage(message.chat.id, `Fehler: ${data.toString()}`));
        }
    }
}
