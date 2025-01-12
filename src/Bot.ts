import assert from 'assert';
import { injectable } from 'inversify';
import { Config } from './Config.js';
import { MessageStorageService } from './MessageStorageService.js';
import { GitHubService } from './GitHubService.js';
import { OldMessageReplyService } from './OldMessageReplyService.js';
import { TelegramMessageService } from './TelegramMessageService.js';
import { ReplyStrategyFinder } from './ReplyStrategyFinder.js';
import { ScheduledMessageService } from './ScheduledMessageService.js';
import { PokemonTcgPocketService } from './PokemonTcgPocketService.js';
import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import * as Typegram from '@telegraf/types';
import { ErrorService } from './ErrorService.js';

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
    private readonly pokemonTcgPocketService: PokemonTcgPocketService,
  ) {}

  /** Sets the handler to listen to messages. */
  start(): void {
    this.telegraf.on(message(), (context) => {
      this.handleMessage(context.message).catch(ErrorService.log);
    });
    this.telegraf.catch(ErrorService.log);
    this.telegraf
      .launch()
      .then(() => this.telegraf.telegram.getMyName())
      .then((me) => {
        assert(me.name === this.config.username);
      })
      .catch(ErrorService.log);
    this.messageStorage.startDailyDeletion(this.oldMessageReplyService);
    this.gitHub.announceNewCommits().catch(ErrorService.log);
    this.scheduledMessageService.schedule().catch(ErrorService.log);
    this.pokemonTcgPocketService
      .synchronizeCardDatabaseWithYmlSource()
      .catch(ErrorService.log);
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
