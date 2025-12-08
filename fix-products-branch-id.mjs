#!/usr/bin/env node
/**
 * Fix products missing branch_id
 * Assigns branch_id to products that don't have one
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Use production Supabase connection
const supabaseUrl = 'https://jxhzveborezjhsmzsgbc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixProductsBranchId() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  🔧 FIXING PRODUCTS MISSING BRANCH_ID                 ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Get default branch (main branch or first available)
    console.log('1️⃣ Getting default branch...');
    const { data: branches, error: branchError } = await supabase
      .from('store_locations')
      .select('id, name, is_main')
      .order('is_main', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);

    if (branchError || !branches || branches.length === 0) {
      console.error('❌ Error: No branches found in store_locations');
      console.error('   Please create at least one branch first.');
      return;
    }

    const defaultBranchId = branches[0].id;
    const defaultBranchName = branches[0].name;
    console.log(`   ✅ Using branch: ${defaultBranchName} (${defaultBranchId})\n`);

    // 2. Count products without branch_id
    console.log('2️⃣ Counting products without branch_id...');
    const { count, error: countError } = await supabase
      .from('lats_products')
      .select('*', { count: 'exact', head: true })
      .is('branch_id', null);

    if (countError) {
      console.error('❌ Error counting products:', countError.message);
      return;
    }

    console.log(`   📊 Found ${count || 0} products without branch_id\n`);

    if (count === 0) {
      console.log('✅ All products already have branch_id assigned!');
      return;
    }

    // 3. Ask for confirmation
    console.log('⚠️  This will update all products without branch_id.');
    console.log(`   They will be assigned to: ${defaultBranchName}`);
    console.log(`   Total products to update: ${count}\n`);

    // For automated execution, we'll proceed
    // In interactive mode, you could add: readline.question('Continue? (y/n): ')

    // 4. Update products
    console.log('3️⃣ Updating products...');
    const { data: updated, error: updateError } = await supabase
      .from('lats_products')
      .update({ branch_id: defaultBranchId })
      .is('branch_id', null)
      .select('id, name');

    if (updateError) {
      console.error('❌ Error updating products:', updateError.message);
      console.error('   Details:', JSON.stringify(updateError, null, 2));
      return;
    }

    console.log(`   ✅ Updated ${updated?.length || 0} products\n`);

    // 5. Verify the fix
    console.log('4️⃣ Verifying the fix...');
    const { count: remaining, error: verifyError } = await supabase
      .from('lats_products')
      .select('*', { count: 'exact', head: true })
      .is('branch_id', null);

    if (verifyError) {
      console.error('❌ Error verifying:', verifyError.message);
    } else {
      if (remaining === 0) {
        console.log('   ✅ All products now have branch_id assigned!');
      } else {
        console.log(`   ⚠️  ${remaining} products still missing branch_id`);
      }
    }

    // 6. Show sample updated products
    if (updated && updated.length > 0) {
      console.log('\n5️⃣ Sample updated products:');
      updated.slice(0, 10).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} (now has branch_id: ${defaultBranchId})`);
      });
      if (updated.length > 10) {
        console.log(`   ... and ${updated.length - 10} more`);
      }
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  ✅ FIX COMPLETE                                      ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    console.log(`Products updated: ${updated?.length || 0}`);
    console.log(`Assigned to branch: ${defaultBranchName} (${defaultBranchId})`);
    console.log(`Products still missing branch_id: ${remaining || 0}\n`);

  } catch (error) {
    console.error('\n❌ Error fixing products:', error);
    process.exit(1);
  }
}

fixProductsBranchId().catch(console.error);

