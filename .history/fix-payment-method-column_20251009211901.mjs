#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import chalk from 'chalk';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

console.log(chalk.blue('\n🔧 Fixing payment_method column to JSONB...\n'));

const sql = neon(DATABASE_URL);

async function fixPaymentMethod() {
  try {
    // Step 1: Drop the default constraint first
    console.log(chalk.yellow('📝 Step 1: Removing default constraint...'));
    await sql`
      ALTER TABLE lats_sales 
      ALTER COLUMN payment_method DROP DEFAULT
    `;
    console.log(chalk.green('   ✅ Default constraint removed\n'));

    // Step 2: Convert existing data and change column type
    console.log(chalk.yellow('📝 Step 2: Converting column to JSONB...'));
    await sql`
      ALTER TABLE lats_sales 
      ALTER COLUMN payment_method TYPE JSONB 
      USING CASE 
        WHEN payment_method IS NULL THEN NULL
        WHEN payment_method::text ~ '^\\{.*\\}$' OR payment_method::text ~ '^\\[.*\\]$' THEN payment_method::jsonb
        ELSE json_build_object('type', payment_method, 'amount', 0)::jsonb
      END
    `;
    console.log(chalk.green('   ✅ Column converted to JSONB\n'));

    // Step 3: Verify the change
    console.log(chalk.yellow('📝 Step 3: Verifying column type...'));
    const result = await sql`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lats_sales' AND column_name = 'payment_method'
    `;
    
    if (result[0]?.data_type === 'jsonb') {
      console.log(chalk.green('   ✅ Verified: payment_method is now JSONB\n'));
    } else {
      console.log(chalk.red('   ⚠️ Unexpected type:', result[0]?.data_type, '\n'));
    }

    console.log(chalk.green('========================================'));
    console.log(chalk.green('  ✅ Payment Method Column Fixed!'));
    console.log(chalk.green('========================================\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
  }
}

fixPaymentMethod();

