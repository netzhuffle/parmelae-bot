import { Database } from 'bun:sqlite';
import { afterEach, describe, expect, it } from 'bun:test';
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { applyPendingMigrations } from './DatabaseMigrator.js';

let tempDirs: string[] = [];

afterEach(async () => {
  const dirs = tempDirs;
  tempDirs = [];
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('applyPendingMigrations', () => {
  it('applies pending migrations in directory order and records Prisma migration rows', async () => {
    const { databasePath, migrationsDir } = await createMigrationFixture();
    await writeMigration(
      migrationsDir,
      '20260101000000_create_users',
      'CREATE TABLE "User" ("id" INTEGER PRIMARY KEY);',
    );
    await writeMigration(
      migrationsDir,
      '20260101000001_add_name',
      'ALTER TABLE "User" ADD COLUMN "name" TEXT;',
    );

    const result = await applyPendingMigrations({ databasePath, migrationsDir });

    expect(result.applied).toEqual(['20260101000000_create_users', '20260101000001_add_name']);
    expect(result.skipped).toEqual([]);

    const db = new Database(databasePath);
    try {
      const columns = db.query<{ name: string }, []>('PRAGMA table_info("User")').all();
      expect(columns.map((column) => column.name)).toEqual(['id', 'name']);

      const rows = db
        .query<
          { migration_name: string; finished_at: string | null; applied_steps_count: number },
          []
        >(
          'SELECT migration_name, finished_at, applied_steps_count FROM "_prisma_migrations" ORDER BY migration_name',
        )
        .all();
      expect(rows).toHaveLength(2);
      expect(rows.every((row) => row.finished_at !== null)).toBe(true);
      expect(rows.every((row) => row.applied_steps_count === 1)).toBe(true);
    } finally {
      db.close();
    }
  });

  it('skips migrations already recorded as applied', async () => {
    const { databasePath, migrationsDir } = await createMigrationFixture();
    await writeMigration(
      migrationsDir,
      '20260101000000_create_users',
      'CREATE TABLE "User" ("id" INTEGER PRIMARY KEY);',
    );

    await applyPendingMigrations({ databasePath, migrationsDir });
    const result = await applyPendingMigrations({ databasePath, migrationsDir });

    expect(result.applied).toEqual([]);
    expect(result.skipped).toEqual(['20260101000000_create_users']);
  });

  it('stops when a previous failed migration exists', async () => {
    const { databasePath, migrationsDir } = await createMigrationFixture();
    await writeMigration(
      migrationsDir,
      '20260101000000_create_users',
      'CREATE TABLE "User" ("id" INTEGER PRIMARY KEY);',
    );

    const db = new Database(databasePath);
    try {
      db.exec(`
        CREATE TABLE "_prisma_migrations" (
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
      db.query(
        `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, logs)
          VALUES ('failed-id', 'checksum', '20251231000000_failed', 'boom')`,
      ).run();
    } finally {
      db.close();
    }

    expect.assertions(2);
    try {
      await applyPendingMigrations({ databasePath, migrationsDir });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('20251231000000_failed');
    }
  });
});

async function createMigrationFixture(): Promise<{ databasePath: string; migrationsDir: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'parmelae-migration-test-'));
  tempDirs.push(dir);

  const migrationsDir = join(dir, 'migrations');
  await mkdir(migrationsDir);

  return {
    databasePath: join(dir, 'sqlite.db'),
    migrationsDir,
  };
}

async function writeMigration(migrationsDir: string, name: string, sql: string): Promise<void> {
  const migrationDir = join(migrationsDir, name);
  await mkdir(migrationDir);
  await writeFile(join(migrationDir, 'migration.sql'), sql);
}
