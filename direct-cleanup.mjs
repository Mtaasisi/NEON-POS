#!/usr/bin/env node
/**
 * Direct cleanup of branch_transfers references for the problematic variants
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.VITE_DATABASE_URL ||
                    process.env.DATABASE_URL ||
                    'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const TARGET_VARIANT_IDS = [
  '2fb93225-c882-4dd1-a53a-d9892486c72d',
  '1d17c854-bb58-4975-bc7b-4def1fc3b990',
  '8918501c-78ce-46a8-8cec-12d9a08ce021'
];

console.log(`🛠️  Direct cleanup of branch_transfers references...\n`);

async function directCleanup() {
  const sql = neon(DATABASE_URL);

  try {
    console.log('📊 Checking current references...');

    // Check how many references exist
    const inClause = TARGET_VARIANT_IDS.map(id => `'${id}'`).join(',');
    const countQuery = `SELECT COUNT(*) as count FROM branch_transfers WHERE entity_id IN (${inClause})`;
    const countResult = await sql.query(countQuery);
    const totalCount = parseInt(countResult[0].count);

    console.log(`Found ${totalCount} branch transfer references for the target variants.`);

    if (totalCount === 0) {
      console.log('✅ No references found - cleanup not needed.');
      return;
    }

    // Show the references before deletion
    const selectQuery = `SELECT id, entity_id, status, quantity, notes FROM branch_transfers WHERE entity_id IN (${inClause}) ORDER BY entity_id`;
    const references = await sql.query(selectQuery);

    console.log('\n📋 References to be deleted:');
    references.forEach((ref, index) => {
      console.log(`  ${index + 1}. ID: ${ref.id}, Entity: ${ref.entity_id}, Status: ${ref.status}, Qty: ${ref.quantity}`);
    });

    // Perform deletion
    console.log('\n🗑️  Deleting references...');
    await sql.query('BEGIN');

    try {
      const deleteQuery = `DELETE FROM branch_transfers WHERE entity_id IN (${inClause})`;
      const deleteResult = await sql.query(deleteQuery);

      console.log(`✅ Deleted ${deleteResult.rowCount || deleteResult.length || 'unknown'} reference(s)`);

      // Verify deletion
      const verifyQuery = `SELECT COUNT(*) as count FROM branch_transfers WHERE entity_id IN (${inClause})`;
      const verifyResult = await sql.query(verifyQuery);
      const remainingCount = parseInt(verifyResult[0].count);

      if (remainingCount === 0) {
        console.log('✅ Verification: All references successfully removed!');
        await sql.query('COMMIT');
        console.log('✅ Transaction committed successfully!');
      } else {
        console.log(`⚠️  Warning: ${remainingCount} references still remain after deletion.`);
        await sql.query('ROLLBACK');
        console.log('❌ Transaction rolled back due to incomplete deletion.');
      }

    } catch (error) {
      await sql.query('ROLLBACK');
      console.error('❌ Error during deletion, transaction rolled back:', error);
      throw error;
    }

    console.log('\n🎉 Cleanup completed! The variants should now be deletable.');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

directCleanup();
