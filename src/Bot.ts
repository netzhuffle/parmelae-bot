import TelegramBot from 'node-telegram-bot-api';
import assert from 'assert';
import { injectable } from 'inversify';
import { Config } from './Config';
import { MessageStorageService } from './MessageStorageService';
import { GitHubService } from './GitHubService';
import { OldMessageReplyService } from './OldMessageReplyService';
import { MessageService } from './MessageService';
import { ReplyStrategyFinder } from './ReplyStrategyFinder';
import * as Sentry from '@sentry/node';
import { ScheduledMessageService } from './ScheduledMessageService';

/**
 * The most helpful bot in the world
 */
@injectable()
export class Bot {
  constructor(
    private readonly telegram: TelegramBot,
    private readonly config: Config,
    private readonly messageStorage: MessageStorageService,
    private readonly gitHub: GitHubService,
    private readonly oldMessageReplyService: OldMessageReplyService,
    private readonly newMessageService: MessageService,
    private readonly replyStrategyFinder: ReplyStrategyFinder,
    private readonly scheduledMessageService: ScheduledMessageService,
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
    this.telegram.on('polling_error', Sentry.captureException);
    this.telegram.on('webhook_error', Sentry.captureException);
    this.telegram.on('error', Sentry.captureException);
    this.telegram
      .getMe()
      .then((me) => {
        assert(me.username === this.config.username);
      })
      .catch(Sentry.captureException);
    this.messageStorage.startDailyDeletion(this.oldMessageReplyService);
    this.gitHub.announceNewCommits().catch(Sentry.captureException);
    this.scheduledMessageService.schedule().catch(Sentry.captureException);
  }

  /**
   * Handles new messages and replies if necessary.
   *
   * @param telegramMessage - The message to reply to
   */
  async handleMessage(telegramMessage: TelegramBot.Message): Promise<void> {
    const message = await this.newMessageService.storeIncoming(telegramMessage);
    if (!message) {
      console.log('Unknown message type, cannot handle.');
      return;
    }

    const replyStrategy = this.replyStrategyFinder.getHandlingStrategy(message);
    return replyStrategy.handle(message);
  }
}
