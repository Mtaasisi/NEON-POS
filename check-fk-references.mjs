#!/usr/bin/env node
/**
 * Check foreign key references to lats_product_variants to understand FK constraints
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.VITE_DATABASE_URL ||
                    process.env.DATABASE_URL ||
                    'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

console.log('🔍 Checking foreign key references to lats_product_variants...\n');

async function checkFKReferences() {
  const sql = neon(DATABASE_URL);

  try {
    console.log('📊 Querying foreign key constraints...');

    const fkQuery = `
      SELECT
        tc.table_schema,
        tc.table_name,
        kcu.column_name AS referencing_column,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'lats_product_variants'
        AND ccu.column_name = 'id';
    `;

    const results = await sql.query(fkQuery);

    console.log('✅ Found foreign key constraints:');
    console.log('='.repeat(80));

    if (results.length === 0) {
      console.log('❌ No foreign key constraints found referencing lats_product_variants.id');
    } else {
      results.forEach((row, index) => {
        console.log(`${index + 1}. Table: ${row.table_name}`);
        console.log(`   Column: ${row.referencing_column}`);
        console.log(`   Schema: ${row.table_schema}`);
        console.log(`   Constraint: ${row.constraint_name}`);
        console.log('');
      });
    }

    console.log('='.repeat(80));

    // Also check branch_transfers columns specifically
    console.log('📋 Checking branch_transfers table columns...');
    const branchTransfersQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'branch_transfers'
      ORDER BY ordinal_position;
    `;

    const branchColumns = await sql.query(branchTransfersQuery);

    console.log('✅ branch_transfers columns:');
    branchColumns.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.column_name} (${col.data_type})`);
    });

  } catch (error) {
    console.error('❌ Error checking foreign keys:', error);
  }
}

checkFKReferences();
