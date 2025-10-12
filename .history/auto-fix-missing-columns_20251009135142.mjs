#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

console.log('\n🔧 Auto-Fix Missing Columns Script');
console.log('=====================================\n');

// Database connection string
const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function runFixes() {
  try {
    console.log('📡 Connecting to Neon database...\n');

    // Fix 1: Add selling_price to lats_products
    console.log('1️⃣ Adding selling_price column to lats_products...');
    await sql`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'lats_products' 
              AND column_name = 'selling_price'
          ) THEN
              ALTER TABLE lats_products 
              ADD COLUMN selling_price NUMERIC(10, 2) DEFAULT 0;
              
              RAISE NOTICE '✅ Added selling_price to lats_products';
          ELSE
              RAISE NOTICE '✓ lats_products.selling_price already exists';
          END IF;
      END $$;
    `;
    console.log('   ✅ Done\n');

    // Fix 2: Add cost_price to lats_products
    console.log('2️⃣ Adding cost_price column to lats_products...');
    await sql`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'lats_products' 
              AND column_name = 'cost_price'
          ) THEN
              ALTER TABLE lats_products 
              ADD COLUMN cost_price NUMERIC(10, 2) DEFAULT 0;
              
              RAISE NOTICE '✅ Added cost_price to lats_products';
          ELSE
              RAISE NOTICE '✓ lats_products.cost_price already exists';
          END IF;
      END $$;
    `;
    console.log('   ✅ Done\n');

    // Fix 3: Add stock_quantity to lats_products
    console.log('3️⃣ Adding stock_quantity column to lats_products...');
    await sql`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'lats_products' 
              AND column_name = 'stock_quantity'
          ) THEN
              ALTER TABLE lats_products 
              ADD COLUMN stock_quantity INTEGER DEFAULT 0;
              
              RAISE NOTICE '✅ Added stock_quantity to lats_products';
          ELSE
              RAISE NOTICE '✓ lats_products.stock_quantity already exists';
          END IF;
      END $$;
    `;
    console.log('   ✅ Done\n');

    // Fix 4: Add min_stock_level to lats_products
    console.log('4️⃣ Adding min_stock_level column to lats_products...');
    await sql`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'lats_products' 
              AND column_name = 'min_stock_level'
          ) THEN
              ALTER TABLE lats_products 
              ADD COLUMN min_stock_level INTEGER DEFAULT 0;
              
              RAISE NOTICE '✅ Added min_stock_level to lats_products';
          ELSE
              RAISE NOTICE '✓ lats_products.min_stock_level already exists';
          END IF;
      END $$;
    `;
    console.log('   ✅ Done\n');

    // Fix 5: Add total_quantity to lats_products
    console.log('5️⃣ Adding total_quantity column to lats_products...');
    await sql`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'lats_products' 
              AND column_name = 'total_quantity'
          ) THEN
              ALTER TABLE lats_products 
              ADD COLUMN total_quantity INTEGER DEFAULT 0;
              
              RAISE NOTICE '✅ Added total_quantity to lats_products';
          ELSE
              RAISE NOTICE '✓ lats_products.total_quantity already exists';
          END IF;
      END $$;
    `;
    console.log('   ✅ Done\n');

    // Fix 6: Add total_value to lats_products
    console.log('6️⃣ Adding total_value column to lats_products...');
    await sql`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'lats_products' 
              AND column_name = 'total_value'
          ) THEN
              ALTER TABLE lats_products 
              ADD COLUMN total_value NUMERIC(12, 2) DEFAULT 0;
              
              RAISE NOTICE '✅ Added total_value to lats_products';
          ELSE
              RAISE NOTICE '✓ lats_products.total_value already exists';
          END IF;
      END $$;
    `;
    console.log('   ✅ Done\n');

    // Fix 7: Add storage_room_id to lats_products
    console.log('7️⃣ Adding storage_room_id column to lats_products...');
    await sql`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'lats_products' 
              AND column_name = 'storage_room_id'
          ) THEN
              ALTER TABLE lats_products 
              ADD COLUMN storage_room_id UUID;
              
              RAISE NOTICE '✅ Added storage_room_id to lats_products';
          ELSE
              RAISE NOTICE '✓ lats_products.storage_room_id already exists';
          END IF;
      END $$;
    `;
    console.log('   ✅ Done\n');

    // Fix 8: Add store_shelf_id to lats_products
    console.log('8️⃣ Adding store_shelf_id column to lats_products...');
    await sql`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'lats_products' 
              AND column_name = 'store_shelf_id'
          ) THEN
              ALTER TABLE lats_products 
              ADD COLUMN store_shelf_id UUID;
              
              RAISE NOTICE '✅ Added store_shelf_id to lats_products';
          ELSE
              RAISE NOTICE '✓ lats_products.store_shelf_id already exists';
          END IF;
      END $$;
    `;
    console.log('   ✅ Done\n');

    // Create indexes
    console.log('9️⃣ Creating performance indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_lats_products_category ON lats_products(category_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_lats_products_storage ON lats_products(storage_room_id, store_shelf_id)`;
    console.log('   ✅ Done\n');

    // Verify the fix
    console.log('🔍 Verifying selling_price column exists...');
    const verification = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lats_products' 
      AND column_name = 'selling_price'
    `;

    if (verification.length > 0) {
      console.log('   ✅ Verified: selling_price column exists!\n');
      
      console.log('=====================================');
      console.log('✅ ALL FIXES APPLIED SUCCESSFULLY!');
      console.log('=====================================\n');
      console.log('Your product creation should now work without errors.');
      console.log('Please refresh your application to test.\n');
    } else {
      console.log('   ❌ Verification failed - column not found\n');
    }

  } catch (error) {
    console.error('\n❌ Error running fixes:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

runFixes();

