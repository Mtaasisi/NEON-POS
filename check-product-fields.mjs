#!/usr/bin/env node
/**
 * Check if all product fields from the form are being saved to database
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.VITE_DATABASE_URL ||
                    process.env.DATABASE_URL ||
                    'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

console.log(`🔍 Checking product fields in database...\n`);

async function checkProductFields() {
  const sql = neon(DATABASE_URL);

  try {
    // Check the lats_products table structure
    console.log('📋 lats_products table columns:');
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'lats_products'
      ORDER BY ordinal_position;
    `;
    const columns = await sql.query(columnsQuery);

    columns.forEach((col, index) => {
      console.log(`  ${index + 1}. ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n🔍 Checking for recent iPhone 14 Pro Max products...');
    const recentProductsQuery = `
      SELECT id, name, attributes, is_customer_portal_visible, created_at
      FROM lats_products
      WHERE name ILIKE '%iPhone 14 Pro Max%'
      ORDER BY created_at DESC
      LIMIT 5;
    `;
    const products = await sql.query(recentProductsQuery);

    if (products.length === 0) {
      console.log('❌ No iPhone 14 Pro Max products found');
    } else {
      console.log('✅ Found products:');
      products.forEach((product, index) => {
        console.log(`\n  ${index + 1}. ${product.name} (ID: ${product.id})`);
        console.log(`     Created: ${product.created_at}`);
        console.log(`     Customer Portal Visible: ${product.is_customer_portal_visible}`);
        console.log(`     Attributes: ${JSON.stringify(product.attributes, null, 2)}`);
      });
    }

    // Check what fields should be saved based on the form
    console.log('\n📝 Form fields that should be saved:');
    console.log('  ✓ name - Product Name & Model');
    console.log('  ✓ description - Description (optional)');
    console.log('  ✓ category_id - Category');
    console.log('  ✓ attributes.condition - Condition (new/used/refurbished)');
    console.log('  ✓ attributes.customer_portal_specification - Customer Portal Specifications');
    console.log('  ✓ is_customer_portal_visible - Customer Portal Visibility');
    console.log('  ✓ attributes.specification - Product Specifications');
    console.log('  ✓ branch_id - Current branch');
    console.log('  ✓ is_active - Always true');
    console.log('  ✓ metadata - Creation info and variant settings');

  } catch (error) {
    console.error('❌ Error checking product fields:', error);
  }
}

checkProductFields();
