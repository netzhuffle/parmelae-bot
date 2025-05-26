import { Annotation } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { AIMessage } from '@langchain/core/messages';

/**
 * Tool execution context for tracking current tool calls and announcement.
 */
export interface ToolExecutionState {
  announcementMessageId?: number;
  originalAIMessage?: AIMessage;
  currentToolCallIds?: string[];
}

/**
 * Enhanced graph state annotation that includes tool execution context
 * and accumulated tool call message IDs in addition to the standard messages.
 */
export const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  toolExecution: Annotation<ToolExecutionState>({
    reducer: (x, y) => ({
      ...x,
      ...y,
    }),
  }),
  toolCallMessageIds: Annotation<number[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});
