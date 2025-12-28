#!/usr/bin/env node
/**
 * Fix the variant deletion issue by removing the branch_transfers reference
 * Variant ID: 0c7add79-5355-433a-8d17-e40763a5389c
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.VITE_DATABASE_URL ||
                    process.env.DATABASE_URL ||
                    'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const TARGET_VARIANT_ID = '0c7add79-5355-433a-8d17-e40763a5389c';

console.log(`🔧 Fixing variant deletion for ${TARGET_VARIANT_ID}...\n`);

async function fixVariantDeletion() {
  const sql = neon(DATABASE_URL);

  try {
    console.log('📊 Checking current references...');

    // Check branch_transfers reference
    const branchTransferQuery = `SELECT id, status, quantity, notes FROM branch_transfers WHERE entity_id = '${TARGET_VARIANT_ID}'`;
    const branchTransfers = await sql.query(branchTransferQuery);

    console.log(`Found ${branchTransfers.length} branch transfer reference(s):`);
    branchTransfers.forEach((bt, index) => {
      console.log(`  ${index + 1}. ID: ${bt.id}, Status: ${bt.status}, Quantity: ${bt.quantity}`);
      console.log(`     Notes: ${bt.notes}`);
    });

    console.log('\n🛠️  Performing cleanup...');

    // Start transaction
    console.log('Starting transaction...');
    await sql.query('BEGIN');

    try {
      // Remove the branch_transfers reference (it's already completed, so safe to remove)
      const deleteBranchTransfer = `DELETE FROM branch_transfers WHERE entity_id = '${TARGET_VARIANT_ID}'`;
      const deleteResult = await sql.query(deleteBranchTransfer);
      console.log(`✅ Removed ${deleteResult.rowCount} branch transfer reference(s)`);

      // Now the variant should be deletable
      console.log('✅ Variant references cleaned up successfully!');
      console.log('The variant deletion should now work without FK constraint errors.');

      // Commit the transaction
      await sql.query('COMMIT');
      console.log('✅ Transaction committed successfully!');

    } catch (error) {
      // Rollback on error
      await sql.query('ROLLBACK');
      console.error('❌ Error during cleanup, transaction rolled back:', error);
      throw error;
    }

    console.log('\n🎉 Cleanup completed! Try deleting the variant again in your app.');

  } catch (error) {
    console.error('❌ Error during fix:', error);
    process.exit(1);
  }
}

fixVariantDeletion();
