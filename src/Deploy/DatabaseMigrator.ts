import { Database } from 'bun:sqlite';
import { createHash, randomUUID } from 'crypto';
import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';

import { getDatabasePath } from '../RuntimePaths.js';

interface Migration {
  name: string;
  sql: string;
  checksum: string;
}

interface MigrationRow {
  migration_name: string;
  finished_at: string | null;
  rolled_back_at: string | null;
  logs: string | null;
}

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

/**
 * Applies pending Prisma SQLite migrations without requiring the Prisma CLI on the server.
 */
export async function applyPendingMigrations({
  databasePath = getDatabasePath(),
  migrationsDir = getMigrationsDir(),
}: {
  databasePath?: string;
  migrationsDir?: string;
} = {}): Promise<MigrationResult> {
  const migrations = await readMigrations(migrationsDir);
  const db = new Database(databasePath);

  try {
    ensurePrismaMigrationsTable(db);
    const migrationRows = getMigrationRows(db);
    const failedMigration = migrationRows.find(
      (row) => row.finished_at === null && row.rolled_back_at === null,
    );
    if (failedMigration) {
      throw new Error(
        `Cannot apply migrations because ${failedMigration.migration_name} previously failed: ${failedMigration.logs ?? '<no logs>'}`,
      );
    }

    const appliedMigrationNames = new Set(
      migrationRows
        .filter((row) => row.finished_at !== null && row.rolled_back_at === null)
        .map((row) => row.migration_name),
    );
    const result: MigrationResult = { applied: [], skipped: [] };

    for (const migration of migrations) {
      if (appliedMigrationNames.has(migration.name)) {
        result.skipped.push(migration.name);
        continue;
      }

      applyMigration(db, migration);
      result.applied.push(migration.name);
    }

    return result;
  } finally {
    db.close();
  }
}

export function getMigrationsDir(): string {
  return Bun.env.PRISMA_MIGRATIONS_DIR ?? join(process.cwd(), 'prisma/migrations');
}

async function readMigrations(migrationsDir: string): Promise<Migration[]> {
  const entries = await readdir(migrationsDir);
  const migrations = await Promise.all(
    entries.toSorted().map(async (entry) => {
      const migrationDir = join(migrationsDir, entry);
      const migrationFile = join(migrationDir, 'migration.sql');

      if (!(await stat(migrationDir)).isDirectory() || !(await Bun.file(migrationFile).exists())) {
        return undefined;
      }

      const sql = await readFile(migrationFile, 'utf8');
      return {
        name: entry,
        sql,
        checksum: createHash('sha256').update(sql).digest('hex'),
      };
    }),
  );

  return migrations.filter((migration) => migration !== undefined);
}

function ensurePrismaMigrationsTable(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
      "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
    );
  `);
}

function getMigrationRows(db: Database): MigrationRow[] {
  return db
    .query<MigrationRow, []>(
      'SELECT migration_name, finished_at, rolled_back_at, logs FROM "_prisma_migrations"',
    )
    .all();
}

function applyMigration(db: Database, migration: Migration): void {
  const id = randomUUID();
  const startedAt = new Date().toISOString();

  db.query(
    `INSERT INTO "_prisma_migrations"
      (id, checksum, migration_name, started_at, applied_steps_count)
      VALUES ($id, $checksum, $migrationName, $startedAt, 0)`,
  ).run({
    $id: id,
    $checksum: migration.checksum,
    $migrationName: migration.name,
    $startedAt: startedAt,
  });

  try {
    db.exec(migration.sql);
  } catch (error) {
    const logs = error instanceof Error ? error.message : String(error);
    db.query('UPDATE "_prisma_migrations" SET logs = $logs WHERE id = $id').run({
      $id: id,
      $logs: logs,
    });
    throw new Error(`Migration ${migration.name} failed: ${logs}`, { cause: error });
  }

  db.query(
    'UPDATE "_prisma_migrations" SET finished_at = $finishedAt, applied_steps_count = 1 WHERE id = $id',
  ).run({
    $id: id,
    $finishedAt: new Date().toISOString(),
  });
}
