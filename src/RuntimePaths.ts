import assert from 'assert';
import { join, resolve } from 'path';

const PROJECT_ROOT = resolve(import.meta.dir, '..');
const DEFAULT_DATABASE_URL = 'file:./prisma/sqlite.db';
const DEFAULT_BACKUP_DIR = join(PROJECT_ROOT, 'backups');
const COMMANDS_DIR = join(PROJECT_ROOT, 'cmd');

/**
 * Returns the configured SQLite database URL.
 *
 * Defaults to the repo-local development database.
 */
export function getDatabaseUrl(): string {
  return Bun.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
}

/**
 * Resolves the configured SQLite database path to an absolute filesystem path.
 */
export function getDatabasePath(databaseUrl: string = getDatabaseUrl()): string {
  assert(databaseUrl.startsWith('file:'), 'DATABASE_URL must use the file: scheme');

  const rawPath = databaseUrl.slice('file:'.length);
  assert(rawPath.length > 0, 'DATABASE_URL must point to a SQLite file');

  return rawPath.startsWith('/') ? rawPath : resolve(PROJECT_ROOT, rawPath);
}

/**
 * Returns the configured backup directory.
 *
 * Defaults to the repo-local backup directory for development.
 */
export function getBackupDir(): string {
  return Bun.env.BACKUP_DIR ?? DEFAULT_BACKUP_DIR;
}

/**
 * Resolves a command path from the repo-local cmd/ directory.
 */
export function getCommandPath(commandName: string): string {
  return join(COMMANDS_DIR, commandName);
}
