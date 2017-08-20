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
   * @param {Object} telegram - The telegram bot API dependency
   * @param {Object} cmd - The cmd dependency
   */
  constructor(flameRate, oneLiners, triggers, replies, telegram, cmd) {
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
     * The cmd dependency
     * @type {Object}
     */
    this.cmd = cmd;

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
      this.telegram.sendSticker(message.chat.id, stickerFileId, { reply_to_message_id: message.message_id });
    } else {
      this.telegram.sendMessage(message.chat.id, reply, { reply_to_message_id: message.message_id });
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
      if (message.text.startsWith('/')) {
        this.handleCommand(message);
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

      const repliesMatch = this.replies.search(message.text);
      if (repliesMatch) {
        this.reply(repliesMatch, message);
        return;
      }

      this.usernamePromise.then(username => {
        if ((!message.text || !message.text.startsWith('/')) && new RegExp(username, 'i').test(message.text)) {
          this.replyRandomInsult(message, message.from);
        }
      });
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
   * Handles a command
   *
   * @param {Object} message - The message with a command
   */
  handleCommand(message) {
    if (message.chat.id === -126749874) {
      if (message.text.startsWith('/startminecraft')) {
        this.cmd.get('./cmd/startminecraft', (error, data, stderr) => {
          this.reply(data, message);
        });
      } else if (message.text.startsWith('/stopminecraft')) {
        this.cmd.get('./cmd/stopminecraft', (error, data, stderr) => {
          this.reply(data, message);
        });
      } else if (message.text.startsWith('/backupminecraft')) {
        this.cmd.get('./cmd/backupminecraft', (error, data, stderr) => {
          this.reply(data, message);
        });
      } else if (message.text.startsWith('/statusminecraft')) {
        this.cmd.get('./cmd/statusminecraft', (error, data, stderr) => {
          this.reply(data, message);
        });
      }
    } else {
      this.reply('Sorry, ich höre nur im Banden-Chat auf Kommandos.');
    }
  }
}

module.exports = FlameBot;
