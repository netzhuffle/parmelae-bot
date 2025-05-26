import { injectable } from 'inversify';
import { AIMessage } from '@langchain/core/messages';
import { INTERMEDIATE_ANSWER_TOOL_NAME } from '../Tools/IntermediateAnswerTool.js';
import { StateAnnotation } from './StateAnnotation.js';

/**
 * Factory for creating a node that announces tool calls in a unified, content-aware format.
 * Combines all tool calls for a message into a single announcement, with AIMessage content as the first line if present.
 * Stores context for later persistence of tool calls and responses.
 */
@injectable()
export class ToolCallAnnouncementNodeFactory {
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
      id?: string;
    }
    return async ({ messages }: typeof StateAnnotation.State) => {
      const lastMessage = messages[messages.length - 1] as AIMessage;
      const toolCalls = (lastMessage.tool_calls ?? []) as ToolCall[];
      const lines = this.getAnnouncementLines(lastMessage, toolCalls);

      if (lines.length > 0) {
        const messageId = await announceToolCall(lines.join('\n'));

        // Store context for later persistence (only if a message was actually stored)
        if (messageId !== null && toolCalls.length > 0) {
          return {
            toolExecution: {
              announcementMessageId: messageId,
              originalAIMessage: lastMessage,
              currentToolCallIds: toolCalls
                .map((tc) => tc.id)
                .filter((id): id is string => id !== undefined),
            },
            toolCallMessageIds: [messageId],
          };
        }
      }

      return {};
    };
  }
}
