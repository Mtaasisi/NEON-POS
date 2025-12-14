#!/usr/bin/env node

/**
 * Fix installments missing branch_id
 * This script updates existing installment plans to have the correct branch_id
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixInstallmentsBranch() {
  console.log('🔧 Starting installments branch_id fix...\n');

  try {
    // Step 1: Check how many installments need fixing
    console.log('📊 Step 1: Checking installments without branch_id...');
    const { data: withoutBranch, error: checkError } = await supabase
      .from('customer_installment_plans')
      .select('id, plan_number, customer_id')
      .is('branch_id', null);

    if (checkError) {
      throw checkError;
    }

    if (!withoutBranch || withoutBranch.length === 0) {
      console.log('✅ All installments already have branch_id set!');
      console.log('✅ No fix needed.\n');
      return;
    }

    console.log(`⚠️  Found ${withoutBranch.length} installment(s) without branch_id:\n`);
    withoutBranch.forEach(plan => {
      console.log(`   - ${plan.plan_number} (ID: ${plan.id})`);
    });
    console.log('');

    // Step 2: Get the default branch (first branch in the system)
    console.log('📊 Step 2: Finding default branch...');
    const { data: branches, error: branchError } = await supabase
      .from('branches')
      .select('id, name')
      .order('created_at', { ascending: true })
      .limit(1);

    if (branchError) {
      throw branchError;
    }

    if (!branches || branches.length === 0) {
      console.error('❌ No branches found in the database!');
      console.error('   Please create a branch first.');
      process.exit(1);
    }

    const defaultBranch = branches[0];
    console.log(`✅ Default branch: ${defaultBranch.name} (ID: ${defaultBranch.id})\n`);

    // Step 3: Update installments
    console.log('🔄 Step 3: Updating installments...');
    const { data: updated, error: updateError } = await supabase
      .from('customer_installment_plans')
      .update({ branch_id: defaultBranch.id })
      .is('branch_id', null)
      .select('id, plan_number');

    if (updateError) {
      throw updateError;
    }

    console.log(`✅ Updated ${updated?.length || 0} installment(s):\n`);
    updated?.forEach(plan => {
      console.log(`   ✓ ${plan.plan_number}`);
    });
    console.log('');

    // Step 4: Verify the fix
    console.log('✅ Step 4: Verifying fix...');
    const { data: remaining, error: verifyError } = await supabase
      .from('customer_installment_plans')
      .select('id')
      .is('branch_id', null);

    if (verifyError) {
      throw verifyError;
    }

    if (!remaining || remaining.length === 0) {
      console.log('✅ All installments now have branch_id set!\n');
    } else {
      console.log(`⚠️  ${remaining.length} installment(s) still missing branch_id.\n`);
    }

    // Step 5: Show summary
    console.log('📊 Final Summary:');
    const { data: allPlans, error: summaryError } = await supabase
      .from('customer_installment_plans')
      .select('branch_id, status');

    if (!summaryError && allPlans) {
      const byBranch = allPlans.reduce((acc, plan) => {
        const branchId = plan.branch_id || 'null';
        if (!acc[branchId]) {
          acc[branchId] = { total: 0, active: 0 };
        }
        acc[branchId].total++;
        if (plan.status === 'active') {
          acc[branchId].active++;
        }
        return acc;
      }, {});

      console.log('');
      Object.entries(byBranch).forEach(([branchId, stats]) => {
        console.log(`   Branch ${branchId}: ${stats.total} total, ${stats.active} active`);
      });
    }

    console.log('\n✅ Fix completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Error during fix:', error.message);
    if (error.details) {
      console.error('   Details:', error.details);
    }
    process.exit(1);
  }
}

// Run the fix
fixInstallmentsBranch();

