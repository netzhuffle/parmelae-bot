import assert from 'assert';
import { LLMChain } from 'langchain/chains';
import {
  AIMessagePromptTemplate,
  BasePromptTemplate,
  BaseStringPromptTemplate,
  HumanMessagePromptTemplate,
  PromptTemplate,
} from 'langchain/prompts';
import {
  AIMessage,
  BaseMessage,
  ChainValues,
  FunctionMessage,
  HumanMessage,
  InputValues,
} from 'langchain/schema';
import { injectable } from 'inversify';
import { ChatGptModel, GptModelsProvider } from './GptModelsProvider.js';
import {
  ChatGptMessage,
  ChatGptRoles,
} from './MessageGenerators/ChatGptMessage.js';
import { ChatCompletionMessage } from 'openai/resources/index.js';

/** Human message template with username. */
export class UserMessagePromptTemplate extends HumanMessagePromptTemplate<
  InputValues<string>
> {
  async format(values: InputValues<string>): Promise<BaseMessage> {
    if (!this.name) {
      return super.format(values);
    }

    const message = await super.format(values);
    assert(message instanceof HumanMessage);
    message.name = this.name;
    return message;
  }

  constructor(
    prompt: BaseStringPromptTemplate<
      InputValues<Extract<keyof InputValues<string>, string>>
    >,
    private readonly name?: string,
  ) {
    super(prompt);
  }

  static fromNameAndTemplate(name: string, template: string) {
    return new this(PromptTemplate.fromTemplate(template), name);
  }
}

/** Human message template with username. */
export class AIFunctionCallMessagePromptTemplate extends AIMessagePromptTemplate<
  InputValues<string>
> {
  async format(values: InputValues<string>): Promise<BaseMessage> {
    if (!this.functionCall) {
      return super.format(values);
    }

    const message = await super.format(values);
    assert(message instanceof AIMessage);
    message.additional_kwargs.function_call = this.functionCall;
    return message;
  }

  constructor(
    prompt: BaseStringPromptTemplate<
      InputValues<Extract<keyof InputValues<string>, string>>
    >,
    private readonly functionCall: ChatCompletionMessage.FunctionCall,
  ) {
    super(prompt);
  }

  static fromCallAndTemplate(
    functionCall: ChatCompletionMessage.FunctionCall,
    template: string,
  ) {
    return new this(PromptTemplate.fromTemplate(template), functionCall);
  }
}

/** Function result message template. */
export class FunctionMessagePromptTemplate extends HumanMessagePromptTemplate<
  InputValues<string>
> {
  async format(values: InputValues<string>): Promise<BaseMessage> {
    return new FunctionMessage(
      {
        content: await this.prompt.format(values),
        name: this.name,
      },
      '',
    );
  }

  static fromTemplate(template: string) {
    return new this(PromptTemplate.fromTemplate(template));
  }

  constructor(
    prompt: BaseStringPromptTemplate<
      InputValues<Extract<keyof InputValues<string>, string>>
    >,
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

  constructor(private readonly models: GptModelsProvider) {}

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
  static createUserChatMessage(name: string, content: string): HumanMessage {
    return new HumanMessage({
      name,
      content,
    });
  }
}
