import dotenv from 'dotenv';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function testAccountCreation() {
  console.log('🧪 Testing account creation and retrieval...\n');
  
  try {
    const defaultBranchId = '00000000-0000-0000-0000-000000000001';
    const testName = `Test Account ${Date.now()}`;
    
    // Create a test account
    const testAccount = await sql`
      INSERT INTO finance_accounts (
        name, type, balance, currency, is_active, is_payment_method,
        branch_id, is_shared
      )
      VALUES (
        ${testName},
        'cash',
        0,
        'TZS',
        true,
        true,
        ${defaultBranchId},
        true
      )
      RETURNING 
        id, name, type, balance, currency, is_active, is_payment_method,
        branch_id, is_shared, created_at
    `;
    
    console.log('✅ Created test account:');
    console.log(JSON.stringify(testAccount[0], null, 2));
    
    // Now try to fetch it
    const fetched = await sql`
      SELECT 
        id, name, type, balance, currency, is_active, is_payment_method,
        branch_id, is_shared, created_at, updated_at
      FROM finance_accounts
      WHERE id = ${testAccount[0].id}
        AND is_active = true
        AND is_payment_method = true
    `;
    
    console.log('\n✅ Fetched account:');
    console.log(JSON.stringify(fetched[0], null, 2));
    
    // Check branch filtering
    const branchFiltered = await sql`
      SELECT 
        id, name, type, branch_id, is_shared
      FROM finance_accounts
      WHERE is_active = true
        AND is_payment_method = true
        AND (branch_id = ${defaultBranchId} OR is_shared = true)
      ORDER BY created_at DESC
    `;
    
    console.log(`\n✅ Branch-filtered accounts (${branchFiltered.length}):`);
    branchFiltered.forEach(acc => {
      console.log(`   - ${acc.name}: branch_id=${acc.branch_id || 'NULL'}, is_shared=${acc.is_shared}`);
    });
    
    // Clean up test account
    await sql`DELETE FROM finance_accounts WHERE name = ${testName}`;
    console.log('\n🗑️ Cleaned up test account');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await sql.end();
  }
}

testAccountCreation();
