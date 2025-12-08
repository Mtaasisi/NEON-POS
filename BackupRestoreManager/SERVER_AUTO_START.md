# 🔧 Server Auto-Start Feature

## ✨ Automatic Server Detection & Startup

The Backup & Restore Manager now **automatically detects and starts** PostgreSQL servers when needed!

## 🎯 How It Works

### Automatic Detection
- ✅ Detects if you're connecting to a **local PostgreSQL** server (localhost)
- ✅ Checks if the PostgreSQL service is running
- ✅ Attempts to start it automatically if it's not running

### Supported Platforms

#### macOS
- Uses `brew services` to check/start PostgreSQL
- Supports: `postgresql@14`, `postgresql@15`, `postgresql@16`, `postgresql@17`
- Fallback: Uses `pg_ctl` if Homebrew services aren't available

#### Windows
- Uses Windows Service Manager (`sc` command)
- Supports standard PostgreSQL installations

#### Linux
- Uses `systemctl` to manage PostgreSQL service
- May require `sudo` for starting (will prompt if needed)

## 🚀 When Auto-Start Triggers

Auto-start activates when:
1. ✅ You test a connection to localhost
2. ✅ You backup a local database
3. ✅ You restore to a local database
4. ✅ You merge schemas involving local databases

## 💡 What Happens

1. **Connection Test Fails** → App detects it's a local connection
2. **Checks Server Status** → Verifies if PostgreSQL is running
3. **Attempts Auto-Start** → Tries to start the service automatically
4. **Retries Connection** → Waits a few seconds and tries again
5. **Success!** → Connection works, operation continues

## 📋 Example Flow

```
⚠️  Database connection failed. Checking if PostgreSQL server is running...
   ❌ PostgreSQL server is not running
🔧 Attempting to start PostgreSQL server...
   📦 Starting postgresql@17 via Homebrew...
   ⏳ Waiting for service to start...
   ✅ PostgreSQL started successfully!
   🔄 Retrying connection...
   ✅ Connection successful after starting server!
```

## ⚙️ Manual Start (If Auto-Start Fails)

If automatic start doesn't work, the app will show you the manual command:

### macOS
```bash
brew services start postgresql@17
```

### Windows
```bash
net start postgresql-x64-*
```

### Linux
```bash
sudo systemctl start postgresql
```

## 🔍 Detection Methods

The app tries multiple methods to detect PostgreSQL:

1. **Service Manager** (brew/systemctl/net)
2. **Process Check** (pg_isready)
3. **Connection Test** (direct connection attempt)

## ⚠️ Notes

- **Cloud Databases**: Auto-start only works for localhost connections
- **Remote Servers**: No auto-start (you need to start them manually)
- **Permissions**: Linux may require `sudo` for starting services
- **Timing**: App waits 2-3 seconds after starting for server to be ready

## 🎉 Benefits

- ✅ **No manual intervention** needed for local databases
- ✅ **Seamless experience** - just connect and go
- ✅ **Smart detection** - only activates for local connections
- ✅ **Clear feedback** - shows what's happening
- ✅ **Fallback options** - provides manual commands if needed

## 🛠️ Troubleshooting

### "Could not start PostgreSQL automatically"
- Check if PostgreSQL is installed
- Verify service name matches (e.g., `postgresql@17`)
- Try the manual command shown in the error message

### "Permission denied" (Linux)
- Run the manual command with `sudo`
- Or configure passwordless sudo for PostgreSQL service

### "Service not found"
- PostgreSQL might be installed differently
- Check your installation method
- Use manual start command

---

**The app now handles server management automatically!** 🚀
