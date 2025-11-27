# Automatic Neon Database Backup Setup

## ✅ Setup Complete!

Your automatic database backup is now configured and ready to use.

## 📋 What's Configured

- **Workflow File**: `.github/workflows/neon-auto-backup.yml`
- **Backup Type**: Full database backup (schema + data)
- **Storage**: GitHub Actions Artifacts
- **Retention**: 90 days
- **Schedule**: Daily at 02:00 UTC
- **PostgreSQL Version**: 17 (matches your Neon server)

## 🔧 Required Setup

### 1. Add Database Secret

1. Go to: https://github.com/Mtaasisi/NEON-POS/settings/secrets/actions
2. Click **"New repository secret"**
3. Name: `NEON_DB_URL`
4. Value: Your Neon database connection string
   ```
   postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```
5. Click **"Add secret"**

### 2. Test the Workflow

1. Go to: https://github.com/Mtaasisi/NEON-POS/actions/workflows/neon-auto-backup.yml
2. Click **"Run workflow"** (top right)
3. Select **"main"** branch
4. Click **"Run workflow"**
5. Wait 2-5 minutes for completion
6. Check the workflow run - it should show ✅ success

## 📥 How to Download Backups

1. Go to: https://github.com/Mtaasisi/NEON-POS/actions
2. Find the workflow run (look for "Automatic Neon Database Backup")
3. Click on the run
4. Scroll down to **"Artifacts"** section
5. Click **"neon-database-backup-{timestamp}"** to download
6. Extract: `gunzip neon-backup-full-*.sql.gz`

## 🔄 How to Restore

```bash
# 1. Download the backup from GitHub Actions artifacts
# 2. Extract the gzipped file
gunzip neon-backup-full-*.sql.gz

# 3. Restore to your database
# Make sure to use direct endpoint (not pooler)
DB_URL="postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
psql "$DB_URL" -f neon-backup-full-*.sql
```

## ⚙️ Automatic Schedule

The backup runs automatically:
- **Daily at 02:00 UTC**
- Creates a new artifact each time
- Old artifacts are kept for 90 days

## 🐛 Troubleshooting

### Workflow Fails

1. Check if `NEON_DB_URL` secret is set correctly
2. Verify the connection string is valid
3. Check the workflow run logs for specific errors

### Can't Download Artifact

- Artifacts are only available for 90 days
- Make sure you're logged into GitHub
- Check if the workflow run completed successfully

### Backup File is Empty

- Check database connection string
- Verify database is accessible
- Check workflow logs for connection errors

## 📊 Workflow Features

- ✅ Full database backup (schema + data)
- ✅ Automatic compression (gzip)
- ✅ Version matching (PostgreSQL 17)
- ✅ Error handling and validation
- ✅ Automatic daily schedule
- ✅ 90-day artifact retention
- ✅ No special permissions required

## 🔗 Links

- **Workflow**: https://github.com/Mtaasisi/NEON-POS/actions/workflows/neon-auto-backup.yml
- **All Runs**: https://github.com/Mtaasisi/NEON-POS/actions
- **Secrets**: https://github.com/Mtaasisi/NEON-POS/settings/secrets/actions

---

**Last Updated**: $(date)
**Status**: ✅ Ready to use

