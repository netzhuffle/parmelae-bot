import { describe, beforeEach, it, expect } from 'bun:test';
import { ToolMessageRepositoryFake } from '../Fakes/ToolMessageRepositoryFake.js';

describe('ToolMessageRepository', () => {
  let repository: ToolMessageRepositoryFake;

  beforeEach(() => {
    repository = new ToolMessageRepositoryFake();
  });

  describe('store', () => {
    it('should store a tool message with provided data', async () => {
      const toolMessageData = {
        toolCallId: 'call-123',
        text: 'Tool response text',
        messageId: 456,
      };

      await repository.store(toolMessageData);

      expect(repository.storeCallArgs).toHaveLength(1);
      expect(repository.storeCallArgs[0]).toEqual({
        toolCallId: 'call-123',
        text: 'Tool response text',
        messageId: 456,
      });
    });

    it('should store multiple tool messages', async () => {
      const toolMessageData1 = {
        toolCallId: 'call-123',
        text: 'First response',
        messageId: 456,
      };

      const toolMessageData2 = {
        toolCallId: 'call-124',
        text: 'Second response',
        messageId: 456,
      };

      await repository.store(toolMessageData1);
      await repository.store(toolMessageData2);

      expect(repository.storeCallArgs).toHaveLength(2);
      expect(repository.storeCallArgs[0]).toEqual(toolMessageData1);
      expect(repository.storeCallArgs[1]).toEqual(toolMessageData2);
    });
  });
});
