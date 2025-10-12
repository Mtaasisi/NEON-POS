#!/usr/bin/env node

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbConfig = JSON.parse(readFileSync(join(__dirname, 'database-config.json'), 'utf-8'));
const sql = postgres(dbConfig.url, { ssl: 'require', max: 10 });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

async function importImages() {
  try {
    log.title('🖼️  Checking Product Images Table');

    // Check if product_images table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'product_images'
      )
    `;

    if (!tableCheck[0].exists) {
      log.error('product_images table does not exist!');
      log.info('Creating product_images table...');
      
      await sql`
        CREATE TABLE product_images (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          product_id UUID REFERENCES lats_products(id) ON DELETE CASCADE,
          image_url TEXT,
          thumbnail_url TEXT,
          file_name TEXT,
          file_size INTEGER,
          mime_type TEXT,
          is_primary BOOLEAN DEFAULT false,
          display_order INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      
      log.success('Created product_images table');
    } else {
      log.success('product_images table exists');
    }

    // Load backup
    const backupPath = '/Users/mtaasisi/Downloads/database-backup-2025-10-01T22-09-09-482Z.json';
    log.info(`Loading backup file...`);
    const backupData = JSON.parse(readFileSync(backupPath, 'utf-8'));
    
    const images = backupData.tables.product_images?.data || [];
    log.info(`Found ${images.length} product images in backup`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const image of images) {
      try {
        // Check if image already exists
        const existing = await sql`
          SELECT id FROM product_images WHERE id = ${image.id}
        `;

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        // Insert image
        await sql`
          INSERT INTO product_images (
            id, product_id, image_url, thumbnail_url, file_name,
            file_size, mime_type, is_primary, created_at, updated_at
          ) VALUES (
            ${image.id},
            ${image.product_id},
            ${image.image_url || null},
            ${image.thumbnail_url || null},
            ${image.file_name || null},
            ${image.file_size || null},
            ${image.mime_type || null},
            ${image.is_primary || false},
            ${image.created_at || new Date().toISOString()},
            ${image.updated_at || new Date().toISOString()}
          )
        `;

        created++;
        log.success(`Imported image: ${image.file_name || image.id}`);

      } catch (error) {
        errors++;
        log.error(`Failed to import image: ${error.message}`);
      }
    }

    log.title('📊 Import Summary');
    console.log(`
${colors.bright}Product Images:${colors.reset}
  ✓ Created: ${colors.green}${created}${colors.reset}
  ⊘ Skipped: ${colors.yellow}${skipped}${colors.reset}
  ✗ Errors: ${errors > 0 ? colors.red : colors.green}${errors}${colors.reset}
    `);

    if (errors === 0) {
      log.success('🎉 Image import completed successfully!');
    } else {
      log.warn(`⚠️  Image import completed with ${errors} errors`);
    }

  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

importImages();

