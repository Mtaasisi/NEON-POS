import { Pool } from '@neondatabase/serverless';

// Use Supabase connection string directly (from connection-strings.txt)
const DATABASE_URL = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function columnExists(tableName, columnName) {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1 
      AND column_name = $2
    )
  `, [tableName, columnName]);
  return result.rows[0].exists;
}

async function addColumnIfNotExists(tableName, columnName, columnDefinition) {
  const exists = await columnExists(tableName, columnName);
  if (exists) {
    console.log(`   ✅ ${tableName}.${columnName} already exists`);
    return false;
  }
  
  try {
    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
    console.log(`   ✅ Added ${tableName}.${columnName}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error adding ${tableName}.${columnName}:`, error.message);
    return false;
  }
}

async function fixMissingColumns() {
  console.log('🔧 Fixing Missing Columns in Supabase Database\n');
  console.log(`📊 Database: ${DATABASE_URL.match(/@([^/]+)/)?.[1] || 'unknown'}\n`);

  let addedCount = 0;

  // 1. employees table
  console.log('📋 Fixing employees table...');
  addedCount += await addColumnIfNotExists('employees', 'full_name', 'TEXT') ? 1 : 0;
  console.log('');

  // 2. lats_sales table
  console.log('📋 Fixing lats_sales table...');
  addedCount += await addColumnIfNotExists('lats_sales', 'branch_id', 'UUID') ? 1 : 0;
  addedCount += await addColumnIfNotExists('lats_sales', 'tax_amount', 'NUMERIC DEFAULT 0') ? 1 : 0;
  console.log('');

  // 3. finance_expenses table
  console.log('📋 Fixing finance_expenses table...');
  addedCount += await addColumnIfNotExists('finance_expenses', 'branch_id', 'UUID') ? 1 : 0;
  console.log('');

  // 4. lats_pos_general_settings table
  console.log('📋 Fixing lats_pos_general_settings table...');
  addedCount += await addColumnIfNotExists('lats_pos_general_settings', 'business_name', 'TEXT') ? 1 : 0;
  addedCount += await addColumnIfNotExists('lats_pos_general_settings', 'business_address', 'TEXT') ? 1 : 0;
  addedCount += await addColumnIfNotExists('lats_pos_general_settings', 'business_phone', 'TEXT') ? 1 : 0;
  addedCount += await addColumnIfNotExists('lats_pos_general_settings', 'business_email', 'TEXT') ? 1 : 0;
  addedCount += await addColumnIfNotExists('lats_pos_general_settings', 'business_website', 'TEXT') ? 1 : 0;
  addedCount += await addColumnIfNotExists('lats_pos_general_settings', 'business_logo', 'TEXT') ? 1 : 0;
  addedCount += await addColumnIfNotExists('lats_pos_general_settings', 'font_size', 'TEXT DEFAULT \'medium\'') ? 1 : 0;
  console.log('');

  // 5. lats_purchase_orders table
  console.log('📋 Fixing lats_purchase_orders table...');
  addedCount += await addColumnIfNotExists('lats_purchase_orders', 'branch_id', 'UUID') ? 1 : 0;
  console.log('');

  // 6. lats_suppliers table
  console.log('📋 Fixing lats_suppliers table...');
  addedCount += await addColumnIfNotExists('lats_suppliers', 'branch_id', 'UUID') ? 1 : 0;
  console.log('');

  // 7. customers table
  console.log('📋 Fixing customers table...');
  addedCount += await addColumnIfNotExists('customers', 'branch_id', 'UUID') ? 1 : 0;
  console.log('');

  // 8. finance_accounts table
  console.log('📋 Fixing finance_accounts table...');
  addedCount += await addColumnIfNotExists('finance_accounts', 'icon', 'TEXT') ? 1 : 0;
  console.log('');

  // 9. user_daily_goals table
  console.log('📋 Fixing user_daily_goals table...');
  addedCount += await addColumnIfNotExists('user_daily_goals', 'date', 'DATE') ? 1 : 0;
  console.log('');

  // 10. lats_products table
  console.log('📋 Fixing lats_products table...');
  addedCount += await addColumnIfNotExists('lats_products', 'max_stock_level', 'NUMERIC') ? 1 : 0;
  console.log('');

  console.log(`\n✅ Fixed ${addedCount} missing column(s)`);
  console.log('✅ Done!');
  
  await pool.end();
}

fixMissingColumns().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

