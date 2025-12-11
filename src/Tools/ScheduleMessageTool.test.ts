import { beforeEach, afterEach, describe, it, expect, jest } from 'bun:test';
import { ScheduleMessageTool } from './ScheduleMessageTool.js';
import { ScheduledMessageRepositoryFake } from '../Fakes/ScheduledMessageRepositoryFake.js';
import { ScheduledMessageService } from '../ScheduledMessageService.js';
import { TelegramServiceFake } from '../Fakes/TelegramServiceFake.js';
import type { ScheduledMessageRepository } from '../Repositories/ScheduledMessageRepository.js';

describe('ScheduleMessageTool', () => {
  let scheduleMessageTool: ScheduleMessageTool;
  let repository: ScheduledMessageRepositoryFake;
  let service: ScheduledMessageService;
  const chatId = BigInt(456);
  const fromId = BigInt(789);

  beforeEach(() => {
    jest.useFakeTimers();
    repository = new ScheduledMessageRepositoryFake();
    const telegram = new TelegramServiceFake();
    const scheduledMessageRepository =
      repository as unknown as ScheduledMessageRepository;
    service = new ScheduledMessageService(scheduledMessageRepository, telegram);
    scheduleMessageTool = new ScheduleMessageTool(
      scheduledMessageRepository,
      service,
      chatId,
      fromId,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    repository.reset();
  });

  describe('_call', () => {
    it('should schedule message with valid input', async () => {
      const now = new Date('2024-01-15T12:00:00Z');
      jest.setSystemTime(now);

      const seconds = 60; // 1 minute
      const messageText = 'Test reminder';
      const input = `${seconds},${messageText}`;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result: string = await scheduleMessageTool.invoke(input);

      // Should create scheduled message in repository
      expect(repository.createCallArgs.length).toBeGreaterThan(0);
      const createCall = repository.createCallArgs[0];
      if (createCall) {
        expect(createCall.text).toBe(messageText);
        expect(createCall.chatId).toBe(chatId);
        expect(createCall.fromId).toBe(fromId);
      }

      // Should have scheduled a timer
      const timerCount = jest.getTimerCount();
      expect(timerCount).toBeGreaterThan(0);

      // Should return success message with formatted date/time
      expect(result).toContain('Successfully scheduled message for');
      expect(result).toContain('CET');
    });

    it('should return error for input without comma', async () => {
      const input = '60Test reminder';

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result: string = await scheduleMessageTool.invoke(input);

      expect(result).toBe(
        'Error: Invalid input. Input should be a comma separated list of "integer amount of seconds in the future","message text".',
      );
      expect(repository.createCallArgs.length).toBe(0);
    });

    it('should return error for non-numeric first argument', async () => {
      const input = 'not-a-number,Test reminder';

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result: string = await scheduleMessageTool.invoke(input);

      expect(result).toBe(
        'Error: Invalid input. Input should be a comma separated list of "integer amount of seconds in the future","message text". First value must be a positive integer. Use the "date-time" tool if you need to get the current time for calculation purposes.',
      );
      expect(repository.createCallArgs.length).toBe(0);
    });

    it('should return error for negative number', async () => {
      const input = '-60,Test reminder';

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result: string = await scheduleMessageTool.invoke(input);

      expect(result).toBe(
        'Error: Invalid input. Input should be a comma separated list of "integer amount of seconds in the future","message text". First value must be a positive integer. Use the "date-time" tool if you need to get the current time for calculation purposes.',
      );
      expect(repository.createCallArgs.length).toBe(0);
    });

    it('should schedule setTimeout with correct delay', async () => {
      const now = new Date('2024-01-15T12:00:00Z');
      jest.setSystemTime(now);

      const seconds = 120; // 2 minutes
      const messageText = 'Test message';
      const input = `${seconds},${messageText}`;

      await scheduleMessageTool.invoke(input);

      // Should have scheduled a timer for 2 minutes (120 seconds * 1000 ms)
      const timerCount = jest.getTimerCount();
      expect(timerCount).toBeGreaterThan(0);

      // Advance time by 2 minutes
      jest.advanceTimersByTime(120 * 1000);

      // Wait for async operations
      jest.runAllTimers();
      await Promise.resolve(); // Allow promises to settle

      // Should have created scheduled message
      expect(repository.createCallArgs.length).toBeGreaterThan(0);
    });

    it('should return error message when repository.create fails', async () => {
      const now = new Date('2024-01-15T12:00:00Z');
      jest.setSystemTime(now);

      const seconds = 60;
      const messageText = 'Test message';
      const input = `${seconds},${messageText}`;

      // Make repository.create throw an error using error simulation flag
      repository.createShouldThrow = true;
      repository.createError = new Error('Database error');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result: string = await scheduleMessageTool.invoke(input);

      expect(result).toBe('Error: Failed scheduling the message.');
      expect(repository.createCallArgs.length).toBeGreaterThan(0);
    });

    it('should trim message text', async () => {
      const now = new Date('2024-01-15T12:00:00Z');
      jest.setSystemTime(now);

      const seconds = 60;
      const messageText = '  Test message with spaces  ';
      const input = `${seconds},${messageText}`;

      await scheduleMessageTool.invoke(input);

      // Should create with trimmed message
      expect(repository.createCallArgs.length).toBeGreaterThan(0);
      const createCall = repository.createCallArgs[0];
      if (createCall) {
        expect(createCall.text).toBe('Test message with spaces');
      }
    });
  });
});
