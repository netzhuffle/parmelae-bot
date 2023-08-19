import assert from 'assert';
import { injectable } from 'inversify';
import { Config } from './Config';
import { MessageStorageService } from './MessageStorageService';
import { GitHubService } from './GitHubService';
import { OldMessageReplyService } from './OldMessageReplyService';
import { TelegramMessageService } from './TelegramMessageService';
import { ReplyStrategyFinder } from './ReplyStrategyFinder';
import { ScheduledMessageService } from './ScheduledMessageService';
import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import * as Typegram from 'telegraf/typings/core/types/typegram';
import { ErrorService } from './ErrorService';

/** The most helpful bot in the world. */
@injectable()
export class Bot {
  constructor(
    private readonly telegraf: Telegraf,
    private readonly config: Config,
    private readonly messageStorage: MessageStorageService,
    private readonly gitHub: GitHubService,
    private readonly oldMessageReplyService: OldMessageReplyService,
    private readonly messageService: TelegramMessageService,
    private readonly replyStrategyFinder: ReplyStrategyFinder,
    private readonly scheduledMessageService: ScheduledMessageService,
  ) {}

  /** Sets the handler to listen to messages. */
  start(): void {
    this.telegraf.on(message(), (context) => {
      this.handleMessage(context.message).catch(ErrorService.log);
    });
    this.telegraf.catch(ErrorService.log);
    this.telegraf
      .launch()
      .then(() => this.telegraf.telegram.getMe())
      .then((me) => {
        assert(me.username === this.config.username);
      })
      .catch(ErrorService.log);
    this.messageStorage.startDailyDeletion(this.oldMessageReplyService);
    this.gitHub.announceNewCommits().catch(ErrorService.log);
    this.scheduledMessageService.schedule().catch(ErrorService.log);
  }

  /**
   * Handles new messages and replies if necessary.
   *
   * @param telegramMessage - The message to reply to
   */
  async handleMessage(telegramMessage: Typegram.Message): Promise<void> {
    if (!this.messageService.isSupported(telegramMessage)) {
      return;
    }
    const message = await this.messageService.store(telegramMessage);
    const replyStrategy = this.replyStrategyFinder.getHandlingStrategy(message);
    return replyStrategy.handle(message);
  }
}
