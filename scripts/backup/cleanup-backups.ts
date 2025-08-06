#!/usr/bin/env bun

import { join } from 'path';

// Configuration
const BACKUP_DIR = join(import.meta.dir, '../../backups');
const BACKUP_PREFIX = 'sqlite-backup';
const MAX_BACKUPS = 5;

interface BackupFile {
  name: string;
  path: string;
  created: Date;
  size: number;
}

/**
 * Get all backup files sorted by creation time (newest first)
 */
async function getBackupFiles(): Promise<BackupFile[]> {
  try {
    // Use Bun's shell to list files with safety check
    const result =
      await Bun.$`find ${BACKUP_DIR} -name "${BACKUP_PREFIX}*.db" -type f`.text();
    const files = result.trim().split('\n').filter(Boolean);

    // Safety check: Ensure we're only working with backup files
    const invalidFiles = files.filter(
      (file) => !file.includes(BACKUP_PREFIX) || !file.endsWith('.db'),
    );
    if (invalidFiles.length > 0) {
      throw new Error(
        `Found non-backup files in results: ${invalidFiles.join(', ')}`,
      );
    }

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
 * Delete backup files, keeping only the most recent ones
 */
async function cleanupBackups(): Promise<void> {
  console.log(`🧹 Starting backup cleanup...`);
  console.log(`📁 Backup directory: ${BACKUP_DIR}`);
  console.log(`📊 Maximum backups to keep: ${MAX_BACKUPS}`);

  try {
    const backupFiles = await getBackupFiles();

    console.log(`📋 Found ${backupFiles.length} backup files`);

    if (backupFiles.length <= MAX_BACKUPS) {
      console.log(
        `✅ No cleanup needed - only ${backupFiles.length} backups exist`,
      );
      return;
    }

    // Files to delete (all except the most recent MAX_BACKUPS)
    const filesToDelete = backupFiles.slice(MAX_BACKUPS);
    const filesToKeep = backupFiles.slice(0, MAX_BACKUPS);

    console.log(`🗑️  Files to delete: ${filesToDelete.length}`);
    console.log(`💾 Files to keep: ${filesToKeep.length}`);

    // Delete old backup files
    let deletedCount = 0;
    let totalSizeFreed = 0;

    const deletePromises = filesToDelete.map(async (file) => {
      try {
        await Bun.$`rm -f ${file.path}`.quiet();
        console.log(`🗑️  Deleted: ${file.name} (${formatFileSize(file.size)})`);
        return { success: true, size: file.size, name: file.name };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed to delete ${file.name}:`, errorMessage);
        return { success: false, size: 0, name: file.name };
      }
    });

    const results = await Promise.all(deletePromises);

    // Calculate totals
    for (const result of results) {
      if (result.success) {
        deletedCount++;
        totalSizeFreed += result.size;
      }
    }

    console.log(`✅ Cleanup completed!`);
    console.log(`🗑️  Deleted: ${deletedCount} files`);
    console.log(`💾 Freed: ${formatFileSize(totalSizeFreed)}`);
    console.log(`📊 Remaining backups: ${filesToKeep.length}`);

    // Show remaining backups
    console.log(`📋 Kept backups:`);
    filesToKeep.forEach((file, index) => {
      console.log(
        `  ${index + 1}. ${file.name} (${formatFileSize(file.size)}) - ${file.created.toISOString()}`,
      );
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Cleanup failed:', errorMessage);
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
    await cleanupBackups();
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Cleanup script failed:', errorMessage);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${Bun.argv[1]}`) {
  void main();
}
