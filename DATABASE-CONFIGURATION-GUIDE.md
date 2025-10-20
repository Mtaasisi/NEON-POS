# Database Configuration Guide

## Overview
This project uses **two different Neon databases** for development and production environments:

- **Development Database**: Original database (ep-damp-fire-adtxvumr)
- **Production Database**: New database (ep-young-firefly-adlvuhdv)

---

## Environment Setup

### For Development (Local Testing)
Use the original database for development:

```bash
# Copy the recommended template
cp env.template.RECOMMENDED .env

# The development database is already configured:
# DATABASE_URL=postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### For Production Build (dist folder)
Use the new database for production:

```bash
# Copy the production template
cp env.production.template .env.production

# Update the password (replace **************** with your actual password)
# DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

---

## Building for Production

### Development Build (uses development database)
```bash
npm run build
```
This uses `.env` file with the development database.

### Production Build (uses production database)
```bash
npm run build:prod
```
This uses `.env.production` file with the new production database.

---

## Database Configuration Files

### 1. `database-config.json`
Used by backend scripts and migrations:
- **development**: Original database
- **production**: New database (ep-young-firefly-adlvuhdv)
- **production_old**: Backup of original database

### 2. `env.template.RECOMMENDED`
Template for local development (`.env`):
- Uses original development database
- Contains commented production database URLs

### 3. `env.production.template`
Template for production builds (`.env.production`):
- Uses new production database
- Requires password update

### 4. `server/api.mjs`
Backend API server with automatic database selection:
- **Development mode**: Uses original database
- **Production mode**: Uses new database

---

## How It Works

### Automatic Database Selection
The system automatically selects the correct database based on:

1. **Environment Variables**: 
   - `.env` → Development database
   - `.env.production` → Production database

2. **NODE_ENV**:
   - `development` → Original database
   - `production` → New database

3. **Build Command**:
   - `npm run build` → Development database
   - `npm run build:prod` → Production database

---

## Quick Start

### For Development:
```bash
# 1. Copy environment template
cp env.template.RECOMMENDED .env

# 2. Start development server
npm run dev
```

### For Production Deployment:
```bash
# 1. Create production environment file
cp env.production.template .env.production

# 2. Edit .env.production and replace **************** with actual password
nano .env.production

# 3. Build for production
npm run build:prod

# 4. Deploy the dist folder
```

---

## Database URLs Reference

### Development Database (Original)
```
Host: ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech
User: neondb_owner
Password: npg_vABqUKk73tEW
Database: neondb
SSL: require
```

### Production Database (New)
```
Host: ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech
User: neondb_owner
Password: **************** (update in .env.production)
Database: neondb
SSL: require
Channel Binding: require
```

---

## Testing Database Connection

### Test Development Database:
```bash
psql 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require' -c "SELECT version();"
```

### Test Production Database:
```bash
psql 'postgresql://neondb_owner:YOUR_PASSWORD@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' -c "SELECT version();"
```

---

## Important Notes

1. **Never commit `.env` or `.env.production` files** to version control
2. **Always use the correct environment file** for your build
3. **Update the production password** in `.env.production` before building
4. **The dist folder** will use whichever database was configured during build time
5. **Development and production databases are separate** - changes in dev won't affect production

---

## Troubleshooting

### Issue: "Password authentication failed"
**Solution**: Update the password in your `.env.production` file with the actual password.

### Issue: "Wrong database in production"
**Solution**: Make sure you ran `npm run build:prod` instead of `npm run build`.

### Issue: "Environment variables not loading"
**Solution**: Restart your development server or rebuild the project.

---

## Summary

- ✅ Development uses: **ep-damp-fire-adtxvumr** (original database)
- ✅ Production uses: **ep-young-firefly-adlvuhdv** (new database)
- ✅ Automatic selection based on `NODE_ENV`
- ✅ Separate environment files for each environment
- ✅ Clear separation between dev and prod data


