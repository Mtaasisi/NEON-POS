import dotenv from 'dotenv';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function checkAccounts() {
  console.log('🔍 Checking payment accounts...\n');
  
  try {
    // Get all accounts
    const allAccounts = await sql`
      SELECT 
        id, 
        name, 
        type, 
        balance, 
        currency,
        is_active,
        is_payment_method,
        branch_id,
        is_shared,
        created_at
      FROM finance_accounts
      ORDER BY created_at DESC
    `;
    
    console.log(`📊 Total accounts in database: ${allAccounts.length}\n`);
    
    if (allAccounts.length === 0) {
      console.log('⚠️  No accounts found in database!');
      return;
    }
    
    allAccounts.forEach((acc, idx) => {
      console.log(`${idx + 1}. ${acc.name} (${acc.type})`);
      console.log(`   ID: ${acc.id}`);
      console.log(`   Active: ${acc.is_active}, Payment Method: ${acc.is_payment_method}`);
      console.log(`   Branch ID: ${acc.branch_id || 'NULL (shared)'}`);
      console.log(`   Is Shared: ${acc.is_shared}`);
      console.log(`   Balance: ${acc.balance} ${acc.currency}`);
      console.log(`   Created: ${acc.created_at}`);
      console.log('');
    });
    
    // Check branch settings
    const currentBranchId = '00000000-0000-0000-0000-000000000001';
    const branchSettings = await sql`
      SELECT 
        data_isolation_mode,
        share_accounts
      FROM store_locations
      WHERE id = ${currentBranchId}
    `;
    
    if (branchSettings.length > 0) {
      console.log('🏪 Branch Settings:');
      console.log(`   Isolation Mode: ${branchSettings[0].data_isolation_mode}`);
      console.log(`   Share Accounts: ${branchSettings[0].share_accounts}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkAccounts();
