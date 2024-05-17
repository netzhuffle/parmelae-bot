import { injectable } from 'inversify';
import { ChatGptAgentService } from '../ChatGptAgentService.js';
import { Message } from '@prisma/client';
import { ConversationService } from '../ConversationService.js';
import { Config } from '../Config.js';
import { SchiParmelaeIdentity } from './Identities/SchiParmelaeIdentity.js';

/**
 * A generator for replies to a message after executing necessary commands.
 */
@injectable()
export class ReplyGenerator {
  constructor(
    private readonly chatGptAgent: ChatGptAgentService,
    private readonly conversation: ConversationService,
    private readonly config: Config,
    private readonly schiParmelaeIdentity: SchiParmelaeIdentity,
  ) {}

  /**
   * Asks GPT to generate a reply using the current identity for the chat.
   *
   * Executes commands within the reply.
   *
   * @param message - The message to reply to
   * @return The reply text
   */
  async generate(message: Message): Promise<string> {
    const identity =
      this.config.identityByChatId.get(message.chatId) ??
      this.schiParmelaeIdentity;
    const examples = identity.exampleConversations;
    const example = examples.length
      ? examples[Math.floor(Math.random() * examples.length)]
      : [];
    const conversation = await this.conversation.getConversation(
      message.id,
      identity.conversationLength,
    );
    const completion = await this.chatGptAgent.generate(
      message,
      identity.prompt,
      example,
      conversation,
    );
    return completion.content;
  }
}
