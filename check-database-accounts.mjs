import dotenv from 'dotenv';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use the provided connection string
const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function checkDatabase() {
  console.log('🔍 Checking database for payment accounts...\n');
  
  try {
    // 1. Check all payment accounts
    console.log('📊 1. ALL PAYMENT ACCOUNTS:');
    console.log('='.repeat(60));
    const allAccounts = await sql`
      SELECT 
        id, name, type, balance, currency,
        is_active, is_payment_method,
        branch_id, is_shared,
        created_at, updated_at
      FROM finance_accounts
      ORDER BY created_at DESC
    `;
    
    console.log(`Total accounts: ${allAccounts.length}\n`);
    allAccounts.forEach((acc, idx) => {
      console.log(`${idx + 1}. ${acc.name} (${acc.type})`);
      console.log(`   ID: ${acc.id}`);
      console.log(`   Active: ${acc.is_active}, Payment Method: ${acc.is_payment_method}`);
      console.log(`   Branch ID: ${acc.branch_id || 'NULL'}`);
      console.log(`   Is Shared: ${acc.is_shared}`);
      console.log(`   Balance: ${acc.balance} ${acc.currency}`);
      console.log(`   Created: ${acc.created_at}`);
      console.log('');
    });
    
    // 2. Check active payment methods (what should show in UI)
    console.log('\n📊 2. ACTIVE PAYMENT METHODS (should show in UI):');
    console.log('='.repeat(60));
    const activePaymentMethods = await sql`
      SELECT 
        id, name, type, branch_id, is_shared
      FROM finance_accounts
      WHERE is_active = true
        AND is_payment_method = true
      ORDER BY name
    `;
    
    console.log(`Total: ${activePaymentMethods.length}\n`);
    activePaymentMethods.forEach(acc => {
      console.log(`   - ${acc.name}: branch_id=${acc.branch_id || 'NULL'}, is_shared=${acc.is_shared}`);
    });
    
    // 3. Check branch settings
    console.log('\n📊 3. BRANCH SETTINGS:');
    console.log('='.repeat(60));
    const branches = await sql`
      SELECT 
        id, name, data_isolation_mode, share_accounts
      FROM store_locations
      ORDER BY name
    `;
    
    if (branches.length === 0) {
      console.log('⚠️  NO BRANCHES FOUND! This is the problem.');
      console.log('   Accounts need a branch to be visible.');
    } else {
      branches.forEach(branch => {
        console.log(`\n   Branch: ${branch.name}`);
        console.log(`   ID: ${branch.id}`);
        console.log(`   Isolation Mode: ${branch.data_isolation_mode || 'NOT SET'}`);
        console.log(`   Share Accounts: ${branch.share_accounts !== null ? branch.share_accounts : 'NOT SET'}`);
      });
    }
    
    // 4. Test query with branch filtering
    console.log('\n📊 4. TESTING BRANCH FILTERING:');
    console.log('='.repeat(60));
    const defaultBranchId = '00000000-0000-0000-0000-000000000001';
    
    // Scenario A: No branch selected (should show all shared accounts)
    const noBranchFilter = await sql`
      SELECT id, name, branch_id, is_shared
      FROM finance_accounts
      WHERE is_active = true AND is_payment_method = true
      ORDER BY name
    `;
    console.log(`A. No branch filter: ${noBranchFilter.length} accounts`);
    
    // Scenario B: Branch filter with shared mode
    const branchShared = await sql`
      SELECT id, name, branch_id, is_shared
      FROM finance_accounts
      WHERE is_active = true 
        AND is_payment_method = true
        AND (branch_id = ${defaultBranchId} OR is_shared = true OR branch_id IS NULL)
      ORDER BY name
    `;
    console.log(`B. Branch OR shared: ${branchShared.length} accounts`);
    
    // Scenario C: Branch filter only (isolated mode)
    const branchOnly = await sql`
      SELECT id, name, branch_id, is_shared
      FROM finance_accounts
      WHERE is_active = true 
        AND is_payment_method = true
        AND branch_id = ${defaultBranchId}
      ORDER BY name
    `;
    console.log(`C. Branch only: ${branchOnly.length} accounts`);
    
    // 5. Check for any data issues
    console.log('\n📊 5. DATA ISSUES CHECK:');
    console.log('='.repeat(60));
    
    // Check for accounts with missing required fields
    const missingFields = await sql`
      SELECT id, name
      FROM finance_accounts
      WHERE is_active = true 
        AND is_payment_method = true
        AND (name IS NULL OR name = '' OR currency IS NULL)
    `;
    if (missingFields.length > 0) {
      console.log(`⚠️  Accounts with missing fields: ${missingFields.length}`);
      missingFields.forEach(acc => console.log(`   - ${acc.name || 'NO NAME'} (ID: ${acc.id})`));
    } else {
      console.log('✅ No accounts with missing required fields');
    }
    
    // Check for duplicate names
    const duplicates = await sql`
      SELECT name, COUNT(*) as count
      FROM finance_accounts
      WHERE is_active = true AND is_payment_method = true
      GROUP BY name
      HAVING COUNT(*) > 1
    `;
    if (duplicates.length > 0) {
      console.log(`⚠️  Duplicate account names: ${duplicates.length}`);
      duplicates.forEach(dup => console.log(`   - ${dup.name}: ${dup.count} accounts`));
    } else {
      console.log('✅ No duplicate account names');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Details:', error);
  } finally {
    await sql.end();
  }
}

checkDatabase();
