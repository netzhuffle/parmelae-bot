import { afterEach, describe, expect, it } from 'bun:test';
import { join } from 'path';

import { getBackupDir, getCommandPath, getDatabasePath, getDatabaseUrl } from './RuntimePaths.js';

const originalDatabaseUrl = Bun.env.DATABASE_URL;
const originalBackupDir = Bun.env.BACKUP_DIR;

afterEach(() => {
  if (originalDatabaseUrl === undefined) {
    delete Bun.env.DATABASE_URL;
  } else {
    Bun.env.DATABASE_URL = originalDatabaseUrl;
  }

  if (originalBackupDir === undefined) {
    delete Bun.env.BACKUP_DIR;
  } else {
    Bun.env.BACKUP_DIR = originalBackupDir;
  }
});

describe('RuntimePaths', () => {
  it('defaults DATABASE_URL to the repo-local sqlite database', () => {
    delete Bun.env.DATABASE_URL;

    expect(getDatabaseUrl()).toBe('file:./prisma/sqlite.db');
    expect(getDatabasePath()).toBe(join(import.meta.dir, '../prisma/sqlite.db'));
  });

  it('resolves absolute DATABASE_URL paths unchanged', () => {
    Bun.env.DATABASE_URL = 'file:/srv/parmelae-bot/shared/sqlite.db';

    expect(getDatabasePath()).toBe('/srv/parmelae-bot/shared/sqlite.db');
  });

  it('defaults BACKUP_DIR to the repo-local backups directory', () => {
    delete Bun.env.BACKUP_DIR;

    expect(getBackupDir()).toBe(join(import.meta.dir, '../backups'));
  });

  it('uses BACKUP_DIR when configured', () => {
    Bun.env.BACKUP_DIR = '/srv/parmelae-bot/shared/backups';

    expect(getBackupDir()).toBe('/srv/parmelae-bot/shared/backups');
  });

  it('resolves commands from the repo cmd directory', () => {
    expect(getCommandPath('startminecraft')).toBe(join(import.meta.dir, '../cmd/startminecraft'));
  });
});
