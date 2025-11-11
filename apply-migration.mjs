#!/usr/bin/env node

/**
 * Apply IMEI Variant Support Migration
 * 
 * This script applies the IMEI variant migration using the Neon serverless driver.
 * Use this if psql is not available or if you prefer Node.js execution.
 * 
 * Run: node apply-migration.mjs
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sql = neon(process.env.VITE_DATABASE_URL || process.env.VITE_NEON_DATABASE_URL);

console.log('🚀 Applying IMEI Variant Support Migration\n');
console.log('═'.repeat(60));

try {
  // Read the migration file
  const migrationPath = join(__dirname, 'migrations', 'add_imei_variant_support.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf8');

  console.log('\n📄 Migration file loaded successfully');
  console.log(`   File: ${migrationPath}`);
  console.log(`   Size: ${migrationSQL.length} bytes\n`);

  console.log('⏳ Executing migration... (this may take a moment)\n');

  // Split SQL into individual statements (simple split by semicolon)
  // Note: This is a basic approach. For complex SQL, you might need a proper parser.
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let executed = 0;
  let skipped = 0;

  for (const statement of statements) {
    try {
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.length < 5) {
        skipped++;
        continue;
      }

      // Execute the statement
      await sql.unsafe(statement);
      executed++;
    } catch (error) {
      // If error is "already exists", that's okay
      if (
        error.message.includes('already exists') ||
        error.message.includes('duplicate')
      ) {
        console.log(`⚠️  Skipped (already exists): ${statement.substring(0, 50)}...`);
        skipped++;
      } else {
        console.error(`❌ Error executing statement:`, error.message);
        console.error(`   Statement: ${statement.substring(0, 100)}...`);
        throw error;
      }
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('\n✅ Migration completed successfully!\n');
  console.log(`   Statements executed: ${executed}`);
  console.log(`   Statements skipped: ${skipped}`);
  console.log('\n' + '═'.repeat(60));

  console.log('\n📊 Verifying setup...\n');

  // Quick verification
  const checks = [];

  // Check variant_attributes
  const variantAttrsCheck = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'lats_product_variants' 
    AND column_name = 'variant_attributes'
  `;
  checks.push({
    name: 'variant_attributes column',
    pass: variantAttrsCheck.length > 0
  });

  // Check trigger
  const triggerCheck = await sql`
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE trigger_name = 'enforce_unique_imei'
  `;
  checks.push({
    name: 'enforce_unique_imei trigger',
    pass: triggerCheck.length > 0
  });

  // Check view
  const viewCheck = await sql`
    SELECT table_name 
    FROM information_schema.views 
    WHERE table_name = 'available_imei_variants'
  `;
  checks.push({
    name: 'available_imei_variants view',
    pass: viewCheck.length > 0
  });

  // Display verification results
  checks.forEach(check => {
    if (check.pass) {
      console.log(`✅ ${check.name}`);
    } else {
      console.log(`❌ ${check.name}`);
    }
  });

  const allPass = checks.every(c => c.pass);

  console.log('\n' + '═'.repeat(60));

  if (allPass) {
    console.log('\n✅ All verifications passed! Your database is ready.\n');
    console.log('Next steps:');
    console.log('1. Run verification: node verify-imei-setup.mjs');
    console.log('2. (Optional) Migrate old data: node migrate-inventory-items-to-imei-variants.mjs');
    console.log('3. Start using the system!\n');
  } else {
    console.log('\n⚠️  Some verifications failed. Please check the output above.\n');
  }

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error('\nError details:', error);
  process.exit(1);
}

