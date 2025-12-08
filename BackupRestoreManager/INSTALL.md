# 📦 Installation Guide

## Quick Install (Recommended)

### macOS
1. **Double-click** `Launch App.command`
2. First time: It will automatically install dependencies
3. App launches automatically!

### Windows
1. **Double-click** `Launch App.bat`
2. First time: It will automatically install dependencies
3. App launches automatically!

### Linux/Unix
1. Open terminal in this folder
2. Run: `chmod +x "Launch App.sh"`
3. Run: `./Launch\ App.sh`
4. First time: It will automatically install dependencies

## Manual Install

If automatic install doesn't work:

```bash
# Navigate to this folder
cd BackupRestoreManager

# Install dependencies
npm install

# Run the app
npm start
```

## Requirements Check

### Node.js
```bash
node --version
```
**Required**: v18.0.0 or higher

### npm
```bash
npm --version
```
**Required**: Comes with Node.js

## Troubleshooting

### "npm: command not found"
- Install Node.js from https://nodejs.org/
- Restart terminal after installation

### "Permission denied" (macOS/Linux)
```bash
chmod +x "Launch App.command"
chmod +x "Launch App.sh"
```

### "Module not found: pg"
```bash
npm install
```

## That's It!

Once dependencies are installed, you can:
- Move this folder anywhere
- Launch from any location
- Everything is self-contained!
