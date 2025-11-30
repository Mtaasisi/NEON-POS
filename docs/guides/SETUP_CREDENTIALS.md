# 🔧 Quick Setup - 3 Steps

## Step 1: Get Your Neon Credentials

Go to https://console.neon.tech and get:

1. **Project ID**: 
   - Look at URL: `console.neon.tech/app/projects/[PROJECT-ID]`
   - Or: Project Settings → General

2. **API Key**:
   - Profile → Account Settings → API Keys
   - Click "Generate new API key"

3. **Connection Strings** (for each branch):
   - Click "Branches" in sidebar
   - Click on each branch (dev, main)
   - Copy the "Connection String"

## Step 2: Create neon-branches.json

Copy the template and add your credentials:

```bash
cp neon-branches.json.template neon-branches.json
nano neon-branches.json  # or use your editor
```

Replace these placeholders:
- YOUR_NEON_PROJECT_ID
- YOUR_NEON_API_KEY
- Connection strings for dev and main branches

## Step 3: Run Migration Again

```bash
node scripts/migrate-branch-data.mjs --from dev --to main
```

That's it! 🎉

---

**Security Note:** Make sure neon-branches.json is in .gitignore!
