import dotenv from 'dotenv';
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function checkColumns() {
  console.log('🔍 Checking finance_accounts table columns...\n');
  
  try {
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'finance_accounts'
      ORDER BY ordinal_position
    `;
    
    console.log(`📋 Total columns: ${columns.length}\n`);
    columns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check which columns we're trying to select that don't exist
    const requiredColumns = [
      'id', 'name', 'type', 'balance', 'account_number', 'bank_name', 
      'currency', 'is_active', 'is_payment_method', 
      'payment_icon', 'payment_color', 'payment_description',
      'requires_reference', 'requires_account_number', 
      'notes', 'branch_id', 'is_shared', 'created_at', 'updated_at'
    ];
    
    console.log('\n🔍 Checking which columns exist:');
    const existingColumns = columns.map(c => c.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log(`\n⚠️  Missing columns: ${missingColumns.join(', ')}`);
    } else {
      console.log('\n✅ All required columns exist');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkColumns();
