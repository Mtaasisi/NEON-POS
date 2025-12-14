#!/usr/bin/env node
/**
 * Fix customers missing branch_id in batches
 * Processes in smaller chunks to avoid timeouts
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Use production Supabase connection
const supabaseUrl = 'https://jxhzveborezjhsmzsgbc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

const supabase = createClient(supabaseUrl, supabaseKey);

const BATCH_SIZE = 500; // Process 500 customers at a time (smaller to avoid timeouts)

async function fixCustomersBranchIdBatch() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  🔧 FIXING CUSTOMERS BRANCH_ID (BATCH MODE)           ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Get default branch
    console.log('1️⃣ Getting default branch...');
    const { data: branches, error: branchError } = await supabase
      .from('store_locations')
      .select('id, name, is_main')
      .order('is_main', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);

    if (branchError || !branches || branches.length === 0) {
      console.error('❌ Error: No branches found');
      return;
    }

    const defaultBranchId = branches[0].id;
    const defaultBranchName = branches[0].name;
    console.log(`   ✅ Using branch: ${defaultBranchName} (${defaultBranchId})\n`);

    // Count customers without branch_id
    console.log('2️⃣ Counting customers without branch_id...');
    const { count, error: countError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .is('branch_id', null);

    if (countError) {
      console.error('❌ Error counting customers:', countError.message);
      return;
    }

    const totalCustomers = count || 0;
    console.log(`   📊 Found ${totalCustomers} customers without branch_id\n`);

    if (totalCustomers === 0) {
      console.log('✅ All customers already have branch_id!');
      return;
    }

    // Calculate batches
    const totalBatches = Math.ceil(totalCustomers / BATCH_SIZE);
    console.log(`3️⃣ Processing in ${totalBatches} batches of ${BATCH_SIZE} customers each...\n`);

    let totalFixed = 0;
    let batchNumber = 0;

    // Process in batches
    while (true) {
      batchNumber++;
      console.log(`   Processing batch ${batchNumber}/${totalBatches}...`);

      // Get a batch of customer IDs without branch_id
      const { data: customers, error: fetchError } = await supabase
        .from('customers')
        .select('id')
        .is('branch_id', null)
        .limit(BATCH_SIZE);

      if (fetchError) {
        console.error(`   ❌ Error fetching batch ${batchNumber}:`, fetchError.message);
        break;
      }

      if (!customers || customers.length === 0) {
        console.log(`   ✅ No more customers to process\n`);
        break;
      }

      const customerIds = customers.map(c => c.id);
      console.log(`      Found ${customerIds.length} customers in this batch`);

      // Update customers one by one to avoid query size limits
      let fixedInBatch = 0;
      for (const customerId of customerIds) {
        const { error: updateError } = await supabase
          .from('customers')
          .update({ branch_id: defaultBranchId })
          .eq('id', customerId);

        if (!updateError) {
          fixedInBatch++;
        } else if (updateError.code !== 'PGRST116') {
          // PGRST116 is "not found" which is fine
          console.warn(`      ⚠️  Error updating customer ${customerId}: ${updateError.message}`);
        }
      }

      totalFixed += fixedInBatch;
      console.log(`      ✅ Fixed ${fixedInBatch} customers (Total: ${totalFixed}/${totalCustomers})`);

      // Small delay to avoid overwhelming the database
      if (batchNumber < totalBatches) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Verify
    console.log('\n4️⃣ Verifying the fix...');
    const { count: remaining, error: verifyError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .is('branch_id', null);

    if (verifyError) {
      console.error('   ⚠️  Error verifying:', verifyError.message);
    } else {
      if (remaining === 0) {
        console.log('   ✅ All customers now have branch_id!');
      } else {
        console.log(`   ⚠️  ${remaining} customers still missing branch_id`);
      }
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  ✅ FIX COMPLETE                                      ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    console.log(`Total customers processed: ${totalFixed}`);
    console.log(`Assigned to branch: ${defaultBranchName} (${defaultBranchId})`);
    console.log(`Customers still missing branch_id: ${remaining || 0}\n`);

  } catch (error) {
    console.error('\n❌ Error fixing customers:', error);
    process.exit(1);
  }
}

fixCustomersBranchIdBatch().catch(console.error);

