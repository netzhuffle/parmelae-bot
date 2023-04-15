import TelegramBot from 'node-telegram-bot-api';
import assert from 'assert';
import { injectable } from 'inversify';
import { ReplyStrategyFinder } from './ReplyStrategyFinder';
import { Config } from './Config';
import { MessageStorageService } from './MessageStorageService';
import { GitHubService } from './GitHubService';
import { OldMessageReplyService } from './OldMessageReplyService';

/**
 * The most helpful bot in the world
 */
@injectable()
export class Bot {
  /** The last sent message */
  private lastMessage: TelegramBot.Message | null = null;

  constructor(
    private readonly replyStrategyFinder: ReplyStrategyFinder,
    private readonly telegram: TelegramBot,
    private readonly config: Config,
    private readonly messageStorageService: MessageStorageService,
    private readonly gitHubService: GitHubService,
    private readonly oldMessageReplyService: OldMessageReplyService,
  ) {}

  /**
   * Sets the handler to listen to messages
   */
  start(): void {
    this.telegram.on('message', (message) => {
      this.handleMessage(message).catch((e) =>
        console.error('Could not handle message', e),
      );
    });
    this.telegram.on('polling_error', console.error);
    this.telegram
      .getMe()
      .then((me) => {
        assert(me.username === this.config.username);
      })
      .catch((e) => console.error('Could not fetch bot username', e));
    this.messageStorageService.startDailyDeletion(this.oldMessageReplyService);
    this.gitHubService
      .announceNewCommits()
      .catch((e) => console.error('Could not announce new commits', e));
  }

  /**
   * Handles new messages and replies if necessary
   *
   * @param message - The message to reply to
   */
  async handleMessage(message: TelegramBot.Message): Promise<void> {
    await this.messageStorageService.store(message);
    const replyStrategy = this.replyStrategyFinder.getHandlingStrategy(message);
    return replyStrategy.handle(message);
  }
}
