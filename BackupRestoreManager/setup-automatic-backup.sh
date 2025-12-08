#!/bin/bash
# Automatic Backup Setup Script
# This script helps you set up automatic daily backups

echo "╔════════════════════════════════════════════════════════╗"
echo "║     📅 AUTOMATIC BACKUP SETUP                         ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Get current directory
BACKUP_DIR="$(cd "$(dirname "$0")" && pwd)"
NODE_PATH=$(which node)

if [ -z "$NODE_PATH" ]; then
    echo "❌ Error: Node.js not found in PATH"
    echo "Please install Node.js or provide full path"
    exit 1
fi

echo "📁 Backup directory: $BACKUP_DIR"
echo "🔧 Node.js path: $NODE_PATH"
echo ""

# Check if connections file exists
CONNECTIONS_FILE="$BACKUP_DIR/.db-connections.json"
if [ ! -f "$CONNECTIONS_FILE" ]; then
    echo "⚠️  No saved connections found!"
    echo "Please run the main app first and add a connection."
    exit 1
fi

# Show available connections
echo "📋 Available connections:"
node -e "
const fs = require('fs');
const connections = JSON.parse(fs.readFileSync('$CONNECTIONS_FILE', 'utf8'));
connections.forEach((c, i) => console.log(\`  \${i + 1}. \${c.name}\`));
" 2>/dev/null || echo "  (Could not read connections)"

echo ""
read -p "Enter connection name: " CONNECTION_NAME

# Validate connection exists
if ! node -e "
const fs = require('fs');
const connections = JSON.parse(fs.readFileSync('$CONNECTIONS_FILE', 'utf8'));
if (!connections.find(c => c.name === '$CONNECTION_NAME')) {
  process.exit(1);
}
" 2>/dev/null; then
    echo "❌ Connection '$CONNECTION_NAME' not found!"
    exit 1
fi

# Get backup type
echo ""
echo "Backup types:"
echo "  1. Full (Data + Schema)"
echo "  2. Data Only"
echo "  3. Schema Only"
read -p "Select backup type (1-3) [1]: " BACKUP_TYPE_CHOICE
BACKUP_TYPE_CHOICE=${BACKUP_TYPE_CHOICE:-1}

case $BACKUP_TYPE_CHOICE in
    1) BACKUP_TYPE="full" ;;
    2) BACKUP_TYPE="data" ;;
    3) BACKUP_TYPE="schema" ;;
    *) BACKUP_TYPE="full" ;;
esac

# Get backup name
read -p "Backup name prefix [daily]: " BACKUP_NAME
BACKUP_NAME=${BACKUP_NAME:-daily}

# Get schedule
echo ""
echo "Schedule options:"
echo "  1. Daily at 2:00 AM"
echo "  2. Daily at 3:00 AM"
echo "  3. Weekly (Sunday 1:00 AM)"
echo "  4. Monthly (1st of month, midnight)"
echo "  5. Custom (you'll edit crontab manually)"
read -p "Select schedule (1-5) [1]: " SCHEDULE_CHOICE
SCHEDULE_CHOICE=${SCHEDULE_CHOICE:-1}

case $SCHEDULE_CHOICE in
    1) CRON_TIME="0 2 * * *" ;;
    2) CRON_TIME="0 3 * * *" ;;
    3) CRON_TIME="0 1 * * 0" ;;
    4) CRON_TIME="0 0 1 * *" ;;
    5) CRON_TIME="CUSTOM" ;;
    *) CRON_TIME="0 2 * * *" ;;
esac

if [ "$CRON_TIME" != "CUSTOM" ]; then
    # Create cron job
    CRON_JOB="$CRON_TIME cd $BACKUP_DIR && $NODE_PATH scheduled-backup.mjs \"$CONNECTION_NAME\" \"$BACKUP_TYPE\" \"$BACKUP_NAME\" >> $BACKUP_DIR/backup.log 2>&1"
    
    # Add to crontab
    (crontab -l 2>/dev/null | grep -v "scheduled-backup.mjs.*$CONNECTION_NAME"; echo "$CRON_JOB") | crontab -
    
    echo ""
    echo "✅ Automatic backup scheduled!"
    echo ""
    echo "📋 Schedule: $CRON_TIME"
    echo "📦 Type: $BACKUP_TYPE"
    echo "💾 Name: $BACKUP_NAME"
    echo "🔗 Connection: $CONNECTION_NAME"
    echo ""
    echo "📝 View scheduled jobs: crontab -l"
    echo "📊 View backup logs: tail -f $BACKUP_DIR/backup.log"
    echo ""
    echo "🧪 Test the backup now? (y/n)"
    read -p "> " TEST_NOW
    
    if [ "$TEST_NOW" = "y" ] || [ "$TEST_NOW" = "Y" ]; then
        echo ""
        echo "🧪 Running test backup..."
        cd "$BACKUP_DIR"
        $NODE_PATH scheduled-backup.mjs "$CONNECTION_NAME" "$BACKUP_TYPE" "test-$(date +%Y%m%d)"
        echo ""
        echo "✅ Test complete! Check PROD BACKUP folder."
    fi
else
    echo ""
    echo "📝 Manual setup required:"
    echo ""
    echo "1. Open crontab: crontab -e"
    echo "2. Add this line:"
    echo ""
    echo "   [TIME] cd $BACKUP_DIR && $NODE_PATH scheduled-backup.mjs \"$CONNECTION_NAME\" \"$BACKUP_TYPE\" \"$BACKUP_NAME\" >> $BACKUP_DIR/backup.log 2>&1"
    echo ""
    echo "   Replace [TIME] with your schedule (e.g., '0 2 * * *' for daily at 2 AM)"
    echo ""
    echo "Cron time format: minute hour day month weekday"
    echo "Examples:"
    echo "  0 2 * * *     = Daily at 2:00 AM"
    echo "  0 */6 * * *   = Every 6 hours"
    echo "  0 1 * * 0     = Every Sunday at 1:00 AM"
fi

echo ""
echo "✅ Setup complete!"
