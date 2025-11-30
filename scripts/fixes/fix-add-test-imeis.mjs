#!/usr/bin/env node

/**
 * Manually add test IMEIs to fix the stock issue
 */

import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

async function addTestIMEIs() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🔧 ADDING TEST IMEIs TO FIX STOCK');
    console.log('═'.repeat(60));
    console.log('');

    // Find the iPhone 6 product and its variant
    const { rows: products } = await client.query(`
      SELECT p.id as product_id, p.name, v.id as variant_id, v.variant_name
      FROM lats_products p
      JOIN lats_product_variants v ON v.product_id = p.id
      WHERE p.name ILIKE '%iPhone 6%'
        AND (v.is_parent = TRUE OR v.variant_type = 'parent')
        AND v.variant_name = '128'
      ORDER BY p.created_at DESC
      LIMIT 1
    `);

    if (products.length === 0) {
      console.log('❌ iPhone 6 with 128 variant not found');
      return;
    }

    const { product_id, variant_id, name, variant_name } = products[0];
    console.log(`📱 Found: ${name} - ${variant_name}`);
    console.log(`   Product ID: ${product_id}`);
    console.log(`   Variant ID: ${variant_id}`);
    console.log('');

    // Add 5 test IMEIs
    const testIMEIs = [
      '123456789012345',
      '234567890123456',
      '345678901234567',
      '456789012345678',
      '567890123456789'
    ];

    console.log('📲 Adding IMEIs...');
    console.log('');

    for (let i = 0; i < testIMEIs.length; i++) {
      const imei = testIMEIs[i];
      console.log(`   ${i + 1}. Adding IMEI: ${imei}...`);

      try {
        const { rows } = await client.query(`
          SELECT * FROM add_imei_to_parent_variant(
            $1::uuid,
            $2::text,
            NULL,
            NULL,
            1000::numeric,
            101000::numeric,
            'new',
            NULL,
            'Test IMEI added manually'
          )
        `, [variant_id, imei]);

        const result = rows[0];
        if (result.success) {
          console.log(`      ✅ Success! Child ID: ${result.child_variant_id}`);
        } else {
          console.log(`      ❌ Failed: ${result.error_message}`);
        }
      } catch (error) {
        console.log(`      ❌ Error: ${error.message}`);
      }
    }

    console.log('');
    console.log('🔍 Verifying...');
    console.log('');

    // Check parent stock
    const { rows: parent } = await client.query(`
      SELECT quantity, variant_name
      FROM lats_product_variants
      WHERE id = $1
    `, [variant_id]);

    console.log(`📊 Parent Variant "${parent[0].variant_name}": Stock = ${parent[0].quantity}`);

    // Check children
    const { rows: children } = await client.query(`
      SELECT 
        variant_attributes->>'imei' as imei,
        quantity,
        is_active
      FROM lats_product_variants
      WHERE parent_variant_id = $1
        AND variant_type = 'imei_child'
    `, [variant_id]);

    console.log(`📲 IMEI Children: ${children.length}`);
    children.forEach((child, i) => {
      console.log(`   ${i + 1}. IMEI: ${child.imei}, Qty: ${child.quantity}, Active: ${child.is_active}`);
    });

    console.log('');
    console.log('═'.repeat(60));
    console.log('✅ DONE! Check your product page now.');
    console.log('   Stock should show 5 units available.');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

addTestIMEIs();

