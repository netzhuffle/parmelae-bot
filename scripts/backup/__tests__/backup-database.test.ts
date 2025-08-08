import { describe, it, expect, setSystemTime } from 'bun:test';
import { existsSync, mkdirSync } from 'fs';

// Import the backup script functions
import {
  createBackupFilename,
  ensureBackupDirectory,
} from '../backup-database.ts';

describe('Backup Database Script', () => {
  describe('createBackupFilename', () => {
    it('should create filename with correct format', () => {
      const filename = createBackupFilename();

      expect(filename).toMatch(
        /^sqlite-backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.db$/,
      );
    });

    it('should create unique filenames for different times', () => {
      // Set a specific time
      const baseTime = new Date('2024-01-15T10:30:45Z');
      setSystemTime(baseTime);

      const filename1 = createBackupFilename();

      // Advance time by 1 second
      setSystemTime(new Date(baseTime.getTime() + 1000));

      const filename2 = createBackupFilename();

      // Reset system time
      setSystemTime();

      expect(filename1).toBe('sqlite-backup-2024-01-15-10-30-45.db');
      expect(filename2).toBe('sqlite-backup-2024-01-15-10-30-46.db');
      expect(filename1).not.toBe(filename2);
    });
  });

  describe('ensureBackupDirectory', () => {
    it('should create backup directory if it does not exist', async () => {
      const testDir = '/tmp/test-backup-dir';

      // Remove directory if it exists
      try {
        if (existsSync(testDir)) {
          // Use rm via shell is not necessary here; Node fs is enough in tests
          // But keep Bun.$ for parity and to avoid platform differences
          const { $ } = await import('bun');
          await $`rm -rf ${testDir}`.quiet();
        }
      } catch {
        // Ignore errors
      }

      await ensureBackupDirectory(testDir);

      expect(existsSync(testDir)).toBe(true);
    });

    it('should not fail if directory already exists', async () => {
      const testDir = '/tmp/test-backup-dir-exists';

      // Create directory first
      mkdirSync(testDir, { recursive: true });

      // Should not throw error
      await ensureBackupDirectory(testDir);

      expect(existsSync(testDir)).toBe(true);
    });
  });

  describe('Backup script structure', () => {
    it('should export required functions', () => {
      expect(typeof createBackupFilename).toBe('function');
      expect(typeof ensureBackupDirectory).toBe('function');
    });

    it('should create valid timestamp format', () => {
      const filename = createBackupFilename();
      const parts = filename.split('-');

      // Check format: sqlite-backup-YYYY-MM-DD-HH-mm-ss.db
      expect(parts[0]).toBe('sqlite');
      expect(parts[1]).toBe('backup');
      expect(parts[2]).toMatch(/^\d{4}$/); // Year
      expect(parts[3]).toMatch(/^\d{2}$/); // Month
      expect(parts[4]).toMatch(/^\d{2}$/); // Day
      expect(parts[5]).toMatch(/^\d{2}$/); // Hour
      expect(parts[6]).toMatch(/^\d{2}$/); // Minute
      expect(parts[7]).toMatch(/^\d{2}\.db$/); // Second + extension
    });
  });
});
