#!/bin/bash
# Backup & Restore Manager Launcher
# Double-click this file to launch the app

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    echo ""
    echo "Press Enter to close..."
    read
    exit 1
fi

# Check if the script exists
if [ ! -f "backup-restore-manager.mjs" ]; then
    echo "❌ Error: backup-restore-manager.mjs not found in:"
    echo "   $SCRIPT_DIR"
    echo ""
    echo "Press Enter to close..."
    read
    exit 1
fi

# Run the app
echo "🚀 Launching Backup & Restore Manager..."
echo ""
node backup-restore-manager.mjs

# Keep terminal open if there's an error
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ App exited with error code: $EXIT_CODE"
  echo "Press Enter to close..."
  read
fi
