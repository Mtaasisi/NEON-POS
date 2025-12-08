#!/usr/bin/env node
/**
 * Merge duplicate branches and delete Main Branch
 * - Merges duplicate DAR branches into the one with products
 * - Updates all references from Main Branch to DAR
 * - Deletes duplicate and Main Branch
 */

import pg from 'pg';
const { Client } = pg;

// Get connection string from command line or use provided one
const connectionString = process.argv[2] || 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = new Client({ 
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

// Branch IDs
const KEEP_DAR_BRANCH_ID = '24cd45b8-1ce1-486a-b055-29d169c3a8ea'; // DAR with all products
const DELETE_DAR_BRANCH_ID = '85629690-6b1b-4d17-943d-dcf0f9aa9e95'; // Duplicate DAR
const DELETE_MAIN_BRANCH_ID = '00000000-0000-0000-0000-000000000001'; // Main Branch

async function mergeAndDeleteBranches() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  🔄 MERGING BRANCHES & DELETING MAIN BRANCH          ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Connect to database
    console.log('📊 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Start transaction
    await client.query('BEGIN');

    // Step 1: Find all tables with branch_id columns
    console.log('1️⃣ Finding all tables with branch_id columns...');
    const tablesResult = await client.query(`
      SELECT 
        table_name,
        column_name
      FROM information_schema.columns
      WHERE column_name = 'branch_id'
        AND table_schema = 'public'
      ORDER BY table_name
    `);

    const tablesWithBranchId = tablesResult.rows.map(row => row.table_name);
    console.log(`   ✅ Found ${tablesWithBranchId.length} tables with branch_id:`);
    tablesWithBranchId.forEach((table, i) => {
      console.log(`      ${i + 1}. ${table}`);
    });
    console.log('');

    // Step 2: Update references from duplicate DAR branch to main DAR branch
    console.log('2️⃣ Updating references from duplicate DAR branch...');
    let updatedDuplicateCount = 0;
    
    for (const table of tablesWithBranchId) {
      try {
        // Check if table exists and has data
        const checkResult = await client.query(`
          SELECT COUNT(*) as count 
          FROM ${table} 
          WHERE branch_id = $1
        `, [DELETE_DAR_BRANCH_ID]);
        
        const count = parseInt(checkResult.rows[0].count);
        
        if (count > 0) {
          const updateResult = await client.query(`
            UPDATE ${table}
            SET branch_id = $1
            WHERE branch_id = $2
          `, [KEEP_DAR_BRANCH_ID, DELETE_DAR_BRANCH_ID]);
          
          console.log(`   ✅ Updated ${updateResult.rowCount} rows in ${table}`);
          updatedDuplicateCount += updateResult.rowCount;
        }
      } catch (error) {
        // Some tables might not exist or have constraints, skip them
        console.log(`   ⚠️  Skipped ${table}: ${error.message}`);
      }
    }
    
    console.log(`   ✅ Total rows updated from duplicate DAR: ${updatedDuplicateCount}\n`);

    // Step 3: Update references from Main Branch to DAR branch
    console.log('3️⃣ Updating references from Main Branch to DAR...');
    let updatedMainCount = 0;
    
    for (const table of tablesWithBranchId) {
      try {
        // Check if table exists and has data
        const checkResult = await client.query(`
          SELECT COUNT(*) as count 
          FROM ${table} 
          WHERE branch_id = $1
        `, [DELETE_MAIN_BRANCH_ID]);
        
        const count = parseInt(checkResult.rows[0].count);
        
        if (count > 0) {
          const updateResult = await client.query(`
            UPDATE ${table}
            SET branch_id = $1
            WHERE branch_id = $2
          `, [KEEP_DAR_BRANCH_ID, DELETE_MAIN_BRANCH_ID]);
          
          console.log(`   ✅ Updated ${updateResult.rowCount} rows in ${table}`);
          updatedMainCount += updateResult.rowCount;
        }
      } catch (error) {
        // Some tables might not exist or have constraints, skip them
        console.log(`   ⚠️  Skipped ${table}: ${error.message}`);
      }
    }
    
    console.log(`   ✅ Total rows updated from Main Branch: ${updatedMainCount}\n`);

    // Step 4: Check for any remaining references before deletion
    console.log('4️⃣ Checking for remaining references...');
    
    let remainingRefs = [];
    for (const table of tablesWithBranchId) {
      try {
        const checkDuplicate = await client.query(`
          SELECT COUNT(*) as count 
          FROM ${table} 
          WHERE branch_id IN ($1, $2)
        `, [DELETE_DAR_BRANCH_ID, DELETE_MAIN_BRANCH_ID]);
        
        const count = parseInt(checkDuplicate.rows[0].count);
        if (count > 0) {
          remainingRefs.push({ table, count });
        }
      } catch (error) {
        // Skip if table doesn't exist
      }
    }
    
    if (remainingRefs.length > 0) {
      console.log('   ⚠️  Remaining references found:');
      remainingRefs.forEach(({ table, count }) => {
        console.log(`      ${table}: ${count} rows`);
      });
      console.log('   ⚠️  These will be handled by CASCADE or need manual review\n');
    } else {
      console.log('   ✅ No remaining references found\n');
    }

    // Step 5: Delete duplicate DAR branch
    console.log('5️⃣ Deleting duplicate DAR branch...');
    try {
      const deleteDuplicateResult = await client.query(`
        DELETE FROM lats_branches
        WHERE id = $1
      `, [DELETE_DAR_BRANCH_ID]);
      
      console.log(`   ✅ Deleted duplicate DAR branch (${DELETE_DAR_BRANCH_ID})`);
    } catch (error) {
      console.log(`   ❌ Error deleting duplicate DAR branch: ${error.message}`);
      console.log(`   ⚠️  This might be due to foreign key constraints. You may need to handle this manually.`);
    }
    console.log('');

    // Step 6: Delete Main Branch
    console.log('6️⃣ Deleting Main Branch...');
    try {
      const deleteMainResult = await client.query(`
        DELETE FROM lats_branches
        WHERE id = $1
      `, [DELETE_MAIN_BRANCH_ID]);
      
      console.log(`   ✅ Deleted Main Branch (${DELETE_MAIN_BRANCH_ID})`);
    } catch (error) {
      console.log(`   ❌ Error deleting Main Branch: ${error.message}`);
      console.log(`   ⚠️  This might be due to foreign key constraints. You may need to handle this manually.`);
    }
    console.log('');

    // Step 7: Verify remaining branches
    console.log('7️⃣ Verifying remaining branches...');
    const remainingBranches = await client.query(`
      SELECT id, name, location, is_active
      FROM lats_branches
      ORDER BY created_at DESC
    `);
    
    console.log(`   ✅ Remaining branches: ${remainingBranches.rows.length}`);
    remainingBranches.rows.forEach((branch, i) => {
      console.log(`      ${i + 1}. ${branch.name} (${branch.id})`);
      console.log(`         Location: ${branch.location || 'N/A'}`);
      console.log(`         Active: ${branch.is_active ? 'Yes' : 'No'}`);
    });
    console.log('');

    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Transaction committed successfully!\n');

    // Final summary
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  📊 SUMMARY                                            ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`Tables checked: ${tablesWithBranchId.length}`);
    console.log(`Rows updated from duplicate DAR: ${updatedDuplicateCount}`);
    console.log(`Rows updated from Main Branch: ${updatedMainCount}`);
    console.log(`Remaining branches: ${remainingBranches.rows.length}`);
    console.log('╚════════════════════════════════════════════════════════╝\n');

    await client.end();
    console.log('✅ Merge and delete complete!');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK').catch(() => {});
    console.error('\n❌ Error:', error.message);
    console.error('\nTransaction rolled back. No changes were made.');
    console.error('\nPlease check:');
    console.error('  1. Database connection is correct');
    console.error('  2. You have proper permissions');
    console.error('  3. No critical foreign key constraints are blocking deletion');
    await client.end().catch(() => {});
    process.exit(1);
  }
}

mergeAndDeleteBranches().catch(error => {
  console.error('❌ Fatal Error:', error);
  process.exit(1);
});
