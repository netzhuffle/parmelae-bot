import { injectable } from 'inversify';
import { MessagesAnnotation } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
import { INTERMEDIATE_ANSWER_TOOL_NAME } from '../Tools/IntermediateAnswerTool.js';
import { MessageRepository } from '../Repositories/MessageRepository.js';

/**
 * Factory for creating a node that announces tool calls in a unified, content-aware format.
 * Combines all tool calls for a message into a single announcement, with AIMessage content as the first line if present.
 * Persists tool calls to the database after announcement.
 */
@injectable()
export class ToolCallAnnouncementNodeFactory {
  constructor(private readonly messageRepository: MessageRepository) {}

  private formatParameters(params: Record<string, unknown>): string {
    return (
      '{' +
      Object.entries(params)
        .map(
          ([key, value]) =>
            `${key}: ${typeof value === 'string' ? value : String(value)}`,
        )
        .join(', ') +
      '}'
    );
  }

  private shouldAnnounceToolCall(toolCall: { name: string }): boolean {
    return toolCall.name !== INTERMEDIATE_ANSWER_TOOL_NAME;
  }

  private formatToolCall(toolCall: {
    name: string;
    args?: Record<string, unknown>;
  }): string {
    const { name: toolName, args: input } = toolCall;
    const filtered = Object.fromEntries(
      Object.entries(input ?? {}).filter(
        ([, value]) => value !== null && value !== false && value !== '',
      ),
    );
    if (Object.keys(filtered).length === 0) {
      return `[${toolName}]`;
    } else {
      const parameters = this.formatParameters(filtered);
      return `[${toolName}: ${parameters}]`;
    }
  }

  private getAnnouncementLines(
    lastMessage: AIMessage,
    toolCalls: { name: string; args?: Record<string, unknown> }[],
  ): string[] {
    const lines: string[] = [];
    if (
      typeof lastMessage.content === 'string' &&
      lastMessage.content.trim() !== ''
    ) {
      lines.push(lastMessage.content);
    }
    for (const toolCall of toolCalls) {
      if (!this.shouldAnnounceToolCall(toolCall)) {
        continue;
      }
      lines.push(this.formatToolCall(toolCall));
    }
    return lines;
  }

  /**
   * Creates the node for announcing tool calls.
   * @param announceToolCall - The function to call with the announcement string. Returns the database message ID, or null if no message was stored.
   */
  create(announceToolCall: (text: string) => Promise<number | null>) {
    interface ToolCall {
      name: string;
      args?: Record<string, unknown>;
    }
    return async ({ messages }: typeof MessagesAnnotation.State) => {
      const lastMessage = messages[messages.length - 1] as AIMessage;
      const toolCalls = (lastMessage.tool_calls ?? []) as ToolCall[];
      const lines = this.getAnnouncementLines(lastMessage, toolCalls);
      if (lines.length > 0) {
        const messageId = await announceToolCall(lines.join('\n'));

        // Store tool calls in database only if a message was actually stored
        if (messageId !== null && toolCalls.length > 0) {
          await this.messageRepository.updateToolCalls(
            messageId,
            lastMessage.tool_calls!,
          );
        }
      }
      return {};
    };
  }
}
