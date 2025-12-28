#!/usr/bin/env node
/**
 * Check for recent branch transfers that might be referencing the variants
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

console.log(`🔍 Checking for recent branch transfers...\n`);

async function checkRecentTransfers() {
  const sql = neon(DATABASE_URL);

  try {
    // Check all recent branch transfers
    console.log('📊 Recent branch transfers (last 24 hours):');
    const recentQuery = `
      SELECT id, entity_id, entity_type, status, quantity, notes, created_at, updated_at
      FROM branch_transfers
      WHERE created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 20
    `;
    const recentTransfers = await sql.query(recentQuery);

    if (recentTransfers.length === 0) {
      console.log('✅ No recent branch transfers found');
    } else {
      recentTransfers.forEach((transfer, index) => {
        const isTargetVariant = TARGET_VARIANT_IDS.includes(transfer.entity_id);
        const marker = isTargetVariant ? '🎯' : '   ';
        console.log(`${marker} ${index + 1}. ${transfer.created_at.toISOString().slice(0, 19)} - ${transfer.entity_id}`);
        console.log(`      Status: ${transfer.status}, Quantity: ${transfer.quantity}, Type: ${transfer.entity_type}`);
        if (transfer.notes) {
          console.log(`      Notes: ${transfer.notes.slice(0, 100)}${transfer.notes.length > 100 ? '...' : ''}`);
        }
      });
    }

    console.log('\n🔍 Checking if any transfers reference our target variants...');
    const inClause = TARGET_VARIANT_IDS.map(id => `'${id}'`).join(',');
    const targetQuery = `SELECT * FROM branch_transfers WHERE entity_id IN (${inClause})`;
    const targetTransfers = await sql.query(targetQuery);

    if (targetTransfers.length > 0) {
      console.log('⚠️  Found transfers referencing target variants:');
      targetTransfers.forEach((transfer, index) => {
        console.log(`   ${index + 1}. ID: ${transfer.id}, Status: ${transfer.status}, Created: ${transfer.created_at}`);
      });
    } else {
      console.log('✅ No transfers found referencing target variants');
    }

    // Check if the app might be seeing cached data
    console.log('\n🔍 Checking database connection and cache...');
    console.log(`Database URL: ${DATABASE_URL.substring(0, 50)}...`);

    // Test a simple query to make sure we're connected to the right DB
    const testQuery = `SELECT COUNT(*) as variant_count FROM lats_product_variants WHERE id IN (${inClause})`;
    const testResult = await sql.query(testQuery);
    console.log(`✅ Connected to database with ${testResult[0].variant_count} target variants found`);

  } catch (error) {
    console.error('❌ Error checking recent transfers:', error);
  }
}

checkRecentTransfers();
