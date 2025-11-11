#!/usr/bin/env node

/**
 * 🔍 VERIFY DATABASE INDEXES
 * 
 * This script checks if performance optimization indexes are properly applied
 * to your Neon database.
 * 
 * USAGE: node verify-database-indexes.mjs
 */

import postgres from 'postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const DATABASE_URL = process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: VITE_DATABASE_URL not found in .env file');
  process.exit(1);
}

console.log('\n🔍 Checking Database Indexes...\n');

const sql = postgres(DATABASE_URL, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10
});

try {
  // Check which indexes exist
  const indexes = await sql`
    SELECT 
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE tablename IN (
      'lats_products',
      'lats_product_variants', 
      'lats_categories',
      'lats_suppliers',
      'lats_product_images'
    )
    AND indexname LIKE 'idx_%'
    ORDER BY tablename, indexname
  `;

  const expectedIndexes = [
    'idx_lats_products_branch_created',
    'idx_lats_products_is_active',
    'idx_lats_products_category',
    'idx_lats_products_supplier',
    'idx_lats_products_sku',
    'idx_lats_products_barcode',
    'idx_lats_products_shared',
    'idx_lats_product_variants_product',
    'idx_lats_product_variants_quantity',
    'idx_lats_categories_active',
    'idx_lats_suppliers_active',
    'idx_lats_products_null_branch',
    'idx_lats_product_images_product'
  ];

  const foundIndexNames = indexes.map(idx => idx.indexname);
  
  console.log('📊 INDEX STATUS:\n');
  console.log(`Total Expected: ${expectedIndexes.length}`);
  console.log(`Total Found: ${foundIndexNames.length}\n`);

  let missingIndexes = [];
  
  expectedIndexes.forEach(expectedIdx => {
    const found = foundIndexNames.includes(expectedIdx);
    const status = found ? '✅' : '❌';
    console.log(`${status} ${expectedIdx}`);
    
    if (!found) {
      missingIndexes.push(expectedIdx);
    }
  });

  console.log('\n' + '='.repeat(60) + '\n');

  if (missingIndexes.length === 0) {
    console.log('✅ ALL INDEXES APPLIED SUCCESSFULLY!\n');
    console.log('Your database is fully optimized for performance.\n');
    
    // Check index usage statistics
    console.log('📈 Checking Index Usage Statistics...\n');
    
    const indexStats = await sql`
      SELECT 
        tablename,
        indexname,
        idx_scan as index_scans,
        idx_tup_read as tuples_read
      FROM pg_stat_user_indexes
      WHERE tablename IN ('lats_products', 'lats_product_variants')
      AND indexname LIKE 'idx_%'
      ORDER BY idx_scan DESC
      LIMIT 10
    `;

    if (indexStats.length > 0) {
      console.log('Top 10 Most Used Indexes:');
      indexStats.forEach((stat, i) => {
        console.log(`  ${i + 1}. ${stat.indexname}`);
        console.log(`     Scans: ${stat.index_scans} | Tuples: ${stat.tuples_read}`);
      });
      console.log('');
    }

    // Check query performance
    console.log('⚡ Recent Query Performance:\n');
    
    try {
      const queryStats = await sql`
        SELECT 
          ROUND(mean_exec_time::numeric, 2) as avg_time_ms,
          calls,
          SUBSTRING(query, 1, 80) as query_snippet
        FROM pg_stat_statements
        WHERE query LIKE '%lats_products%'
        AND query NOT LIKE '%pg_stat%'
        ORDER BY mean_exec_time DESC
        LIMIT 5
      `;

      if (queryStats.length > 0) {
        console.log('Slowest Product Queries:');
        queryStats.forEach((stat, i) => {
          const status = stat.avg_time_ms < 1000 ? '✅' : 
                        stat.avg_time_ms < 5000 ? '⚠️' : '❌';
          console.log(`  ${i + 1}. ${status} ${stat.avg_time_ms}ms (${stat.calls} calls)`);
          console.log(`     ${stat.query_snippet}...`);
        });
        console.log('');
      } else {
        console.log('⚠️ pg_stat_statements extension not enabled\n');
        console.log('To enable query monitoring, run in Neon SQL console:');
        console.log('CREATE EXTENSION IF NOT EXISTS pg_stat_statements;\n');
      }
    } catch (err) {
      console.log('⚠️ Could not fetch query stats (pg_stat_statements may not be enabled)\n');
    }

    console.log('💡 PERFORMANCE TIPS:\n');
    console.log('   • Cold starts (13-15s) are normal for Neon free tier');
    console.log('   • Warm queries should be <1 second');
    console.log('   • Consider Neon Auto-Scaling for faster cold starts');
    console.log('   • Monitor query times in browser console\n');
    
  } else {
    console.log(`❌ MISSING ${missingIndexes.length} INDEXES!\n`);
    console.log('These indexes are missing:');
    missingIndexes.forEach(idx => {
      console.log(`   • ${idx}`);
    });
    console.log('\n📝 TO FIX:\n');
    console.log('1. Open your Neon Console: https://console.neon.tech');
    console.log('2. Select your database');
    console.log('3. Go to SQL Editor');
    console.log('4. Run the file: performance-optimization-indexes.sql');
    console.log('5. Run this verification script again\n');
    
    console.log('⚡ QUICK APPLY COMMAND:\n');
    console.log('   Run in terminal:');
    console.log('   node apply-performance-indexes.mjs\n');
  }

  await sql.end();
  
} catch (error) {
  console.error('❌ Error checking indexes:', error.message);
  await sql.end();
  process.exit(1);
}

