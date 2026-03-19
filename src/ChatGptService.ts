import { HumanMessage, MessageContent } from '@langchain/core/messages';
import { BaseChatPromptTemplate } from '@langchain/core/prompts';
import { ChainValues } from '@langchain/core/utils/types';
import { injectable } from 'inversify';

import { getAiMessageTextChunkContent } from './AiMessageTextContent.js';
import { GptModel, GptModelsProvider } from './GptModelsProvider.js';
import { ChatGptMessage, ChatGptRoles } from './MessageGenerators/ChatGptMessage.js';
import { StreamingTextSink } from './StreamingTextSink.js';

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
    streamSink?: StreamingTextSink,
  ): Promise<ChatGptMessage> {
    const chain = prompt.pipe(this.models.getModel(model));
    const stream = await chain.stream(promptValues);
    let content = '';
    for await (const chunk of stream) {
      const textChunk = getAiMessageTextChunkContent(chunk);
      if (textChunk.length === 0) {
        continue;
      }
      content += textChunk;
      if (streamSink) {
        void streamSink.appendText(textChunk);
      }
    }
    return {
      role: ChatGptRoles.Assistant,
      content,
    };
  }

  /** Returns a human chat message with a username. */
  static createUserChatMessage(name: string, content: MessageContent): HumanMessage {
    return new HumanMessage({
      name,
      content,
    });
  }
}
