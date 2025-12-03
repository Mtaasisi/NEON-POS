# ✅ 5-Minute Railway Setup Checklist

## Your Project
**URL:** https://railway.com/project/5e086917-5c68-4018-bfc3-2fbe6162a4ec

---

## 🎯 Do These 3 Things

### ☐ 1. Set Root Directory

**Where:** Click service → Settings → Find "Root Directory"  
**Type:** `server`  
**Save:** It auto-saves

---

### ☐ 2. Add Variables

**Where:** Click service → Variables → Raw Editor  
**Paste this:**

```
VITE_SUPABASE_URL=https://jxhzveborezjhsmzsgbc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw
NODE_ENV=production
PORT=8000
CORS_ORIGIN=https://dukani.site
```

---

### ☐ 3. Generate Domain

**Where:** Settings → Networking → "Generate Domain"  
**Result:** You get: `https://something.up.railway.app`

---

## ✅ Done!

Wait 2 minutes for deployment, then test:

```
https://your-url.up.railway.app/api/whatsapp/webhook/health
```

---

## 🎯 That's All!

Your webhook will be:
```
https://your-url.up.railway.app/api/whatsapp/webhook
```

Use this in WasenderAPI!

