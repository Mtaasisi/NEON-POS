#!/usr/bin/env node

/**
 * Check if existing accounts are properly isolated per branch
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

async function checkAccountsIsolation() {
  console.log('🔍 Checking accounts branch isolation...\n');

  try {
    // Get all accounts
    const { data: accounts, error } = await supabase
      .from('finance_accounts')
      .select('id, name, type, branch_id, is_shared, is_payment_method, is_active, balance, currency')
      .order('is_shared', { ascending: false })
      .order('branch_id')
      .order('name');

    if (error) {
      console.error('❌ Error fetching accounts:', error);
      return;
    }

    if (!accounts || accounts.length === 0) {
      console.log('⚠️  No accounts found');
      return;
    }

    // Get branch names
    const branchIds = [...new Set(accounts.map(a => a.branch_id).filter(Boolean))];
    const { data: branches } = await supabase
      .from('store_locations')
      .select('id, name')
      .in('id', branchIds);

    const branchMap = new Map(branches?.map(b => [b.id, b.name]) || []);

    // Analyze accounts
    const sharedAccounts = accounts.filter(a => a.is_shared === true);
    const isolatedAccounts = accounts.filter(a => a.is_shared === false);
    const isolatedWithBranchId = isolatedAccounts.filter(a => a.branch_id);
    const isolatedWithoutBranchId = isolatedAccounts.filter(a => !a.branch_id);
    const sharedWithBranchId = sharedAccounts.filter(a => a.branch_id);

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 ACCOUNTS ISOLATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`Total Accounts: ${accounts.length}`);
    console.log(`  - Shared Accounts: ${sharedAccounts.length}`);
    console.log(`  - Isolated Accounts: ${isolatedAccounts.length}\n`);

    // Check for issues
    const issues = [];
    if (isolatedWithoutBranchId.length > 0) {
      issues.push(`❌ ${isolatedWithoutBranchId.length} isolated accounts missing branch_id`);
    }
    if (sharedWithBranchId.length > 0) {
      issues.push(`⚠️  ${sharedWithBranchId.length} shared accounts have branch_id (should be NULL)`);
    }

    if (issues.length > 0) {
      console.log('🚨 ISSUES FOUND:\n');
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log('');
    } else {
      console.log('✅ All accounts are properly configured!\n');
    }

    // Accounts by branch
    console.log('═══════════════════════════════════════════════════════');
    console.log('📍 ACCOUNTS BY BRANCH');
    console.log('═══════════════════════════════════════════════════════\n');

    // Group by branch
    const accountsByBranch = new Map();
    accounts.forEach(account => {
      const branchKey = account.branch_id || 'SHARED';
      if (!accountsByBranch.has(branchKey)) {
        accountsByBranch.set(branchKey, []);
      }
      accountsByBranch.get(branchKey).push(account);
    });

    // Show shared accounts first
    if (accountsByBranch.has('SHARED')) {
      const shared = accountsByBranch.get('SHARED');
      console.log(`📦 SHARED ACCOUNTS (${shared.length}):`);
      shared.forEach(acc => {
        const status = acc.branch_id ? '⚠️  Has branch_id' : '✅ Correct';
        console.log(`   ${status} - ${acc.name} (${acc.type}) - ${acc.currency} ${acc.balance || 0}`);
      });
      console.log('');
    }

    // Show isolated accounts by branch
    const branchEntries = Array.from(accountsByBranch.entries())
      .filter(([key]) => key !== 'SHARED')
      .sort();

    branchEntries.forEach(([branchId, branchAccounts]) => {
      const branchName = branchMap.get(branchId) || 'Unknown Branch';
      console.log(`🏪 ${branchName} (${branchId}):`);
      branchAccounts.forEach(acc => {
        const status = acc.branch_id ? '✅ Isolated' : '❌ Missing branch_id';
        const paymentMethod = acc.is_payment_method ? ' [Payment Method]' : '';
        console.log(`   ${status} - ${acc.name} (${acc.type}) - ${acc.currency} ${acc.balance || 0}${paymentMethod}`);
      });
      console.log('');
    });

    // Payment methods summary
    const paymentMethods = accounts.filter(a => a.is_payment_method && a.is_active);
    console.log('═══════════════════════════════════════════════════════');
    console.log('💳 PAYMENT METHODS SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`Total Payment Methods: ${paymentMethods.length}`);
    const sharedPaymentMethods = paymentMethods.filter(a => a.is_shared);
    const isolatedPaymentMethods = paymentMethods.filter(a => !a.is_shared && a.branch_id);
    const isolatedPaymentMethodsMissing = paymentMethods.filter(a => !a.is_shared && !a.branch_id);

    console.log(`  - Shared: ${sharedPaymentMethods.length}`);
    console.log(`  - Isolated (with branch_id): ${isolatedPaymentMethods.length}`);
    if (isolatedPaymentMethodsMissing.length > 0) {
      console.log(`  - Isolated (missing branch_id): ${isolatedPaymentMethodsMissing.length} ❌`);
    }

    // Detailed payment methods
    if (paymentMethods.length > 0) {
      console.log('\nPayment Methods Details:');
      paymentMethods.forEach(pm => {
        const branchName = pm.branch_id ? branchMap.get(pm.branch_id) || 'Unknown' : 'SHARED';
        const status = pm.is_shared 
          ? (pm.branch_id ? '⚠️  Shared but has branch_id' : '✅ Shared')
          : (pm.branch_id ? '✅ Isolated' : '❌ Missing branch_id');
        console.log(`   ${status} - ${pm.name} (${branchName})`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the check
checkAccountsIsolation().catch(console.error);
