#!/bin/bash

# Setup script for Neon Database environment configuration
echo "🚀 Neon Database Environment Setup"
echo "===================================="
echo ""

# Check if .env already exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled. Edit your .env file manually."
        exit 0
    fi
fi

echo ""
echo "This app requires Supabase-compatible API endpoints."
echo "You have three options:"
echo ""
echo "1. Use Supabase with Neon as the database (RECOMMENDED)"
echo "2. Set up PostgREST with your Neon database"
echo "3. Get help migrating to Neon's native driver"
echo ""
read -p "Which option do you prefer? (1/2/3): " -n 1 -r OPTION
echo ""
echo ""

case $OPTION in
    1)
        echo "📝 Creating .env file for Supabase..."
        echo ""
        read -p "Enter your Supabase Project URL: " SUPABASE_URL
        read -p "Enter your Supabase anon/public key: " SUPABASE_KEY
        
        # Create .env file
        cat > .env << EOF
# LATS CHANCE Environment Configuration
# Generated on $(date)

# Development Configuration
NODE_ENV=development
VITE_APP_ENV=development

# Supabase Configuration (with Neon backend)
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_KEY

# Direct Neon Connection (for backend scripts)
VITE_DATABASE_URL=postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Optional: Feature flags
# VITE_ENABLE_DEBUG=true
# VITE_ENABLE_ANALYTICS=false
EOF
        
        echo ""
        echo "✅ .env file created successfully!"
        echo ""
        echo "Next steps:"
        echo "1. Restart your development server"
        echo "2. Test the trade-in functionality"
        echo ""
        ;;
    
    2)
        echo "📝 Creating .env file for PostgREST..."
        echo ""
        read -p "Enter your PostgREST endpoint URL: " POSTGREST_URL
        read -p "Enter your PostgREST JWT secret/anon key: " POSTGREST_KEY
        
        # Create .env file
        cat > .env << EOF
# LATS CHANCE Environment Configuration
# Generated on $(date)

# Development Configuration
NODE_ENV=development
VITE_APP_ENV=development

# PostgREST Configuration (Neon backend)
VITE_SUPABASE_URL=$POSTGREST_URL
VITE_SUPABASE_ANON_KEY=$POSTGREST_KEY

# Direct Neon Connection
VITE_DATABASE_URL=postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Optional: Feature flags
# VITE_ENABLE_DEBUG=true
# VITE_ENABLE_ANALYTICS=false
EOF
        
        echo ""
        echo "✅ .env file created successfully!"
        echo ""
        echo "Next steps:"
        echo "1. Ensure PostgREST is running and accessible"
        echo "2. Restart your development server"
        echo "3. Test the trade-in functionality"
        echo ""
        ;;
    
    3)
        echo ""
        echo "📚 To migrate to Neon's native driver, you would need to:"
        echo ""
        echo "1. Replace @supabase/supabase-js with @neondatabase/serverless"
        echo "2. Update src/lib/supabase.ts to use Neon's driver"
        echo "3. Refactor all database queries throughout the app"
        echo ""
        echo "This is a significant undertaking. Would you like me to:"
        echo "  - Create a migration guide?"
        echo "  - Show you the files that need changes?"
        echo ""
        echo "For now, I recommend using Option 1 (Supabase) as it requires"
        echo "minimal changes and Supabase can use Neon as its database."
        echo ""
        exit 0
        ;;
    
    *)
        echo "❌ Invalid option. Please run the script again."
        exit 1
        ;;
esac

echo "🎉 Setup complete!"
echo ""
echo "Your Neon database: ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech"
echo "Database name: neondb"
echo ""
echo "If you encounter any issues, check NEON_DATABASE_SETUP.md for detailed instructions."

