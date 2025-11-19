import dotenv from 'dotenv';
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function testQuery() {
  console.log('🧪 Testing exact query that should be executed...\n');
  
  try {
    const defaultBranchId = '00000000-0000-0000-0000-000000000001';
    
    // Simulate the exact query from fetchPaymentMethods
    // This is what should happen when branch is in shared mode
    const query1 = await sql`
      SELECT 
        id, name, type, balance, account_number, bank_name, currency, 
        is_active, is_payment_method, payment_icon, payment_color, 
        payment_description, requires_reference, requires_account_number, 
        notes, branch_id, is_shared, created_at, updated_at
      FROM finance_accounts
      WHERE is_active = true
        AND is_payment_method = true
      ORDER BY name ASC
    `;
    
    console.log(`✅ Query 1 (no branch filter - shared mode): ${query1.length} accounts`);
    query1.forEach(acc => {
      console.log(`   - ${acc.name} (${acc.type}): branch_id=${acc.branch_id || 'NULL'}, is_shared=${acc.is_shared}`);
    });
    
    // Test with branch filter (if branch was selected)
    const query2 = await sql`
      SELECT 
        id, name, type, balance, account_number, bank_name, currency, 
        is_active, is_payment_method, payment_icon, payment_color, 
        payment_description, requires_reference, requires_account_number, 
        notes, branch_id, is_shared, created_at, updated_at
      FROM finance_accounts
      WHERE is_active = true
        AND is_payment_method = true
        AND (branch_id = ${defaultBranchId} OR is_shared = true OR branch_id IS NULL)
      ORDER BY name ASC
    `;
    
    console.log(`\n✅ Query 2 (with branch OR shared): ${query2.length} accounts`);
    query2.forEach(acc => {
      console.log(`   - ${acc.name} (${acc.type}): branch_id=${acc.branch_id || 'NULL'}, is_shared=${acc.is_shared}`);
    });
    
    // Check if there's a column mismatch issue
    console.log('\n📋 Checking column structure...');
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'finance_accounts'
        AND column_name IN ('branch_id', 'is_shared', 'is_active', 'is_payment_method')
      ORDER BY column_name
    `;
    
    console.log('Required columns:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await sql.end();
  }
}

testQuery();
