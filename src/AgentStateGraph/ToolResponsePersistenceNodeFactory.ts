import { injectable } from 'inversify';
import { ToolMessage } from '@langchain/core/messages';
import { MessageRepository } from '../Repositories/MessageRepository.js';
import { ToolMessageRepository } from '../Repositories/ToolMessageRepository.js';
import { StateAnnotation } from './StateAnnotation.js';

/**
 * Factory for creating a node that persists tool calls and responses to the database.
 * Ensures atomic persistence - tool calls and their responses are stored together.
 */
@injectable()
export class ToolResponsePersistenceNodeFactory {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly toolMessageRepository: ToolMessageRepository,
  ) {}

  /**
   * Creates the node for persisting tool calls and responses.
   */
  create() {
    return async ({
      messages,
      toolExecution,
    }: typeof StateAnnotation.State) => {
      const { announcementMessageId, originalAIMessage, currentToolCallIds } =
        toolExecution || {};

      // Skip if no tool execution context
      if (
        !announcementMessageId ||
        !originalAIMessage ||
        !currentToolCallIds?.length
      ) {
        return {};
      }

      // Find tool responses that match current execution
      const newToolMessages = messages
        .filter((msg): msg is ToolMessage => msg instanceof ToolMessage)
        .filter((msg) => currentToolCallIds.includes(msg.tool_call_id));

      // Only store tool calls that have corresponding responses
      const toolCallsWithResponses = originalAIMessage.tool_calls
        ?.filter((toolCall) =>
          newToolMessages.some((msg) => msg.tool_call_id === toolCall.id),
        )
        .map((toolCall) => ({
          id: toolCall.id,
          name: toolCall.name,
          args: toolCall.args,
        }));

      // Persist tool calls to Message.toolCalls JSON (only those with responses)
      if (toolCallsWithResponses?.length) {
        await this.messageRepository.updateToolCalls(
          announcementMessageId,
          toolCallsWithResponses,
        );
      }

      // Persist tool responses to ToolMessage table
      for (const toolMsg of newToolMessages) {
        await this.toolMessageRepository.store({
          toolCallId: toolMsg.tool_call_id,
          text:
            typeof toolMsg.content === 'string'
              ? toolMsg.content
              : JSON.stringify(toolMsg.content),
          messageId: announcementMessageId,
        });
      }

      return {};
    };
  }
}
