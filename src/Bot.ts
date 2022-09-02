import TelegramBot from "node-telegram-bot-api";
import assert from "assert";
import {inject, singleton} from "tsyringe";
import {ReplyStrategyFinder} from "./ReplyStrategyFinder";
import {Config} from './Config';
import {MessageStorageService} from "./MessageStorageService";

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
        private readonly messageStorageService: MessageStorageService,
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
     * Handles new messages and replies if necessary
     *
     * @param message - The message to reply to
     */
    handleMessage(message: TelegramBot.Message): void {
        this.messageStorageService.store(message);
        const replyStrategy = this.replyStrategyFinder.getHandlingStrategy(message);
        replyStrategy.handle(message);
    }
}
