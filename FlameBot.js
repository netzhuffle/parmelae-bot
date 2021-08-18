'use strict';

const Sticker = require('./Sticker.js');

/**
 * The most polite bot in the world
 */
class FlameBot {
    /**
     * Constructs the flame bot
     * @param {number} flameRate - The chance how often the bot flames back on a message (1 = 100 %)
     * @param {Object} oneLiners - The oneLiners dependency
     * @param {Object} triggers - The triggers dependency
     * @param {Object} replies - The replies dependency
     * @param {Object} nicknames - The nicknames dependency
     * @param {Object} telegram - The telegram bot API dependency
     * @param {function(string):ChildProcess} spawn - The child_process spawn function
     * @param {Wit} wit - Wit client
     */
    constructor(flameRate, oneLiners, triggers, replies, nicknames, telegram, spawn, wit) {
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
         * The replies dependency
         * @type {Object}
         */
        this.replies = replies;
        /**
         * The telegram dependency
         * @type {Object}
         */
        this.telegram = telegram;
        /**
         * The nicknames dependency
         * @type {Object}
         */
        this.nicknames = nicknames;
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
         * The bots username as a Promise
         * @type {Promise.<string>}
         */
        this.usernamePromise = new Promise((resolve, reject) => {
            telegram.getMe().then((me) => {
                resolve(me.username);
            }, reject);
        });
    }

    /**
     * Sets the handler to listen to messages
     */
    start() {
        this.telegram.on('message', (message) => {
            this.handleMessage(message);
        });
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
            this.usernamePromise.then(username => this.handleUsernameMessage(message, username));

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

            const repliesMatch = this.replies.search(message.text);
            if (repliesMatch) {
                this.reply(repliesMatch, message);
                return;
            }

            if (/<Spitzname>/i.test(message.text)) {
                this.reply(this.nicknames.getNickname(), message);
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

        if (Math.random() < this.flameRate) {
            this.replyRandomInsult(message, message.from);
        }
    }

    /**
     * Handles a message containing the bots name
     * @param {Object} message Telegram message
     * @param {string} username The bots username
     */
    handleUsernameMessage(message, username) {
        if (message.chat.id === -104936118 && message.text.includes(username)) {
            if (message.text.startsWith('/')) {
                this.handleCommand(message.text.match(/^\/(.*)@/)[1], message);
            } else {
                const usernameRegex = new RegExp(`^(.*)@${username}(.*)$`, 'i');
                const matches = message.text.match(usernameRegex);
                if (matches) {
                    const [, part1, part2] = matches;
                    let witMessage = part1 + part2;
                    if (part1.endsWith(' ') && part2.startsWith(' ')) {
                        witMessage = part1 + part2.substring(1);
                    }
                    this.wit.message(witMessage).then(data => {
                        const intents = data.intents;
                        if (intents) {
                            const intent = intents[0].name;
                            this.handleCommand(intent, message);
                        }
                    });
                }
            }
        } else if (message.chat.id !== -104936118 && message.text.startsWith('/')) {
            this.reply('Sorry, ich höre nur im Schi-Parmelä-Chat auf Kommandos.', message);
        }
    }

    /**
     * Handles a command
     *
     * @param {string} command - The command
     * @param {Object} message - The message to reply to
     */
    handleCommand(command, message) {
        let process;
        if (command === 'startminecraft') {
            this.reply('Starte Zebenwusch …', message);
            process = this.spawn('/home/jannis/telegram-nachtchad-bot/cmd/startminecraft');
        } else if (command === 'stopminecraft') {
            this.reply('Stoppe & backuppe Zebenwusch …', message);
            process = this.spawn('/home/jannis/telegram-nachtchad-bot/cmd/stopminecraft');
        } else if (command === 'backupminecraft') {
            this.reply('Backuppe Zebenwusch …', message);
            process = this.spawn('/home/jannis/telegram-nachtchad-bot/cmd/backupminecraft');
        } else if (command === 'statusminecraft') {
            this.reply('Prüfe Serverstatus …', message);
            process = this.spawn('/home/jannis/telegram-nachtchad-bot/cmd/statusminecraft');
        } else if (command === 'info') {
            this.reply('Du kannst mich nach dem aktuellen Status von Zebenwusch fragen oder mich bitten, Zebenwusch zu starten, zu stoppen oder zu backuppen.', message);
        } else {
            this.reply('Unbekannter Befehl', message);
        }
        if (process) {
            process.stdout.on('data', (data) => this.telegram.sendMessage(message.chat.id, data.toString()));
            process.stderr.on('data', (data) => this.telegram.sendMessage(message.chat.id, `Fehler: ${data.toString()}`));
        }
    }
}

module.exports = FlameBot;
