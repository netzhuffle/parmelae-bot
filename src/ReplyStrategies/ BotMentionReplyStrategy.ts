import { injectable } from 'inversify';
import { AllowlistedReplyStrategy } from '../AllowlistedReplyStrategy';
import { Config } from '../Config';
import { TelegramService } from '../TelegramService';
import { ReplyGenerator } from '../MessageGenerators/ReplyGenerator';
import {
  TelegramMessage,
  TelegramMessageWithRelations,
} from '../Repositories/Types.js';

/**
 * Handles messages mentioning or replying to the bot in allowlisted chats.
 */
@injectable()
export class BotMentionReplyStrategy extends AllowlistedReplyStrategy {
  constructor(
    private readonly telegram: TelegramService,
    private readonly replyGenerator: ReplyGenerator,
    config: Config,
  ) {
    super(config);
  }

  willHandleAllowlisted(message: TelegramMessageWithRelations): boolean {
    return (
      message.text.includes(`@${this.config.username}`) ||
      message.replyToMessage?.from.username === this.config.username
    );
  }

  async handle(message: TelegramMessage): Promise<void> {
    void this.telegram.sendTyping(message.chatId);
    const text = await this.replyGenerator.generate(message);
    return this.telegram.send(text, message.chatId);
  }
}
