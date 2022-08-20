import {Sticker} from './Sticker';
import TelegramBot from "node-telegram-bot-api";
import assert from "assert";
import {inject, singleton} from "tsyringe";
import {ReplyStrategyFinder} from "./ReplyStrategyFinder";
import {Config} from './Config';

/**
 * The most helpful bot in the world
 */
@singleton()
export class Bot {
    /** The last sent message */
    private lastMessage: TelegramBot.Message | null = null;

    constructor(
        private readonly replyStrategyFinder: ReplyStrategyFinder,
        private readonly telegram: TelegramBot,
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
    }
}
