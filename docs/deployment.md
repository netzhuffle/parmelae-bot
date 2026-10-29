# Production deployment

Production runs a compiled Bun executable under systemd. The server needs Linux x64 with AVX2, `sqlite3`, and the shell utilities used by [activation](../deploy/activate-release.sh); Bun and Node.js are build-time dependencies only.

## Server setup

The default layout separates releases from persistent data:

```text
/srv/parmelae-bot/
├── current -> releases/<git-sha>
├── releases/
└── shared/
    ├── .env
    ├── sqlite.db
    └── backups/
```

1. Create separate runtime (`parmelae-bot`) and deployment (`deploy-parmelae-bot`) users.
2. Create `releases/` and `shared/backups/`. Grant the deployment user release/symlink access and both users the shared-data access their commands need. Backups contain user data; keep them restricted to these operators.
3. Copy the production environment and database into `shared/`. Set these overrides in `shared/.env`:

   ```env
   DATABASE_URL="file:/srv/parmelae-bot/shared/sqlite.db"
   BACKUP_DIR="/srv/parmelae-bot/shared/backups"
   ```

4. Install the [systemd unit](../deploy/systemd/parmelae-bot.service). Its paths and runtime user must match the layout.
5. Grant the deployment user passwordless access to the service-specific `systemctl restart`, `systemctl is-active`, and `journalctl` commands used by activation.
6. Configure the GitHub production environment with the SSH secrets and deployment variables named in the [workflow](../.github/workflows/deploy.yml).

The environment file is sourced by Bash during activation and read by systemd at runtime; use assignments compatible with both.

## Release activation

The [workflow](../.github/workflows/deploy.yml) owns build and upload steps. Pushes to `main` activate the resulting release; manual workflow runs deploy only when the selected ref is `main`.

[Activation](../deploy/activate-release.sh) verifies the executable, CPU, shared files, and systemd target, then creates a verified database backup and applies migrations before switching `current` and restarting. A successful service check triggers best-effort cleanup of old releases and backups.

On restart failure, activation attempts to restore the previous release symlink and restart it. This restores code only: migrations have already run. Use [database recovery](backup-restore-procedures.md) when a schema rollback is required; retain a release compatible with the selected database backup.

## Inspect the service

Run on the server:

```fish
sudo systemctl status parmelae-bot
sudo journalctl -u parmelae-bot -n 100 --no-pager
```

Activation checks that systemd reports the service active; inspect logs and exercise the bot after a deployment to confirm application behavior.
