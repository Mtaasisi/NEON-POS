#!/bin/bash

echo "🚀 Starting Backend API Server for Branch Migration..."
echo ""

# Check if server directory exists
if [ ! -f "server/api.mjs" ]; then
    echo "❌ Error: server/api.mjs not found!"
    echo "Make sure you're in the project root directory."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Start the backend server
echo "Starting backend on http://localhost:3001..."
echo ""
echo "Press Ctrl+C to stop the server"
echo "=================================================="
echo ""

node server/api.mjs

