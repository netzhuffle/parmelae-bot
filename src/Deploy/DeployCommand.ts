import { cleanupDatabaseBackups, createDatabaseBackup } from './DatabaseBackup.js';
import { applyPendingMigrations } from './DatabaseMigrator.js';

type DeployCommand = 'backup' | 'cleanup-backups' | 'migrate';

/**
 * Runs deployment maintenance commands from the compiled executable.
 */
export async function runDeployCommand(args: string[]): Promise<number> {
  const command = args[0] as DeployCommand | undefined;

  try {
    switch (command) {
      case 'backup': {
        const backupPath = await createDatabaseBackup();
        console.log(`Created SQLite backup: ${backupPath}`);
        return 0;
      }
      case 'cleanup-backups': {
        const deletedCount = await cleanupDatabaseBackups();
        console.log(`Deleted ${deletedCount} old SQLite backup(s).`);
        return 0;
      }
      case 'migrate': {
        const result = await applyPendingMigrations();
        console.log(
          `Applied ${result.applied.length} migration(s), skipped ${result.skipped.length} already-applied migration(s).`,
        );
        return 0;
      }
      default:
        console.error('Usage: parmelae-bot deploy <backup|migrate|cleanup-backups>');
        return 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Deploy command failed: ${message}`);
    return 1;
  }
}
