'use strict';

import {Sticker} from './Sticker.js';

/**
 * The most polite bot in the world
 */
export class FlameBot {
    /**
     * Constructs the flame bot
     * @param {number} flameRate - The chance how often the bot flames back on a message (1 = 100 %)
     * @param {Object} oneLiners - The oneLiners dependency
     * @param {Object} triggers - The triggers dependency
     * @param {Object} nicknames - The nicknames dependency
     * @param {Object} gpt3 - The gpt3 dependency
     * @param {Object} telegram - The telegram bot API dependency
     * @param {function(string):ChildProcess} spawn - The child_process spawn function
     * @param {Wit} wit - Wit client
     * @param {OpenAI} openAi - OpenAI client
     */
    constructor(flameRate, oneLiners, triggers, nicknames, gpt3, telegram, spawn, wit, openAi) {
        /**
         * The chance how often the bot flames back on a message (1 = 100 %)
         * @type {number}
         */
        this.flameRate = flameRate;
        /**
         * The oneLiners dependency
         * @type {Object}
         */
        this.oneLiners = oneLiners;
        /**
         * The triggers dependency
         * @type {Object}
         */
        this.triggers = triggers;
        /**
         * The nicknames dependency
         * @type {Object}
         */
        this.nicknames = nicknames;
        /**
         * The gpt3 dependency
         * @type {Object}
         */
        this.gpt3 = gpt3;
        /**
         * The telegram dependency
         * @type {Object}
         */
        this.telegram = telegram;
        /**
         * The child_process spawn function
         * @type {Object}
         */
        this.spawn = spawn;
        /**
         * Wit client
         * @type {Wit}
         */
        this.wit = wit;
        /**
         * OpenAI client
         * @type {OpenAI}
         */
        this.openAi = openAi;
        /**
         * The username, as soon as its available
         * @type {?string}
         */
        this.username = null;
    }

    /**
     * Sets the handler to listen to messages
     */
    start() {
        this.telegram.getMe().then((me) => {
            this.username = me.username;
            this.telegram.on('message', (message) => {
                this.handleMessage(message);
            });
        }).catch(console.log);
        this.telegram.on('polling_error', console.log);
    }

    /**
     * Replies with an insult
     *
     * @param {Object} message - The message to reply to
     * @param {Object} user - The user to insult
     */
    replyRandomInsult(message, user) {
        const insult = this.oneLiners.getRandomInsult(user.first_name);
        this.reply(insult, message);
    }

    /**
     * Replies to a message
     *
     * @param {(string|Sticker)} reply - The text or Sticker to send
     * @param {Object} message - The message to reply to
     */
    reply(reply, message) {
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
     * @param {Object} message - The message to reply to
     */
    handleMessage(message) {
        // To find a sticker id: Send it to the bot in private chat
        if (message.chat.type === 'private' && message.sticker) {
            this.reply('Sticker file_id: ' + message.sticker.file_id, message);
            return;
        }

        if (message.new_chat_participant) {
            this.replyRandomInsult(message, message.new_chat_participant);
            return;
        }

        if (message.text) {
            if ((message.chat.id === -1001736687780 || message.from.id === 48001795 && message.chat.type === 'private') && message.text.includes(this.username)) {
                this.handleUsernameMessage(message);
                return;
            }

            if (message.chat.id !== -1001736687780 && message.text.startsWith('/') && message.text.includes(this.username)) {
                this.reply('Entschuldigen Sie, ich höre nur im Schi-Parmelä-Chat auf Kommandos.', message);
                return;
            }

            if (this.lastMessage && this.lastMessage.text === message.text && this.lastMessage.from.first_name !== message.from.first_name) {
                this.telegram.sendMessage(message.chat.id, message.text);
                delete this.lastMessage;
            } else {
                /**
                 * The last message
                 * @type {Object}
                 */
                this.lastMessage = message;
            }

            const triggersMatches = this.triggers.search(message.text);
            triggersMatches.forEach(triggersMatch => {
                this.reply(triggersMatch, message);
            });

            if (/<Spitzname>/i.test(message.text)) {
                this.reply(this.nicknames.getNickname(), message);
                return;
            }

            if (Math.random() < this.flameRate && !message.text.startsWith('/') && message.text.length < 400 && message.chat.id === -1001736687780 || message.from.id === 48001795 && message.chat.type === 'private') {
                this.gpt3.reply(message.text, (text) => this.reply(text, message), this.openAi);
                return;
            }
        }

        if (message.sticker) {
            if (this.lastMessage && this.lastMessage.sticker && this.lastMessage.sticker.file_id === message.sticker.file_id && this.lastMessage.from.first_name !== message.from.first_name) {
                this.telegram.sendSticker(message.chat.id, message.sticker.file_id);
                delete this.lastMessage;
            } else {
                this.lastMessage = message;
            }
        }

        if (Math.random() < this.flameRate / 100) {
            this.replyRandomInsult(message, message.from);
        }
    }

    /**
     * Handles a message containing the bots name
     * @param {Object} message Telegram message
     */
    handleUsernameMessage(message) {
        if (message.text.startsWith('/')) {
            this.handleCommand(message.text.match(/^\/(.*)@/)[1], message);
            return;
        }
        const usernameRegex = new RegExp(`^(.*)@${this.username}(.*)$`, 'is');
        const matches = message.text.match(usernameRegex);
        if (matches) {
            const [, part1, part2] = matches;
            let witMessage = part1 + part2;
            if (part1.endsWith(' ')) {
                witMessage = part1.substring(0, part1.length - 1) + part2;
            }
            this.wit.message(witMessage).then(data => {
                const intents = data.intents;
                if (intents && intents[0]) {
                    const intent = intents[0].name;
                    this.handleCommand(intent, message);
                } else {
                    this.gpt3.replyCheaper(witMessage, text => this.reply(text, message), this.openAi);
                }
            });
        }
    }

    /**
     * Handles a command
     *
     * @param {string} command - The command
     * @param {Object} message - The message to reply to
     */
    handleCommand(command, message) {
        if (command === 'info') {
            this.reply('Sie können mich nach dem aktuellen Status von Minecraft fragen oder mich bitten, Skycreate zu starten, zu stoppen oder zu backuppen.', message);
            return;
        }
        if (command === 'comment') {
            if (!message.reply_to_message || !message.reply_to_message.text) {
                this.reply('Ich würde Ihnen gerne einen Kommentar dazu abgeben, aber dazu müssen Sie mich in einer Antwort auf einen Text fragen, s’il vous plait.', message);
                return;
            }
            this.gpt3.reply(message.reply_to_message.text, (text) => this.reply(text, message), this.openAi);
            return;
        }
        if (command === 'complete') {
            if (!message.reply_to_message || !message.reply_to_message.text) {
                this.reply('Ich würde gerne fortfahren, aber dazu müssen Sie mich in einer Antwort auf einen meiner Texte darum bitten, s’il vous plait.', message);
                return;
            }
            this.gpt3.continue(message.reply_to_message.text, (text) => this.reply(text, message), this.openAi);
            return;
        }

        let process;
        if (command === 'startminecraft') {
            this.reply('Starte Skycreate …', message);
            process = this.spawn('/home/jannis/telegram-nachtchad-bot/cmd/startminecraft');
        } else if (command === 'stopminecraft') {
            this.reply('Stoppe & backuppe Skycreate …', message);
            process = this.spawn('/home/jannis/telegram-nachtchad-bot/cmd/stopminecraft');
        } else if (command === 'backupminecraft') {
            this.reply('Backuppe Skycreate …', message);
            process = this.spawn('/home/jannis/telegram-nachtchad-bot/cmd/backupminecraft');
        } else if (command === 'statusminecraft') {
            this.reply('Prüfe Serverstatus …', message);
            process = this.spawn('/home/jannis/telegram-nachtchad-bot/cmd/statusminecraft');
        } else {
            this.reply('Unbekannter Befehl', message);
        }
        if (process) {
            process.stdout.on('data', (data) => this.telegram.sendMessage(message.chat.id, data.toString()));
            process.stderr.on('data', (data) => this.telegram.sendMessage(message.chat.id, `Fehler: ${data.toString()}`));
        }
    }
}
