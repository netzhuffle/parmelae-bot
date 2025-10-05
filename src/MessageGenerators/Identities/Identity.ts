import { ChatPromptTemplate } from '@langchain/core/prompts';
import { BaseMessage } from '@langchain/core/messages';
import { StructuredTool, Tool } from '@langchain/core/tools';

/** A bot identity, used to generate replies. */
export interface Identity {
  /** Name of the identity. */
  readonly name: string;

  /** The GPT prompt. */
  readonly prompt: ChatPromptTemplate;

  /** List of example messages to choose one. */
  readonly exampleConversations: BaseMessage[][];

  /** The number of chat messages to send as the main conversation. */
  readonly conversationLength: number;

  /** Tools available to this identity. Merged with global tools during agent creation. */
  readonly tools: readonly (StructuredTool | Tool)[];
}
