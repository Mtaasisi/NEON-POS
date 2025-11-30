import dotenv from 'dotenv';
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function testQuery() {
  console.log('🧪 Testing exact product query from code...\n');
  
  try {
    // Test the exact select statement from latsProductApi.ts
    const columns = [
      'id', 'name', 'description', 'sku', 'barcode', 'category_id', 'supplier_id',
      'cost_price', 'stock_quantity', 'min_stock_level', 'max_stock_level',
      'is_active', 'image_url', 'brand', 'model', 'warranty_period',
      'created_at', 'updated_at', 'specification', 'condition', 'selling_price',
      'total_quantity', 'total_value', 'storage_room_id', 'shelf_id',
      'branch_id', 'is_shared', 'sharing_mode', 'visible_to_branches'
    ];
    
    console.log('🔍 Checking which columns exist...\n');
    
    // Get all columns from the table
    const tableColumns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'lats_products'
      ORDER BY column_name
    `;
    
    const existingColumns = tableColumns.map(c => c.column_name);
    const missingColumns = columns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log(`❌ Missing columns (${missingColumns.length}):`);
      missingColumns.forEach(col => console.log(`   - ${col}`));
    } else {
      console.log('✅ All columns exist!');
    }
    
    console.log('\n📋 Testing the actual query...');
    const result = await sql`
      SELECT 
        id, name, description, sku, barcode, category_id, supplier_id,
        cost_price, stock_quantity, min_stock_level, max_stock_level,
        is_active, image_url, brand, model, warranty_period,
        created_at, updated_at, specification, condition, selling_price,
        total_quantity, total_value, storage_room_id, shelf_id,
        branch_id, is_shared, sharing_mode, visible_to_branches
      FROM lats_products
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    console.log(`✅ Query successful! Returned ${result.length} products\n`);
    result.forEach((prod, idx) => {
      console.log(`${idx + 1}. ${prod.name} (${prod.sku})`);
      console.log(`   Branch ID: ${prod.branch_id || 'NULL'}, Is Shared: ${prod.is_shared}`);
    });
    
  } catch (error) {
    console.error('❌ Query Error:', error.message);
    if (error.message.includes('column') || error.message.includes('does not exist')) {
      console.error('\n💡 This is a column name mismatch issue!');
    }
  } finally {
    await sql.end();
  }
}

testQuery();
