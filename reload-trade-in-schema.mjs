#!/usr/bin/env node

/**
 * Reload Trade-In Schema Cache
 * 
 * This script fixes the PostgREST schema cache issue causing:
 * "Could not find a relationship between 'lats_trade_in_prices' and 'lats_products'"
 */

import postgres from 'postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

console.log('🔧 Starting Trade-In Schema Cache Reload...\n');

const sql = postgres(DATABASE_URL, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

async function reloadTradeInSchema() {
  try {
    console.log('📋 Step 1: Verifying foreign key relationship...');
    
    // Verify foreign key exists
    const fkCheck = await sql`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'lats_trade_in_prices'
          AND kcu.column_name = 'product_id'
    `;
    
    if (fkCheck.length > 0) {
      console.log('✅ Foreign key constraint exists:', fkCheck[0].constraint_name);
      console.log(`   ${fkCheck[0].table_name}.${fkCheck[0].column_name} → ${fkCheck[0].foreign_table_name}.${fkCheck[0].foreign_column_name}\n`);
    } else {
      console.log('⚠️  Foreign key constraint NOT FOUND!');
      console.log('   Will attempt to recreate it...\n');
      
      // Recreate the foreign key
      await sql`
        ALTER TABLE lats_trade_in_prices 
          ADD CONSTRAINT lats_trade_in_prices_product_id_fkey 
          FOREIGN KEY (product_id) 
          REFERENCES lats_products(id) 
          ON DELETE CASCADE
      `;
      
      console.log('✅ Foreign key constraint recreated\n');
    }
    
    console.log('📋 Step 2: Checking table columns...');
    
    const columns = await sql`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'lats_trade_in_prices'
        AND column_name IN ('id', 'product_id', 'variant_id', 'branch_id')
      ORDER BY ordinal_position
    `;
    
    console.log('✅ Table columns:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    console.log('');
    
    console.log('📋 Step 3: Verifying in pg_constraint catalog...');
    
    const pgConstraint = await sql`
      SELECT
        conname AS constraint_name,
        conrelid::regclass AS table_name,
        confrelid::regclass AS foreign_table_name,
        a.attname AS column_name,
        af.attname AS foreign_column_name
      FROM pg_constraint AS c
      JOIN pg_attribute AS a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
      JOIN pg_attribute AS af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
      WHERE c.contype = 'f'
        AND c.conrelid::regclass::text = 'lats_trade_in_prices'
        AND a.attname = 'product_id'
    `;
    
    if (pgConstraint.length > 0) {
      console.log('✅ Constraint visible in pg_constraint:', pgConstraint[0].constraint_name);
      console.log(`   ${pgConstraint[0].table_name}.${pgConstraint[0].column_name} → ${pgConstraint[0].foreign_table_name}.${pgConstraint[0].foreign_column_name}\n`);
    } else {
      console.log('❌ Constraint NOT visible in pg_constraint - this is the problem!\n');
    }
    
    console.log('📋 Step 4: Reloading PostgREST schema cache...');
    
    try {
      // Send NOTIFY to PostgREST to reload schema
      await sql`NOTIFY pgrst, 'reload schema'`;
      console.log('✅ NOTIFY signal sent to PostgREST\n');
      console.log('⏳ PostgREST will reload its schema cache within 1-2 minutes...\n');
    } catch (error) {
      console.log('⚠️  NOTIFY failed (this is normal on some Neon/Supabase setups)');
      console.log('   PostgREST will auto-reload its cache periodically.\n');
    }
    
    console.log('📋 Step 5: Testing SQL query...');
    
    const testQuery = await sql`
      SELECT 
        tip.id,
        tip.device_name,
        tip.device_model,
        tip.base_trade_in_price,
        p.id AS product_id,
        p.name AS product_name,
        p.sku AS product_sku
      FROM lats_trade_in_prices tip
      LEFT JOIN lats_products p ON tip.product_id = p.id
      LIMIT 5
    `;
    
    console.log(`✅ SQL query works! Found ${testQuery.length} trade-in prices\n`);
    
    if (testQuery.length > 0) {
      console.log('📊 Sample data:');
      testQuery.forEach((row, idx) => {
        console.log(`   ${idx + 1}. ${row.device_name} ${row.device_model} - ${row.base_trade_in_price}`);
        if (row.product_name) {
          console.log(`      → Linked to product: ${row.product_name} (${row.product_sku})`);
        }
      });
      console.log('');
    }
    
    // Check total count
    const countResult = await sql`
      SELECT COUNT(*) as count FROM lats_trade_in_prices
    `;
    
    console.log(`📊 Total trade-in prices in database: ${countResult[0].count}\n`);
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ SCHEMA CACHE RELOAD COMPLETE');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📝 Next Steps:');
    console.log('   1. ⏳ Wait 1-2 minutes for PostgREST to reload its cache');
    console.log('   2. 🔄 Hard refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)');
    console.log('   3. 🧪 Test the trade-in prices page again');
    console.log('   4. ℹ️  If the error persists, try the alternative fix below:\n');
    
    console.log('💡 Alternative Fix (if needed):');
    console.log('   Run this SQL in your Neon/Supabase dashboard:');
    console.log('   ```sql');
    console.log('   ALTER TABLE lats_trade_in_prices DROP CONSTRAINT IF EXISTS lats_trade_in_prices_product_id_fkey;');
    console.log('   ALTER TABLE lats_trade_in_prices ADD CONSTRAINT lats_trade_in_prices_product_id_fkey FOREIGN KEY (product_id) REFERENCES lats_products(id) ON DELETE CASCADE;');
    console.log('   NOTIFY pgrst, \'reload schema\';');
    console.log('   ```\n');
    
  } catch (error) {
    console.error('❌ Error during schema reload:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the script
reloadTradeInSchema();

