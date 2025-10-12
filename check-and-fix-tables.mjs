#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const log = {
  info: (msg) => console.log(`\x1b[34mℹ\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m✅\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m❌\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m⚠\x1b[0m ${msg}`),
  step: (msg) => console.log(`\x1b[36m→\x1b[0m ${msg}`),
};

async function main() {
  const config = JSON.parse(readFileSync('database-config.json', 'utf-8'));
  const sql = neon(config.url);

  console.log('\n' + '='.repeat(50));
  console.log('🔍 Checking Database Tables');
  console.log('='.repeat(50) + '\n');

  try {
    // Check if settings tables exist and their structure
    log.step('Checking lats_pos_general_settings table...');
    
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lats_pos_general_settings'
      ORDER BY ordinal_position
    `;

    if (columns.length === 0) {
      log.warn('Table lats_pos_general_settings does not exist!');
      log.info('Need to create tables from schema...');
    } else {
      log.info(`Found ${columns.length} columns:`);
      columns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });

      // Check if user_id column exists
      const hasUserId = columns.some(col => col.column_name === 'user_id');
      if (!hasUserId) {
        log.error('Missing user_id column! Need to recreate table.');
        
        // Drop and recreate the table
        log.step('Recreating lats_pos_general_settings table...');
        
        await sql`DROP TABLE IF EXISTS lats_pos_general_settings CASCADE`;
        
        const createTableSQL = `
          CREATE TABLE lats_pos_general_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
            business_id TEXT,
            theme TEXT DEFAULT 'light',
            language TEXT DEFAULT 'en',
            currency TEXT DEFAULT 'USD',
            timezone TEXT DEFAULT 'UTC',
            date_format TEXT DEFAULT 'MM/DD/YYYY',
            time_format TEXT DEFAULT '12',
            show_product_images BOOLEAN DEFAULT true,
            show_stock_levels BOOLEAN DEFAULT true,
            show_prices BOOLEAN DEFAULT true,
            show_barcodes BOOLEAN DEFAULT true,
            products_per_page INTEGER DEFAULT 20,
            auto_complete_search BOOLEAN DEFAULT true,
            confirm_delete BOOLEAN DEFAULT true,
            show_confirmations BOOLEAN DEFAULT true,
            enable_sound_effects BOOLEAN DEFAULT true,
            sound_volume NUMERIC(3,2) DEFAULT 0.5,
            enable_click_sounds BOOLEAN DEFAULT true,
            enable_cart_sounds BOOLEAN DEFAULT true,
            enable_payment_sounds BOOLEAN DEFAULT true,
            enable_delete_sounds BOOLEAN DEFAULT true,
            enable_animations BOOLEAN DEFAULT true,
            enable_caching BOOLEAN DEFAULT true,
            cache_duration INTEGER DEFAULT 300000,
            enable_lazy_loading BOOLEAN DEFAULT true,
            max_search_results INTEGER DEFAULT 50,
            enable_tax BOOLEAN DEFAULT false,
            tax_rate NUMERIC(5,2) DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `;
        
        const parts = [createTableSQL];
        parts.raw = [createTableSQL];
        await sql(parts);
        
        log.success('Recreated lats_pos_general_settings table');
      }
    }

    log.success('\nDatabase check complete!');
    log.info('You can now run: npm run fix-database');

  } catch (error) {
    log.error(`Failed: ${error.message}`);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

main().catch(console.error);

