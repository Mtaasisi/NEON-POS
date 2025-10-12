# 🚀 Quick Start - Database Branches

## ✅ Setup Complete!

Your app is now configured to easily switch between Neon database branches!

---

## 🎯 Quick Commands

### Check Current Branch
```bash
npm run branch:check
# or
./check-branch.sh
```

### Switch to Development
```bash
npm run branch:dev
# or
./switch-to-dev.sh
```

### Switch to Production
```bash
npm run branch:prod
# or
./switch-to-prod.sh
```

---

## 📊 Your Available Branches

| Branch | Purpose | When to Use |
|--------|---------|-------------|
| **development** | Testing & Development | Default - Use for all testing and development work |
| **production** | Live Production | Only for production deployments |
| **production_old** | Backup (2025-10-10) | Rollback/recovery purposes |

---

## 🔄 Typical Workflow

### 1. Development Work
```bash
# Switch to development branch
npm run branch:dev

# Start your app
npm run dev:full
```

### 2. Testing Features
```bash
# Make sure you're on development
npm run branch:check

# Run tests
npm run test:product
```

### 3. Deploying to Production
```bash
# Switch to production
npm run branch:prod

# Build and deploy
npm run build
```

---

## 📁 Configuration Files

| File | Purpose |
|------|---------|
| `.env` | Active database configuration (auto-generated) |
| `.env.example` | Template with all branch options |
| `.env.development` | Development branch config |
| `.env.production` | Production branch config |
| `database-config.json` | Backup config for scripts |

---

## 🔧 Manual Configuration

If you need to manually configure, edit `.env`:

```env
# For Development:
DATABASE_URL=postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# For Production:
DATABASE_URL=postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
```

---

## 🎓 Learn More

For detailed information about your Neon branches, see:
- **NEON-BRANCHES-GUIDE.md** - Complete branch management guide
- **Neon Console**: https://console.neon.tech/

---

## ⚠️ Important Notes

1. **Never commit `.env`** - It's automatically ignored by git
2. **Always test on development first** before pushing to production
3. **Database changes** - Test schema changes on development branch
4. **Current Status** - You're now using the **development** branch by default

---

## 🆘 Troubleshooting

### Connection Issues?
```bash
# Check your current configuration
npm run branch:check

# Verify neonctl is working
neonctl branches list --project-id plain-cloud-13300646
```

### Need to Reset?
```bash
# Reset to development branch
npm run branch:dev
```

---

## 📞 Support

- **Project**: Inauzwa (plain-cloud-13300646)
- **Organization**: Thatboy
- **Neon Console**: https://console.neon.tech/

