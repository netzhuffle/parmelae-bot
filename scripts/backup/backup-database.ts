#!/usr/bin/env bun

import { $ } from 'bun';
import { join } from 'path';

// Configuration
const DB_PATH = join(import.meta.dir, '../../prisma/sqlite.db');
const BACKUP_DIR = join(import.meta.dir, '../../backups');
const BACKUP_PREFIX = 'sqlite-backup';

/**
 * Create a timestamped backup filename
 */
export function createBackupFilename(): string {
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/T/, '-')
    .replace(/\..+/, '')
    .replace(/:/g, '-');
  return `${BACKUP_PREFIX}-${timestamp}.db`;
}

/**
 * Ensure backup directory exists
 */
export async function ensureBackupDirectory(
  dir: string = BACKUP_DIR,
): Promise<void> {
  const dirExists = await Bun.file(dir).exists();
  if (!dirExists) {
    console.log(`Creating backup directory: ${dir}`);
    await $`mkdir -p ${dir}`;
  }
}

/**
 * Create a safe backup of the SQLite database
 */
async function createBackup(): Promise<string> {
  const startTime = Bun.nanoseconds();
  const backupFilename = createBackupFilename();
  const backupPath = join(BACKUP_DIR, backupFilename);

  console.log(`Starting database backup...`);
  console.log(`Source: ${DB_PATH}`);
  console.log(`Destination: ${backupPath}`);

  // Check if source database exists
  const dbExists = await Bun.file(DB_PATH).exists();
  if (!dbExists) {
    throw new Error(`Source database not found: ${DB_PATH}`);
  }

  try {
    // Perform backup using sqlite3 CLI
    console.log('Performing backup...');
    const backupCmd = `.backup '${backupPath}'`;
    await $`sqlite3 -cmd ${backupCmd} ${DB_PATH} ".quit"`.quiet();

    // Verify backup integrity using sqlite3 CLI
    console.log('Verifying backup...');
    const integrity =
      await $`sqlite3 -readonly ${backupPath} "PRAGMA integrity_check;"`.text();
    if (integrity.trim() !== 'ok') {
      throw new Error(`Backup verification failed: ${integrity.trim()}`);
    }
    console.log('✅ Backup verification passed');

    // Get backup file size
    const backupFile = Bun.file(backupPath);
    const backupSize = (await backupFile.stat()).size;

    console.log(`✅ Backup completed successfully!`);
    console.log(`📁 Backup file: ${backupPath}`);
    console.log(`📏 Backup size: ${formatFileSize(backupSize)}`);
    console.log(`📅 Created at: ${new Date().toISOString()}`);

    // Performance timing
    const endTime = Bun.nanoseconds();
    const durationMs = (endTime - startTime) / 1_000_000; // Convert to milliseconds
    console.log(`⏱️  Backup duration: ${durationMs.toFixed(2)}ms`);

    // Force garbage collection after backup operation
    if (Bun.gc) {
      Bun.gc();
    }

    return backupPath;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Backup failed:', errorMessage);

    // Clean up failed backup file (no DB handle to close)

    try {
      const backupFile = Bun.file(backupPath);
      if (await backupFile.exists()) {
        await $`rm -f ${backupPath}`.quiet();
        console.log('🧹 Cleaned up failed backup file');
      }
    } catch {
      console.warn('⚠️  Warning: Failed to clean up backup file:', backupPath);
    }

    throw error;
  }
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    await ensureBackupDirectory();
    await createBackup();

    // Exit with success code
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Backup script failed:', errorMessage);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${Bun.argv[1]}`) {
  void main();
}
