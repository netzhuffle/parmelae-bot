# Database backup and restore

The production paths below assume the default [deployment layout](deployment.md).

## Deployment backups

[Activation](../deploy/activate-release.sh) runs `parmelae-bot deploy backup` before migrations. [DatabaseBackup.ts](../src/Deploy/DatabaseBackup.ts) uses the `sqlite3` CLI `.backup` command, requires `PRAGMA integrity_check` to return `ok`, and removes a failed backup attempt. Files are named `sqlite-backup-YYYY-MM-DD-HH-mm-ss.db` in UTC.

After successful activation, `deploy cleanup-backups` retains the five newest matching backup files by filesystem creation time (falling back to modification time). Cleanup is best-effort: deployment may succeed while old backups remain. Pre-restore files named below are outside this cleanup pattern.

## Restore a database

Restoration discards changes since the selected backup. Choose a database and code release with compatible schemas before proceeding. These are manual server commands; the compiled executable has backup, migration, and cleanup commands, but no restore command.

1. Stop the service and confirm it is inactive:

   ```fish
   cd /srv/parmelae-bot
   sudo systemctl stop parmelae-bot
   sudo systemctl is-active parmelae-bot
   ```

2. Select a backup and verify it before replacing the current database. Continue only if integrity checking prints `ok`:

   ```fish
   set selected_backup shared/backups/sqlite-backup-YYYY-MM-DD-HH-mm-ss.db
   sqlite3 -readonly "$selected_backup" "PRAGMA integrity_check;"
   ```

3. Preserve the stopped database using SQLite’s backup operation (which includes committed WAL data). If the current database cannot be opened, preserve its database and any `-wal`/`-shm` files separately before replacement:

   ```fish
   set pre_restore shared/backups/pre-restore-(date -u +%Y-%m-%d-%H-%M-%S).db
   sqlite3 shared/sqlite.db ".backup '$pre_restore'"
   ```

4. Restore through SQLite so replacement handles the database’s journal state:

   ```fish
   sqlite3 shared/sqlite.db ".restore '$selected_backup'"
   sqlite3 -readonly shared/sqlite.db "PRAGMA integrity_check;"
   ```

5. Continue only after the restored database reports `ok`. Confirm database ownership and permissions permit the runtime user to read and write it, then start the service and inspect logs:

   ```fish
   sudo systemctl start parmelae-bot
   sudo systemctl status parmelae-bot
   sudo journalctl -u parmelae-bot -n 100 --no-pager
   ```

On a source checkout with Bun installed, [restore-database.ts](../scripts/backup/restore-database.ts) provides an interactive restore helper. It copies files and does not manage systemd or SQLite sidecar files; use the stopped-service procedure above for production recovery.
