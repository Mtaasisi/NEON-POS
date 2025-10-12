#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { neon } from '@neondatabase/serverless';

console.log('\n=====================================');
console.log('📦 IMPORTING CATEGORIES FROM BACKUP');
console.log('=====================================\n');

// Get database URL
let DATABASE_URL;
if (existsSync('database-config.json')) {
  const config = JSON.parse(readFileSync('database-config.json', 'utf-8'));
  DATABASE_URL = config.connectionString || config.url;
  console.log('✅ Found database-config.json');
} else {
  DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
  console.log('✅ Using hardcoded database URL');
}

const sql = neon(DATABASE_URL);

async function importCategories() {
  try {
    console.log('📖 Reading backup file...');
    const backupPath = '/Users/mtaasisi/Downloads/database-backup-2025-10-01T22-09-09-482Z.json';
    
    if (!existsSync(backupPath)) {
      console.error('❌ Backup file not found at:', backupPath);
      process.exit(1);
    }

    const backup = JSON.parse(readFileSync(backupPath, 'utf-8'));
    
    if (!backup.tables || !backup.tables.lats_categories) {
      console.error('❌ No categories found in backup');
      process.exit(1);
    }

    const categories = backup.tables.lats_categories.data;
    console.log(`✅ Found ${categories.length} categories in backup\n`);

    // Check if table exists
    console.log('🔍 Checking if lats_categories table exists...');
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'lats_categories'
      );
    `;
    
    if (!tableCheck[0].exists) {
      console.log('📋 Creating lats_categories table...');
      await sql`
        CREATE TABLE IF NOT EXISTS lats_categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          color VARCHAR(50),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          parent_id UUID REFERENCES lats_categories(id) ON DELETE SET NULL,
          is_active BOOLEAN DEFAULT true,
          sort_order INTEGER DEFAULT 0,
          icon VARCHAR(50),
          metadata JSONB
        );
      `;
      console.log('✅ Table created\n');
    } else {
      console.log('✅ Table exists\n');
    }

    // Get existing categories
    console.log('🔍 Checking for existing categories...');
    const existingCategories = await sql`SELECT id FROM lats_categories`;
    const existingIds = new Set(existingCategories.map(c => c.id));
    console.log(`   Found ${existingIds.size} existing categories\n`);

    // Import categories
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    console.log('📥 Starting import...\n');

    for (const category of categories) {
      try {
        if (existingIds.has(category.id)) {
          console.log(`⏭️  Skipping existing: ${category.name}`);
          skipped++;
          continue;
        }

        await sql`
          INSERT INTO lats_categories (
            id, name, description, color, created_at, updated_at,
            parent_id, is_active, sort_order, icon, metadata
          ) VALUES (
            ${category.id},
            ${category.name},
            ${category.description},
            ${category.color},
            ${category.created_at},
            ${category.updated_at},
            ${category.parent_id},
            ${category.is_active},
            ${category.sort_order},
            ${category.icon},
            ${category.metadata ? JSON.stringify(category.metadata) : null}
          )
        `;

        console.log(`✅ Imported: ${category.name}`);
        imported++;
      } catch (error) {
        console.error(`❌ Error importing ${category.name}:`, error.message);
        errors++;
      }
    }

    // Summary
    console.log('\n=====================================');
    console.log('📊 IMPORT SUMMARY');
    console.log('=====================================');
    console.log(`✅ Successfully imported: ${imported}`);
    console.log(`⏭️  Skipped (already exist): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📦 Total categories in backup: ${categories.length}`);
    console.log('=====================================\n');

    // Verify final count
    const finalCount = await sql`SELECT COUNT(*) FROM lats_categories`;
    console.log(`✅ Total categories now in database: ${finalCount[0].count}\n`);

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

importCategories();

