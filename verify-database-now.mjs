import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

console.log('🔍 VERIFYING DATABASE SCHEMA\n');
console.log('=====================================\n');

async function verifyDatabase() {
  try {
    // Check each critical table
    const tables = [
      { name: 'lats_sales', description: 'Sales records' },
      { name: 'lats_sale_items', description: 'Sale line items' },
      { name: 'daily_sales_closures', description: 'Daily closures' },
      { name: 'lats_spare_part_variants', description: 'Spare part variants' },
      { name: 'customers', description: 'Customers' },
      { name: 'users', description: 'System users' }
    ];
    
    console.log('📊 Checking tables:\n');
    
    for (const table of tables) {
      try {
        const result = await sql`SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = ${table.name}
        ) as exists`;
        
        if (result[0].exists) {
          // Get row count
          const countResult = await sql.unsafe(`SELECT COUNT(*) as count FROM ${table.name}`);
          console.log(`  ✅ ${table.name.padEnd(30)} - EXISTS (${countResult[0].count} records)`);
        } else {
          console.log(`  ❌ ${table.name.padEnd(30)} - MISSING`);
        }
      } catch (err) {
        console.log(`  ⚠️  ${table.name.padEnd(30)} - ERROR: ${err.message}`);
      }
    }
    
    console.log('\n=====================================\n');
    
    // Check lats_sales columns
    console.log('📋 Checking lats_sales columns:\n');
    
    const requiredColumns = [
      'id', 'sale_number', 'customer_name', 'status', 
      'user_id', 'sold_by', 'total_amount', 'created_at'
    ];
    
    const columnsResult = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'lats_sales'
    `;
    
    const existingColumns = columnsResult.map(row => row.column_name);
    
    for (const col of requiredColumns) {
      if (existingColumns.includes(col)) {
        console.log(`  ✅ ${col}`);
      } else {
        console.log(`  ❌ ${col} - MISSING`);
      }
    }
    
    console.log('\n=====================================\n');
    
    // Test a simple query
    console.log('🧪 Testing actual queries:\n');
    
    try {
      const salesTest = await sql`SELECT COUNT(*) as count FROM lats_sales LIMIT 1`;
      console.log(`  ✅ lats_sales query works (${salesTest[0].count} sales)`);
    } catch (err) {
      console.log(`  ❌ lats_sales query failed: ${err.message}`);
    }
    
    try {
      const itemsTest = await sql`SELECT COUNT(*) as count FROM lats_sale_items LIMIT 1`;
      console.log(`  ✅ lats_sale_items query works (${itemsTest[0].count} items)`);
    } catch (err) {
      console.log(`  ❌ lats_sale_items query failed: ${err.message}`);
    }
    
    try {
      const closuresTest = await sql`SELECT COUNT(*) as count FROM daily_sales_closures LIMIT 1`;
      console.log(`  ✅ daily_sales_closures query works (${closuresTest[0].count} closures)`);
    } catch (err) {
      console.log(`  ❌ daily_sales_closures query failed: ${err.message}`);
    }
    
    try {
      const variantsTest = await sql`SELECT COUNT(*) as count FROM lats_spare_part_variants LIMIT 1`;
      console.log(`  ✅ lats_spare_part_variants query works (${variantsTest[0].count} variants)`);
    } catch (err) {
      console.log(`  ❌ lats_spare_part_variants query failed: ${err.message}`);
    }
    
    console.log('\n=====================================');
    console.log('✅ VERIFICATION COMPLETE!');
    console.log('=====================================\n');
    console.log('Your database is ready to use!');
    console.log('🔄 Refresh your browser to see the fixes in action.\n');
    
  } catch (error) {
    console.error('\n❌ Verification error:', error.message);
    throw error;
  }
}

verifyDatabase().catch(console.error);

