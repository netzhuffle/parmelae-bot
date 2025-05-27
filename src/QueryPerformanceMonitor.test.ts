import { QueryPerformanceMonitor } from './QueryPerformanceMonitor.js';

import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
const mockPrismaClient = {
  $on: jest.fn(),
} as unknown as PrismaClient;

describe('QueryPerformanceMonitor', () => {
  let monitor: QueryPerformanceMonitor;
  let queryEventHandler: (event: unknown) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    monitor = new QueryPerformanceMonitor(mockPrismaClient as any);

    // Capture the query event handler
    (mockPrismaClient.$on as jest.Mock).mockImplementation(
      (event: string, handler: unknown) => {
        if (event === 'query') {
          queryEventHandler = handler as (event: unknown) => void;
        }
      },
    );
  });

  describe('startMonitoring', () => {
    it('should set up event listeners for query monitoring', () => {
      monitor.startMonitoring();

      expect(mockPrismaClient.$on).toHaveBeenCalledWith(
        'query',
        expect.any(Function),
      );
      expect(mockPrismaClient.$on).toHaveBeenCalledWith(
        'info',
        expect.any(Function),
      );
      expect(mockPrismaClient.$on).toHaveBeenCalledWith(
        'warn',
        expect.any(Function),
      );
      expect(mockPrismaClient.$on).toHaveBeenCalledWith(
        'error',
        expect.any(Function),
      );
    });

    it('should not set up listeners multiple times', () => {
      monitor.startMonitoring();
      monitor.startMonitoring();

      // Should only be called once for each event type
      expect(mockPrismaClient.$on).toHaveBeenCalledTimes(4);
    });
  });

  describe('query event handling', () => {
    beforeEach(() => {
      monitor.startMonitoring();
    });

    it('should capture query metrics', () => {
      const mockQueryEvent = {
        query: 'SELECT * FROM "Message" WHERE "id" = $1',
        params: '["123"]',
        duration: 45,
        timestamp: new Date('2024-01-01T10:00:00Z'),
      };

      queryEventHandler(mockQueryEvent);

      const stats = monitor.getStats();
      expect(stats.totalQueries).toBe(1);
      expect(stats.averageDuration).toBe(45);
    });

    it('should identify slow queries', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const slowQueryEvent = {
        query: 'SELECT * FROM "Message" WHERE "chatId" = $1',
        params: '["456"]',
        duration: 150, // Above threshold
        timestamp: new Date(),
      };

      queryEventHandler(slowQueryEvent);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🐌 Slow query detected (150ms):'),
        expect.any(Object),
      );

      consoleSpy.mockRestore();
    });

    it('should extract target from different query types', () => {
      const queries = [
        {
          query: 'SELECT * FROM "Message" WHERE "id" = $1',
          params: '[]',
          duration: 10,
          timestamp: new Date(),
          expectedTarget: 'SELECT Message',
        },
        {
          query: 'INSERT INTO "User" ("id", "firstName") VALUES ($1, $2)',
          params: '[]',
          duration: 15,
          timestamp: new Date(),
          expectedTarget: 'INSERT User',
        },
        {
          query: 'UPDATE "Message" SET "text" = $1 WHERE "id" = $2',
          params: '[]',
          duration: 20,
          timestamp: new Date(),
          expectedTarget: 'UPDATE Message',
        },
        {
          query: 'DELETE FROM "ToolMessage" WHERE "messageId" = $1',
          params: '[]',
          duration: 8,
          timestamp: new Date(),
          expectedTarget: 'DELETE ToolMessage',
        },
      ];

      queries.forEach((queryEvent) => {
        queryEventHandler(queryEvent);
      });

      const stats = monitor.getStats();
      const targets = Array.from(stats.queryFrequency.keys());

      expect(targets).toContain('SELECT message');
      expect(targets).toContain('INSERT user');
      expect(targets).toContain('UPDATE message');
      expect(targets).toContain('DELETE toolmessage');
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      monitor.startMonitoring();
    });

    it('should return correct statistics', () => {
      const queries = [
        {
          query: 'SELECT * FROM "Message"',
          params: '[]',
          duration: 10,
          timestamp: new Date(),
        },
        {
          query: 'SELECT * FROM "Message"',
          params: '[]',
          duration: 20,
          timestamp: new Date(),
        },
        {
          query: 'SELECT * FROM "User"',
          params: '[]',
          duration: 150,
          timestamp: new Date(),
        },
      ];

      queries.forEach(queryEventHandler);

      const stats = monitor.getStats();

      expect(stats.totalQueries).toBe(3);
      expect(stats.averageDuration).toBe(60); // (10 + 20 + 150) / 3
      expect(stats.slowQueries).toHaveLength(1);
      expect(stats.slowQueries[0].duration).toBe(150);
      expect(stats.queryFrequency.get('SELECT message')).toBe(2);
      expect(stats.queryFrequency.get('SELECT user')).toBe(1);
    });

    it('should handle empty metrics', () => {
      const stats = monitor.getStats();

      expect(stats.totalQueries).toBe(0);
      expect(stats.averageDuration).toBe(0);
      expect(stats.slowQueries).toHaveLength(0);
      expect(stats.queryFrequency.size).toBe(0);
    });
  });

  describe('generateReport', () => {
    beforeEach(() => {
      monitor.startMonitoring();
    });

    it('should generate a comprehensive performance report', () => {
      const queries = [
        {
          query: 'SELECT * FROM "Message"',
          params: '[]',
          duration: 10,
          timestamp: new Date(),
        },
        {
          query: 'SELECT * FROM "User"',
          params: '[]',
          duration: 150,
          timestamp: new Date(),
        },
      ];

      queries.forEach(queryEventHandler);

      const report = monitor.generateReport();

      expect(report).toContain('DATABASE QUERY PERFORMANCE REPORT');
      expect(report).toContain('Total Queries: 2');
      expect(report).toContain('Average Duration: 80.00ms');
      expect(report).toContain('Slow Queries (>100ms): 1');
      expect(report).toContain('SELECT user - 150ms');
    });
  });

  describe('clearMetrics', () => {
    beforeEach(() => {
      monitor.startMonitoring();
    });

    it('should clear all collected metrics', () => {
      const queryEvent = {
        query: 'SELECT * FROM "Message"',
        params: '[]',
        duration: 10,
        timestamp: new Date(),
      };

      queryEventHandler(queryEvent);
      expect(monitor.getStats().totalQueries).toBe(1);

      monitor.clearMetrics();
      expect(monitor.getStats().totalQueries).toBe(0);
    });
  });

  describe('getMetricsForPeriod', () => {
    beforeEach(() => {
      monitor.startMonitoring();
    });

    it('should return metrics within specified time period', () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T11:00:00Z');

      const queries = [
        {
          query: 'SELECT * FROM "Message"',
          params: '[]',
          duration: 10,
          timestamp: new Date('2024-01-01T09:30:00Z'),
        }, // Before
        {
          query: 'SELECT * FROM "User"',
          params: '[]',
          duration: 20,
          timestamp: new Date('2024-01-01T10:30:00Z'),
        }, // Within
        {
          query: 'SELECT * FROM "Chat"',
          params: '[]',
          duration: 30,
          timestamp: new Date('2024-01-01T11:30:00Z'),
        }, // After
      ];

      queries.forEach(queryEventHandler);

      const periodMetrics = monitor.getMetricsForPeriod(startTime, endTime);

      expect(periodMetrics).toHaveLength(1);
      expect(periodMetrics[0].duration).toBe(20);
    });
  });
});
