# 🌍 Environment Setup Guide

This guide explains how to configure your POS system for different environments (Development and Production).

## 📋 Overview

Your project uses **Neon Database Branching** to separate development and production databases:

- **Development Branch**: `ep-dry-brook-ad3duuog` - Safe for testing and development
- **Production Database**: Main branch - Live production data

---

## 🔧 Setup Instructions

### Step 1: Configure Development Environment

1. **Edit `.env.development` file** (already created):
   ```bash
   nano .env.development
   ```

2. **Replace the placeholders** with your actual credentials:
   - Replace `YOUR_PASSWORD` with your Neon database password
   - Replace `REGION` with your region (e.g., `us-east-1`)
   
   Example:
   ```env
   DATABASE_URL=postgresql://neondb_owner:mypass123@ep-dry-brook-ad3duuog-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

### Step 2: Configure Production Environment

1. **Edit `.env.production` file** (already created):
   ```bash
   nano .env.production
   ```

2. **Get your production endpoint** from Neon Dashboard:
   - Go to your Neon project
   - Select the **main branch** (not ep-dry-brook-ad3duuog)
   - Copy the connection string
   
3. **Update the file** with production credentials

---

## 🚀 Usage

### Development Mode (Using Branch Database)

```bash
# Run development server with branch database
npm run dev

# Build for development/testing
npm run build
```

This will use the **ep-dry-brook-ad3duuog** branch database.

### Production Mode (Using Main Database)

```bash
# Build for production
npm run build:prod

# Preview production build
npm run preview
```

This will use your **main production** database.

---

## 📦 Deployment to Production

When you're ready to deploy to production:

### Option 1: Build Locally and Upload

```bash
# 1. Build with production environment
npm run build:prod

# 2. The dist/ folder will contain your production build
# 3. Upload dist/ folder to your hosting service (Vercel, Netlify, etc.)
```

### Option 2: Deploy with GitHub + CI/CD

```bash
# 1. Commit your changes
git add .
git commit -m "Production build configuration"

# 2. Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main

# 3. Configure your hosting platform:
# - On Vercel/Netlify dashboard
# - Set build command: npm run build:prod
# - Add environment variables from .env.production
```

---

## ⚙️ Environment Variables on Hosting Platform

When deploying to a hosting platform (Vercel, Netlify, etc.), add these environment variables:

```
DATABASE_URL=your_production_database_url
VITE_DATABASE_URL=your_production_database_url
VITE_API_URL=your_production_api_url
NODE_ENV=production
VITE_ENV=production
```

---

## 🔍 How It Works

### Vite Mode System

Vite automatically loads the correct environment file based on the `--mode` flag:

| Command | Environment File | Database |
|---------|-----------------|----------|
| `npm run dev` | `.env.development` | Branch: ep-dry-brook-ad3duuog |
| `npm run build` | `.env.development` | Branch: ep-dry-brook-ad3duuog |
| `npm run build:prod` | `.env.production` | Main production DB |

### Why Use Branches?

- **✅ Safe Testing**: Changes in development don't affect production
- **✅ Data Isolation**: Dev data separate from live customer data  
- **✅ Easy Rollback**: Can reset dev branch without affecting production
- **✅ Schema Changes**: Test migrations on dev branch first

---

## 🔐 Security Notes

1. **Never commit `.env` files** to Git (they're in `.gitignore`)
2. **Keep `.env.development` and `.env.production` files local**
3. **Use different passwords** for dev and prod databases
4. **On hosting platforms**, add environment variables through their dashboard

---

## 📝 Quick Reference

### Development Workflow
```bash
# 1. Use dev database
npm run dev

# 2. Make changes, test features
# ... work on your code ...

# 3. Build for testing
npm run build

# 4. Test the build
npm run preview
```

### Production Deployment
```bash
# 1. Switch to production configuration
npm run build:prod

# 2. Deploy the dist/ folder
# Upload to your hosting service
```

---

## 🆘 Troubleshooting

### "Database connection failed"
- Check that you've replaced `YOUR_PASSWORD` in the `.env` file
- Verify the endpoint name matches your Neon branch name
- Ensure you're using the correct region

### "Cannot find module .env"
- Make sure `.env.development` or `.env.production` exists
- Run `cp .env.example .env.development` to create from template

### Build uses wrong database
- Check which command you're using (`build` vs `build:prod`)
- Verify the correct `.env` file has the right DATABASE_URL

---

## 📚 Additional Resources

- [Neon Branching Documentation](https://neon.tech/docs/guides/branching)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Deployment Guide](./DEPLOYMENT-GUIDE.md)

---

## ✅ Checklist Before First Build

- [ ] Created `.env.development` with branch database URL
- [ ] Created `.env.production` with main database URL  
- [ ] Replaced all `YOUR_PASSWORD` placeholders
- [ ] Tested development build: `npm run build`
- [ ] Verified production build: `npm run build:prod`
- [ ] Added environment variables to hosting platform

---

**Need Help?** Check your Neon dashboard for the exact connection strings for each branch.

