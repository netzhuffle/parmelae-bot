import { describe, beforeEach, it, expect, mock } from 'bun:test';
import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { MessageRepository } from '../Repositories/MessageRepository.js';
import { ToolMessageRepository } from '../Repositories/ToolMessageRepository.js';
import { ToolResponsePersistenceNodeFactory } from './ToolResponsePersistenceNodeFactory.js';
import { StateAnnotation } from './StateAnnotation.js';

// Create mock functions separately for proper assertion tracking
const mockUpdateToolCalls = mock(() => Promise.resolve());
const mockStore = mock();

const mockMessageRepository = {
  updateToolCalls: mockUpdateToolCalls,
} as unknown as MessageRepository;

const mockToolMessageRepository = {
  store: mockStore,
} as unknown as ToolMessageRepository;

describe('ToolResponsePersistenceNodeFactory', () => {
  let factory: ToolResponsePersistenceNodeFactory;
  let node: (state: typeof StateAnnotation.State) => Promise<object>;

  beforeEach(() => {
    mock.clearAllMocks();
    factory = new ToolResponsePersistenceNodeFactory(
      mockMessageRepository,
      mockToolMessageRepository,
    );
    node = factory.create();
  });

  describe('create', () => {
    it('should persist tool calls and responses when context is available', async () => {
      const originalAIMessage = new AIMessage({
        content: 'Checking weather',
        tool_calls: [
          {
            id: 'call-123',
            name: 'weather',
            args: { location: 'London' },
          },
          {
            id: 'call-124',
            name: 'time',
            args: { timezone: 'UTC' },
          },
        ],
      });

      const toolMessage1 = new ToolMessage({
        content: 'Weather is sunny, 22°C',
        tool_call_id: 'call-123',
      });

      const toolMessage2 = new ToolMessage({
        content: 'Current time is 14:30',
        tool_call_id: 'call-124',
      });

      const state: typeof StateAnnotation.State = {
        messages: [
          new HumanMessage('What is the weather in London?'),
          originalAIMessage,
          toolMessage1,
          toolMessage2,
        ],
        toolExecution: {
          announcementMessageId: 456,
          originalAIMessage,
          currentToolCallIds: ['call-123', 'call-124'],
        },
        toolCallMessageIds: [],
      };

      await node(state);

      expect(mockUpdateToolCalls).toHaveBeenCalledWith(
        456,
        originalAIMessage.tool_calls,
      );

      expect(mockStore).toHaveBeenCalledTimes(2);
      expect(mockStore).toHaveBeenCalledWith({
        toolCallId: 'call-123',
        text: 'Weather is sunny, 22°C',
        messageId: 456,
      });
      expect(mockStore).toHaveBeenCalledWith({
        toolCallId: 'call-124',
        text: 'Current time is 14:30',
        messageId: 456,
      });
    });

    it('should only persist tool messages from current execution', async () => {
      const originalAIMessage = new AIMessage({
        content: 'Checking weather',
        tool_calls: [
          {
            id: 'call-123',
            name: 'weather',
            args: { location: 'London' },
          },
        ],
      });

      const currentToolMessage = new ToolMessage({
        content: 'Weather is sunny, 22°C',
        tool_call_id: 'call-123',
      });

      const oldToolMessage = new ToolMessage({
        content: 'Old response',
        tool_call_id: 'call-999', // Not in current execution
      });

      const state: typeof StateAnnotation.State = {
        messages: [
          new HumanMessage('What is the weather?'),
          oldToolMessage, // This should be ignored
          originalAIMessage,
          currentToolMessage,
        ],
        toolExecution: {
          announcementMessageId: 456,
          originalAIMessage,
          currentToolCallIds: ['call-123'], // Only current call
        },
        toolCallMessageIds: [],
      };

      await node(state);

      expect(mockStore).toHaveBeenCalledTimes(1);
      expect(mockStore).toHaveBeenCalledWith({
        toolCallId: 'call-123',
        text: 'Weather is sunny, 22°C',
        messageId: 456,
      });
    });

    it('should only persist tool calls that have responses', async () => {
      const originalAIMessage = new AIMessage({
        content: 'Checking weather and time',
        tool_calls: [
          {
            id: 'call-123',
            name: 'weather',
            args: { location: 'London' },
          },
          {
            id: 'call-124',
            name: 'time',
            args: { timezone: 'UTC' },
          },
        ],
      });

      // Only one tool response available
      const toolMessage1 = new ToolMessage({
        content: 'Weather is sunny, 22°C',
        tool_call_id: 'call-123',
      });

      const state: typeof StateAnnotation.State = {
        messages: [
          new HumanMessage('What is the weather and time?'),
          originalAIMessage,
          toolMessage1, // Only response for call-123
        ],
        toolExecution: {
          announcementMessageId: 456,
          originalAIMessage,
          currentToolCallIds: ['call-123', 'call-124'], // Both tool calls attempted
        },
        toolCallMessageIds: [],
      };

      await node(state);

      // Should only store the tool call that has a response
      expect(mockUpdateToolCalls).toHaveBeenCalledWith(
        456,
        [originalAIMessage.tool_calls![0]], // Only the first tool call
      );

      expect(mockStore).toHaveBeenCalledTimes(1);
      expect(mockStore).toHaveBeenCalledWith({
        toolCallId: 'call-123',
        text: 'Weather is sunny, 22°C',
        messageId: 456,
      });
    });

    it('should skip persistence when no tool execution context', async () => {
      const state: typeof StateAnnotation.State = {
        messages: [new HumanMessage('Hello'), new AIMessage('Hi there')],
        toolExecution: {}, // Empty context
        toolCallMessageIds: [],
      };

      const result = await node(state);

      expect(mockUpdateToolCalls).not.toHaveBeenCalled();
      expect(mockStore).not.toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it('should skip persistence when missing announcement message ID', async () => {
      const originalAIMessage = new AIMessage({
        content: 'Checking weather',
        tool_calls: [{ id: 'call-123', name: 'weather', args: {} }],
      });

      const state: typeof StateAnnotation.State = {
        messages: [originalAIMessage],
        toolExecution: {
          // Missing announcementMessageId
          originalAIMessage,
          currentToolCallIds: ['call-123'],
        },
        toolCallMessageIds: [],
      };

      const result = await node(state);

      expect(mockUpdateToolCalls).not.toHaveBeenCalled();
      expect(mockStore).not.toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it('should skip persistence when missing current tool call IDs', async () => {
      const originalAIMessage = new AIMessage({
        content: 'Checking weather',
        tool_calls: [{ id: 'call-123', name: 'weather', args: {} }],
      });

      const state: typeof StateAnnotation.State = {
        messages: [originalAIMessage],
        toolExecution: {
          announcementMessageId: 456,
          originalAIMessage,
          // Missing currentToolCallIds
        },
        toolCallMessageIds: [],
      };

      const result = await node(state);

      expect(mockUpdateToolCalls).not.toHaveBeenCalled();
      expect(mockStore).not.toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it('should handle database errors gracefully', async () => {
      const originalAIMessage = new AIMessage({
        content: 'Checking weather',
        tool_calls: [{ id: 'call-123', name: 'weather', args: {} }],
      });

      const toolMessage = new ToolMessage({
        content: 'Weather response',
        tool_call_id: 'call-123',
      });

      const state: typeof StateAnnotation.State = {
        messages: [originalAIMessage, toolMessage],
        toolExecution: {
          announcementMessageId: 456,
          originalAIMessage,
          currentToolCallIds: ['call-123'],
        },
        toolCallMessageIds: [],
      };

      // Replace the mock implementation to reject with an error
      mockUpdateToolCalls.mockImplementation(() =>
        Promise.reject(new Error('Database error')),
      );

      try {
        await node(state);
        expect.unreachable('Expected promise to reject');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Database error');
      }
    });
  });
});
