#!/bin/bash

# Start Backend API Server
# This script helps start the backend server with proper environment

echo "🚀 Starting POS Backend API Server..."
echo ""

# Check if server directory exists
if [ ! -d "server" ]; then
    echo "❌ Server directory not found!"
    echo "📁 Please ensure you're in the project root"
    exit 1
fi

# Check if .env file exists in server
if [ ! -f "server/.env" ]; then
    echo "⚠️  No .env file found in server/"
    echo "📝 Creating from .env.example..."
    
    if [ -f "server/.env.example" ]; then
        cp server/.env.example server/.env
        echo "✅ Created server/.env"
        echo "⚠️  IMPORTANT: Edit server/.env and add your DATABASE_URL!"
        echo ""
        read -p "Press Enter to continue or Ctrl+C to stop and edit .env..."
    else
        echo "❌ .env.example not found!"
        exit 1
    fi
fi

# Check if DATABASE_URL is set
if ! grep -q "^DATABASE_URL=postgresql" server/.env 2>/dev/null; then
    echo "⚠️  DATABASE_URL may not be configured in server/.env"
    echo "📝 Please edit server/.env and add your Neon database URL"
    echo ""
    read -p "Press Enter to continue anyway or Ctrl+C to stop..."
fi

# Navigate to server directory
cd server

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
    echo ""
fi

# Start server
echo "🎯 Starting server in development mode..."
echo "📍 API will be available at: http://localhost:8000"
echo "🔗 Health check: http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev

