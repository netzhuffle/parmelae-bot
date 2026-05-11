# Database Backup and Restore Procedures

This document outlines the automated backup and restore procedures for the Parmelae Bot SQLite database.

## Overview

The backup system provides automated database protection with the following features:

- **Automated backups** before each deployment
- **Retention management** (keeps 5 most recent backups)
- **Integrity verification** of backup files
- **Manual restore capability** for emergency recovery
- **Comprehensive logging** for audit trails

## Backup System Architecture

### File Structure

```
project-root/
├── shared/sqlite.db          # Production database
├── shared/backups/           # Backup directory
│   ├── sqlite-backup-YYYY-MM-DD-HH-mm-ss.db
│   └── ...
└── current/parmelae-bot      # Compiled executable with deploy backup commands
```

### Backup Naming Convention

Backup files follow the pattern: `sqlite-backup-YYYY-MM-DD-HH-mm-ss.db`

Example: `sqlite-backup-2024-01-15-14-30-45.db`

## Automated Backup Process

### GitHub Actions Integration

The backup process is integrated into the deployment workflow:

1. **SSH Setup** - Establishes secure connection to production server
2. **Database Backup** - Creates backup using the compiled executable and `sqlite3` CLI safe backup method
3. **Backup Cleanup** - Removes old backups, keeping only 5 most recent
4. **Deployment** - Proceeds with application deployment

### Backup Script Features

- **Safe SQLite backup** using `sqlite3` CLI `.backup` command
- **Atomic operations** to prevent corruption during live database access
- **Integrity verification** after backup creation
- **Comprehensive error handling** with detailed logging
- **Automatic cleanup** of failed backup attempts

## Manual Restore Process

### Prerequisites

1. SSH access to production server
2. Backup files available in `/srv/parmelae-bot/shared/backups/`
3. Bot service stopped through systemd

### Restore Steps

1. **Connect to production server:**

   ```fish
   ssh jannis@jannis.rocks
   ```

2. **Navigate to deployment directory:**

   ```fish
   cd /srv/parmelae-bot
   ```

3. **Stop the bot service:**

   ```fish
   sudo systemctl stop parmelae-bot
   ```

4. **Create a pre-restore copy of the current database:**

   ```fish
   cp shared/sqlite.db shared/backups/pre-restore-(date -u +%Y-%m-%d-%H-%M-%S).db
   ```

5. **Restore the selected backup file:**

   ```fish
   cp shared/backups/sqlite-backup-YYYY-MM-DD-HH-mm-ss.db shared/sqlite.db
   sqlite3 -readonly shared/sqlite.db "PRAGMA integrity_check;"
   ```

6. **Restart the bot service:**
   ```fish
   sudo systemctl start parmelae-bot
   ```

### Restore Safety Features

- **Pre-restore backup** of current database
- **Backup verification** before restoration
- **Post-restore verification** of database integrity
- **Interactive confirmation** to prevent accidental restores
- **Detailed logging** of all operations

## Security Best Practices

### File Permissions

Backup files are stored with restricted permissions:

```fish
# Backup directory permissions
chmod 750 /srv/parmelae-bot/shared/backups

# Backup file permissions
chmod 640 /srv/parmelae-bot/shared/backups/*.db
```

### Access Control

- Backup directory accessible only to application user
- SSH key-based authentication for deployment
- No direct database access from external sources

### Data Protection

- Backups contain sensitive user data
- Files stored on secure production server
- No backup files in version control
- Automatic cleanup prevents storage accumulation

## Monitoring and Maintenance

### Backup Monitoring

Check backup status after deployments:

```fish
# List recent backups
ls -la /srv/parmelae-bot/shared/backups/

# Check backup file integrity
sqlite3 -readonly /srv/parmelae-bot/shared/backups/sqlite-backup-YYYY-MM-DD-HH-mm-ss.db "PRAGMA integrity_check;"
```

### Storage Management

- Maximum 5 backup files retained
- Automatic cleanup after each deployment
- Monitor disk space usage
- Backup files typically 1-10MB each

### Log Analysis

Backup operations are logged with timestamps:

- Backup creation logs
- Cleanup operation logs
- Error messages and stack traces
- Verification results

## Troubleshooting

### Common Issues

#### Backup Creation Fails

**Symptoms:**

- GitHub Actions deployment fails at backup step
- Error messages in deployment logs

**Solutions:**

1. Check database file exists: `ls -la /srv/parmelae-bot/shared/sqlite.db`
2. Verify file permissions: `ls -la /srv/parmelae-bot/shared/`
3. Check disk space: `df -h`
4. Review deployment logs

#### Restore Verification Fails

**Symptoms:**

- Backup file cannot be opened
- Database corruption detected

**Solutions:**

1. Verify backup file integrity: `file backup-file.db`
2. Check file permissions
3. Try alternative backup file
4. Contact system administrator

#### Cleanup Script Errors

**Symptoms:**

- Old backups not removed
- Permission denied errors

**Solutions:**

1. Check backup directory permissions
2. Verify executable and directory permissions
3. Review file ownership
4. Check disk space availability

### Emergency Procedures

#### Database Corruption

If the production database becomes corrupted:

1. **Stop the bot service immediately**
2. **Identify the most recent working backup**
3. **Perform manual restore procedure**
4. **Verify database integrity**
5. **Restart the bot service**

#### Backup Directory Issues

If backup directory becomes inaccessible:

1. **Create new backup directory**
2. **Update `BACKUP_DIR` in `/srv/parmelae-bot/shared/.env`**
3. **Test backup functionality**
4. **Monitor next deployment**

## Maintenance Schedule

### Daily

- Monitor deployment logs for backup success
- Check backup directory disk usage

### Weekly

- Verify backup file integrity
- Review backup retention policy
- Check deploy backup command functionality

### Monthly

- Test restore procedure in staging environment
- Review security permissions
- Update documentation as needed

## Contact Information

For backup and restore issues:

- **Primary Contact:** System Administrator
- **Emergency Contact:** DevOps Team
- **Documentation:** This file and deploy command implementation comments

---

**Last Updated:** May 2026  
**Version:** 2.0  
**Maintainer:** DevOps Team
