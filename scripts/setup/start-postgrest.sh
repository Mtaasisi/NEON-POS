#!/bin/bash

# Start PostgREST with Docker Compose

echo "🚀 Starting PostgREST for Neon Database"
echo "========================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo ""
    echo "Please install Docker Desktop from:"
    echo "https://www.docker.com/products/docker-desktop"
    echo ""
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running!"
    echo ""
    echo "Please start Docker Desktop and try again."
    echo ""
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found!"
    echo ""
    echo "Please make sure you're in the project directory."
    echo ""
    exit 1
fi

echo "📦 Starting PostgREST container..."
echo ""

# Start Docker Compose
docker-compose up -d

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ PostgREST is now running!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🌐 API Endpoint: http://localhost:3000"
    echo "📚 Swagger UI: http://localhost:8080"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📋 Next Steps:"
    echo ""
    echo "1. Generate JWT tokens:"
    echo "   npm install jsonwebtoken"
    echo "   node generate-jwt.js"
    echo ""
    echo "2. Update your .env file:"
    echo "   VITE_SUPABASE_URL=http://localhost:3000"
    echo "   VITE_SUPABASE_ANON_KEY=<token-from-step-1>"
    echo ""
    echo "3. Test the API:"
    echo "   curl http://localhost:3000"
    echo ""
    echo "4. View logs:"
    echo "   docker-compose logs -f postgrest"
    echo ""
    echo "5. Stop PostgREST:"
    echo "   docker-compose down"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
else
    echo ""
    echo "❌ Failed to start PostgREST"
    echo ""
    echo "Try running: docker-compose logs"
    echo ""
    exit 1
fi

