#!/usr/bin/env bun

import { cleanupDatabaseBackups } from '../../src/Deploy/DatabaseBackup.js';

async function main(): Promise<void> {
  try {
    const deletedCount = await cleanupDatabaseBackups();
    console.log(`Deleted ${deletedCount} old SQLite backup(s).`);
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Cleanup script failed:', errorMessage);
    process.exit(1);
  }
}

if (import.meta.url === `file://${Bun.argv[1]}`) {
  void main();
}
