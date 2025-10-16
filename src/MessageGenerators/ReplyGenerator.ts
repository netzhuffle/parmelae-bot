import { injectable } from 'inversify';
import { ChatGptAgentService } from '../ChatGptAgentService.js';
import { MessageModel } from '../generated/prisma/models/Message.js';
import { ConversationService } from '../ConversationService.js';
import { Config } from '../Config.js';
import { BotIdentityContext } from '../BotIdentityContext.js';
import { SchiParmelaeIdentity } from './Identities/SchiParmelaeIdentity.js';
import { Identity } from './Identities/Identity.js';
import { BaseMessage } from '@langchain/core/messages';

/** Enhanced response from ReplyGenerator including tool call message IDs */
export interface ReplyGeneratorResponse {
  text: string;
  toolCallMessageIds: number[];
}

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
   * @param announceToolCall - A callback to announce tool calls
   * @return The reply text and tool call message IDs
   */
  async generate(
    message: MessageModel,
    announceToolCall: (text: string) => Promise<number | null>,
  ): Promise<ReplyGeneratorResponse> {
    const identity = this.getIdentityForChat(message.chatId);
    const example = this.selectRandomExample(identity.exampleConversations);
    const botContext: BotIdentityContext = { username: this.config.username };
    const conversation = await this.conversation.getConversation(
      message.id,
      identity.conversationLength,
      botContext,
    );
    const completion = await this.chatGptAgent.generate(
      message,
      example,
      conversation,
      announceToolCall,
      identity,
    );
    return {
      text: completion.message.content,
      toolCallMessageIds: completion.toolCallMessageIds,
    };
  }

  /**
   * Gets the appropriate identity for a given chat, falling back to default if none set.
   */
  private getIdentityForChat(chatId: bigint): Identity {
    return (
      this.config.identityByChatId.get(chatId) ?? this.schiParmelaeIdentity
    );
  }

  /**
   * Selects a random example conversation from the identity's examples.
   */
  private selectRandomExample(examples: BaseMessage[][]): BaseMessage[] {
    return examples.length > 0
      ? examples[Math.floor(Math.random() * examples.length)]
      : [];
  }
}
