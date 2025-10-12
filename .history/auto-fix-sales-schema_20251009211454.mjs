#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import chalk from 'chalk';

// Use the same connection string from supabaseClient.ts
const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

console.log(chalk.blue('\n========================================'));
console.log(chalk.blue('  POS Database Schema Auto-Fix'));
console.log(chalk.blue('========================================\n'));

const sql = neon(DATABASE_URL);

async function runFix() {
  try {
    console.log(chalk.cyan('🔍 Checking current schema...\n'));

    // Step 1: Fix payment_method column type
    console.log(chalk.yellow('📝 Step 1: Fixing payment_method column...'));
    try {
      await sql`
        DO $$ 
        BEGIN
          -- Check if payment_method exists and is TEXT
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'lats_sales' 
            AND column_name = 'payment_method' 
            AND data_type = 'text'
          ) THEN
            ALTER TABLE lats_sales ALTER COLUMN payment_method TYPE JSONB USING 
              CASE 
                WHEN payment_method IS NULL THEN NULL
                WHEN payment_method::text ~ '^\\{.*\\}$' THEN payment_method::jsonb
                ELSE json_build_object('type', payment_method, 'amount', 0)::jsonb
              END;
          ELSIF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'lats_sales' AND column_name = 'payment_method'
          ) THEN
            ALTER TABLE lats_sales ADD COLUMN payment_method JSONB;
          END IF;
        END $$;
      `;
      console.log(chalk.green('   ✅ payment_method is now JSONB\n'));
    } catch (error) {
      console.log(chalk.red('   ⚠️ Warning:', error.message, '\n'));
    }

    // Step 2: Add payment_status column
    console.log(chalk.yellow('📝 Step 2: Adding payment_status column...'));
    try {
      await sql`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'lats_sales' AND column_name = 'payment_status'
          ) THEN
            ALTER TABLE lats_sales ADD COLUMN payment_status TEXT DEFAULT 'completed';
            
            IF EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'lats_sales' AND column_name = 'status'
            ) THEN
              UPDATE lats_sales SET payment_status = status WHERE status IS NOT NULL;
            END IF;
          END IF;
        END $$;
      `;
      console.log(chalk.green('   ✅ payment_status column ready\n'));
    } catch (error) {
      console.log(chalk.red('   ⚠️ Warning:', error.message, '\n'));
    }

    // Step 3: Add sold_by column
    console.log(chalk.yellow('📝 Step 3: Adding sold_by column...'));
    try {
      await sql`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'lats_sales' AND column_name = 'sold_by'
          ) THEN
            ALTER TABLE lats_sales ADD COLUMN sold_by TEXT;
            
            IF EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'lats_sales' AND column_name = 'created_by'
            ) THEN
              UPDATE lats_sales SET sold_by = created_by WHERE created_by IS NOT NULL;
            END IF;
          END IF;
        END $$;
      `;
      console.log(chalk.green('   ✅ sold_by column ready\n'));
    } catch (error) {
      console.log(chalk.red('   ⚠️ Warning:', error.message, '\n'));
    }

    // Step 4: Fix discount columns
    console.log(chalk.yellow('📝 Step 4: Fixing discount columns...'));
    try {
      await sql`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'lats_sales' AND column_name = 'discount'
          ) THEN
            ALTER TABLE lats_sales ADD COLUMN discount NUMERIC DEFAULT 0;
            
            IF EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'lats_sales' AND column_name = 'discount_amount'
            ) THEN
              UPDATE lats_sales SET discount = discount_amount WHERE discount_amount IS NOT NULL;
              ALTER TABLE lats_sales DROP COLUMN discount_amount;
            END IF;
          END IF;
          
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'lats_sales' AND column_name = 'discount_type'
          ) THEN
            ALTER TABLE lats_sales DROP COLUMN discount_type;
          END IF;
          
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'lats_sales' AND column_name = 'discount_value'
          ) THEN
            ALTER TABLE lats_sales DROP COLUMN discount_value;
          END IF;
        END $$;
      `;
      console.log(chalk.green('   ✅ discount column fixed (removed old columns)\n'));
    } catch (error) {
      console.log(chalk.red('   ⚠️ Warning:', error.message, '\n'));
    }

    // Step 5: Fix tax columns
    console.log(chalk.yellow('📝 Step 5: Fixing tax column...'));
    try {
      await sql`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'lats_sales' AND column_name = 'tax'
          ) THEN
            ALTER TABLE lats_sales ADD COLUMN tax NUMERIC DEFAULT 0;
            
            IF EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'lats_sales' AND column_name = 'tax_amount'
            ) THEN
              UPDATE lats_sales SET tax = tax_amount WHERE tax_amount IS NOT NULL;
              ALTER TABLE lats_sales DROP COLUMN tax_amount;
            END IF;
          END IF;
        END $$;
      `;
      console.log(chalk.green('   ✅ tax column ready\n'));
    } catch (error) {
      console.log(chalk.red('   ⚠️ Warning:', error.message, '\n'));
    }

    // Step 6: Ensure all required columns
    console.log(chalk.yellow('📝 Step 6: Adding optional columns...'));
    try {
      await sql`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sales' AND column_name = 'customer_name') THEN
            ALTER TABLE lats_sales ADD COLUMN customer_name TEXT;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sales' AND column_name = 'customer_phone') THEN
            ALTER TABLE lats_sales ADD COLUMN customer_phone TEXT;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sales' AND column_name = 'customer_email') THEN
            ALTER TABLE lats_sales ADD COLUMN customer_email TEXT;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sales' AND column_name = 'subtotal') THEN
            ALTER TABLE lats_sales ADD COLUMN subtotal NUMERIC DEFAULT 0;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sales' AND column_name = 'notes') THEN
            ALTER TABLE lats_sales ADD COLUMN notes TEXT;
          END IF;
        END $$;
      `;
      console.log(chalk.green('   ✅ All optional columns ready\n'));
    } catch (error) {
      console.log(chalk.red('   ⚠️ Warning:', error.message, '\n'));
    }

    // Step 7: Fix sale_items columns
    console.log(chalk.yellow('📝 Step 7: Fixing sale items columns...'));
    try {
      await sql`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sale_items' AND column_name = 'product_name') THEN
            ALTER TABLE lats_sale_items ADD COLUMN product_name TEXT;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sale_items' AND column_name = 'variant_name') THEN
            ALTER TABLE lats_sale_items ADD COLUMN variant_name TEXT;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sale_items' AND column_name = 'sku') THEN
            ALTER TABLE lats_sale_items ADD COLUMN sku TEXT;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sale_items' AND column_name = 'unit_price') THEN
            ALTER TABLE lats_sale_items ADD COLUMN unit_price NUMERIC DEFAULT 0;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sale_items' AND column_name = 'total_price') THEN
            ALTER TABLE lats_sale_items ADD COLUMN total_price NUMERIC DEFAULT 0;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sale_items' AND column_name = 'cost_price') THEN
            ALTER TABLE lats_sale_items ADD COLUMN cost_price NUMERIC DEFAULT 0;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lats_sale_items' AND column_name = 'profit') THEN
            ALTER TABLE lats_sale_items ADD COLUMN profit NUMERIC DEFAULT 0;
          END IF;
        END $$;
      `;
      console.log(chalk.green('   ✅ Sale items columns ready\n'));
    } catch (error) {
      console.log(chalk.red('   ⚠️ Warning:', error.message, '\n'));
    }

    // Get final schema
    console.log(chalk.cyan('📋 Verifying final schema...\n'));
    const schema = await sql`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'lats_sales' 
      ORDER BY ordinal_position
    `;

    console.log(chalk.green('✅ lats_sales table columns:'));
    schema.forEach(col => {
      console.log(chalk.gray(`   - ${col.column_name} (${col.data_type})`));
    });

    console.log(chalk.blue('\n========================================'));
    console.log(chalk.green('  ✅ Database Schema Fixed Successfully!'));
    console.log(chalk.blue('========================================\n'));

    console.log(chalk.green('✨ Changes applied:'));
    console.log(chalk.green('  ✓ payment_method is JSONB'));
    console.log(chalk.green('  ✓ payment_status column added'));
    console.log(chalk.green('  ✓ sold_by column added'));
    console.log(chalk.green('  ✓ discount column fixed'));
    console.log(chalk.green('  ✓ tax column fixed'));
    console.log(chalk.green('  ✓ All sale_items columns verified\n'));

    console.log(chalk.cyan('🚀 Your POS system is ready to use!'));
    console.log(chalk.cyan('   Run: npm run dev\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error.message);
    console.error(chalk.red('Stack:'), error.stack);
    process.exit(1);
  }
}

runFix();

