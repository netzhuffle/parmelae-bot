import TelegramBot from "node-telegram-bot-api";
import assert from "assert";
import {singleton} from "tsyringe";
import {ReplyStrategyFinder} from "./ReplyStrategyFinder";
import {Config} from './Config';
import {MessageStorageService} from "./MessageStorageService";
import {GitHubService} from "./GitHubService";

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
        private readonly config: Config,
        private readonly messageStorageService: MessageStorageService,
        private readonly gitHubService: GitHubService,
    ) {
    }

    /**
     * Sets the handler to listen to messages
     */
    start(): void {
        this.telegram.on('message', async (message): Promise<void> => {
            await this.handleMessage(message);
        });
        this.telegram.on('polling_error', console.error);
        this.telegram.getMe().then((me): void => {
            assert(me.username === this.config.username);
        });
        this.messageStorageService.startDailyDeletion();
        this.gitHubService.startPollingAndAnnounceCommits();
    }

    /**
     * Handles new messages and replies if necessary
     *
     * @param message - The message to reply to
     */
    async handleMessage(message: TelegramBot.Message): Promise<void> {
        await this.messageStorageService.store(message);
        const replyStrategy = this.replyStrategyFinder.getHandlingStrategy(message);
        replyStrategy.handle(message);
    }
}
