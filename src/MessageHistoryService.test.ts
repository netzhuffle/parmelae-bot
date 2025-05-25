import { MessageHistoryService } from './MessageHistoryService.js';
import { MessageRepositoryFake } from './Fakes/MessageRepositoryFake.js';

describe('MessageHistoryService', () => {
  let service: MessageHistoryService;
  let repository: MessageRepositoryFake;

  beforeEach(() => {
    repository = new MessageRepositoryFake();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    service = new MessageHistoryService(repository as any);
  });

  describe('getHistory', () => {
    it('should return single message when count is 1', async () => {
      const message = repository.addMessage({
        id: 1,
        text: 'Single message',
        toolMessages: [],
      });

      const result = await service.getHistory(1, 1);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(message);
      expect(repository.getCallArgs).toEqual([1]);
    });

    it('should include tool messages in returned messages', async () => {
      const toolMessages = [
        { id: 1, messageId: 1, toolCallId: 'call-123', text: 'Tool response' },
      ];
      repository.addMessage({
        id: 1,
        text: 'Message with tools',
        toolCalls: [{ id: 'call-123', name: 'test_tool' }],
        toolMessages,
      });

      const result = await service.getHistory(1, 1);

      expect(result).toHaveLength(1);
      expect(result[0].toolMessages).toEqual(toolMessages);
      expect(result[0].toolCalls).toEqual([
        { id: 'call-123', name: 'test_tool' },
      ]);
    });

    it('should follow reply chain when message is a reply', async () => {
      const chatId = BigInt(100);
      const originalMessage = repository.addMessage({
        id: 1,
        chatId,
        text: 'Original message',
        toolMessages: [],
      });
      repository.addMessage({
        id: 2,
        chatId,
        text: 'Reply message',
        replyToMessage: originalMessage,
        replyToMessageId: 1,
        toolMessages: [],
      });

      const result = await service.getHistory(2, 2);

      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('Original message');
      expect(result[1].text).toBe('Reply message');
      expect(repository.getCallArgs).toEqual([2, 1]);
    });

    it('should fall back to chat history when not a reply', async () => {
      const chatId = BigInt(100);
      repository.addMessage({
        id: 1,
        chatId,
        text: 'First message',
        toolMessages: [],
      });
      repository.addMessage({
        id: 2,
        chatId,
        text: 'Second message',
        toolMessages: [],
      });

      const result = await service.getHistory(2, 2);

      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('First message');
      expect(result[1].text).toBe('Second message');
      expect(repository.getCallArgs).toEqual([2]);
      expect(repository.getLastChatMessageCallArgs).toEqual([
        { chatId, beforeMessageId: 2 },
      ]);
    });

    it('should stop when requested count is reached', async () => {
      const chatId = BigInt(100);
      repository.addMessage({
        id: 1,
        chatId,
        text: 'Message 1',
        toolMessages: [],
      });
      repository.addMessage({
        id: 2,
        chatId,
        text: 'Message 2',
        toolMessages: [],
      });
      repository.addMessage({
        id: 3,
        chatId,
        text: 'Message 3',
        toolMessages: [],
      });

      const result = await service.getHistory(3, 2);

      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('Message 2');
      expect(result[1].text).toBe('Message 3');
    });

    it('should stop when no more messages available', async () => {
      const chatId = BigInt(100);
      const singleMessage = repository.addMessage({
        id: 1,
        chatId,
        text: 'Only message',
        toolMessages: [],
      });

      const result = await service.getHistory(1, 5);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(singleMessage);
    });

    it('should handle complex reply chain with tool messages', async () => {
      const chatId = BigInt(100);

      // Message 1: Original with tool calls
      const message1 = repository.addMessage({
        id: 1,
        chatId,
        text: 'Original with tools',
        toolCalls: [{ id: 'call-123', name: 'search_tool' }],
        toolMessages: [
          {
            id: 1,
            messageId: 1,
            toolCallId: 'call-123',
            text: 'Search result',
          },
        ],
      });

      // Message 2: Reply to message 1
      const message2 = repository.addMessage({
        id: 2,
        chatId,
        text: 'Reply to original',
        replyToMessage: message1,
        replyToMessageId: 1,
        toolMessages: [],
      });

      // Message 3: Reply to message 2 with tools
      repository.addMessage({
        id: 3,
        chatId,
        text: 'Reply with tools',
        replyToMessage: message2,
        replyToMessageId: 2,
        toolCalls: [{ id: 'call-456', name: 'calc_tool' }],
        toolMessages: [
          {
            id: 2,
            messageId: 3,
            toolCallId: 'call-456',
            text: 'Calculation result',
          },
        ],
      });

      const result = await service.getHistory(3, 3);

      expect(result).toHaveLength(3);
      expect(result[0].text).toBe('Original with tools');
      expect(result[0].toolMessages).toHaveLength(1);
      expect(result[1].text).toBe('Reply to original');
      expect(result[2].text).toBe('Reply with tools');
      expect(result[2].toolMessages).toHaveLength(1);
    });
  });
});
