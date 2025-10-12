# ⚠️ IMPORTANT: Branch Selection Required

## 🚨 Before You Start

**You MUST select a database branch before running the app!**

The app will **NOT** auto-select a branch. You need to explicitly choose one.

---

## 🎯 Quick Setup (First Time)

### Option 1: Use Development Branch (Recommended)
```bash
npm run branch:dev
npm run dev:full
```

### Option 2: Use Production Branch
```bash
npm run branch:prod
npm run build
```

---

## ❌ What Happens If You Don't Select a Branch?

If you try to start the app without selecting a branch, you'll see:

```
❌ DATABASE_URL not configured!

🔧 Please run one of these commands to select a branch:
   npm run branch:dev    (for development)
   npm run branch:prod   (for production)
```

---

## ✅ Check Current Branch

```bash
npm run branch:check
```

---

## 🔄 Switch Between Branches Anytime

```bash
# Switch to development
npm run branch:dev

# Switch to production
npm run branch:prod

# Check current setting
npm run branch:check
```

---

## 📖 More Information

- **Quick Reference**: See `QUICK-START-BRANCHES.md`
- **Full Guide**: See `NEON-BRANCHES-GUIDE.md`
