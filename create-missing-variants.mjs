#!/usr/bin/env node

/**
 * Create missing variants for products that should have them
 */

import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.production') });

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  try {
    console.log('🔧 Create Missing Variants for Products');
    console.log('='.repeat(60));

    // Test database connection
    console.log('🔌 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Find products that should have variants but don't
    console.log('🔍 Finding products that need variants...\n');
    
    const productsNeedingVariants = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.branch_id,
        p.cost_price,
        p.selling_price,
        p.unit_price,
        p.stock_quantity,
        p.min_stock_level,
        p.metadata->>'useVariants' as use_variants,
        (p.metadata->>'variantCount')::int as variant_count,
        COUNT(v.id) as existing_variant_count
      FROM lats_products p
      LEFT JOIN lats_product_variants v ON v.product_id = p.id AND v.parent_variant_id IS NULL
      WHERE p.is_active = true
        AND (
          (p.metadata->>'useVariants')::boolean = true
          OR (p.metadata->>'variantCount')::int > 0
        )
      GROUP BY p.id, p.name, p.sku, p.branch_id, p.cost_price, p.selling_price, 
               p.unit_price, p.stock_quantity, p.min_stock_level, p.metadata
      HAVING COUNT(v.id) = 0
      ORDER BY p.name
    `);

    console.log(`📊 Found ${productsNeedingVariants.rows.length} products that need variants\n`);

    if (productsNeedingVariants.rows.length === 0) {
      console.log('✅ All products that should have variants already have them!');
      process.exit(0);
    }

    // Show what we'll create
    console.log('📋 Products that will get variants:');
    productsNeedingVariants.rows.slice(0, 10).forEach((product, idx) => {
      console.log(`   ${idx + 1}. ${product.name} (Expected: ${product.variant_count || 1} variant(s))`);
    });
    if (productsNeedingVariants.rows.length > 10) {
      console.log(`   ... and ${productsNeedingVariants.rows.length - 10} more\n`);
    } else {
      console.log('');
    }

    console.log(`⚠️  About to create variants for ${productsNeedingVariants.rows.length} products`);
    console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Create variants
    let created = 0;
    let errors = 0;
    const errorList = [];

    for (const product of productsNeedingVariants.rows) {
      try {
        // Determine how many variants to create
        const variantCount = Math.max(1, product.variant_count || 1);
        
        // Create variants
        for (let i = 0; i < variantCount; i++) {
          const variantName = variantCount === 1 ? 'Default' : `Variant ${i + 1}`;
          const variantSku = product.sku 
            ? `${product.sku}-${variantCount === 1 ? 'DEFAULT' : `V${i + 1}`}`
            : `SKU-${product.id.substring(0, 8)}-${variantCount === 1 ? 'DEFAULT' : `V${i + 1}`}`;

          const result = await pool.query(`
            INSERT INTO lats_product_variants (
              id,
              product_id,
              name,
              variant_name,
              sku,
              cost_price,
              unit_price,
              selling_price,
              quantity,
              min_quantity,
              branch_id,
              is_active,
              is_parent,
              parent_variant_id,
              variant_attributes,
              attributes,
              created_at,
              updated_at
            ) VALUES (
              gen_random_uuid(),
              $1::uuid,
              $2,
              $3,
              $4,
              COALESCE($5::numeric, 0),
              COALESCE($6::numeric, $7::numeric, 0),
              COALESCE($7::numeric, 0),
              COALESCE($8::integer, 0),
              COALESCE($9::integer, 0),
              $10::uuid,
              true,
              true,
              NULL,
              jsonb_build_object(
                'auto_created', true,
                'created_at', NOW(),
                'created_from', 'missing_variants_script'
              ),
              '{}'::jsonb,
              NOW(),
              NOW()
            )
            RETURNING id, name
          `, [
            product.id,
            variantName,
            variantName,
            variantSku,
            product.cost_price || 0,
            product.unit_price || product.selling_price || 0,
            product.selling_price || 0,
            product.stock_quantity || 0,
            product.min_stock_level || 0,
            product.branch_id
          ]);

          created++;
          if (i === 0) {
            console.log(`✅ Created variant for: ${product.name}`);
          }
        }
      } catch (error) {
        errors++;
        errorList.push({ product: product.name, error: error.message });
        console.error(`❌ Error creating variant for ${product.name}:`, error.message);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Variants created: ${created}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📦 Products processed: ${productsNeedingVariants.rows.length}`);

    if (errorList.length > 0) {
      console.log('\n⚠️  Errors:');
      errorList.slice(0, 5).forEach(err => {
        console.log(`   - ${err.product}: ${err.error}`);
      });
      if (errorList.length > 5) {
        console.log(`   ... and ${errorList.length - 5} more errors`);
      }
    }

    // Verify
    console.log('\n🔍 Verifying...');
    const verifyResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM lats_products p
      LEFT JOIN lats_product_variants v ON v.product_id = p.id AND v.parent_variant_id IS NULL
      WHERE p.is_active = true
        AND (
          (p.metadata->>'useVariants')::boolean = true
          OR (p.metadata->>'variantCount')::int > 0
        )
      GROUP BY p.id
      HAVING COUNT(v.id) = 0
    `);
    
    const stillMissing = verifyResult.rows.length;
    if (stillMissing === 0) {
      console.log('✅ All products now have variants!');
    } else {
      console.log(`⚠️  ${stillMissing} products still missing variants`);
    }

    console.log('='.repeat(60));
    console.log('\n🎉 Done!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
