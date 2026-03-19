import { describe, beforeEach, it, expect, mock, spyOn } from 'bun:test';

import { PrismaClient } from '../generated/prisma/client.js';
import { DateTimeSettingRepository } from './DateTimeSettingRepository.js';

describe('DateTimeSettingRepository', () => {
  let repository: DateTimeSettingRepository;
  let prisma: PrismaClient;
  let findUniqueMock: ReturnType<typeof mock>;
  let createMock: ReturnType<typeof mock>;
  let updateMock: ReturnType<typeof mock>;
  let upsertMock: ReturnType<typeof mock>;

  beforeEach(() => {
    findUniqueMock = mock();
    createMock = mock();
    updateMock = mock();
    upsertMock = mock();
    prisma = {
      dateTimeSetting: {
        findUnique: findUniqueMock,
        create: createMock,
        update: updateMock,
        upsert: upsertMock,
      },
    } as unknown as PrismaClient;
    repository = new DateTimeSettingRepository(prisma);
  });

  describe('get', () => {
    it('should return stored date when setting exists', async () => {
      const storedDate = new Date('2025-11-13T15:24:36.000Z');
      findUniqueMock.mockResolvedValue({
        setting: 'test-setting',
        dateTime: storedDate,
      });

      const result = await repository.get('test-setting', new Date());

      expect(result).toEqual(storedDate);
      expect(findUniqueMock).toHaveBeenCalledWith({
        where: { setting: 'test-setting' },
      });
    });

    it('should create and return startingValue when setting does not exist', async () => {
      const startingValue = new Date('2025-11-17T10:00:00.000Z');
      findUniqueMock.mockResolvedValue(null);
      createMock.mockResolvedValue({
        setting: 'test-setting',
        dateTime: startingValue,
      });

      const result = await repository.get('test-setting', startingValue);

      expect(result).toEqual(startingValue);
      expect(createMock).toHaveBeenCalledWith({
        data: {
          setting: 'test-setting',
          dateTime: startingValue,
        },
      });
    });

    it('should return startingValue and repair when stored date is invalid', async () => {
      const invalidDate = new Date(NaN);
      const startingValue = new Date('2025-11-17T10:00:00.000Z');
      const consoleWarnSpy = spyOn(console, 'warn').mockImplementation(() => {
        // Suppress console output in tests
      });

      findUniqueMock.mockResolvedValue({
        setting: 'test-setting',
        dateTime: invalidDate,
      });
      updateMock.mockResolvedValue({
        setting: 'test-setting',
        dateTime: startingValue,
      });

      const result = await repository.get('test-setting', startingValue);

      expect(result).toEqual(startingValue);
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid date stored'));
      expect(updateMock).toHaveBeenCalledWith({
        where: { setting: 'test-setting' },
        data: { dateTime: startingValue },
      });

      consoleWarnSpy.mockRestore();
    });
  });

  describe('update', () => {
    it('should update setting when newDate is newer than oldDate', async () => {
      const oldDate = new Date('2025-11-13T15:24:36.000Z');
      const newDate = new Date('2025-11-17T10:00:00.000Z');

      findUniqueMock.mockResolvedValue({
        setting: 'test-setting',
        dateTime: oldDate,
      });
      upsertMock.mockResolvedValue({
        setting: 'test-setting',
        dateTime: newDate,
      });

      await repository.update('test-setting', newDate);

      expect(upsertMock).toHaveBeenCalledWith({
        where: {
          setting: 'test-setting',
        },
        create: {
          setting: 'test-setting',
          dateTime: newDate,
        },
        update: {
          dateTime: newDate,
        },
      });
    });

    it('should not update when newDate is older than or equal to oldDate', async () => {
      const oldDate = new Date('2025-11-17T10:00:00.000Z');
      const newDate = new Date('2025-11-13T15:24:36.000Z');

      findUniqueMock.mockResolvedValue({
        setting: 'test-setting',
        dateTime: oldDate,
      });

      await repository.update('test-setting', newDate);

      expect(upsertMock).not.toHaveBeenCalled();
    });

    it('should throw error when newDate is invalid', async () => {
      const invalidDate = new Date(NaN);

      // oxlint-disable-next-line @typescript-eslint/await-thenable -- Bun's rejects matcher is awaitable, but Oxlint does not recognize it as thenable
      await expect(repository.update('test-setting', invalidDate)).rejects.toThrow(
        'Cannot update setting',
      );
    });

    it('should update when oldDate is invalid (treat as no old date)', async () => {
      const invalidOldDate = new Date(NaN);
      const newDate = new Date('2025-11-17T10:00:00.000Z');

      findUniqueMock.mockResolvedValue({
        setting: 'test-setting',
        dateTime: invalidOldDate,
      });
      upsertMock.mockResolvedValue({
        setting: 'test-setting',
        dateTime: newDate,
      });

      await repository.update('test-setting', newDate);

      expect(upsertMock).toHaveBeenCalledWith({
        where: {
          setting: 'test-setting',
        },
        create: {
          setting: 'test-setting',
          dateTime: newDate,
        },
        update: {
          dateTime: newDate,
        },
      });
    });

    it('should update when oldDate does not exist', async () => {
      const newDate = new Date('2025-11-17T10:00:00.000Z');

      findUniqueMock.mockResolvedValue(null);
      upsertMock.mockResolvedValue({
        setting: 'test-setting',
        dateTime: newDate,
      });

      await repository.update('test-setting', newDate);

      expect(upsertMock).toHaveBeenCalledWith({
        where: {
          setting: 'test-setting',
        },
        create: {
          setting: 'test-setting',
          dateTime: newDate,
        },
        update: {
          dateTime: newDate,
        },
      });
    });

    it('should overwrite the stored date even when the previous timestamp cannot be used as a fingerprint', async () => {
      const oldDate = new Date('2026-03-19T01:00:00.000Z');
      const newDate = new Date('2026-03-19T02:00:00.000Z');

      findUniqueMock.mockResolvedValue({
        setting: 'last commit DateTime',
        dateTime: oldDate,
      });
      upsertMock.mockResolvedValue({
        setting: 'last commit DateTime',
        dateTime: newDate,
      });

      await repository.update('last commit DateTime', newDate);

      expect(upsertMock).toHaveBeenCalledWith({
        where: {
          setting: 'last commit DateTime',
        },
        create: {
          setting: 'last commit DateTime',
          dateTime: newDate,
        },
        update: {
          dateTime: newDate,
        },
      });
    });
  });
});
