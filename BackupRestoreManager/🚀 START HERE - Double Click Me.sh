#!/bin/bash
# ╔════════════════════════════════════════════════════════╗
# ║     🔄 BACKUP & RESTORE MANAGER                        ║
# ║     🚀 START HERE - DOUBLE CLICK THIS FILE!            ║
# ╚════════════════════════════════════════════════════════╝

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Clear screen and show logo
clear
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║     🔄  BACKUP & RESTORE MANAGER                      ║"
echo "║     📦  Database Backup, Restore & Schema Merge        ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed or not in PATH"
    echo ""
    echo "📥 Please install Node.js from:"
    echo "   https://nodejs.org/"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 First time setup: Installing dependencies..."
    echo "   This may take a minute..."
    echo ""
    if command -v npm &> /dev/null; then
        npm install
        if [ $? -ne 0 ]; then
            echo ""
            echo "❌ Failed to install dependencies"
            exit 1
        fi
        echo ""
        echo "✅ Dependencies installed successfully!"
        echo ""
    else
        echo "❌ Error: npm is not installed"
        exit 1
    fi
fi

# Check if the script exists
if [ ! -f "backup-restore-manager.mjs" ]; then
    echo "❌ Error: backup-restore-manager.mjs not found"
    exit 1
fi

# Run the app
echo "🚀 Launching Backup & Restore Manager..."
echo ""
sleep 1
node backup-restore-manager.mjs
