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
├── prisma/sqlite.db          # Production database
├── backups/                  # Backup directory
│   ├── sqlite-backup-YYYY-MM-DD-HH-mm-ss.db
│   └── ...
└── scripts/backup/
    ├── backup-database.ts    # Main backup script
    ├── cleanup-backups.ts    # Retention management
    └── restore-database.ts   # Manual restore tool
```

### Backup Naming Convention
Backup files follow the pattern: `sqlite-backup-YYYY-MM-DD-HH-mm-ss.db`

Example: `sqlite-backup-2024-01-15-14-30-45.db`

## Automated Backup Process

### GitHub Actions Integration

The backup process is integrated into the deployment workflow:

1. **SSH Setup** - Establishes secure connection to production server
2. **Database Backup** - Creates backup using `sqlite3` CLI safe backup method
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
2. Backup files available in `/home/jannis/parmelae-bot/backups/`
3. Bot service stopped (PM2)

### Restore Steps

1. **Connect to production server:**
   ```bash
   ssh jannis@jannis.rocks
   ```

2. **Navigate to project directory:**
   ```bash
   cd /home/jannis/parmelae-bot
   ```

3. **Stop the bot service:**
   ```bash
   pm2 stop parmelae-bot
   ```

4. **Run the restore script:**
   ```bash
   bun scripts/backup/restore-database.ts
   ```

5. **Follow the interactive prompts:**
   - Select the backup file to restore
   - Confirm the restoration
   - Wait for verification

6. **Restart the bot service:**
   ```bash
   pm2 start ecosystem.config.cjs
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
```bash
# Backup directory permissions
chmod 750 /home/jannis/parmelae-bot/backups

# Backup file permissions
chmod 640 /home/jannis/parmelae-bot/backups/*.db
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
```bash
# List recent backups
ls -la /home/jannis/parmelae-bot/backups/

# Check backup file integrity
bun scripts/backup/restore-database.ts --verify-only
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
1. Check database file exists: `ls -la prisma/sqlite.db`
2. Verify file permissions: `ls -la prisma/`
3. Check disk space: `df -h`
4. Review backup script logs

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
2. Verify script execution rights
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
2. **Update script configurations**
3. **Test backup functionality**
4. **Monitor next deployment**

## Maintenance Schedule

### Daily
- Monitor deployment logs for backup success
- Check backup directory disk usage

### Weekly
- Verify backup file integrity
- Review backup retention policy
- Check backup script functionality

### Monthly
- Test restore procedure in staging environment
- Review security permissions
- Update documentation as needed

## Contact Information

For backup and restore issues:
- **Primary Contact:** System Administrator
- **Emergency Contact:** DevOps Team
- **Documentation:** This file and inline script comments

---

**Last Updated:** January 2024  
**Version:** 1.0  
**Maintainer:** DevOps Team 