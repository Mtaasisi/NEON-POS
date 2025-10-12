#!/usr/bin/env node

/**
 * Automated Fix for Sales Reports Errors
 * 
 * This script automatically applies the database migration to fix:
 * 1. Missing daily_sales_closures table
 * 2. Missing columns in lats_sales table
 * 
 * Usage: node apply-sales-reports-fix.mjs
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'fs';

console.log('\n🔧 Sales Reports Database Fix');
console.log('=====================================\n');

// Get database URL
let DATABASE_URL;
try {
  // First check if database-config.json exists
  if (existsSync('database-config.json')) {
    const config = JSON.parse(readFileSync('database-config.json', 'utf-8'));
    DATABASE_URL = config.connectionString || config.url;
    console.log('✅ Using database-config.json');
  } else {
    // Otherwise use the connection string from supabaseClient.ts
    DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
    console.log('✅ Using configured database URL');
  }
  console.log(`   Database: ${DATABASE_URL.substring(0, 50)}...\n`);
} catch (e) {
  console.error('❌ Error reading database config:', e.message);
  process.exit(1);
}

// Create Neon SQL client
const sql = neon(DATABASE_URL);

async function applyFix() {
  try {
    console.log('📊 Step 1: Creating daily_sales_closures table...\n');
    
    // Create the table
    await sql`
      CREATE TABLE IF NOT EXISTS daily_sales_closures (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date DATE NOT NULL UNIQUE,
        total_sales NUMERIC(12, 2) DEFAULT 0,
        total_transactions INTEGER DEFAULT 0,
        closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        closed_by TEXT NOT NULL,
        closed_by_user_id UUID,
        sales_data JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('   ✅ Table created/verified\n');

    console.log('📈 Step 2: Creating indexes...\n');
    
    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_sales_closures_date ON daily_sales_closures(date DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_sales_closures_closed_at ON daily_sales_closures(closed_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_sales_closures_closed_by_user_id ON daily_sales_closures(closed_by_user_id)`;
    console.log('   ✅ Indexes created\n');

    console.log('🔒 Step 3: Setting up Row Level Security...\n');
    
    // Enable RLS
    await sql`ALTER TABLE daily_sales_closures ENABLE ROW LEVEL SECURITY`;
    
    // Drop policy if exists and recreate
    try {
      await sql`DROP POLICY IF EXISTS "Allow all operations on daily closures" ON daily_sales_closures`;
    } catch (e) {
      // Policy might not exist, that's OK
    }
    
    await sql`
      CREATE POLICY "Allow all operations on daily closures"
        ON daily_sales_closures
        FOR ALL
        USING (true)
        WITH CHECK (true)
    `;
    console.log('   ✅ RLS policies configured\n');

    console.log('🔄 Step 4: Creating update trigger...\n');
    
    // Create update function
    await sql`
      CREATE OR REPLACE FUNCTION update_daily_sales_closures_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;
    
    // Drop trigger if exists and recreate
    await sql`DROP TRIGGER IF EXISTS update_daily_sales_closures_updated_at_trigger ON daily_sales_closures`;
    await sql`
      CREATE TRIGGER update_daily_sales_closures_updated_at_trigger
        BEFORE UPDATE ON daily_sales_closures
        FOR EACH ROW
        EXECUTE FUNCTION update_daily_sales_closures_updated_at()
    `;
    console.log('   ✅ Trigger created\n');

    console.log('📝 Step 5: Adding optional columns to lats_sales...\n');
    
    // Check and add subtotal column
    const subtotalCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'lats_sales' AND column_name = 'subtotal'
    `;
    
    if (subtotalCheck.length === 0) {
      await sql`ALTER TABLE lats_sales ADD COLUMN subtotal NUMERIC(12, 2) DEFAULT 0`;
      console.log('   ✅ Added subtotal column');
    } else {
      console.log('   ℹ️  subtotal column already exists');
    }

    // Check and add discount_amount column
    const discountCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'lats_sales' AND column_name = 'discount_amount'
    `;
    
    if (discountCheck.length === 0) {
      await sql`ALTER TABLE lats_sales ADD COLUMN discount_amount NUMERIC(12, 2) DEFAULT 0`;
      console.log('   ✅ Added discount_amount column');
    } else {
      console.log('   ℹ️  discount_amount column already exists');
    }

    // Check and add tax column
    const taxCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'lats_sales' AND column_name = 'tax'
    `;
    
    if (taxCheck.length === 0) {
      await sql`ALTER TABLE lats_sales ADD COLUMN tax NUMERIC(12, 2) DEFAULT 0`;
      console.log('   ✅ Added tax column');
    } else {
      console.log('   ℹ️  tax column already exists');
    }

    console.log('\n✨ Step 6: Verifying the fix...\n');
    
    // Verify table exists
    const tableCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'daily_sales_closures'
    `;
    
    if (tableCheck.length > 0) {
      console.log('   ✅ daily_sales_closures table verified');
    } else {
      console.log('   ❌ daily_sales_closures table not found');
      throw new Error('Table creation failed');
    }

    // Verify columns
    const columnsCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'lats_sales' 
        AND column_name IN ('subtotal', 'discount_amount', 'tax')
    `;
    
    console.log(`   ✅ Found ${columnsCheck.length}/3 optional columns in lats_sales`);

    console.log('\n🎉 DATABASE FIX COMPLETED SUCCESSFULLY!\n');
    console.log('=====================================\n');
    console.log('✅ All database changes applied');
    console.log('✅ daily_sales_closures table created');
    console.log('✅ Indexes and RLS policies configured');
    console.log('✅ Optional columns added to lats_sales');
    console.log('\n📱 Next Steps:');
    console.log('   1. Refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)');
    console.log('   2. Navigate to Sales Reports page');
    console.log('   3. Errors should be gone! 🚀\n');

  } catch (error) {
    console.error('\n❌ Error applying fix:', error.message);
    console.error('\nFull error details:', error);
    console.error('\n💡 If you see permission errors, make sure your database user has');
    console.error('   permissions to CREATE TABLE and ALTER TABLE.\n');
    process.exit(1);
  }
}

// Run the fix
console.log('🚀 Starting database migration...\n');
applyFix();

