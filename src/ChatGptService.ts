import assert from 'node:assert/strict';
import {
  AIMessagePromptTemplate,
  BaseChatPromptTemplate,
  BaseStringPromptTemplate,
  HumanMessagePromptTemplate,
  PromptTemplate,
} from '@langchain/core/prompts';
import {
  AIMessage,
  AIMessageFields,
  BaseMessage,
  HumanMessage,
  MessageContent,
  MessageContentComplex,
  MessageContentText,
  ToolMessage,
} from '@langchain/core/messages';
import { ChainValues, InputValues } from '@langchain/core/utils/types';
import { injectable } from 'inversify';
import { GptModel, GptModelsProvider } from './GptModelsProvider.js';
import {
  ChatGptMessage,
  ChatGptRoles,
} from './MessageGenerators/ChatGptMessage.js';

type ToolCalls = NonNullable<AIMessageFields['tool_calls']>;

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

/** AI message template with tool call(s). */
export class AIToolCallsMessagePromptTemplate extends AIMessagePromptTemplate<
  InputValues<string>
> {
  async format(values: InputValues<string>): Promise<BaseMessage> {
    assert(this.prompt instanceof BaseStringPromptTemplate);
    assert(this.toolCalls);
    assert(this.toolCalls.every((toolCall) => typeof toolCall.id === 'string'));

    return new AIMessage({
      content: await this.prompt.format(values),
      tool_calls: this.toolCalls,
      additional_kwargs: {
        tool_calls: this.toolCalls.map((toolCall) => ({
          id: toolCall.id!,
          type: 'function',
          function: {
            name: toolCall.name,
            arguments: JSON.stringify(toolCall.args),
          },
        })),
      },
    });
  }

  constructor(
    prompt: BaseStringPromptTemplate<
      InputValues<Extract<keyof InputValues<string>, string>>
    >,
    private readonly toolCalls: ToolCalls,
  ) {
    super(prompt);
  }

  /** Use fromCallsAndTemplate instead. */
  static fromTemplate(template: string) {
    return new this(PromptTemplate.fromTemplate(template), []);
  }

  static fromTemplateAndCalls(template: string, toolCalls: ToolCalls) {
    return new this(PromptTemplate.fromTemplate(template), toolCalls);
  }
}

/** Tool result message template. */
export class ToolMessagePromptTemplate extends HumanMessagePromptTemplate<
  InputValues<string>
> {
  async format(values: InputValues<string>): Promise<BaseMessage> {
    assert(this.prompt instanceof BaseStringPromptTemplate);
    return new ToolMessage({
      content: await this.prompt.format(values),
      tool_call_id: this.toolCallId,
    });
  }

  constructor(
    prompt: BaseStringPromptTemplate<
      InputValues<Extract<keyof InputValues<string>, string>>
    >,
    private readonly toolCallId: string,
  ) {
    super(prompt);
  }

  /** Use fromCallIdAndTemplate instead. */
  static fromTemplate(template: string) {
    return new this(PromptTemplate.fromTemplate(template), '');
  }

  static fromCallIdAndTemplate(toolCallId: string, template: string) {
    return new this(PromptTemplate.fromTemplate(template), toolCallId);
  }
}

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
    const textContent = this.getTextContent(response.content);
    return {
      role: ChatGptRoles.Assistant,
      content: textContent.text,
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

  private getTextContent(content: MessageContent): MessageContentText {
    if (typeof content === 'string') {
      return {
        type: 'text',
        text: content,
      };
    }
    for (const item of content) {
      if (this.isTextContent(item)) {
        return item;
      }
    }
    throw new Error('No text content found in response');
  }

  private isTextContent(
    content: MessageContentComplex,
  ): content is MessageContentText {
    return content.type === 'text';
  }
}
