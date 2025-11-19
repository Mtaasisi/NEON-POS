# 📌 Quick Reference Card

## 🚀 Most Common Commands

```bash
# Verify everything is configured correctly
npm run verify:env

# Development (uses DEV database)
npm run dev

# Build for production (uses PROD database)
npm run build:prod

# Deploy to Netlify
git push
```

---

## 🗄️ Database Connections

| Mode | Database Host | Command |
|------|--------------|---------|
| **Development** 🔧 | `ep-damp-fire-adtxvumr` | `npm run dev` |
| **Production** 🚀 | `ep-young-firefly-adlvuhdv` | `npm run build:prod` |

---

## 📁 Environment Files

| File | Purpose | Database |
|------|---------|----------|
| `.env` | Default | Development |
| `.env.development` | Dev mode | Development |
| `.env.production` | Prod mode | Production |
| `server/.env` | Backend dev | Development |
| `server/.env.production` | Backend prod | Production |

---

## ✅ Quick Checks

### Before Deploying:
```bash
npm run verify:env      # ✅ Check configuration
npm run dev             # ✅ Test locally
npm run build:prod      # ✅ Build successfully
```

### After Deploying:
1. Open: `https://dukani.site/lats/`
2. Press F12 (DevTools)
3. Check Console: No MIME errors ✅
4. Check Network: Assets load (200) ✅

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| MIME errors | `npm run build:prod` then clear cache |
| Wrong database | Check with `npm run verify:env` |
| Build fails | Check terminal for errors |
| Deploy fails | Check Netlify logs |
| Data missing | Check browser console |

---

## 🎯 Remember:

- ✅ Development = Safe testing
- ✅ Production = Live site
- ✅ Always verify before deploying
- ✅ Clear cache after deploying
- ✅ Never commit `.env` files

---

## 📞 Help Commands

```bash
npm run verify:env      # Verify configuration
npm run db:check        # Check database connection
npm run db:validate     # Validate database schema
```

---

## 🌐 URLs

- **Local Dev:** `http://localhost:5173`
- **Production:** `https://dukani.site/lats/`

---

**Status:** ✅ All configured and ready!

Keep this card handy for quick reference! 📌

