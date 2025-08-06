#!/usr/bin/env bun

import Database from 'better-sqlite3';
import { join } from 'path';
import { createInterface } from 'readline';

// Configuration
const BACKUP_DIR = join(import.meta.dir, '../../backups');
const DB_PATH = join(import.meta.dir, '../../prisma/sqlite.db');
const BACKUP_PREFIX = 'sqlite-backup';

interface BackupFile {
  name: string;
  path: string;
  created: Date;
  size: number;
}

/**
 * Get all available backup files
 */
async function getAvailableBackups(): Promise<BackupFile[]> {
  try {
    // Use Bun's shell to list files
    const result =
      await Bun.$`find ${BACKUP_DIR} -name "${BACKUP_PREFIX}*.db" -type f`.text();
    const files = result.trim().split('\n').filter(Boolean);

    const fileStats = await Promise.all(
      files.map(async (filePath) => {
        const file = Bun.file(filePath);
        const stats = await file.stat();
        const fileName = filePath.split('/').pop();
        if (!fileName) {
          throw new Error(`Invalid file path: ${filePath}`);
        }
        return {
          name: fileName,
          path: filePath,
          created: stats.birthtime || stats.mtime,
          size: stats.size,
        };
      }),
    );

    // Sort by creation time (newest first)
    return fileStats.sort((a, b) => b.created.getTime() - a.created.getTime());
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error reading backup directory:', errorMessage);
    throw error;
  }
}

/**
 * Verify backup file integrity
 */
function verifyBackup(backupPath: string): boolean {
  try {
    const db = new Database(backupPath, { readonly: true });

    // Check if database can be opened and has tables
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all();
    db.close();

    if (tables.length === 0) {
      throw new Error('Backup file contains no tables');
    }

    console.log(`✅ Backup verification passed`);
    console.log(`📊 Tables found: ${tables.length}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Backup verification failed: ${errorMessage}`);
    return false;
  }
}

/**
 * Create a backup of the current database before restoration
 */
async function backupCurrentDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const currentBackupPath = join(
    BACKUP_DIR,
    `pre-restore-backup-${timestamp}.db`,
  );

  try {
    const dbFile = Bun.file(DB_PATH);
    if (await dbFile.exists()) {
      console.log(`💾 Creating backup of current database...`);
      await Bun.$`cp ${DB_PATH} ${currentBackupPath}`.quiet();
      console.log(`✅ Current database backed up to: ${currentBackupPath}`);
      return currentBackupPath;
    } else {
      console.log(`ℹ️  No current database found to backup`);
      return null;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to backup current database: ${errorMessage}`);
    return null;
  }
}

/**
 * Restore database from backup
 */
async function restoreDatabase(backupPath: string): Promise<boolean> {
  console.log(`🔄 Starting database restoration...`);
  console.log(`📁 Source backup: ${backupPath}`);
  console.log(`📁 Target database: ${DB_PATH}`);

  try {
    // Verify backup integrity
    if (!verifyBackup(backupPath)) {
      throw new Error('Backup verification failed');
    }

    // Create backup of current database
    const currentBackup = await backupCurrentDatabase();

    // Perform restoration
    console.log(`🔄 Restoring database...`);
    await Bun.$`cp ${backupPath} ${DB_PATH}`.quiet();

    // Verify restoration
    console.log(`✅ Verifying restoration...`);
    if (!verifyBackup(DB_PATH)) {
      throw new Error('Restoration verification failed');
    }

    console.log(`✅ Database restoration completed successfully!`);

    if (currentBackup) {
      console.log(`💾 Previous database backed up to: ${currentBackup}`);
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Database restoration failed: ${errorMessage}`);
    return false;
  }
}

/**
 * Display available backups and get user selection
 */
async function selectBackup(): Promise<BackupFile | null> {
  const backups = await getAvailableBackups();

  if (backups.length === 0) {
    console.log(`❌ No backup files found in ${BACKUP_DIR}`);
    return null;
  }

  console.log(`📋 Available backups:`);
  backups.forEach((backup, index) => {
    const size = formatFileSize(backup.size);
    const date = backup.created.toISOString();
    console.log(`  ${index + 1}. ${backup.name} (${size}) - ${date}`);
  });

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      `\nSelect backup to restore (1-${backups.length}) or 'q' to quit: `,
      (answer) => {
        rl.close();

        if (answer.toLowerCase() === 'q') {
          resolve(null);
          return;
        }

        const selection = parseInt(answer) - 1;
        if (selection >= 0 && selection < backups.length) {
          resolve(backups[selection]);
        } else {
          console.log(`❌ Invalid selection. Please try again.`);
          resolve(null);
        }
      },
    );
  });
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
async function main() {
  console.log(`🔄 Database Restore Tool`);
  console.log(`📁 Backup directory: ${BACKUP_DIR}`);
  console.log(`📁 Database path: ${DB_PATH}`);
  console.log(``);

  try {
    const selectedBackup = await selectBackup();

    if (!selectedBackup) {
      console.log(`👋 Restoration cancelled`);
      process.exit(0);
    }

    console.log(`\n⚠️  WARNING: This will replace the current database!`);
    console.log(`📁 Selected backup: ${selectedBackup.name}`);
    console.log(`📅 Created: ${selectedBackup.created.toISOString()}`);
    console.log(`📊 Size: ${formatFileSize(selectedBackup.size)}`);

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`\nAre you sure you want to proceed? (yes/no): `, (answer) => {
      rl.close();

      if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        void restoreDatabase(selectedBackup.path).then((success) => {
          process.exit(success ? 0 : 1);
        });
      } else {
        console.log(`👋 Restoration cancelled`);
        process.exit(0);
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Restore script failed: ${errorMessage}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${Bun.argv[1]}`) {
  void main();
}
