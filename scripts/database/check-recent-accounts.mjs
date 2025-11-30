import dotenv from 'dotenv';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function checkAccounts() {
  console.log('🔍 Checking all payment accounts...\n');
  
  try {
    const defaultBranchId = '00000000-0000-0000-0000-000000000001';
    
    // Get all accounts
    const allAccounts = await sql`
      SELECT 
        id, name, type, balance, currency,
        is_active, is_payment_method,
        branch_id, is_shared,
        created_at
      FROM finance_accounts
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    console.log(`📊 Total accounts in database: ${allAccounts.length}\n`);
    
    allAccounts.forEach((acc, idx) => {
      console.log(`${idx + 1}. ${acc.name} (${acc.type})`);
      console.log(`   ID: ${acc.id}`);
      console.log(`   Active: ${acc.is_active}, Payment Method: ${acc.is_payment_method}`);
      console.log(`   Branch ID: ${acc.branch_id || 'NULL'}`);
      console.log(`   Is Shared: ${acc.is_shared}`);
      console.log(`   Created: ${acc.created_at}`);
      console.log('');
    });
    
    // Test the exact query that should be used
    console.log('🧪 Testing query with branch filtering...');
    const filteredAccounts = await sql`
      SELECT 
        id, name, type, balance, currency,
        is_active, is_payment_method,
        branch_id, is_shared
      FROM finance_accounts
      WHERE is_active = true
        AND is_payment_method = true
        AND (branch_id = ${defaultBranchId} OR is_shared = true OR branch_id IS NULL)
      ORDER BY name ASC
    `;
    
    console.log(`✅ Filtered accounts (should show in UI): ${filteredAccounts.length}`);
    filteredAccounts.forEach(acc => {
      console.log(`   - ${acc.name}: branch_id=${acc.branch_id || 'NULL'}, is_shared=${acc.is_shared}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkAccounts();
