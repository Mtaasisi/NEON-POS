import dotenv from 'dotenv';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function verifyQuery() {
  console.log('🔍 Verifying account query logic...\n');
  
  try {
    const defaultBranchId = '00000000-0000-0000-0000-000000000001';
    
    // Get branch settings
    const branch = await sql`
      SELECT data_isolation_mode, share_accounts
      FROM store_locations
      WHERE id = ${defaultBranchId}
    `;
    
    console.log('🏪 Branch Settings:');
    if (branch.length > 0) {
      console.log(`   Isolation Mode: ${branch[0].data_isolation_mode}`);
      console.log(`   Share Accounts: ${branch[0].share_accounts}`);
    } else {
      console.log('   ⚠️ Branch not found!');
    }
    
    // Test different query scenarios
    console.log('\n📊 Testing Query Scenarios:\n');
    
    // Scenario 1: No filter (shared mode)
    const allAccounts = await sql`
      SELECT id, name, branch_id, is_shared
      FROM finance_accounts
      WHERE is_active = true AND is_payment_method = true
      ORDER BY name
    `;
    console.log(`1. All accounts (no filter): ${allAccounts.length}`);
    
    // Scenario 2: Branch filter only
    const branchOnly = await sql`
      SELECT id, name, branch_id, is_shared
      FROM finance_accounts
      WHERE is_active = true 
        AND is_payment_method = true
        AND branch_id = ${defaultBranchId}
      ORDER BY name
    `;
    console.log(`2. Branch filter only: ${branchOnly.length}`);
    
    // Scenario 3: Branch OR shared (hybrid/isolated with shared accounts)
    const branchOrShared = await sql`
      SELECT id, name, branch_id, is_shared
      FROM finance_accounts
      WHERE is_active = true 
        AND is_payment_method = true
        AND (branch_id = ${defaultBranchId} OR is_shared = true OR branch_id IS NULL)
      ORDER BY name
    `;
    console.log(`3. Branch OR shared OR null: ${branchOrShared.length}`);
    branchOrShared.forEach(acc => {
      console.log(`   - ${acc.name}: branch_id=${acc.branch_id || 'NULL'}, is_shared=${acc.is_shared}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

verifyQuery();
