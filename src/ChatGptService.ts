import { BaseChatPromptTemplate } from '@langchain/core/prompts';
import {
  ContentBlock,
  HumanMessage,
  MessageContent,
} from '@langchain/core/messages';
import { ChainValues } from '@langchain/core/utils/types';
import { injectable } from 'inversify';
import { GptModel, GptModelsProvider } from './GptModelsProvider.js';
import {
  ChatGptMessage,
  ChatGptRoles,
} from './MessageGenerators/ChatGptMessage.js';

/** ChatGPT Service */
@injectable()
export class ChatGptService {
  /** Maximum number of characters in input text to avoid high cost. */
  static readonly MAX_INPUT_TEXT_LENGTH = 2000;

  constructor(private readonly models: GptModelsProvider) {}

  /**
   * Generates and returns a message using a prompt and model.
   */
  async generate(
    prompt: BaseChatPromptTemplate,
    model: GptModel,
    promptValues: ChainValues,
  ): Promise<ChatGptMessage> {
    const chain = prompt.pipe(this.models.getModel(model));
    const response = await chain.invoke(promptValues);
    const textContentBlock = this.getTextContentBlock(response.contentBlocks);
    return {
      role: ChatGptRoles.Assistant,
      content: textContentBlock.text,
    };
  }

  /** Returns a human chat message with a username. */
  static createUserChatMessage(
    name: string,
    content: MessageContent,
  ): HumanMessage {
    return new HumanMessage({
      name,
      content,
    });
  }

  private getTextContentBlock(
    contentBlocks: ContentBlock.Standard[],
  ): ContentBlock.Text {
    for (const contentBlock of contentBlocks) {
      if (contentBlock.type === 'text') {
        return contentBlock;
      }
    }
    throw new Error('No text content found in response');
  }
}
