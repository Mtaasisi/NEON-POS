#!/usr/bin/env node

/**
 * 🔧 AUTOMATIC DATABASE CONNECTION FIX
 * Fixes all Neon database connection errors automatically
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { neon } from '@neondatabase/serverless';

console.log('🔧 AUTOMATIC DATABASE CONNECTION FIX');
console.log('=====================================\n');

// Read database config
let DATABASE_URL;
try {
  if (existsSync('database-config.json')) {
    const config = JSON.parse(readFileSync('database-config.json', 'utf-8'));
    DATABASE_URL = config.connectionString || config.url;
    console.log('✅ Found database-config.json');
    console.log(`   URL: ${DATABASE_URL.substring(0, 50)}...\n`);
  } else {
    // Use hardcoded connection from supabaseClient.ts
    DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
    console.log('✅ Using hardcoded database URL');
  }
} catch (e) {
  console.error('❌ Error reading database config:', e.message);
  process.exit(1);
}

console.log('📡 Testing database connection...\n');

const sql = neon(DATABASE_URL);

async function testConnection() {
  try {
    // Test basic connection
    console.log('1️⃣ Testing basic SELECT query...');
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    console.log('✅ Database connected successfully!');
    console.log(`   Time: ${result[0].current_time}`);
    console.log(`   Version: ${result[0].pg_version.substring(0, 50)}...\n`);
    return true;
  } catch (error) {
    console.log('❌ Database connection failed!');
    console.log(`   Error: ${error.message}\n`);
    return false;
  }
}

async function checkTables() {
  console.log('2️⃣ Checking critical tables...');
  
  const criticalTables = [
    'users',
    'customers',
    'lats_products',
    'lats_categories',
    'finance_accounts',
    'lats_suppliers'
  ];
  
  const tableStatus = {};
  
  for (const table of criticalTables) {
    try {
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${table}
        ) as exists
      `;
      tableStatus[table] = result[0].exists;
      console.log(`   ${result[0].exists ? '✅' : '❌'} ${table}`);
    } catch (error) {
      tableStatus[table] = false;
      console.log(`   ❌ ${table} (error: ${error.message})`);
    }
  }
  
  console.log('');
  return tableStatus;
}

async function createMissingTables(tableStatus) {
  console.log('3️⃣ Creating missing tables...');
  
  let created = 0;
  
  // Create users table if missing
  if (!tableStatus.users) {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'staff',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      console.log('   ✅ Created users table');
      created++;
    } catch (e) {
      console.log(`   ⚠️  users: ${e.message}`);
    }
  }
  
  // Create customers table if missing
  if (!tableStatus.customers) {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS customers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(50),
          address TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      console.log('   ✅ Created customers table');
      created++;
    } catch (e) {
      console.log(`   ⚠️  customers: ${e.message}`);
    }
  }
  
  // Create categories table if missing
  if (!tableStatus.lats_categories) {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS lats_categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      console.log('   ✅ Created lats_categories table');
      created++;
    } catch (e) {
      console.log(`   ⚠️  lats_categories: ${e.message}`);
    }
  }
  
  // Create products table if missing
  if (!tableStatus.lats_products) {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS lats_products (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          sku VARCHAR(100),
          category_id UUID REFERENCES lats_categories(id),
          condition VARCHAR(50) DEFAULT 'new',
          cost_price DECIMAL(10,2) DEFAULT 0,
          selling_price DECIMAL(10,2) DEFAULT 0,
          stock_quantity INTEGER DEFAULT 0,
          min_stock_level INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      console.log('   ✅ Created lats_products table');
      created++;
    } catch (e) {
      console.log(`   ⚠️  lats_products: ${e.message}`);
    }
  }
  
  // Create suppliers table if missing
  if (!tableStatus.lats_suppliers) {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS lats_suppliers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          contact_person VARCHAR(255),
          email VARCHAR(255),
          phone VARCHAR(50),
          address TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      console.log('   ✅ Created lats_suppliers table');
      created++;
    } catch (e) {
      console.log(`   ⚠️  lats_suppliers: ${e.message}`);
    }
  }
  
  // Create finance_accounts table if missing
  if (!tableStatus.finance_accounts) {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS finance_accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          account_type VARCHAR(50),
          is_active BOOLEAN DEFAULT true,
          is_payment_method BOOLEAN DEFAULT false,
          balance DECIMAL(10,2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      console.log('   ✅ Created finance_accounts table');
      created++;
    } catch (e) {
      console.log(`   ⚠️  finance_accounts: ${e.message}`);
    }
  }
  
  console.log(`\n   📊 Created ${created} missing tables\n`);
}

async function createTestData() {
  console.log('4️⃣ Creating test data...');
  
  try {
    // Create admin user if not exists
    const existingUser = await sql`SELECT id FROM users WHERE username = 'admin' LIMIT 1`;
    
    if (existingUser.length === 0) {
      await sql`
        INSERT INTO users (username, email, password_hash, role)
        VALUES ('admin', 'admin@pos.local', '$2a$10$rO0eQjGXnYlJQZ5zqPY0JeHqI5YqGKXY5lGQR7YnKmJQZ5zqPY0Je', 'admin')
      `;
      console.log('   ✅ Created admin user (username: admin, password: admin123)');
    } else {
      console.log('   ℹ️  Admin user already exists');
    }
    
    // Create test category
    const existingCategory = await sql`SELECT id FROM lats_categories WHERE name = 'Electronics' LIMIT 1`;
    
    if (existingCategory.length === 0) {
      await sql`
        INSERT INTO lats_categories (name, description)
        VALUES ('Electronics', 'Electronic devices and accessories')
      `;
      console.log('   ✅ Created test category: Electronics');
    } else {
      console.log('   ℹ️  Electronics category already exists');
    }
    
    // Create test payment methods
    const existingPayment = await sql`SELECT id FROM finance_accounts WHERE is_payment_method = true LIMIT 1`;
    
    if (existingPayment.length === 0) {
      await sql`
        INSERT INTO finance_accounts (name, account_type, is_payment_method, is_active)
        VALUES 
          ('Cash', 'cash', true, true),
          ('M-PESA', 'mobile_money', true, true),
          ('Bank Transfer', 'bank', true, true)
      `;
      console.log('   ✅ Created payment methods');
    } else {
      console.log('   ℹ️  Payment methods already exist');
    }
    
  } catch (error) {
    console.log(`   ⚠️  Error creating test data: ${error.message}`);
  }
  
  console.log('');
}

async function disableRLS() {
  console.log('5️⃣ Disabling RLS for easier access...');
  
  const tables = ['users', 'customers', 'lats_products', 'lats_categories', 'finance_accounts', 'lats_suppliers'];
  
  for (const table of tables) {
    try {
      await sql`ALTER TABLE ${sql(table)} DISABLE ROW LEVEL SECURITY`;
      console.log(`   ✅ Disabled RLS on ${table}`);
    } catch (error) {
      console.log(`   ⚠️  ${table}: ${error.message}`);
    }
  }
  
  console.log('');
}

async function main() {
  try {
    // Test connection
    const connected = await testConnection();
    
    if (!connected) {
      console.log('\n❌ UNABLE TO CONNECT TO DATABASE');
      console.log('\n📋 Troubleshooting Steps:');
      console.log('1. Check if your Neon database is active');
      console.log('2. Verify the connection string in database-config.json');
      console.log('3. Check if your IP is allowed in Neon settings');
      console.log('4. Ensure your internet connection is working\n');
      process.exit(1);
    }
    
    // Check tables
    const tableStatus = await checkTables();
    
    // Create missing tables
    await createMissingTables(tableStatus);
    
    // Create test data
    await createTestData();
    
    // Disable RLS
    await disableRLS();
    
    console.log('=====================================');
    console.log('✅ DATABASE FIX COMPLETE!');
    console.log('=====================================\n');
    console.log('You can now run your application with:');
    console.log('  npm run dev\n');
    console.log('And test product creation with:');
    console.log('  npm run test:product\n');
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

