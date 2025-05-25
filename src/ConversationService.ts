import { MessageHistoryService } from './MessageHistoryService.js';
import { Config } from './Config.js';
import { ChatGptService } from './ChatGptService.js';
import {
  AIMessage,
  MessageContent,
  ToolMessage,
} from '@langchain/core/messages';
import type { ToolCall } from '@langchain/core/messages/tool';
import { injectable } from 'inversify';
import { TelegramService } from './TelegramService.js';
import { Conversation } from './Conversation.js';
import type { MessageWithUserAndToolMessages } from './Repositories/Types.js';

/**
 * Service to create a conversation for LangChain from history.
 */
@injectable()
export class ConversationService {
  constructor(
    private readonly messageHistory: MessageHistoryService,
    private readonly telegram: TelegramService,
    private readonly config: Config,
  ) {}

  /** Return the conversation for the given message id, up to this message. */
  async getConversation(
    messageId: number,
    messageCount: number,
  ): Promise<Conversation> {
    const historyMessages = await this.messageHistory.getHistory(
      messageId,
      messageCount,
    );

    const allMessages = [];

    for (const message of historyMessages) {
      if (this.shouldSkipMessage(message)) {
        continue;
      }

      if (this.isAssistantMessage(message)) {
        const assistantMessages = this.processAssistantMessage(message);
        allMessages.push(...assistantMessages);
      } else {
        const content = await this.buildMessageContent(message);
        const userMessage = this.processUserMessage(message, content);
        allMessages.push(userMessage);
      }
    }

    return new Conversation(allMessages);
  }

  /**
   * Determines if a message should be skipped from conversation history.
   */
  private shouldSkipMessage(message: MessageWithUserAndToolMessages): boolean {
    // Never skip messages with tool calls, regardless of text content
    if (message.toolCalls) {
      return false;
    }

    return (
      message.imageFileId === null &&
      (!message.text ||
        message.text.length >= ChatGptService.MAX_INPUT_TEXT_LENGTH)
    );
  }

  /**
   * Builds the message content for text or image messages.
   */
  private async buildMessageContent(
    message: MessageWithUserAndToolMessages,
  ): Promise<MessageContent> {
    if (message.imageFileId !== null) {
      const content: MessageContent = [
        {
          type: 'image_url',
          image_url: {
            url: await this.telegram.getFileUrl(message.imageFileId),
          },
        },
      ];

      if (message.text) {
        content.push({
          type: 'text',
          text: message.text,
        });
      }

      return content;
    }

    return message.text;
  }

  /**
   * Checks if a message is from the assistant.
   */
  private isAssistantMessage(message: MessageWithUserAndToolMessages): boolean {
    return (
      message.from.username === this.config.username &&
      // OpenAI API does not allow image content in assistant messages.
      message.imageFileId === null
    );
  }

  /**
   * Processes an assistant message and returns an array of LangChain messages.
   */
  private processAssistantMessage(
    message: MessageWithUserAndToolMessages,
  ): (AIMessage | ToolMessage)[] {
    const messages: (AIMessage | ToolMessage)[] = [];

    const hasToolCalls = Boolean(message.toolCalls);
    const cleanContent = this.extractAIMessageContent(
      message.text,
      hasToolCalls,
    );

    const aiMessageOptions: {
      content: MessageContent;
      tool_calls?: ToolCall[];
    } = { content: cleanContent };

    if (message.toolCalls) {
      const toolCalls = this.parseToolCalls(message.toolCalls);
      if (toolCalls) {
        aiMessageOptions.tool_calls = toolCalls;
      }
    }

    messages.push(new AIMessage(aiMessageOptions));

    // Add tool response messages if they exist
    const toolMessages = this.createToolMessages(message.toolMessages);
    messages.push(...toolMessages);

    return messages;
  }

  /**
   * Processes a user message and returns a LangChain message.
   */
  private processUserMessage(
    message: MessageWithUserAndToolMessages,
    content: MessageContent,
  ): ReturnType<typeof ChatGptService.createUserChatMessage> {
    return ChatGptService.createUserChatMessage(
      message.from.username ?? message.from.firstName,
      content,
    );
  }

  /**
   * Parses tool calls from JSON, handling both array and string formats.
   */
  private parseToolCalls(toolCalls: unknown): ToolCall[] | null {
    try {
      const parsed = Array.isArray(toolCalls)
        ? (toolCalls as ToolCall[])
        : (JSON.parse(toolCalls as string) as ToolCall[]);
      return parsed;
    } catch (error) {
      // If parsing fails, continue without tool calls
      console.warn('Failed to parse tool calls JSON:', error);
      return null;
    }
  }

  /**
   * Creates ToolMessage instances from tool message data.
   */
  private createToolMessages(
    toolMessages: MessageWithUserAndToolMessages['toolMessages'],
  ): ToolMessage[] {
    return toolMessages.map(
      (toolMessage) =>
        new ToolMessage({
          tool_call_id: toolMessage.toolCallId,
          content: toolMessage.text,
        }),
    );
  }

  /**
   * Extracts clean AI message content by removing tool call announcements.
   */
  private extractAIMessageContent(text: string, hasToolCalls: boolean): string {
    if (!hasToolCalls) {
      return text;
    }

    // If the message starts with "[", it contains only tool calls, no AI content
    if (text.trimStart().startsWith('[')) {
      return '';
    }

    // Find the first newline followed by "[" which indicates start of tool call announcements
    const toolCallStart = text.indexOf('\n[');
    if (toolCallStart === -1) {
      // No tool call announcements found in expected format
      // If the text is only whitespace, return empty string
      if (text.trim() === '') {
        return '';
      }
      return text;
    }

    // Return everything before the tool call announcements
    return text.substring(0, toolCallStart);
  }
}
