#!/usr/bin/env bun

import {
  createBackupFilename,
  createDatabaseBackup,
  ensureBackupDirectory,
} from '../../src/Deploy/DatabaseBackup.js';

export { createBackupFilename, ensureBackupDirectory };

async function main(): Promise<void> {
  try {
    const backupPath = await createDatabaseBackup();
    console.log(`Created SQLite backup: ${backupPath}`);
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Backup script failed:', errorMessage);
    process.exit(1);
  }
}

if (import.meta.url === `file://${Bun.argv[1]}`) {
  void main();
}
