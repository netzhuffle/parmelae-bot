import { beforeEach, afterEach, describe, it, expect, jest } from 'bun:test';
import { MessageStorageService } from './MessageStorageService.js';
import { MessageRepositoryFake } from './Fakes/MessageRepositoryFake.js';
import { OldMessageReplyServiceFake } from './Fakes/OldMessageReplyServiceFake.js';
import { MessageWithUser } from './Repositories/Types.js';
import type { MessageRepository } from './Repositories/MessageRepository.js';
import type { OldMessageReplyService } from './OldMessageReplyService.js';

describe('MessageStorageService', () => {
  let messageStorageService: MessageStorageService;
  let messageRepository: MessageRepositoryFake;
  let oldMessageReplyService: OldMessageReplyServiceFake;

  beforeEach(() => {
    jest.useFakeTimers();
    messageRepository = new MessageRepositoryFake();
    oldMessageReplyService = new OldMessageReplyServiceFake();
    messageStorageService = new MessageStorageService(
      messageRepository as unknown as MessageRepository,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    messageRepository.reset();
    oldMessageReplyService.reset();
  });

  describe('startDailyDeletion', () => {
    it('should immediately delete and schedule next when called during main chat time', async () => {
      // Set time to 15:00 (3 PM) - within main chat time (11-23)
      const testTime = new Date('2024-01-15T15:00:00Z');
      jest.setSystemTime(testTime);

      const deletedMessages: MessageWithUser[] = [
        {
          id: 1,
          telegramMessageId: 123,
          chatId: BigInt(456),
          fromId: BigInt(789),
          sentAt: new Date('2024-01-08T10:00:00Z'),
          editedAt: null,
          replyToMessageId: null,
          text: 'Old message',
          imageFileId: null,
          stickerFileId: null,
          toolCalls: null,
          messageAfterToolCallsId: null,
          from: {
            id: BigInt(789),
            username: 'testuser',
            firstName: 'Test',
            lastName: null,
            isBot: false,
            languageCode: null,
          },
        },
      ];

      messageRepository.deleteOldReturnData = deletedMessages;

      messageStorageService.startDailyDeletion(
        oldMessageReplyService as unknown as OldMessageReplyService,
      );

      // Wait for promise chain to complete (deleteOld().then(reply))
      await new Promise<void>((resolve) => {
        setImmediate(() => {
          setImmediate(() => {
            resolve();
          });
        });
      });

      // Verify deleteOld was called immediately
      expect(messageRepository.deleteOldCallArgs.length).toBeGreaterThan(0);
      // Verify reply was called with deleted messages
      expect(oldMessageReplyService.replyCallArgs.length).toBeGreaterThan(0);
      expect(oldMessageReplyService.replyCallArgs[0]).toEqual(deletedMessages);
    });

    it('should schedule for next main chat window when called outside main chat time', () => {
      // Set time to 05:00 (5 AM) - outside main chat time (11-23)
      const testTime = new Date('2024-01-15T05:00:00Z');
      jest.setSystemTime(testTime);

      messageStorageService.startDailyDeletion(
        oldMessageReplyService as unknown as OldMessageReplyService,
      );

      // Should not call deleteOld immediately
      expect(messageRepository.deleteOldCallArgs.length).toBe(0);

      // Should have scheduled a timer (verify by checking timer count)
      const timerCount = jest.getTimerCount();
      expect(timerCount).toBeGreaterThan(0);
    });
  });

  describe('scheduleNextDeletion', () => {
    it('should schedule a timer when called outside main chat time', () => {
      // Set time to 00:00 (midnight) - outside main chat time
      const testTime = new Date('2024-01-15T00:00:00Z');
      jest.setSystemTime(testTime);

      // Access private method through startDailyDeletion which calls scheduleNextDeletion
      messageStorageService.startDailyDeletion(
        oldMessageReplyService as unknown as OldMessageReplyService,
      );

      // Should have scheduled a timer
      const timerCount = jest.getTimerCount();
      expect(timerCount).toBeGreaterThan(0);
    });
  });
});
