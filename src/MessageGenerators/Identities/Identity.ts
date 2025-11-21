import { StructuredTool, Tool } from '@langchain/core/tools';

/** A bot identity, used to generate replies. */
export interface Identity {
  /** Name of the identity. */
  readonly name: string;

  /** The LLM system prompt. */
  readonly systemPrompt: string;

  /** The number of chat messages to send as the main conversation. */
  readonly conversationLength: number;

  /** Tools available to this identity. Merged with global tools during agent creation. */
  readonly tools: readonly (StructuredTool | Tool)[];
}
