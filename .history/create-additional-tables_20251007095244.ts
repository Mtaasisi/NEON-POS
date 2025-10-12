#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();
const sql = neon(process.env.VITE_DATABASE_URL!);

async function createAdditionalTables() {
  console.log('🚀 Creating Additional POS Tables...\n');
  
  let successCount = 0;
  let errorCount = 0;

  // Product Variants
  console.log('📝 Creating lats_product_variants...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS lats_product_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES lats_products(id) ON DELETE CASCADE,
        variant_name TEXT NOT NULL,
        sku TEXT UNIQUE,
        barcode TEXT,
        quantity INTEGER DEFAULT 0,
        min_quantity INTEGER DEFAULT 5,
        unit_price NUMERIC DEFAULT 0,
        cost_price NUMERIC DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ lats_product_variants created');
    successCount++;
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}`);
    errorCount++;
  }

  // Settings tables
  console.log('\n📝 Creating lats_pos_general_settings...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS lats_pos_general_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT UNIQUE NOT NULL,
        value JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ lats_pos_general_settings created');
    successCount++;
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}`);
    errorCount++;
  }

  console.log('\n📝 Creating lats_pos_receipt_settings...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS lats_pos_receipt_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT UNIQUE NOT NULL,
        value JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ lats_pos_receipt_settings created');
    successCount++;
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}`);
    errorCount++;
  }

  console.log('\n📝 Creating lats_pos_advanced_settings...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS lats_pos_advanced_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT UNIQUE NOT NULL,
        value JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ lats_pos_advanced_settings created');
    successCount++;
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}`);
    errorCount++;
  }

  // Purchase Orders
  console.log('\n📝 Creating lats_purchase_orders...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS lats_purchase_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        po_number TEXT UNIQUE NOT NULL,
        supplier_id UUID REFERENCES lats_suppliers(id),
        status TEXT DEFAULT 'pending',
        total_amount NUMERIC DEFAULT 0,
        notes TEXT,
        order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expected_delivery_date TIMESTAMP WITH TIME ZONE,
        received_date TIMESTAMP WITH TIME ZONE,
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ lats_purchase_orders created');
    successCount++;
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}`);
    errorCount++;
  }

  // Stock Movements
  console.log('\n📝 Creating lats_stock_movements...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS lats_stock_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES lats_products(id),
        variant_id UUID REFERENCES lats_product_variants(id),
        movement_type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        reference_type TEXT,
        reference_id UUID,
        notes TEXT,
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ lats_stock_movements created');
    successCount++;
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}`);
    errorCount++;
  }

  // Employees
  console.log('\n📝 Creating employees...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS employees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        full_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        position TEXT,
        department TEXT,
        hire_date DATE,
        is_active BOOLEAN DEFAULT true,
        salary NUMERIC,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ employees created');
    successCount++;
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}`);
    errorCount++;
  }

  // Appointments
  console.log('\n📝 Creating appointments...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS appointments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID REFERENCES customers(id),
        device_id UUID REFERENCES devices(id),
        technician_id UUID,
        appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
        duration_minutes INTEGER DEFAULT 60,
        status TEXT DEFAULT 'scheduled',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ appointments created');
    successCount++;
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}`);
    errorCount++;
  }

  // System Settings
  console.log('\n📝 Creating system_settings...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS system_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        setting_key TEXT UNIQUE NOT NULL,
        setting_value JSONB,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ system_settings created');
    successCount++;
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}`);
    errorCount++;
  }

  // Audit Logs
  console.log('\n📝 Creating audit_logs...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        action TEXT NOT NULL,
        table_name TEXT,
        record_id UUID,
        old_data JSONB,
        new_data JSONB,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ audit_logs created');
    successCount++;
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}`);
    errorCount++;
  }

  console.log(`\n📊 Summary: ✅ ${successCount} successful, ❌ ${errorCount} errors`);
  
  // List all tables now
  console.log('\n📋 Final table list:');
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  tables.forEach((t: any) => console.log(`   - ${t.table_name}`));
  
  console.log('\n✅ Done!\n');
}

createAdditionalTables().catch(console.error);

