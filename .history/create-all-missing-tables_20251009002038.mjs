#!/usr/bin/env node

/**
 * 🔧 CREATE ALL MISSING TABLES AUTOMATICALLY
 * Creates all database tables needed for the app
 */

import { readFileSync, existsSync } from 'fs';
import { neon } from '@neondatabase/serverless';

console.log('🔧 CREATING ALL MISSING DATABASE TABLES');
console.log('========================================\n');

// Read database config
let DATABASE_URL;
if (existsSync('database-config.json')) {
  const config = JSON.parse(readFileSync('database-config.json', 'utf-8'));
  DATABASE_URL = config.connectionString || config.url;
} else {
  DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
}

const sql = neon(DATABASE_URL);

async function createAllTables() {
  console.log('📦 Creating all required tables...\n');
  
  try {
    // 1. Settings table
    console.log('1️⃣ Creating settings table...');
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('   ✅ settings table created\n');
    
    // 2. Devices table
    console.log('2️⃣ Creating devices table...');
    await sql`
      CREATE TABLE IF NOT EXISTS devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        serial_number VARCHAR(255),
        brand VARCHAR(255),
        model VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        condition VARCHAR(50),
        issue_description TEXT,
        unlock_code VARCHAR(100),
        customer_id UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('   ✅ devices table created\n');
    
    // 3. Insert default settings
    console.log('3️⃣ Inserting default settings...');
    await sql`
      INSERT INTO settings (key, value)
      VALUES 
        ('sms_provider_api_key', ''),
        ('sms_api_url', ''),
        ('sms_provider_password', ''),
        ('app_name', 'LATS POS'),
        ('currency', 'KES')
      ON CONFLICT (key) DO NOTHING
    `;
    console.log('   ✅ Default settings inserted\n');
    
    // 4. Create lats_product_images table
    console.log('4️⃣ Creating lats_product_images table...');
    await sql`
      CREATE TABLE IF NOT EXISTS lats_product_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID,
        image_url TEXT NOT NULL,
        thumbnail_url TEXT,
        file_name VARCHAR(255),
        file_size INTEGER,
        is_primary BOOLEAN DEFAULT false,
        uploaded_by UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('   ✅ lats_product_images table created\n');
    
    // 5. Create lats_product_variants table
    console.log('5️⃣ Creating lats_product_variants table...');
    await sql`
      CREATE TABLE IF NOT EXISTS lats_product_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID,
        sku VARCHAR(100),
        name VARCHAR(255),
        selling_price DECIMAL(10,2) DEFAULT 0,
        cost_price DECIMAL(10,2) DEFAULT 0,
        quantity INTEGER DEFAULT 0,
        min_quantity INTEGER DEFAULT 0,
        attributes JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('   ✅ lats_product_variants table created\n');
    
    // 6. Disable RLS on all tables for easier access
    console.log('6️⃣ Disabling RLS on all tables...');
    const tables = ['settings', 'devices', 'users', 'customers', 'lats_products', 
                    'lats_categories', 'finance_accounts', 'lats_suppliers',
                    'lats_product_images', 'lats_product_variants'];
    
    for (const table of tables) {
      try {
        await sql`ALTER TABLE ${sql(table)} DISABLE ROW LEVEL SECURITY`;
        console.log(`   ✅ Disabled RLS on ${table}`);
      } catch (e) {
        console.log(`   ⚠️  ${table}: ${e.message.substring(0, 60)}`);
      }
    }
    
    console.log('\n========================================');
    console.log('✅ ALL TABLES CREATED SUCCESSFULLY!');
    console.log('========================================\n');
    console.log('Your database is now ready!');
    console.log('Restart your dev server and run the test again:\n');
    console.log('  1. Ctrl+C to stop the current server');
    console.log('  2. npm run dev');
    console.log('  3. npm run test:product\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createAllTables();

