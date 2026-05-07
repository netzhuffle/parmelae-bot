import { join } from 'path';

import { $ } from 'bun';

import { getBackupDir, getDatabasePath } from '../RuntimePaths.js';

const BACKUP_PREFIX = 'sqlite-backup';
const DEFAULT_MAX_BACKUPS = 5;

interface BackupFile {
  name: string;
  path: string;
  created: Date;
  size: number;
}

/**
 * Creates the timestamped SQLite backup filename used by deploy backups.
 */
export function createBackupFilename(date: Date = new Date()): string {
  const timestamp = date.toISOString().replace(/T/, '-').replace(/\..+/, '').replace(/:/g, '-');
  return `${BACKUP_PREFIX}-${timestamp}.db`;
}

/**
 * Ensures the configured backup directory exists before backup or cleanup work.
 */
export async function ensureBackupDirectory(dir: string = getBackupDir()): Promise<void> {
  if (!(await Bun.file(dir).exists())) {
    await $`mkdir -p ${dir}`;
  }
}

export async function createDatabaseBackup({
  databasePath = getDatabasePath(),
  backupDir = getBackupDir(),
}: {
  databasePath?: string;
  backupDir?: string;
} = {}): Promise<string> {
  await ensureBackupDirectory(backupDir);

  if (!(await Bun.file(databasePath).exists())) {
    throw new Error(`Source database not found: ${databasePath}`);
  }

  const backupPath = join(backupDir, createBackupFilename());

  try {
    const backupCommand = `.backup '${backupPath}'`;
    await $`sqlite3 -cmd ${backupCommand} ${databasePath} ".quit"`.quiet();

    const integrity = await $`sqlite3 -readonly ${backupPath} "PRAGMA integrity_check;"`.text();
    if (integrity.trim() !== 'ok') {
      throw new Error(`Backup verification failed: ${integrity.trim()}`);
    }

    return backupPath;
  } catch (error) {
    await $`rm -f ${backupPath}`.quiet().catch(() => undefined);
    throw error;
  }
}

export async function cleanupDatabaseBackups({
  backupDir = getBackupDir(),
  maxBackups = DEFAULT_MAX_BACKUPS,
}: {
  backupDir?: string;
  maxBackups?: number;
} = {}): Promise<number> {
  await ensureBackupDirectory(backupDir);

  const backupFiles = await getBackupFiles(backupDir);
  const filesToDelete = backupFiles.slice(maxBackups);

  await Promise.all(filesToDelete.map((file) => $`rm -f ${file.path}`.quiet()));

  return filesToDelete.length;
}

async function getBackupFiles(backupDir: string): Promise<BackupFile[]> {
  const result = await $`find ${backupDir} -name "${BACKUP_PREFIX}*.db" -type f`.text();
  const filePaths = result.trim().split('\n').filter(Boolean);

  const invalidFiles = filePaths.filter(
    (filePath) => !filePath.includes(BACKUP_PREFIX) || !filePath.endsWith('.db'),
  );
  if (invalidFiles.length > 0) {
    throw new Error(`Found non-backup files in backup cleanup: ${invalidFiles.join(', ')}`);
  }

  const files = await Promise.all(
    filePaths.map(async (filePath) => {
      const file = Bun.file(filePath);
      const stats = await file.stat();
      const fileName = filePath.split('/').pop();
      if (!fileName) {
        throw new Error(`Invalid backup file path: ${filePath}`);
      }

      return {
        name: fileName,
        path: filePath,
        created: stats.birthtime || stats.mtime,
        size: stats.size,
      };
    }),
  );

  return files.toSorted((a, b) => b.created.getTime() - a.created.getTime());
}
