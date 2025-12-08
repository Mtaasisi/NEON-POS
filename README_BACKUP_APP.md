# Backup & Restore Manager - App Launcher

## 🚀 How to Launch the App

You have **3 ways** to launch the Backup & Restore Manager:

### Option 1: Double-Click the .command File (Easiest)
1. Find `BackupRestoreManager.command` in your project folder
2. **Double-click** it
3. Terminal will open and run the app automatically

### Option 2: Use the macOS App Bundle
1. Find `Backup Restore Manager.app` in your project folder
2. **Double-click** it (just like any Mac app)
3. Terminal will open and run the app

### Option 3: Run from Terminal
```bash
cd /Users/mtaasisi/Downloads/NEON-POS-main
node backup-restore-manager.mjs
```

Or use the launcher script:
```bash
./launch-backup-manager.sh
```

## 📱 Making it More App-Like

### Create a Desktop Shortcut (macOS)

1. **Right-click** on `Backup Restore Manager.app`
2. Select **"Make Alias"**
3. Drag the alias to your **Desktop** or **Applications** folder
4. Now you can launch it from anywhere!

### Add to Dock

1. Launch the app once
2. While it's running, **right-click** its icon in the Dock
3. Select **"Options" → "Keep in Dock"**
4. Now it stays in your Dock for quick access!

## 🎨 Customize the App Icon (Optional)

If you want a custom icon:

1. Create or download a `.icns` file
2. Place it in: `Backup Restore Manager.app/Contents/Resources/AppIcon.icns`
3. The app will use your custom icon

## ⚡ Quick Access Tips

- **Spotlight Search**: Press `Cmd + Space`, type "Backup Restore Manager"
- **Terminal Alias**: Add to your `~/.zshrc`:
  ```bash
  alias backup-manager="cd /Users/mtaasisi/Downloads/NEON-POS-main && node backup-restore-manager.mjs"
  ```
  Then just type `backup-manager` in terminal!

## 🔧 Troubleshooting

**If double-click doesn't work:**
1. Right-click the `.command` file
2. Select "Open With" → "Terminal"
3. Or run: `chmod +x BackupRestoreManager.command`

**If the app doesn't launch:**
- Make sure Node.js is installed: `node --version`
- Check file permissions: `chmod +x backup-restore-manager.mjs`

## 📝 Notes

- The app runs in Terminal (it's a command-line tool)
- All your data is saved in the `PROD BACKUP/` folder
- Connection strings are saved in `.db-connections.json`
