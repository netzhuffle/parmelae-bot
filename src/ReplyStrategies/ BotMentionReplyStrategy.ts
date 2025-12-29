import { injectable } from 'inversify';
import { AllowlistedReplyStrategy } from '../AllowlistedReplyStrategy.js';
import { Config } from '../Config.js';
import { TelegramService } from '../TelegramService.js';
import { ReplyGenerator } from '../MessageGenerators/ReplyGenerator.js';
import { MessageRepository } from '../Repositories/MessageRepository.js';
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
    private readonly messageRepository: MessageRepository,
    config: Config,
  ) {
    super(config);
  }

  willHandleAllowlisted(message: TelegramMessageWithRelations): boolean {
    return (
      message.text.includes(`@${this.config.primaryBot.username}`) ||
      message.replyToMessage?.from.username === this.config.primaryBot.username
    );
  }

  async handle(message: TelegramMessage): Promise<void> {
    void this.telegram.sendTyping(message.chatId);
    const announceToolCall = async (text: string): Promise<number | null> => {
      return this.telegram.send(text, message.chatId);
    };
    const response = await this.replyGenerator.generate(
      message,
      announceToolCall,
    );
    const replyMessageId = await this.telegram.reply(response.text, message);

    // Link the final response message to its tool call messages
    await this.messageRepository.updateToolCallMessages(
      replyMessageId,
      response.toolCallMessageIds,
    );
  }
}
