import assert from 'assert';
import { LLMChain } from 'langchain/chains';
import {
  AIMessagePromptTemplate,
  BasePromptTemplate,
  BaseStringPromptTemplate,
  HumanMessagePromptTemplate,
  PromptTemplate,
} from '@langchain/core/prompts';
import {
  AIMessage,
  BaseMessage,
  FunctionMessage,
  HumanMessage,
  MessageContent,
} from '@langchain/core/messages';
import { ChainValues, InputValues } from '@langchain/core/utils/types';
import { injectable } from 'inversify';
import { GptModel, GptModelsProvider } from './GptModelsProvider.js';
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
    if (!this.username) {
      return super.format(values);
    }

    const message = await super.format(values);
    assert(message instanceof HumanMessage);
    message.name = this.username;
    return message;
  }

  constructor(
    prompt: BaseStringPromptTemplate<
      InputValues<Extract<keyof InputValues<string>, string>>
    >,
    private readonly username?: string,
  ) {
    super(prompt);
  }

  static fromNameAndTemplate(username: string, template: string) {
    return new this(PromptTemplate.fromTemplate(template), username);
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
    assert(this.prompt instanceof BaseStringPromptTemplate);
    return new FunctionMessage(
      {
        content: await this.prompt.format(values),
        name: this.functionName,
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
    private readonly functionName?: string,
  ) {
    super(prompt);
  }

  static fromNameAndTemplate(functionName: string, template: string) {
    return new this(PromptTemplate.fromTemplate(template), functionName);
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
    model: GptModel,
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
  static createUserChatMessage(
    name: string,
    content: MessageContent,
  ): HumanMessage {
    return new HumanMessage({
      name,
      content,
    });
  }
}
