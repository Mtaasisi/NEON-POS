#!/usr/bin/env node
/**
 * Fix ALL data to have branch_id
 * Checks and fixes all tables that should have branch_id
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Use production Supabase connection
const supabaseUrl = 'https://jxhzveborezjhsmzsgbc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

const supabase = createClient(supabaseUrl, supabaseKey);

// Tables that should have branch_id
const TABLES_TO_CHECK = [
  'lats_products',
  'customers',
  'transactions',
  'product_variants',
  'inventory_items',
  'purchase_orders',
  'sales',
  'returns',
  'stock_transfers',
  'stock_adjustments',
  'suppliers',
  'categories',
  'lats_categories',
  'lats_brands',
  'devices',
  'whatsapp_logs',
  'customer_communications',
  'loyalty_transactions',
  'invoices',
  'payments',
  'expenses',
  'reports'
];

async function getDefaultBranch() {
  const { data: branches, error } = await supabase
    .from('store_locations')
    .select('id, name, is_main')
    .order('is_main', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1);

  if (error || !branches || branches.length === 0) {
    throw new Error('No branches found in store_locations');
  }

  return branches[0];
}

async function checkTableExists(tableName) {
  // Try to query the table with a simple select
  const { error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);

  return !error;
}

async function checkTableHasBranchId(tableName) {
  // Try to select branch_id column
  const { error } = await supabase
    .from(tableName)
    .select('branch_id')
    .limit(1);

  return !error;
}

async function countWithoutBranchId(tableName) {
  const { count, error } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true })
    .is('branch_id', null);

  if (error) {
    // Table might not have branch_id column
    return { count: null, error: error.message };
  }

  return { count: count || 0, error: null };
}

async function fixTableBranchId(tableName, defaultBranchId) {
  const { data, error } = await supabase
    .from(tableName)
    .update({ branch_id: defaultBranchId })
    .is('branch_id', null)
    .select('id');

  if (error) {
    return { updated: 0, error: error.message };
  }

  return { updated: data?.length || 0, error: null };
}

async function fixAllBranchIds() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  🔧 FIXING ALL DATA TO HAVE BRANCH_ID                 ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Get default branch
    console.log('1️⃣ Getting default branch...');
    const defaultBranch = await getDefaultBranch();
    console.log(`   ✅ Using branch: ${defaultBranch.name} (${defaultBranch.id})\n`);

    const results = [];
    let totalFixed = 0;
    let totalChecked = 0;

    // Check each table
    console.log('2️⃣ Checking all tables...\n');
    
    for (const tableName of TABLES_TO_CHECK) {
      totalChecked++;
      console.log(`   Checking: ${tableName}...`);

      // Check if table exists
      const exists = await checkTableExists(tableName);
      if (!exists) {
        console.log(`      ⏭️  Table doesn't exist, skipping\n`);
        results.push({ table: tableName, status: 'not_exists', count: 0 });
        continue;
      }

      // Check if table has branch_id column
      const hasBranchId = await checkTableHasBranchId(tableName);
      if (!hasBranchId) {
        console.log(`      ⏭️  Table doesn't have branch_id column, skipping\n`);
        results.push({ table: tableName, status: 'no_branch_id_column', count: 0 });
        continue;
      }

      // Count records without branch_id
      const { count, error: countError } = await countWithoutBranchId(tableName);
      
      if (countError) {
        console.log(`      ⚠️  Error checking: ${countError}\n`);
        results.push({ table: tableName, status: 'error', count: 0, error: countError });
        continue;
      }

      if (count === 0) {
        console.log(`      ✅ All records already have branch_id\n`);
        results.push({ table: tableName, status: 'ok', count: 0 });
        continue;
      }

      console.log(`      ⚠️  Found ${count} records without branch_id`);
      
      // Fix the records
      const { updated, error: updateError } = await fixTableBranchId(tableName, defaultBranch.id);
      
      if (updateError) {
        console.log(`      ❌ Error fixing: ${updateError}\n`);
        results.push({ table: tableName, status: 'fix_error', count: count, error: updateError });
        continue;
      }

      console.log(`      ✅ Fixed ${updated} records\n`);
      totalFixed += updated;
      results.push({ table: tableName, status: 'fixed', count: updated });
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  📊 SUMMARY                                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const fixedTables = results.filter(r => r.status === 'fixed');
    const okTables = results.filter(r => r.status === 'ok');
    const errorTables = results.filter(r => r.status === 'error' || r.status === 'fix_error');
    const skippedTables = results.filter(r => r.status === 'not_exists' || r.status === 'no_branch_id_column');

    console.log(`Tables checked: ${totalChecked}`);
    console.log(`Tables fixed: ${fixedTables.length}`);
    console.log(`Tables already OK: ${okTables.length}`);
    console.log(`Tables with errors: ${errorTables.length}`);
    console.log(`Tables skipped: ${skippedTables.length}`);
    console.log(`Total records fixed: ${totalFixed}\n`);

    if (fixedTables.length > 0) {
      console.log('✅ Fixed tables:');
      fixedTables.forEach(r => {
        console.log(`   - ${r.table}: ${r.count} records`);
      });
      console.log('');
    }

    if (okTables.length > 0) {
      console.log('✅ Tables already OK:');
      okTables.forEach(r => {
        console.log(`   - ${r.table}`);
      });
      console.log('');
    }

    if (errorTables.length > 0) {
      console.log('⚠️  Tables with errors:');
      errorTables.forEach(r => {
        console.log(`   - ${r.table}: ${r.error || 'Unknown error'}`);
      });
      console.log('');
    }

    if (skippedTables.length > 0) {
      console.log('⏭️  Skipped tables:');
      skippedTables.forEach(r => {
        const reason = r.status === 'not_exists' ? 'Table does not exist' : 'No branch_id column';
        console.log(`   - ${r.table}: ${reason}`);
      });
      console.log('');
    }

    console.log('✅ Fix complete!\n');

  } catch (error) {
    console.error('\n❌ Error fixing branch_ids:', error);
    process.exit(1);
  }
}

fixAllBranchIds().catch(console.error);

