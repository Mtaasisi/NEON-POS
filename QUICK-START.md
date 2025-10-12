# ⚡ Quick Start - Environment Configuration

## 🎯 What You Need to Know

Your POS system uses **two separate databases**:

| Environment | Database Branch | Purpose |
|------------|----------------|---------|
| **Development** | `ep-dry-brook-ad3duuog` | Safe testing, development |
| **Production** | Main branch | Live customer data |

---

## 🔧 First Time Setup (5 minutes)

### Step 1: Configure Development Database

```bash
# Edit the development environment file
nano .env.development
```

**Replace these placeholders:**
- `YOUR_PASSWORD` → Your Neon database password
- `REGION` → Your AWS region (e.g., `us-east-1`)

### Step 2: Configure Production Database

```bash
# Edit the production environment file
nano .env.production
```

**Get your production endpoint from Neon:**
1. Go to [Neon Dashboard](https://console.neon.tech)
2. Select your project
3. Click on **main branch** (NOT the dev branch)
4. Copy the connection string
5. Paste it in `.env.production`

---

## 🚀 Daily Development Workflow

### For Development (Using Branch Database)

```bash
# Start development server
npm run dev

# Build for testing
npm run build

# Preview the build
npm run preview
```

✅ This uses the **ep-dry-brook-ad3duuog** branch - safe to experiment!

---

## 📦 Production Deployment

### When Ready to Deploy

```bash
# Option 1: Use the deployment script
./deploy.sh

# Option 2: Build manually
npm run build:prod
```

✅ This uses your **production database** - be careful!

---

## 📋 Command Reference

| Command | Database Used | Purpose |
|---------|--------------|---------|
| `npm run dev` | Dev Branch | Start dev server |
| `npm run build` | Dev Branch | Build for testing |
| `npm run build:prod` | **Production** | Build for deployment |
| `./deploy.sh` | **Production** | Full deployment script |

---

## ⚠️ Important Safety Rules

1. **Always use `npm run build`** for testing (uses dev database)
2. **Only use `npm run build:prod`** when deploying to production
3. **Never commit `.env` files** to Git
4. **Test on dev branch first**, then deploy to production

---

## 🔍 Verify Your Setup

Check that everything is configured correctly:

```bash
# Check dev environment
cat .env.development | grep "ep-dry-brook-ad3duuog"

# Check prod environment  
cat .env.production | grep -v "YOUR_PASSWORD"

# If you see YOUR_PASSWORD, you need to configure it!
```

---

## 🆘 Quick Troubleshooting

**Problem: "Database connection failed"**
```bash
# Check your .env files have actual credentials
grep "YOUR_PASSWORD" .env.development .env.production
# If found, replace with real password
```

**Problem: "Build uses wrong database"**
```bash
# For development:
npm run build

# For production:
npm run build:prod
```

**Problem: "Can't find .env.development"**
```bash
# Create from template
cp .env.example .env.development
# Then edit and add your credentials
```

---

## ✅ Pre-Deployment Checklist

Before deploying to production:

- [ ] Tested on dev branch: `npm run build` ✓
- [ ] Verified changes work correctly
- [ ] Updated `.env.production` with correct credentials
- [ ] Ran production build: `npm run build:prod`
- [ ] Checked build output for errors
- [ ] Ready to upload `dist/` folder

---

## 📚 More Information

- Full guide: See `ENVIRONMENT-SETUP.md`
- Deployment: See `DEPLOYMENT-GUIDE.md`
- Neon Docs: https://neon.tech/docs

---

**Ready to build?**

```bash
# Development build (safe)
npm run build

# Production build (when ready to deploy)
npm run build:prod
```

