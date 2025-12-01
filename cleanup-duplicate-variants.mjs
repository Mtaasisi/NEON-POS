#!/usr/bin/env node
/**
 * Cleanup Duplicate Variants
 * 
 * This script removes duplicate variants that have identical variant_attributes
 * within the same product, keeping only the oldest variant (earliest created_at).
 * 
 * Safety checks:
 * - Only deletes variants with identical variant_attributes within same product
 * - Keeps the oldest variant (earliest created_at)
 * - Verifies no foreign key references before deletion
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function cleanupDuplicateVariants() {
  console.log('🔍 Starting duplicate variant cleanup...\n');

  // Use pg library for direct database access
  const { default: pg } = await import('pg');
  const { Client } = pg;

  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Step 1: Identify duplicates
    console.log('📊 Identifying duplicate variants...');
    const duplicatesQuery = `
      WITH duplicate_groups AS (
        SELECT 
          pv.product_id,
          pv.variant_attributes,
          COUNT(*) as duplicate_count,
          MIN(pv.created_at) as oldest_created_at
        FROM lats_product_variants pv
        WHERE pv.variant_attributes IS NOT NULL 
          AND pv.variant_attributes != '{}'::jsonb
        GROUP BY pv.product_id, pv.variant_attributes
        HAVING COUNT(*) > 1
      ),
      variants_to_keep AS (
        SELECT pv.id
        FROM lats_product_variants pv
        INNER JOIN duplicate_groups dg 
          ON pv.product_id = dg.product_id 
          AND pv.variant_attributes = dg.variant_attributes
          AND pv.created_at = dg.oldest_created_at
      ),
      variants_to_delete AS (
        SELECT pv.id
        FROM lats_product_variants pv
        INNER JOIN duplicate_groups dg 
          ON pv.product_id = dg.product_id 
          AND pv.variant_attributes = dg.variant_attributes
        WHERE pv.id NOT IN (SELECT id FROM variants_to_keep)
      )
      SELECT 
        (SELECT COUNT(*) FROM duplicate_groups) as duplicate_groups,
        (SELECT COUNT(*) FROM variants_to_keep) as variants_to_keep,
        (SELECT COUNT(*) FROM variants_to_delete) as variants_to_delete;
    `;

    const stats = await client.query(duplicatesQuery);
    const { duplicate_groups, variants_to_keep, variants_to_delete } = stats.rows[0];

    console.log(`   Found ${duplicate_groups} duplicate groups`);
    console.log(`   Will keep ${variants_to_keep} variants (oldest in each group)`);
    console.log(`   Will delete ${variants_to_delete} duplicate variants\n`);

    if (parseInt(variants_to_delete) === 0) {
      console.log('✅ No duplicates to clean up!');
      return;
    }

    // Step 2: Verify no foreign key references
    console.log('🔒 Verifying no foreign key references...');
    const checkReferencesQuery = `
      WITH variants_to_delete AS (
        SELECT pv.id
        FROM lats_product_variants pv
        INNER JOIN (
          SELECT 
            product_id,
            variant_attributes,
            MIN(created_at) as oldest_created_at
          FROM lats_product_variants
          WHERE variant_attributes IS NOT NULL 
            AND variant_attributes != '{}'::jsonb
          GROUP BY product_id, variant_attributes
          HAVING COUNT(*) > 1
        ) dg ON pv.product_id = dg.product_id 
          AND pv.variant_attributes = dg.variant_attributes
          AND pv.created_at > dg.oldest_created_at
      )
      SELECT 
        (SELECT COUNT(*) FROM lats_trade_in_prices WHERE variant_id IN (SELECT id FROM variants_to_delete)) as trade_in_refs,
        (SELECT COUNT(*) FROM lats_stock_transfers WHERE variant_id IN (SELECT id FROM variants_to_delete)) as transfer_refs,
        (SELECT COUNT(*) FROM lats_stock_movements WHERE variant_id IN (SELECT id FROM variants_to_delete)) as movement_refs,
        (SELECT COUNT(*) FROM lats_purchase_order_items WHERE variant_id IN (SELECT id FROM variants_to_delete)) as po_refs,
        (SELECT COUNT(*) FROM lats_inventory_items WHERE variant_id IN (SELECT id FROM variants_to_delete)) as inventory_refs,
        (SELECT COUNT(*) FROM lats_inventory_adjustments WHERE variant_id IN (SELECT id FROM variants_to_delete)) as adjustment_refs;
    `;

    const refCheck = await client.query(checkReferencesQuery);
    const refs = refCheck.rows[0];
    const totalRefs = Object.values(refs).reduce((sum, val) => sum + parseInt(val), 0);

    if (totalRefs > 0) {
      console.log('⚠️  WARNING: Some variants to delete are referenced in other tables!');
      console.log('   References found:', refs);
      console.log('   Aborting cleanup for safety.');
      return;
    }

    console.log('✅ No foreign key references found - safe to delete\n');

    // Step 3: Delete duplicates
    console.log('🗑️  Deleting duplicate variants...');
    const deleteQuery = `
      WITH duplicate_groups AS (
        SELECT 
          product_id,
          variant_attributes,
          MIN(created_at) as oldest_created_at
        FROM lats_product_variants
        WHERE variant_attributes IS NOT NULL 
          AND variant_attributes != '{}'::jsonb
        GROUP BY product_id, variant_attributes
        HAVING COUNT(*) > 1
      )
      DELETE FROM lats_product_variants pv
      USING duplicate_groups dg
      WHERE pv.product_id = dg.product_id 
        AND pv.variant_attributes = dg.variant_attributes
        AND pv.created_at > dg.oldest_created_at
      RETURNING pv.id, pv.product_id;
    `;

    const deleteResult = await client.query(deleteQuery);
    const deletedCount = deleteResult.rowCount;

    console.log(`✅ Successfully deleted ${deletedCount} duplicate variants\n`);

    // Step 4: Verify cleanup
    console.log('🔍 Verifying cleanup...');
    const verifyQuery = `
      SELECT 
        COUNT(*) as remaining_duplicates
      FROM (
        SELECT product_id, variant_attributes, COUNT(*) as cnt
        FROM lats_product_variants
        WHERE variant_attributes IS NOT NULL 
          AND variant_attributes != '{}'::jsonb
        GROUP BY product_id, variant_attributes
        HAVING COUNT(*) > 1
      ) duplicates;
    `;

    const verify = await client.query(verifyQuery);
    const remaining = parseInt(verify.rows[0].remaining_duplicates);

    if (remaining === 0) {
      console.log('✅ All duplicates have been cleaned up!');
    } else {
      console.log(`⚠️  Warning: ${remaining} duplicate groups still remain`);
    }

    console.log('\n📊 Final Summary:');
    console.log(`   - Deleted: ${deletedCount} duplicate variants`);
    console.log(`   - Remaining duplicates: ${remaining}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await client.end();
    console.log('\n✅ Database connection closed');
  }
}

// Run the cleanup
cleanupDuplicateVariants()
  .then(() => {
    console.log('\n✅ Cleanup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });

