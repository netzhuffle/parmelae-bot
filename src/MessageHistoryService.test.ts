import { describe, beforeEach, it, expect } from 'bun:test';
import { MessageHistoryService } from './MessageHistoryService.js';
import { MessageRepositoryFake } from './Fakes/MessageRepositoryFake.js';
import { MessageWithUserAndToolMessages } from './Repositories/Types.js';

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
      expect(result[0]).toEqual(message as MessageWithUserAndToolMessages);
      expect(repository.getCallArgs).toEqual([1]);
    });

    it('should include tool call messages in returned messages', async () => {
      repository.addMessage({
        id: 1,
        text: 'Message with tool calls',
        toolCalls: [{ id: 'call-123', name: 'test_tool' }],
        toolMessages: [
          {
            id: 1,
            messageId: 1,
            toolCallId: 'call-123',
            text: 'Tool response',
          },
        ],
      });

      const result = await service.getHistory(1, 1);

      expect(result).toHaveLength(1);
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
      expect(repository.getPreviousChatMessageCallArgs).toEqual([
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
      expect(result[0]).toEqual(
        singleMessage as MessageWithUserAndToolMessages,
      );
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

    it('should include multiple tool call messages', async () => {
      const chatId = BigInt(100);

      // Create user message
      const originalMessage = repository.addMessage({
        id: 9,
        chatId,
        text: 'User question',
        toolMessages: [],
      });

      // Create tool call announcement messages
      const toolCallMessage1 = repository.addMessage({
        id: 10,
        chatId,
        text: 'Calling search tool...',
        toolMessages: [],
        from: {
          id: BigInt(999),
          isBot: true,
          firstName: 'Bot',
          lastName: null,
          username: 'testbot',
          languageCode: 'en',
        },
      });

      const toolCallMessage2 = repository.addMessage({
        id: 11,
        chatId,
        text: 'Calling calculation tool...',
        toolMessages: [],
        from: {
          id: BigInt(999),
          isBot: true,
          firstName: 'Bot',
          lastName: null,
          username: 'testbot',
          languageCode: 'en',
        },
      });

      // Create final response message that links to tool call messages
      repository.addMessage({
        id: 12,
        chatId,
        text: 'Based on the search and calculation, here is the answer.',
        replyToMessage: originalMessage,
        replyToMessageId: 9,
        toolMessages: [],
        toolCallMessages: [toolCallMessage1, toolCallMessage2], // Link to tool call messages
      });

      const result = await service.getHistory(12, 4);

      // Should include all 4 messages in chronological order
      expect(result).toHaveLength(4);
      expect(result[0].id).toBe(9);
      expect(result[0].text).toBe('User question');
      expect(result[1].id).toBe(10);
      expect(result[1].text).toBe('Calling search tool...');
      expect(result[2].id).toBe(11);
      expect(result[2].text).toBe('Calling calculation tool...');
      expect(result[3].id).toBe(12);
      expect(result[3].text).toBe(
        'Based on the search and calculation, here is the answer.',
      );
    });

    it('should include multiple tool call messages in reply chain', async () => {
      const chatId = BigInt(100);

      // Create user message
      const originalMessage = repository.addMessage({
        id: 9,
        chatId,
        text: 'User question',
        toolMessages: [],
      });

      // Create tool call announcement messages
      const toolCallMessage1 = repository.addMessage({
        id: 10,
        chatId,
        text: 'Calling search tool...',
        toolMessages: [],
        from: {
          id: BigInt(999),
          isBot: true,
          firstName: 'Bot',
          lastName: null,
          username: 'testbot',
          languageCode: 'en',
        },
      });

      const toolCallMessage2 = repository.addMessage({
        id: 11,
        chatId,
        text: 'Calling calculation tool...',
        toolMessages: [],
        from: {
          id: BigInt(999),
          isBot: true,
          firstName: 'Bot',
          lastName: null,
          username: 'testbot',
          languageCode: 'en',
        },
      });

      // Create final response message that links to tool call messages
      const finalResponseMessage = repository.addMessage({
        id: 12,
        chatId,
        text: 'Based on the search and calculation, here is the answer.',
        replyToMessage: originalMessage,
        replyToMessageId: 9,
        toolMessages: [],
        toolCallMessages: [toolCallMessage1, toolCallMessage2], // Link to tool call messages
      });

      // Create user reply
      repository.addMessage({
        id: 13,
        chatId,
        text: 'Thanks',
        replyToMessage: finalResponseMessage,
        replyToMessageId: 12,
        toolMessages: [],
      });

      const result = await service.getHistory(13, 2);

      // Should include all 4 messages in chronological order
      expect(result).toHaveLength(4);
      expect(result[0].id).toBe(10);
      expect(result[0].text).toBe('Calling search tool...');
      expect(result[1].id).toBe(11);
      expect(result[1].text).toBe('Calling calculation tool...');
      expect(result[2].id).toBe(12);
      expect(result[2].text).toBe(
        'Based on the search and calculation, here is the answer.',
      );
      expect(result[3].id).toBe(13);
      expect(result[3].text).toBe('Thanks');
    });

    it('should include multiple tool call messages in history chain', async () => {
      const chatId = BigInt(100);

      // Create user message
      const originalMessage = repository.addMessage({
        id: 9,
        chatId,
        text: 'User question',
        toolMessages: [],
      });

      // Create tool call announcement message
      const toolCallMessage1 = repository.addMessage({
        id: 10,
        chatId,
        text: 'Calling search tool...',
        toolMessages: [],
        from: {
          id: BigInt(999),
          isBot: true,
          firstName: 'Bot',
          lastName: null,
          username: 'testbot',
          languageCode: 'en',
        },
      });

      const toolCallMessage2 = repository.addMessage({
        id: 11,
        chatId,
        text: 'Calling calculation tool...',
        toolMessages: [],
        from: {
          id: BigInt(999),
          isBot: true,
          firstName: 'Bot',
          lastName: null,
          username: 'testbot',
          languageCode: 'en',
        },
      });

      // Create final response message that links to tool call messages
      repository.addMessage({
        id: 12,
        chatId,
        text: 'Based on the search and calculation, here is the answer.',
        replyToMessage: originalMessage,
        replyToMessageId: 9,
        toolMessages: [],
        toolCallMessages: [toolCallMessage1, toolCallMessage2], // Link to tool call messages
      });

      // Create user reply
      repository.addMessage({
        id: 13,
        chatId,
        text: 'Thanks',
        // Not a reply
        toolMessages: [],
      });

      const result = await service.getHistory(13, 2);

      // Should include all 4 messages in chronological order
      expect(result).toHaveLength(4);
      expect(result[0].id).toBe(10);
      expect(result[0].text).toBe('Calling search tool...');
      expect(result[1].id).toBe(11);
      expect(result[1].text).toBe('Calling calculation tool...');
      expect(result[2].id).toBe(12);
      expect(result[2].text).toBe(
        'Based on the search and calculation, here is the answer.',
      );
      expect(result[3].id).toBe(13);
      expect(result[3].text).toBe('Thanks');
    });
  });
});
