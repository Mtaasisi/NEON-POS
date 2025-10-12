#!/usr/bin/env node
/**
 * Create all essential POS tables for Neon Database
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.VITE_DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ VITE_DATABASE_URL is not set');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function createTables() {
  console.log('🚀 Creating POS Database Tables...\n');
  console.log('═'.repeat(60));

  let successCount = 0;
  let errorCount = 0;

  // 1. Customers Table
  console.log('\n📝 Creating customers table...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        gender TEXT,
        city TEXT,
        joined_date DATE,
        loyalty_level TEXT DEFAULT 'bronze',
        color_tag TEXT,
        total_spent NUMERIC DEFAULT 0,
        points INTEGER DEFAULT 0,
        last_visit TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true,
        referral_source TEXT,
        birth_month TEXT,
        birth_day TEXT,
        customer_tag TEXT,
        notes TEXT,
        total_returns INTEGER DEFAULT 0,
        initial_notes TEXT,
        location_description TEXT,
        national_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ Customers table created');
    successCount++;
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}`);
    errorCount++;
  }

  // 2. Devices Table
  console.log('\n📝 Creating devices table...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID REFERENCES customers(id),
        device_name TEXT NOT NULL,
        brand TEXT,
        model TEXT,
        serial_number TEXT,
        imei TEXT,
        problem_description TEXT,
        diagnostic_notes TEXT,
        repair_notes TEXT,
        status TEXT DEFAULT 'pending',
        estimated_cost NUMERIC DEFAULT 0,
        actual_cost NUMERIC DEFAULT 0,
        deposit_amount NUMERIC DEFAULT 0,
        balance_amount NUMERIC DEFAULT 0,
        technician_id UUID,
        intake_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        estimated_completion_date TIMESTAMP WITH TIME ZONE,
        actual_completion_date TIMESTAMP WITH TIME ZONE,
        pickup_date TIMESTAMP WITH TIME ZONE,
        warranty_expiry_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ Devices table created');
    successCount++;
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}`);
    errorCount++;
  }

  // 3. User Daily Goals
  console.log('\n📝 Creating user_daily_goals table...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS user_daily_goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        date DATE NOT NULL,
        goal_amount NUMERIC DEFAULT 0,
        achieved_amount NUMERIC DEFAULT 0,
        is_achieved BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, date)
      )
    `;
    console.log('✅ User daily goals table created');
    successCount++;
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}`);
    errorCount++;
  }

  // 4. Categories
  console.log('\n📝 Creating lats_categories table...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS lats_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        icon TEXT,
        color TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ Categories table created');
    successCount++;
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}`);
    errorCount++;
  }

  // 5. Products
  console.log('\n📝 Creating lats_products table...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS lats_products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        sku TEXT UNIQUE,
        barcode TEXT,
        category_id UUID REFERENCES lats_categories(id),
        unit_price NUMERIC DEFAULT 0,
        cost_price NUMERIC DEFAULT 0,
        stock_quantity INTEGER DEFAULT 0,
        min_stock_level INTEGER DEFAULT 0,
        max_stock_level INTEGER DEFAULT 1000,
        is_active BOOLEAN DEFAULT true,
        image_url TEXT,
        supplier_id UUID,
        brand TEXT,
        model TEXT,
        warranty_period INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ Products table created');
    successCount++;
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}`);
    errorCount++;
  }

  // 6. Sales
  console.log('\n📝 Creating lats_sales table...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS lats_sales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sale_number TEXT UNIQUE NOT NULL,
        customer_id UUID REFERENCES customers(id),
        user_id UUID,
        total_amount NUMERIC DEFAULT 0,
        discount_amount NUMERIC DEFAULT 0,
        tax_amount NUMERIC DEFAULT 0,
        final_amount NUMERIC DEFAULT 0,
        payment_method TEXT DEFAULT 'cash',
        payment_status TEXT DEFAULT 'completed',
        status TEXT DEFAULT 'completed',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ Sales table created');
    successCount++;
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}`);
    errorCount++;
  }

  // 7. Sale Items
  console.log('\n📝 Creating lats_sale_items table...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS lats_sale_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sale_id UUID REFERENCES lats_sales(id) ON DELETE CASCADE,
        product_id UUID REFERENCES lats_products(id),
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price NUMERIC NOT NULL,
        discount NUMERIC DEFAULT 0,
        subtotal NUMERIC NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ Sale items table created');
    successCount++;
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}`);
    errorCount++;
  }

  // 8. Customer Payments
  console.log('\n📝 Creating customer_payments table...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS customer_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID REFERENCES customers(id),
        device_id UUID REFERENCES devices(id),
        amount NUMERIC NOT NULL,
        method TEXT DEFAULT 'cash',
        payment_type TEXT DEFAULT 'payment',
        status TEXT DEFAULT 'completed',
        reference_number TEXT,
        notes TEXT,
        payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ Customer payments table created');
    successCount++;
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}`);
    errorCount++;
  }

  // 9. Suppliers
  console.log('\n📝 Creating lats_suppliers table...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS lats_suppliers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        contact_person TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        country TEXT,
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ Suppliers table created');
    successCount++;
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}`);
    errorCount++;
  }

  // 10. Customer Notes
  console.log('\n📝 Creating customer_notes table...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS customer_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID REFERENCES customers(id),
        note TEXT NOT NULL,
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ Customer notes table created');
    successCount++;
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}`);
    errorCount++;
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Successful: ${successCount}/10`);
  console.log(`   ❌ Errors: ${errorCount}/10`);

  // Verify tables
  console.log(`\n🔍 Verifying created tables...\n`);
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  
  console.log(`✅ Total tables in database: ${tables.length}\n`);
  tables.forEach((t: any, i: number) => {
    console.log(`   ${i + 1}. ${t.table_name}`);
  });

  console.log('\n' + '═'.repeat(60));
  console.log('\n✅ Database setup complete! Your POS system is ready.\n');
}

createTables().catch(console.error);

