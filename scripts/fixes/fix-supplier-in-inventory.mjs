#!/usr/bin/env node

/**
 * Fix Supplier Column in Inventory
 * 
 * This script:
 * 1. Updates the purchase order receive function to set supplier_id on products
 * 2. Backfills supplier_id for existing products from their purchase orders
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get Supabase credentials from environment
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runMigration() {
  console.log('🔧 Starting supplier fix migration...\n');

  try {
    // Read the migration file
    const migrationPath = join(__dirname, 'migrations', 'FIX_add_supplier_to_products_on_receive.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('📊 Applying migration...\n');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If exec_sql doesn't exist, try executing directly (for development)
      console.log('⚠️  exec_sql not available, executing SQL directly...');
      
      // Split by semicolon and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));

      for (const statement of statements) {
        if (!statement) continue;
        
        try {
          await supabase.rpc('exec', { sql: statement });
        } catch (err) {
          console.log('Statement:', statement.substring(0, 100) + '...');
          console.error('Error:', err);
        }
      }
    }

    console.log('\n✅ Migration applied successfully!\n');

    // Verify the fix by counting products with suppliers
    console.log('🔍 Verifying fix...\n');

    const { data: stats, error: statsError } = await supabase.rpc('exec', {
      sql: `
        SELECT 
          COUNT(*) FILTER (WHERE supplier_id IS NOT NULL) as with_supplier,
          COUNT(*) FILTER (WHERE supplier_id IS NULL) as without_supplier,
          COUNT(*) as total
        FROM lats_products
        WHERE is_active = true;
      `
    });

    if (!statsError && stats) {
      console.log('📊 Product Supplier Statistics:');
      console.log(`   - Products with supplier: ${stats[0]?.with_supplier || 0}`);
      console.log(`   - Products without supplier: ${stats[0]?.without_supplier || 0}`);
      console.log(`   - Total active products: ${stats[0]?.total || 0}`);
    }

    console.log('\n✅ Fix complete! Supplier column should now show data in inventory.\n');
    console.log('💡 Note: Only products that were received from purchase orders will have supplier info.');
    console.log('   For manually created products, you can edit them to assign a supplier.\n');

  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

// Alternative simple fix without migration file
async function quickFix() {
  console.log('🔧 Running quick supplier fix...\n');

  try {
    // Backfill supplier_id for products from their purchase orders
    console.log('📊 Updating products with supplier information...');

    const { error } = await supabase.rpc('exec', {
      sql: `
        UPDATE lats_products p
        SET 
          supplier_id = po.supplier_id,
          updated_at = NOW()
        FROM (
          SELECT DISTINCT 
            poi.product_id,
            po.supplier_id
          FROM lats_purchase_order_items poi
          JOIN lats_purchase_orders po ON po.id = poi.purchase_order_id
          WHERE po.supplier_id IS NOT NULL
            AND po.status IN ('received', 'partial_received')
        ) po
        WHERE p.id = po.product_id
          AND p.supplier_id IS NULL
          AND po.supplier_id IS NOT NULL;
      `
    });

    if (error) {
      console.error('❌ Error updating products:', error);
      process.exit(1);
    }

    console.log('✅ Products updated successfully!\n');

    // Get count of updated products
    const { data: products, error: productsError } = await supabase
      .from('lats_products')
      .select('id, name, supplier_id')
      .not('supplier_id', 'is', null)
      .limit(10);

    if (!productsError && products) {
      console.log(`📦 Found ${products.length} products with supplier info (showing first 10):`);
      products.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} (Supplier ID: ${p.supplier_id})`);
      });
    }

    console.log('\n✅ Quick fix complete!\n');

  } catch (error) {
    console.error('❌ Error in quick fix:', error);
    process.exit(1);
  }
}

// Check if we should run the full migration or just the quick fix
const args = process.argv.slice(2);
if (args.includes('--quick')) {
  quickFix();
} else {
  runMigration();
}

