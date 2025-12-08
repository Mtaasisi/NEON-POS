#!/bin/bash
# Quick script to view database tables

echo "📊 Database Tables in 'neondb'"
echo "=================================="
echo ""

# List all tables with numbers
echo "All Tables (183 total):"
psql -h localhost -p 5432 -U $USER -d neondb -c "\dt" -t | nl

echo ""
echo "📈 Table Sizes:"
psql -h localhost -p 5432 -U $USER -d neondb -c "
SELECT 
    table_name,
    pg_size_pretty(pg_total_relation_size('public.'||table_name)) as size,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY pg_total_relation_size('public.'||table_name) DESC
LIMIT 20;
"

echo ""
echo "💡 Quick Commands:"
echo "  View all tables:     psql -h localhost -p 5432 -U $USER -d neondb -c '\dt'"
echo "  View table structure: psql -h localhost -p 5432 -U $USER -d neondb -c '\d table_name'"
echo "  View table data:      psql -h localhost -p 5432 -U $USER -d neondb -c 'SELECT * FROM table_name LIMIT 10;'"
echo "  Interactive mode:     psql -h localhost -p 5432 -U $USER -d neondb"
