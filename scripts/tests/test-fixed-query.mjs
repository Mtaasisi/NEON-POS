import dotenv from 'dotenv';
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function testFixedQuery() {
  console.log('🧪 Testing fixed query with correct column names...\n');
  
  try {
    // Test the exact query we're now using
    const result = await sql`
      SELECT 
        id, name, type, balance, account_number, bank_name, currency, 
        is_active, is_payment_method, icon, color, description, 
        requires_reference, requires_account_number, 
        notes, branch_id, is_shared, created_at, updated_at
      FROM finance_accounts
      WHERE is_active = true
        AND is_payment_method = true
      ORDER BY name ASC
    `;
    
    console.log(`✅ Query successful! Returned ${result.length} accounts\n`);
    
    result.forEach((acc, idx) => {
      console.log(`${idx + 1}. ${acc.name} (${acc.type})`);
      console.log(`   ID: ${acc.id}`);
      console.log(`   Branch ID: ${acc.branch_id || 'NULL'}`);
      console.log(`   Is Shared: ${acc.is_shared}`);
      console.log(`   Balance: ${acc.balance} ${acc.currency}`);
      console.log(`   Icon: ${acc.icon || 'none'}, Color: ${acc.color || 'none'}`);
      console.log('');
    });
    
    console.log('✅ All accounts should now be visible in the UI!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

testFixedQuery();
