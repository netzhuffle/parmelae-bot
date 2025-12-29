import { Config } from './Config.js';
import { TelegramService } from './TelegramService.js';
import { MessageWithUser, TelegramMessage } from './Repositories/Types.js';
import { OldMessageReplyGenerator } from './MessageGenerators/OldMessageReplyGenerator.js';
import { ChatGptService } from './ChatGptService.js';
import { injectable } from 'inversify';
import { MessageModel } from './generated/prisma/models/Message.js';

/**
 * Minimum length to consider reply to a message.
 *
 * Shorter message likely have not enough good information for GPT.
 */
const MINIMUM_MESSAGE_REPLY_LENGTH = 100;

/** Probability to reply to an old message per day and chat (1 = 100%). */
const OLD_MESSAGE_REPLY_PROBABILITY = 0.15;

/** Replies to random old messages. */
@injectable()
export class OldMessageReplyService {
  constructor(
    private readonly config: Config,
    private readonly oldMessageReplyGenerator: OldMessageReplyGenerator,
    private readonly telegramService: TelegramService,
  ) {}

  /**
   * Replies to random old messages with a certain probability.
   *
   * Not more than 1 message per chat receives a reply.
   * @param oldMessages List of old messages
   */
  async reply(oldMessages: MessageWithUser[]): Promise<void> {
    let replyCandidates = oldMessages.filter((message) =>
      this.mayReplyToOldMessage(message),
    );
    while (replyCandidates.length > 0) {
      const randomMessageIndex = Math.floor(
        Math.random() * replyCandidates.length,
      );
      const randomMessage = replyCandidates[randomMessageIndex];
      if (!this.isTelegramMessage(randomMessage)) {
        // Should never happen as mayReplyToOldMessage filtered out non-telegram messages.
        continue;
      }
      if (Math.random() < OLD_MESSAGE_REPLY_PROBABILITY) {
        await this.replyToMessage(randomMessage);
      }
      replyCandidates = replyCandidates.filter(
        (message) => message.chatId !== randomMessage.chatId,
      );
    }
  }

  private isTelegramMessage(message: MessageModel): message is TelegramMessage {
    return message.telegramMessageId !== null;
  }

  private async replyToMessage(message: TelegramMessage) {
    const reply = await this.oldMessageReplyGenerator.generate(message.text);
    await this.telegramService.reply(reply, message);
  }

  private mayReplyToOldMessage(message: MessageWithUser): boolean {
    if (!this.isTelegramMessage(message)) {
      // Only reply to telegram messages.
      return false;
    }

    if (message.text === null) {
      // Only reply to messages with text.
      return false;
    }

    if (!this.config.chatAllowlist.includes(message.chatId)) {
      // Restrict to messages in allowlisted chats.
      return false;
    }

    if (message.text.length < MINIMUM_MESSAGE_REPLY_LENGTH) {
      // Short messages likely have not good enough content for GPT.
      return false;
    }

    if (message.text.length >= ChatGptService.MAX_INPUT_TEXT_LENGTH) {
      // Message too expensive to send to GPT.
      return false;
    }

    if (message.from.username === this.config.primaryBot.username) {
      // Don't reply to own messages.
      return false;
    }

    if (message.text.includes('@' + this.config.primaryBot.username)) {
      // Message that mentions the bot already received a reply.
      return false;
    }

    return true;
  }
}
