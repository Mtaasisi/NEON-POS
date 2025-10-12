# 🗄️ Neon Database Branches Guide

## Your Neon Database Branches

You have **3 branches** in your Neon database project "Inauzwa":

| Branch | Status | Purpose | Endpoint |
|--------|--------|---------|----------|
| **development** | ✅ Default | Testing & Development | `ep-damp-fire-adtxvumr` |
| **production** | ✅ Active | Live Production Data | `ep-damp-fire-adtxvumr` |
| **production_old** | ✅ Backup | Old Production (2025-10-10) | `ep-damp-fire-adtxvumr` |

---

## 🔄 How to Switch Between Branches

### Method 1: Using Environment Files (Recommended)

**For Development:**
```bash
cp .env.development .env
npm run dev
```

**For Production:**
```bash
cp .env.production .env
npm run build
npm start
```

### Method 2: Manual Edit

1. Open `.env` file
2. Update the `DATABASE_URL` line:

```env
# For Development:
DATABASE_URL=postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# For Production:
DATABASE_URL=postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### Method 3: Using Neon CLI

**List all branches:**
```bash
neonctl branches list --project-id plain-cloud-13300646
```

**Get connection string for a specific branch:**
```bash
# Development
neonctl connection-string --project-id plain-cloud-13300646 --branch-id br-spring-night-adh1c4rd --role-name neondb_owner --pooled

# Production
neonctl connection-string --project-id plain-cloud-13300646 --branch-id br-proud-fog-adtzp84p --role-name neondb_owner --pooled
```

---

## 📋 Quick Reference

### Branch IDs:
- **Development**: `br-spring-night-adh1c4rd`
- **Production**: `br-proud-fog-adtzp84p`
- **Production Old**: `br-fragrant-wave-adi2u3tz`

### Project Info:
- **Project ID**: `plain-cloud-13300646`
- **Project Name**: Inauzwa
- **Organization**: Thatboy (`org-young-math-68061514`)
- **Region**: AWS US East 1

---

## 🎯 Best Practices

### 1. Development Workflow
- Always test on **development** branch first
- Use development branch for new features
- Keep production branch stable

### 2. Database Changes
When making schema changes:
```bash
# 1. Switch to development
cp .env.development .env

# 2. Test your migrations
npm run migrate

# 3. If successful, apply to production
cp .env.production .env
npm run migrate
```

### 3. Creating New Branches
```bash
# Create a new branch from production
neonctl branches create --project-id plain-cloud-13300646 --name staging --parent br-proud-fog-adtzp84p
```

---

## 🔐 Security Notes

- ⚠️ Never commit `.env` files to git
- ✅ `.env.example` is safe to commit (no passwords)
- 🔒 Keep your database credentials secure
- 🔄 Rotate passwords periodically in Neon console

---

## 🚨 Current Status

Your app was previously connected to an old endpoint (`ep-dry-brook-ad3duuog`).

**Now configured to use:**
- ✅ **Development branch** by default
- ✅ Easy switching between branches
- ✅ Environment-based configuration

---

## 📞 Need Help?

- **Neon Console**: https://console.neon.tech/
- **Neon Docs**: https://neon.tech/docs/introduction
- **CLI Help**: `neonctl --help`

