#!/bin/bash

# ================================================
# Technician/User Branch Isolation Migration Script
# ================================================

echo "🔒 Starting Technician/User Branch Isolation Migration..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL environment variable is not set."
    echo "Please set it before running this script:"
    echo "  export DATABASE_URL='your-database-connection-string'"
    echo ""
    read -p "Do you want to enter it now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your DATABASE_URL: " DATABASE_URL
        export DATABASE_URL
    else
        echo "❌ Cannot proceed without DATABASE_URL. Exiting."
        exit 1
    fi
fi

echo "📋 Migration will:"
echo "  ✓ Add branch_id to users table"
echo "  ✓ Add branch_id to auth_users table (if exists)"
echo "  ✓ Add branch_id to employees table (if exists)"
echo "  ✓ Update existing data with default branch"
echo "  ✓ Create indexes for performance"
echo "  ✓ Show technician distribution by branch"
echo ""

read -p "Continue with migration? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration cancelled."
    exit 1
fi

echo ""
echo "🚀 Running migration..."
echo ""

# Run the migration
psql "$DATABASE_URL" -f migrations/add_branch_id_to_users.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "📊 Verifying results..."
    echo ""
    
    # Verify the migration
    psql "$DATABASE_URL" -c "
        SELECT 
            'users' as table_name,
            u.role,
            b.name as branch_name,
            COUNT(*) as count 
        FROM users u
        LEFT JOIN lats_branches b ON u.branch_id = b.id
        WHERE u.is_active = true
        GROUP BY u.role, b.name
        ORDER BY u.role, b.name;
    "
    
    echo ""
    echo "✅ Technician/User Branch Isolation is now COMPLETE!"
    echo ""
    echo "📚 Next steps:"
    echo "  1. Technicians are now assigned to branches"
    echo "  2. Each branch will only see their own technicians"
    echo "  3. Toggle isolation on/off in provider.supabase.ts"
    echo "  4. Assign technicians to correct branches if needed"
    echo ""
    echo "📖 Full documentation: TECHNICIAN-ISOLATION-COMPLETE.md"
else
    echo ""
    echo "❌ Migration failed!"
    echo "Please check the error messages above and try again."
    exit 1
fi

