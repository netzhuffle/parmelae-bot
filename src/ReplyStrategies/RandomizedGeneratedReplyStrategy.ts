import { injectable } from 'inversify';
import { AllowlistedReplyStrategy } from '../AllowlistedReplyStrategy.js';
import { Config } from '../Config.js';
import { TelegramService } from '../TelegramService.js';
import { ReplyGenerator } from '../MessageGenerators/ReplyGenerator.js';
import { MessageRepository } from '../Repositories/MessageRepository.js';
import { TelegramMessage } from '../Repositories/Types.js';

/** How likely the bot randomly replies to a message. 1 = 100%. */
const RANDOM_REPLY_PROBABILITY = 0.02;

/** Picks a message by random chance to reply with the reply generator. */
@injectable()
export class RandomizedGeneratedReplyStrategy extends AllowlistedReplyStrategy {
  constructor(
    private readonly telegram: TelegramService,
    private readonly replyGenerator: ReplyGenerator,
    private readonly messageRepository: MessageRepository,
    config: Config,
  ) {
    super(config);
  }

  willHandleAllowlisted(): boolean {
    return Math.random() < RANDOM_REPLY_PROBABILITY;
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
