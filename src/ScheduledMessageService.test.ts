import { beforeEach, afterEach, describe, it, expect, jest } from 'bun:test';
import { ScheduledMessageService } from './ScheduledMessageService.js';
import { ScheduledMessageRepositoryFake } from './Fakes/ScheduledMessageRepositoryFake.js';
import { TelegramServiceFake } from './Fakes/TelegramServiceFake.js';
import { ScheduledMessageModel } from './generated/prisma/models/ScheduledMessage.js';
import type { ScheduledMessageRepository } from './Repositories/ScheduledMessageRepository.js';

describe('ScheduledMessageService', () => {
  let scheduledMessageService: ScheduledMessageService;
  let repository: ScheduledMessageRepositoryFake;
  let telegram: TelegramServiceFake;

  beforeEach(() => {
    jest.useFakeTimers();
    repository = new ScheduledMessageRepositoryFake();
    telegram = new TelegramServiceFake();
    scheduledMessageService = new ScheduledMessageService(
      repository as unknown as ScheduledMessageRepository,
      telegram,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    repository.reset();
    telegram.reset();
  });

  describe('schedule', () => {
    it('should send messages immediately if sendAt is in the past', async () => {
      const now = new Date('2024-01-15T12:00:00Z');
      jest.setSystemTime(now);

      const pastMessage: ScheduledMessageModel = {
        id: 1,
        chatId: BigInt(456),
        fromId: BigInt(789),
        sendAt: new Date('2024-01-15T11:00:00Z'), // 1 hour ago
        scheduledAt: new Date('2024-01-15T10:00:00Z'),
        text: 'Past message',
      };

      repository.addScheduledMessage(pastMessage);
      telegram.sendReturnData = [123];

      await scheduledMessageService.schedule();

      // Should send immediately (within 1 second threshold)
      expect(telegram.sendCallArgs.length).toBeGreaterThan(0);
      expect(telegram.sendCallArgs[0]?.message).toBe('Past message');
      expect(telegram.sendCallArgs[0]?.chatId).toBe(BigInt(456));
    });

    it('should send messages immediately if sendAt is within 1 second', async () => {
      const now = new Date('2024-01-15T12:00:00Z');
      jest.setSystemTime(now);

      const soonMessage: ScheduledMessageModel = {
        id: 2,
        chatId: BigInt(456),
        fromId: BigInt(789),
        sendAt: new Date('2024-01-15T12:00:00.500Z'), // 500ms in the future
        scheduledAt: new Date('2024-01-15T10:00:00Z'),
        text: 'Soon message',
      };

      repository.addScheduledMessage(soonMessage);
      telegram.sendReturnData = [123];

      await scheduledMessageService.schedule();

      // Should send immediately (within 1 second threshold)
      expect(telegram.sendCallArgs.length).toBeGreaterThan(0);
      expect(telegram.sendCallArgs[0]?.message).toBe('Soon message');
    });

    it('should schedule messages with setTimeout if sendAt is in the future', async () => {
      const now = new Date('2024-01-15T12:00:00Z');
      jest.setSystemTime(now);

      const futureMessage: ScheduledMessageModel = {
        id: 3,
        chatId: BigInt(456),
        fromId: BigInt(789),
        sendAt: new Date('2024-01-15T12:05:00Z'), // 5 minutes in the future
        scheduledAt: new Date('2024-01-15T10:00:00Z'),
        text: 'Future message',
      };

      repository.addScheduledMessage(futureMessage);
      telegram.sendReturnData = [123];

      await scheduledMessageService.schedule();

      // Should not send immediately
      expect(telegram.sendCallArgs.length).toBe(0);

      // Should have scheduled a timer
      const timerCount = jest.getTimerCount();
      expect(timerCount).toBeGreaterThan(0);

      // Advance time by 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);

      // Wait for async operations
      jest.runAllTimers();
      await Promise.resolve(); // Allow promises to settle

      // Should send after timeout
      expect(telegram.sendCallArgs.length).toBeGreaterThan(0);
      expect(telegram.sendCallArgs[0]?.message).toBe('Future message');
      expect(telegram.sendCallArgs[0]?.chatId).toBe(BigInt(456));
    });

    it('should handle multiple messages with different send times', async () => {
      const now = new Date('2024-01-15T12:00:00Z');
      jest.setSystemTime(now);

      const messages: ScheduledMessageModel[] = [
        {
          id: 1,
          chatId: BigInt(456),
          fromId: BigInt(789),
          sendAt: new Date('2024-01-15T11:00:00Z'), // Past - send immediately
          scheduledAt: new Date('2024-01-15T10:00:00Z'),
          text: 'Past message',
        },
        {
          id: 2,
          chatId: BigInt(456),
          fromId: BigInt(789),
          sendAt: new Date('2024-01-15T12:02:00Z'), // 2 minutes future - schedule
          scheduledAt: new Date('2024-01-15T10:00:00Z'),
          text: 'Future message',
        },
      ];

      messages.forEach((msg) => repository.addScheduledMessage(msg));
      telegram.sendReturnData = [123, 124];

      await scheduledMessageService.schedule();

      // Past message should be sent immediately
      expect(telegram.sendCallArgs.length).toBeGreaterThan(0);
      expect(telegram.sendCallArgs[0]?.message).toBe('Past message');

      // Future message should be scheduled
      const timerCount = jest.getTimerCount();
      expect(timerCount).toBeGreaterThan(0);

      // Advance time by 2 minutes
      jest.advanceTimersByTime(2 * 60 * 1000);
      jest.runAllTimers();
      await Promise.resolve(); // Allow promises to settle

      // Both messages should be sent
      expect(telegram.sendCallArgs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('send', () => {
    it('should send message via telegram and delete from repository on success', async () => {
      const chatId = BigInt(456);
      const messageId = 123;
      const messageText = 'Test message';

      // Add a scheduled message to the repository so delete can find it
      repository.addScheduledMessage({
        id: messageId,
        chatId,
        fromId: BigInt(789),
        sendAt: new Date(),
        scheduledAt: new Date(),
        text: messageText,
      });

      telegram.sendReturnData = [456];

      scheduledMessageService.send(messageText, messageId, chatId);

      // Wait for async operations - send() uses .then() which needs time to resolve
      // Run timers and allow promise microtasks to execute
      jest.runAllTimers();
      // Use setImmediate to wait for promise chain
      await new Promise<void>((resolve) => {
        setImmediate(() => {
          setImmediate(() => {
            resolve();
          });
        });
      });

      expect(telegram.sendCallArgs.length).toBeGreaterThan(0);
      expect(telegram.sendCallArgs[0]?.message).toBe(messageText);
      expect(telegram.sendCallArgs[0]?.chatId).toBe(chatId);
      expect(repository.deleteCallArgs).toContain(messageId);
    });

    it('should not delete message from repository on send error', async () => {
      const chatId = BigInt(456);
      const messageId = 123;
      const messageText = 'Test message';

      // Make send throw an error using error simulation flag
      telegram.sendShouldThrow = true;
      telegram.sendError = new Error('Send failed');

      scheduledMessageService.send(messageText, messageId, chatId);

      // Wait for async operations
      jest.runAllTimers();
      await new Promise<void>((resolve) => {
        setImmediate(() => {
          setImmediate(() => {
            resolve();
          });
        });
      });

      expect(telegram.sendCallArgs.length).toBeGreaterThan(0);
      // Repository delete should not be called on error
      expect(repository.deleteCallArgs).not.toContain(messageId);
    });
  });
});
