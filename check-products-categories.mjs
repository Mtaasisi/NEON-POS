#!/usr/bin/env node

/**
 * Check if all products have category_id
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
    console.log('🔍 Checking Products Category Status');
    console.log('='.repeat(60));

    // Test database connection
    console.log('🔌 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Get total products count
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM lats_products');
    const totalProducts = parseInt(totalResult.rows[0].count);
    console.log(`📊 Total products: ${totalProducts}\n`);

    // Get all categories
    const categoriesResult = await pool.query(`
      SELECT id, name, description, is_active, created_at
      FROM lats_categories
      ORDER BY name
    `);
    console.log(`📋 Total categories in database: ${categoriesResult.rows.length}\n`);

    // Get products with category_id
    const withCategoryResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM lats_products 
      WHERE category_id IS NOT NULL
    `);
    const withCategoryId = parseInt(withCategoryResult.rows[0].count);

    // Get products without category_id
    const withoutCategoryResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM lats_products 
      WHERE category_id IS NULL
    `);
    const withoutCategoryId = parseInt(withoutCategoryResult.rows[0].count);

    // Get category distribution
    const categoryDistributionResult = await pool.query(`
      SELECT 
        p.category_id,
        c.name as category_name,
        COUNT(*) as count
      FROM lats_products p
      LEFT JOIN lats_categories c ON p.category_id = c.id
      WHERE p.category_id IS NOT NULL
      GROUP BY p.category_id, c.name
      ORDER BY count DESC
    `);

    // Get products with invalid category_id (category doesn't exist)
    const invalidCategoryResult = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.category_id
      FROM lats_products p
      LEFT JOIN lats_categories c ON p.category_id = c.id
      WHERE p.category_id IS NOT NULL AND c.id IS NULL
      LIMIT 10
    `);

    // Get sample products for each category
    const categorySamples = {};
    if (categoryDistributionResult.rows.length > 0) {
      for (const row of categoryDistributionResult.rows) {
        const sampleResult = await pool.query(`
          SELECT name
          FROM lats_products 
          WHERE category_id = $1
          ORDER BY name
          LIMIT 5
        `, [row.category_id]);
        categorySamples[row.category_id] = sampleResult.rows.map(r => r.name).join(', ') || 'N/A';
      }
    }

    // Get sample products without category_id
    const productsWithoutCategoryResult = await pool.query(`
      SELECT id, name, sku, created_at
      FROM lats_products 
      WHERE category_id IS NULL
      LIMIT 10
    `);

    console.log('='.repeat(60));
    console.log('📊 CATEGORY ID STATUS');
    console.log('='.repeat(60));
    console.log(`✅ Products WITH category_id: ${withCategoryId}`);
    console.log(`❌ Products WITHOUT category_id: ${withoutCategoryId}`);
    console.log(`📦 Total products: ${totalProducts}`);
    
    if (withoutCategoryId > 0) {
      const percentage = ((withoutCategoryId / totalProducts) * 100).toFixed(2);
      console.log(`⚠️  ${percentage}% of products are missing category_id\n`);
    } else {
      console.log(`✅ All products have category_id!\n`);
    }

    if (invalidCategoryResult.rows.length > 0) {
      console.log('='.repeat(60));
      console.log('⚠️  PRODUCTS WITH INVALID CATEGORY_ID (Category does not exist)');
      console.log('='.repeat(60));
      invalidCategoryResult.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. ${row.name} (${row.sku || 'No SKU'})`);
        console.log(`   Category ID: ${row.category_id} (NOT FOUND)`);
      });
      console.log(`\n   Total products with invalid category_id: ${invalidCategoryResult.rows.length}\n`);
    }

    if (categoryDistributionResult.rows.length > 0) {
      console.log('='.repeat(60));
      console.log('📊 CATEGORY DISTRIBUTION');
      console.log('='.repeat(60));
      categoryDistributionResult.rows.forEach((row, idx) => {
        const percentage = ((row.count / totalProducts) * 100).toFixed(1);
        console.log(`\n${idx + 1}. ${row.category_name || 'Unknown Category'} (${row.category_id})`);
        console.log(`   Products: ${row.count} (${percentage}%)`);
        console.log(`   Sample: ${categorySamples[row.category_id] || 'N/A'}`);
      });
      console.log('\n');
    }

    if (productsWithoutCategoryResult.rows.length > 0) {
      console.log('='.repeat(60));
      console.log('❌ PRODUCTS WITHOUT CATEGORY_ID (Sample)');
      console.log('='.repeat(60));
      productsWithoutCategoryResult.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. ${row.name} (${row.sku || 'No SKU'}) - ID: ${row.id}`);
      });
      console.log('\n');
    }

    // List all available categories
    if (categoriesResult.rows.length > 0) {
      console.log('='.repeat(60));
      console.log('📋 AVAILABLE CATEGORIES');
      console.log('='.repeat(60));
      categoriesResult.rows.forEach((cat, idx) => {
        console.log(`${idx + 1}. ${cat.name || 'Unnamed'} (${cat.id})`);
        if (cat.description) {
          console.log(`   Description: ${cat.description}`);
        }
        console.log(`   Active: ${cat.is_active ? 'Yes' : 'No'}`);
      });
      console.log('\n');
    }

    // Summary
    console.log('='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    if (withoutCategoryId === 0 && invalidCategoryResult.rows.length === 0) {
      console.log('✅ SUCCESS: All products have valid category_id assigned!');
    } else {
      if (withoutCategoryId > 0) {
        console.log(`⚠️  WARNING: ${withoutCategoryId} products are missing category_id`);
      }
      if (invalidCategoryResult.rows.length > 0) {
        console.log(`⚠️  WARNING: ${invalidCategoryResult.rows.length} products have invalid category_id`);
      }
      console.log('   Consider running a script to assign category_id to these products.');
    }
    console.log('='.repeat(60));

    process.exit(withoutCategoryId === 0 && invalidCategoryResult.rows.length === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
