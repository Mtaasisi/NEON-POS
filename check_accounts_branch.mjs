#!/usr/bin/env node

/**
 * Check Accounts Branch Status
 *
 * This script checks the branch isolation status of payment accounts.
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Get environment variables
const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ Missing database URL environment variables');
  console.error('Please set VITE_DATABASE_URL or DATABASE_URL in your .env file');
  process.exit(1);
}

// Create Neon SQL client
const sql = neon(databaseUrl);

async function checkBranchStatus() {
  console.log('🏪 Checking accounts branch isolation status...');

  try {
    // Check all finance accounts with branch info
    const accountsWithBranch = await sql`
      SELECT id, name, type, is_active, is_payment_method, balance, currency, branch_id, is_shared
      FROM finance_accounts
      ORDER BY name
    `;

    console.log(`\n📊 Finance accounts with branch info (${accountsWithBranch.length}):`);
    accountsWithBranch.forEach(account => {
      const branchInfo = account.branch_id
        ? `Branch: ${account.branch_id}${account.is_shared ? ' (shared)' : ''}`
        : 'Branch: null (global)';
      console.log(`   - ${account.name} (${account.type}) - ${branchInfo} - Active: ${account.is_active}, Payment Method: ${account.is_payment_method}`);
    });

    // Check if there's a current_branch_id setting
    const currentBranchSetting = await sql`
      SELECT value FROM settings WHERE key = 'current_branch_id' LIMIT 1
    `;

    let currentBranchId = null;
    if (currentBranchSetting.length > 0) {
      currentBranchId = currentBranchSetting[0].value;
      console.log(`\n🎯 Current branch setting: ${currentBranchId}`);
    } else {
      console.log('\n⚠️ No current branch setting found');
    }

    // Analyze which accounts are visible for the current branch
    console.log(`\n🔍 Account visibility analysis for current branch (${currentBranchId || 'none'}):`);

    const visibleAccounts = accountsWithBranch.filter(account => {
      // Global accounts (no branch_id) are always visible
      if (!account.branch_id) return true;

      // Shared accounts are visible in any branch
      if (account.is_shared) return true;

      // Branch-specific accounts are only visible in their branch
      return account.branch_id === currentBranchId;
    });

    console.log(`   ✅ Visible accounts: ${visibleAccounts.length}/${accountsWithBranch.length}`);
    if (visibleAccounts.length > 0) {
      visibleAccounts.forEach(account => {
        const reason = !account.branch_id ? 'global' :
                      account.is_shared ? 'shared' : 'branch match';
        console.log(`      - ${account.name} (${account.type}) - ${reason}`);
      });
    } else {
      console.log('      ❌ No accounts visible for current branch!');
      console.log('      💡 Possible solutions:');
      console.log('         1. Set a current branch that matches account branches');
      console.log('         2. Make some accounts global (set branch_id to null)');
      console.log('         3. Make some accounts shared (set is_shared to true)');
      console.log('         4. Create new accounts for the current branch');
    }

    // Check which accounts would be visible for different branches
    if (branches.length > 0) {
      console.log('\n🔍 Branch visibility analysis:');
      branches.forEach(branch => {
        const visibleAccounts = accountsWithBranch.filter(account =>
          !account.branch_id || // global accounts
          account.branch_id === branch.id || // branch-specific accounts
          account.is_shared // shared accounts
        );

        console.log(`   Branch "${branch.name}" (${branch.id}): ${visibleAccounts.length} visible accounts`);
        if (visibleAccounts.length > 0) {
          visibleAccounts.forEach(account => {
            console.log(`      - ${account.name} (${account.type})`);
          });
        }
      });
    }

  } catch (error) {
    console.error('❌ Error checking branch status:', error.message || error);
  }
}

// Run the script
checkBranchStatus().catch(console.error);
