import {Sticker} from './Sticker';
import TelegramBot from "node-telegram-bot-api";
import {spawn} from "child_process";
import {Wit} from "node-wit";
import {OpenAIApi} from "openai";
import assert from "assert";
import {inject, singleton} from "tsyringe";
import {OneLiners} from "./OneLiners";
import {Gpt3} from "./Gpt3";
import {ReplyStrategyFinder} from "./ReplyStrategyFinder";
import {NullReplyStrategy} from "./ReplyStrategies/NullReplyStrategy";
import {Config} from './Config';
import {CommandService} from './CommandService';

/** How likely the bot randomly replies to a message. 1 = 100%. */
const RANDOM_REPLY_PROBABILITY = 0.035;

/**
 * The most helpful bot in the world
 */
@singleton()
export class Bot {
    /** The last sent message */
    private lastMessage: TelegramBot.Message | null = null;

    constructor(
        private readonly replyStrategyFinder: ReplyStrategyFinder,
        private readonly oneLiners: OneLiners,
        private readonly commandService: CommandService,
        private readonly gpt3: Gpt3,
        private readonly telegram: TelegramBot,
        private readonly wit: Wit,
        private readonly openAi: OpenAIApi,
        @inject('Config') private readonly config: Config,
    ) {
    }

    /**
     * Sets the handler to listen to messages
     */
    start(): void {
        this.telegram.on('message', (message) => {
            this.handleMessage(message);
        });
        this.telegram.on('polling_error', console.log);
        this.telegram.getMe().then((me) => {
            assert(me.username === this.config.username);
        });
    }

    /**
     * Replies with a random message
     *
     * @param message - The message to reply to
     * @param user - The user to reply to
     */
    replyRandomMessage(message: TelegramBot.Message, user: TelegramBot.User): void {
        const randomMessage = this.oneLiners.getRandomMessage(user.first_name);
        this.reply(randomMessage, message);
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
     * Handles new messages and replies if necessary
     *
     * @param message - The message to reply to
     */
    handleMessage(message: TelegramBot.Message): void {
        const replyStrategy = this.replyStrategyFinder.getHandlingStrategy(message);
        replyStrategy.handle(message, this.reply.bind(this));

        if (!(replyStrategy instanceof NullReplyStrategy)) {
            return;
        }
        // This is a temporary fallthrough until all handlers have been converted to ReplyStrategies.

        if (message.text) {
            if (Math.random() < RANDOM_REPLY_PROBABILITY && !message.text.startsWith('/') && message.text.length < 400 && message.chat.id === -1001736687780 || message.from?.id === 48001795 && message.chat.type === 'private') {
                this.gpt3.reply(message.text, (text: string) => this.reply(text, message));
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

        if (message.from && Math.random() < RANDOM_REPLY_PROBABILITY / 100) {
            this.replyRandomMessage(message, message.from);
        }
    }
}
