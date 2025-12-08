#!/usr/bin/env node

/**
 * Test if payment accounts are properly fetching branch_id
 * This simulates the actual queries used in the application
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.production') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Supabase credentials not found');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testPaymentAccountsBranchFetch() {
  console.log('🔍 Testing payment accounts branch_id fetch...\n');

  try {
    // Test 1: Query with explicit branch_id in select (like financeAccountService)
    console.log('📋 Test 1: Explicit select with branch_id');
    const { data: explicitSelect, error: error1 } = await supabase
      .from('finance_accounts')
      .select('id, name, type, balance, currency, is_active, is_payment_method, branch_id, is_shared')
      .eq('is_active', true)
      .eq('is_payment_method', true)
      .limit(5);

    if (error1) {
      console.error('❌ Error:', error1);
    } else {
      console.log(`✅ Fetched ${explicitSelect?.length || 0} accounts`);
      explicitSelect?.forEach(acc => {
        console.log(`   - ${acc.name}: branch_id=${acc.branch_id || 'NULL'}, is_shared=${acc.is_shared}`);
      });
    }

    console.log('\n📋 Test 2: Select * (like PaymentTrackingDashboard)');
    const { data: selectAll, error: error2 } = await supabase
      .from('finance_accounts')
      .select('*')
      .eq('is_active', true)
      .eq('is_payment_method', true)
      .limit(5);

    if (error2) {
      console.error('❌ Error:', error2);
    } else {
      console.log(`✅ Fetched ${selectAll?.length || 0} accounts`);
      selectAll?.forEach(acc => {
        const hasBranchId = 'branch_id' in acc;
        console.log(`   - ${acc.name}: branch_id=${hasBranchId ? (acc.branch_id || 'NULL') : 'MISSING'}, is_shared=${acc.is_shared || false}`);
      });
    }

    console.log('\n📋 Test 3: Check if branch_id is in all results');
    const { data: allAccounts, error: error3 } = await supabase
      .from('finance_accounts')
      .select('id, name, branch_id, is_shared, is_payment_method')
      .eq('is_payment_method', true)
      .eq('is_active', true);

    if (error3) {
      console.error('❌ Error:', error3);
    } else {
      const accountsWithBranchId = allAccounts?.filter(acc => acc.branch_id !== null && acc.branch_id !== undefined).length || 0;
      const sharedAccounts = allAccounts?.filter(acc => acc.is_shared === true).length || 0;
      const isolatedAccounts = allAccounts?.filter(acc => acc.is_shared === false).length || 0;
      const isolatedWithBranchId = allAccounts?.filter(acc => acc.is_shared === false && acc.branch_id).length || 0;

      console.log(`✅ Total payment accounts: ${allAccounts?.length || 0}`);
      console.log(`   - Shared accounts: ${sharedAccounts} (branch_id can be NULL)`);
      console.log(`   - Isolated accounts: ${isolatedAccounts}`);
      console.log(`   - Isolated with branch_id: ${isolatedWithBranchId}`);
      console.log(`   - Isolated missing branch_id: ${isolatedAccounts - isolatedWithBranchId}`);

      if (isolatedAccounts > 0 && isolatedWithBranchId < isolatedAccounts) {
        console.log('\n⚠️  WARNING: Some isolated accounts are missing branch_id!');
        allAccounts?.filter(acc => acc.is_shared === false && !acc.branch_id).forEach(acc => {
          console.log(`   ❌ ${acc.name} (ID: ${acc.id}) is isolated but has no branch_id`);
        });
      } else {
        console.log('\n✅ All isolated accounts have branch_id assigned!');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the test
testPaymentAccountsBranchFetch().catch(console.error);
