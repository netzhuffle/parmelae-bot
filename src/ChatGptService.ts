import assert from 'assert';
import { CallbackManager } from 'langchain/callbacks';
import { LLMChain } from 'langchain/chains';
import {
  BasePromptTemplate,
  BaseStringPromptTemplate,
  HumanMessagePromptTemplate,
  PromptTemplate,
} from 'langchain/prompts';
import {
  BaseChatMessage,
  ChainValues,
  HumanChatMessage,
  InputValues,
} from 'langchain/schema';
import { injectable } from 'inversify';
import { ChatGptModel, GptModelsProvider } from './GptModelsProvider';
import {
  ChatGptMessage,
  ChatGptRoles,
} from './MessageGenerators/ChatGptMessage';

/** Human message template with username. */
export class UserMessagePromptTemplate extends HumanMessagePromptTemplate {
  async format(values: InputValues): Promise<BaseChatMessage> {
    if (!this.name) {
      return super.format(values);
    }

    const message = await super.format(values);
    assert(message instanceof HumanChatMessage);
    message.name = this.name;
    return message;
  }

  constructor(
    prompt: BaseStringPromptTemplate,
    private readonly name?: string,
  ) {
    super(prompt);
  }

  static fromNameAndTemplate(name: string, template: string) {
    return new this(PromptTemplate.fromTemplate(template), name);
  }
}

/** ChatGPT Service */
@injectable()
export class ChatGptService {
  /** Maximum number of characters in input text to avoid high cost. */
  static readonly MAX_INPUT_TEXT_LENGTH = 1200;

  constructor(
    private readonly models: GptModelsProvider,
    private readonly callbackManager: CallbackManager,
  ) {}

  /**
   * Generates and returns a message using a prompt and model.
   */
  async generate(
    prompt: BasePromptTemplate,
    model: ChatGptModel,
    promptValues: ChainValues,
  ): Promise<ChatGptMessage> {
    const chain = new LLMChain({
      prompt,
      llm: this.models.getModel(model),
      callbackManager: this.callbackManager,
      verbose: true,
    });
    const response = await chain.call(promptValues);
    assert(typeof response.text === 'string');
    return {
      role: ChatGptRoles.Assistant,
      content: response.text,
    };
  }

  /** Returns a human chat message with a username. */
  static createUserChatMessage(
    name: string,
    content: string,
  ): HumanChatMessage {
    const message = new HumanChatMessage(content);
    message.name = name;
    return message;
  }
}
