import { describe, beforeEach, it, expect } from 'bun:test';
import { MessageRepositoryFake } from './MessageRepositoryFake.js';

describe('MessageRepositoryFake', () => {
  let repository: MessageRepositoryFake;

  beforeEach(() => {
    repository = new MessageRepositoryFake();
  });

  describe('get', () => {
    it('should return message when it exists', async () => {
      const message = repository.addMessage({ id: 1, text: 'Test message' });

      const result = await repository.get(1);

      expect(result).toEqual(message);
      expect(repository.getCallArgs).toEqual([1]);
    });

    it('should throw error when message does not exist', async () => {
      try {
        await repository.get(999);
        expect.unreachable('Expected promise to reject');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Message with id 999 not found');
      }
      expect(repository.getCallArgs).toEqual([999]);
    });
  });

  describe('getPreviousChatMessage', () => {
    it('should return the most recent message in chat before given id', async () => {
      const chatId = BigInt(100);
      repository.addMessage({ id: 1, chatId, text: 'First message' });
      repository.addMessage({ id: 2, chatId, text: 'Second message' });
      repository.addMessage({ id: 3, chatId, text: 'Third message' });

      const result = await repository.getPreviousChatMessage(chatId, 3);

      expect(result?.id).toBe(2);
      expect(result?.text).toBe('Second message');
      expect(repository.getPreviousChatMessageCallArgs).toEqual([
        { chatId, beforeMessageId: 3 },
      ]);
    });

    it('should return null when no messages exist before given id', async () => {
      const chatId = BigInt(100);
      repository.addMessage({ id: 5, chatId, text: 'Only message' });

      const result = await repository.getPreviousChatMessage(chatId, 3);

      expect(result).toBeNull();
    });

    it('should only consider messages from the specified chat', async () => {
      const chatId1 = BigInt(100);
      const chatId2 = BigInt(200);
      repository.addMessage({ id: 1, chatId: chatId1, text: 'Chat 1 message' });
      repository.addMessage({ id: 2, chatId: chatId2, text: 'Chat 2 message' });

      const result = await repository.getPreviousChatMessage(chatId1, 5);

      expect(result?.chatId).toBe(chatId1);
      expect(result?.text).toBe('Chat 1 message');
    });
  });

  describe('updateToolCalls', () => {
    it('should update tool calls for existing message', async () => {
      const message = repository.addMessage({ id: 1, text: 'Test message' });
      const toolCalls = [{ id: 'call-123', name: 'test_tool' }];

      await repository.updateToolCalls(1, toolCalls);

      expect(message.toolCalls).toEqual(toolCalls);
      expect(repository.updateToolCallsCallArgs).toEqual([
        { messageId: 1, toolCalls },
      ]);
    });

    it('should handle updating non-existent message gracefully', async () => {
      const toolCalls = [{ id: 'call-123', name: 'test_tool' }];

      await repository.updateToolCalls(999, toolCalls);

      expect(repository.updateToolCallsCallArgs).toEqual([
        { messageId: 999, toolCalls },
      ]);
    });
  });

  describe('addMessage', () => {
    it('should add message with default values', () => {
      const message = repository.addMessage({ text: 'Custom text' });

      expect(message.id).toBe(1);
      expect(message.text).toBe('Custom text');
      expect(message.from.firstName).toBe('Test');
      expect(message.toolMessages).toEqual([]);
    });

    it('should auto-increment id for multiple messages', () => {
      const message1 = repository.addMessage({ text: 'First' });
      const message2 = repository.addMessage({ text: 'Second' });

      expect(message1.id).toBe(1);
      expect(message2.id).toBe(2);
    });
  });

  describe('reset', () => {
    it('should clear all messages and call args', async () => {
      repository.addMessage({ text: 'Test message' });
      await repository.get(1);
      await repository.updateToolCalls(1, []);

      repository.reset();

      expect(repository.getCallArgs).toEqual([]);
      expect(repository.getPreviousChatMessageCallArgs).toEqual([]);
      expect(repository.updateToolCallsCallArgs).toEqual([]);
    });
  });
});
