import assert from 'assert';

import * as Typegram from '@telegraf/types';
import { injectable } from 'inversify';
import { message as messageFilter } from 'telegraf/filters';

import { BotManager } from './BotManager.js';
import { Config } from './Config.js';
import { ErrorService } from './ErrorService.js';
import { GitHubService } from './GitHubService.js';
import { MessageStorageService } from './MessageStorageService.js';
import { OldMessageReplyService } from './OldMessageReplyService.js';
import { PokemonTcgPocketService } from './PokemonTcgPocket/PokemonTcgPocketService.js';
import { ReplyStrategyFinder } from './ReplyStrategyFinder.js';
import { ScheduledMessageService } from './ScheduledMessageService.js';
import { TelegramMessageService } from './TelegramMessageService.js';

/** The most helpful bot in the world. */
@injectable()
export class Bot {
  constructor(
    private readonly botManager: BotManager,
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
    const primaryTelegraf = this.botManager.getPrimaryBot();
    primaryTelegraf.on(messageFilter(), (context) => {
      this.handleMessage(context.message).catch(ErrorService.log);
    });
    primaryTelegraf.catch(ErrorService.log);
    primaryTelegraf
      .launch()
      .then(() => primaryTelegraf.telegram.getMyName())
      .then((me) => {
        assert(me.name === this.config.primaryBot.username);
        return undefined;
      })
      .catch(ErrorService.log);
    this.messageStorage.startDailyDeletion(this.oldMessageReplyService);
    this.gitHub.announceNewCommits().catch(ErrorService.log);
    this.scheduledMessageService.schedule().catch(ErrorService.log);
    this.pokemonTcgPocketService.synchronizeCardDatabaseWithYamlSource().catch(ErrorService.log);
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
    const storedMessage = await this.messageService.store(telegramMessage);
    const replyStrategy = this.replyStrategyFinder.getHandlingStrategy(storedMessage);
    return replyStrategy.handle(storedMessage);
  }
}
