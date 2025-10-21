#!/bin/bash

# ================================================
# Device & Repair Branch Isolation Migration Script
# ================================================

echo "🔒 Starting Device & Repair Branch Isolation Migration..."
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
echo "  ✓ Add branch_id to devices table"
echo "  ✓ Add branch_id to repair_parts table (if exists)"
echo "  ✓ Add branch_id to customer_payments table"
echo "  ✓ Update existing data with default branch"
echo "  ✓ Create indexes for performance"
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
psql "$DATABASE_URL" -f migrations/add_branch_id_to_devices.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "📊 Verifying results..."
    echo ""
    
    # Verify the migration
    psql "$DATABASE_URL" -c "
        SELECT 
            'devices' as table_name,
            branch_id, 
            COUNT(*) as record_count 
        FROM devices 
        GROUP BY branch_id
        
        UNION ALL
        
        SELECT 
            'customer_payments' as table_name,
            branch_id, 
            COUNT(*) as record_count 
        FROM customer_payments 
        GROUP BY branch_id
        
        ORDER BY table_name, branch_id;
    "
    
    echo ""
    echo "✅ Device & Repair Branch Isolation is now COMPLETE!"
    echo ""
    echo "📚 Next steps:"
    echo "  1. Switch to a branch in your app: localStorage.setItem('current_branch_id', 'your-branch-id')"
    echo "  2. Navigate to the Devices page"
    echo "  3. Verify only devices from that branch appear"
    echo "  4. Create a new device and verify it's assigned to the current branch"
    echo ""
    echo "📖 Full documentation: DEVICE-REPAIR-ISOLATION-COMPLETE.md"
else
    echo ""
    echo "❌ Migration failed!"
    echo "Please check the error messages above and try again."
    exit 1
fi

