#!/usr/bin/env node

/**
 * Quality Check System Migration Runner
 * 
 * This script creates all necessary tables and functions for the quality check system
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable not set');
  console.error('Please ensure your .env file contains DATABASE_URL');
  process.exit(1);
}

async function runMigration() {
  console.log('🚀 Starting Quality Check System Migration...\n');
  
  // Create SQL connection
  const sql = postgres(DATABASE_URL, {
    max: 1,
    ssl: 'require',
    connection: {
      application_name: 'quality-check-migration'
    }
  });

  try {
    // Read migration SQL file
    const migrationPath = join(__dirname, 'migrations', 'create_quality_check_system.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Execute migration
    console.log('⚙️  Executing migration...\n');
    await sql.unsafe(migrationSQL);

    console.log('✅ Migration completed successfully!\n');

    // Verify tables were created
    console.log('🔍 Verifying created tables...\n');
    
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%quality%'
      ORDER BY table_name
    `;

    console.log('📋 Quality Check Tables:');
    tables.forEach(table => {
      console.log(`   ✓ ${table.table_name}`);
    });

    // Count templates
    const [templateCount] = await sql`
      SELECT COUNT(*) as count FROM quality_check_templates
    `;
    console.log(`\n📦 Templates available: ${templateCount.count}`);

    // List templates
    const templates = await sql`
      SELECT id, name, category FROM quality_check_templates WHERE is_active = true
    `;
    console.log('\n📋 Available Templates:');
    templates.forEach(template => {
      console.log(`   ✓ ${template.name} (${template.category}) - ID: ${template.id}`);
    });

    // Count criteria
    const [criteriaCount] = await sql`
      SELECT COUNT(*) as count FROM quality_check_criteria
    `;
    console.log(`\n✓ Total criteria items: ${criteriaCount.count}`);

    // Verify functions
    console.log('\n🔍 Verifying database functions...\n');
    const functions = await sql`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND (
          routine_name LIKE '%quality%'
          OR routine_name = 'add_quality_items_to_inventory_v2'
        )
      ORDER BY routine_name
    `;

    console.log('⚙️  Quality Check Functions:');
    functions.forEach(func => {
      console.log(`   ✓ ${func.routine_name}()`);
    });

    console.log('\n✅ All verifications passed!');
    console.log('\n🎉 Quality Check System is ready to use!\n');
    console.log('📝 Summary:');
    console.log(`   - ${tables.length} tables created`);
    console.log(`   - ${templateCount.count} templates available`);
    console.log(`   - ${criteriaCount.count} criteria items`);
    console.log(`   - ${functions.length} database functions`);
    console.log('\n💡 You can now use the Quality Check feature in your application.\n');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run migration
runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

