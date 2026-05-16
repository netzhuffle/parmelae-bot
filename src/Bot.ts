import assert from 'assert';

import type * as Typegram from '@telegraf/types';
import { injectable } from 'inversify';
import type { Context } from 'telegraf';
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
import { TelegramPollingHealthService } from './TelegramPollingHealthService.js';
import { TelegramPollingSupervisor } from './TelegramPollingSupervisor.js';

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
    private readonly telegramPollingHealthService: TelegramPollingHealthService,
    private readonly telegramPollingSupervisor: TelegramPollingSupervisor,
  ) {}

  /** Sets the handler to listen to messages. */
  start(): void {
    const primaryTelegraf = this.botManager.getPrimaryBot();
    primaryTelegraf.on(messageFilter(), (context) => {
      this.handleMessage(context.message).catch(ErrorService.log);
    });
    primaryTelegraf.catch((error, context) => {
      this.handleTelegrafError(error, context);
    });
    this.telegramPollingSupervisor.start(
      (onLaunch) => primaryTelegraf.launch(onLaunch),
      () => {
        void (async () => {
          try {
            const me = await primaryTelegraf.telegram.getMyName();
            assert(me.name === this.config.primaryBot.username);
            this.telegramPollingHealthService.start(primaryTelegraf.telegram);
          } catch (error) {
            ErrorService.log(error);
          }
        })();
      },
    );
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

  private handleTelegrafError(error: unknown, context: Context): void {
    const update = context.update;
    console.error('Telegram update processing failed.', {
      chatId: this.getUpdateChatId(update)?.toString(),
      updateId: update.update_id,
      updateType: this.getUpdateType(update),
    });
    ErrorService.log(error);
  }

  private getUpdateType(update: Typegram.Update): string {
    return Object.keys(update).find((key) => key !== 'update_id') ?? 'unknown';
  }

  private getUpdateChatId(update: Typegram.Update): number | undefined {
    if ('message' in update) {
      return update.message.chat.id;
    }
    if ('edited_message' in update) {
      return update.edited_message.chat.id;
    }
    if ('channel_post' in update) {
      return update.channel_post.chat.id;
    }
    if ('edited_channel_post' in update) {
      return update.edited_channel_post.chat.id;
    }
    if ('callback_query' in update) {
      return update.callback_query.message?.chat.id;
    }

    return undefined;
  }
}
