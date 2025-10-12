#!/usr/bin/env node
/**
 * Complete Database Schema Setup for POS System
 * This creates ALL tables needed for the full application
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();
const sql = neon(process.env.VITE_DATABASE_URL!);

let totalSuccess = 0;
let totalErrors = 0;

async function createTable(name: string, sqlQuery: any) {
  try {
    await sqlQuery;
    console.log(`✅ ${name}`);
    totalSuccess++;
    return true;
  } catch (err: any) {
    if (err.message.includes('already exists')) {
      console.log(`ℹ️  ${name} (already exists)`);
      totalSuccess++;
      return true;
    }
    console.log(`❌ ${name}: ${err.message}`);
    totalErrors++;
    return false;
  }
}

async function createCompleteSchema() {
  console.log('🚀 Creating Complete POS Database Schema\n');
  console.log('═'.repeat(70));
  
  // ==================== AUTHENTICATION & USERS ====================
  console.log('\n👥 AUTHENTICATION & USERS');
  console.log('─'.repeat(70));
  
  await createTable('users', sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT,
      role TEXT DEFAULT 'user',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('auth_users', `
    CREATE TABLE IF NOT EXISTS auth_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      username TEXT,
      name TEXT,
      role TEXT DEFAULT 'technician',
      is_active BOOLEAN DEFAULT true,
      permissions TEXT[],
      max_devices_allowed INTEGER DEFAULT 10,
      require_approval BOOLEAN DEFAULT false,
      failed_login_attempts INTEGER DEFAULT 0,
      two_factor_enabled BOOLEAN DEFAULT false,
      two_factor_secret TEXT,
      last_login TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('user_settings', `
    CREATE TABLE IF NOT EXISTS user_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      setting_key TEXT NOT NULL,
      setting_value JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, setting_key)
    )
  `);

  await createTable('user_daily_goals', `
    CREATE TABLE IF NOT EXISTS user_daily_goals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      date DATE NOT NULL,
      goal_type TEXT NOT NULL,
      goal_value NUMERIC DEFAULT 0,
      achieved_value NUMERIC DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, date, goal_type)
    )
  `);

  await createTable('employees', `
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
  `);

  // ==================== CUSTOMER MANAGEMENT ====================
  console.log('\n👤 CUSTOMER MANAGEMENT');
  console.log('─'.repeat(70));

  await createTable('customers', `
    CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      gender TEXT,
      city TEXT,
      address TEXT,
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
  `);

  await createTable('customer_notes', `
    CREATE TABLE IF NOT EXISTS customer_notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
      note TEXT NOT NULL,
      note_type TEXT DEFAULT 'general',
      created_by UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('customer_checkins', `
    CREATE TABLE IF NOT EXISTS customer_checkins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
      checkin_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      checkout_date TIMESTAMP WITH TIME ZONE,
      purpose TEXT,
      notes TEXT,
      created_by UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('customer_revenue', `
    CREATE TABLE IF NOT EXISTS customer_revenue (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
      revenue_date DATE NOT NULL,
      revenue_amount NUMERIC DEFAULT 0,
      revenue_source TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // ==================== CONTACT MANAGEMENT ====================
  console.log('\n📞 CONTACT MANAGEMENT');
  console.log('─'.repeat(70));

  await createTable('contact_methods', `
    CREATE TABLE IF NOT EXISTS contact_methods (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
      method_type TEXT NOT NULL,
      contact_value TEXT NOT NULL,
      is_primary BOOLEAN DEFAULT false,
      is_verified BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('contact_preferences', `
    CREATE TABLE IF NOT EXISTS contact_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
      preference_type TEXT NOT NULL,
      preference_value JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('contact_history', `
    CREATE TABLE IF NOT EXISTS contact_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
      contact_type TEXT NOT NULL,
      contact_method TEXT,
      contact_subject TEXT,
      contact_notes TEXT,
      contacted_by UUID,
      contacted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // ==================== DEVICE MANAGEMENT ====================
  console.log('\n🔧 DEVICE MANAGEMENT');
  console.log('─'.repeat(70));

  await createTable('devices', `
    CREATE TABLE IF NOT EXISTS devices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
      device_name TEXT NOT NULL,
      brand TEXT,
      model TEXT,
      serial_number TEXT,
      imei TEXT,
      problem_description TEXT,
      diagnostic_notes TEXT,
      repair_notes TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'normal',
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
      password TEXT,
      accessories TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('device_attachments', `
    CREATE TABLE IF NOT EXISTS device_attachments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER,
      uploaded_by UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('device_checklists', `
    CREATE TABLE IF NOT EXISTS device_checklists (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
      checklist_item TEXT NOT NULL,
      is_checked BOOLEAN DEFAULT false,
      checked_by UUID,
      checked_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('device_ratings', `
    CREATE TABLE IF NOT EXISTS device_ratings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
      customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
      rating INTEGER CHECK (rating >= 1 AND rating <= 5),
      review_text TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('device_remarks', `
    CREATE TABLE IF NOT EXISTS device_remarks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
      remark TEXT NOT NULL,
      remark_type TEXT DEFAULT 'general',
      created_by UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('device_transitions', `
    CREATE TABLE IF NOT EXISTS device_transitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT NOT NULL,
      transitioned_by UUID,
      transition_notes TEXT,
      transitioned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // ==================== DIAGNOSTIC SYSTEM ====================
  console.log('\n🔍 DIAGNOSTIC SYSTEM');
  console.log('─'.repeat(70));

  await createTable('diagnostic_templates', `
    CREATE TABLE IF NOT EXISTS diagnostic_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_name TEXT NOT NULL,
      device_type TEXT,
      checklist_items JSONB,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('diagnostic_requests', `
    CREATE TABLE IF NOT EXISTS diagnostic_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
      template_id UUID REFERENCES diagnostic_templates(id),
      requested_by UUID,
      status TEXT DEFAULT 'pending',
      requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('diagnostic_checks', `
    CREATE TABLE IF NOT EXISTS diagnostic_checks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      request_id UUID REFERENCES diagnostic_requests(id) ON DELETE CASCADE,
      check_name TEXT NOT NULL,
      check_result TEXT,
      is_passed BOOLEAN,
      checked_by UUID,
      checked_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('diagnostic_devices', `
    CREATE TABLE IF NOT EXISTS diagnostic_devices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
      diagnostic_data JSONB,
      diagnostic_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // ==================== PRODUCT & INVENTORY ====================
  console.log('\n📦 PRODUCT & INVENTORY');
  console.log('─'.repeat(70));

  await createTable('lats_categories', `
    CREATE TABLE IF NOT EXISTS lats_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      icon TEXT,
      color TEXT,
      parent_category_id UUID REFERENCES lats_categories(id),
      is_active BOOLEAN DEFAULT true,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('lats_suppliers', `
    CREATE TABLE IF NOT EXISTS lats_suppliers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      contact_person TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      country TEXT,
      tax_id TEXT,
      payment_terms TEXT,
      is_active BOOLEAN DEFAULT true,
      notes TEXT,
      rating NUMERIC(2,1),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('lats_products', `
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
      reorder_point INTEGER DEFAULT 10,
      is_active BOOLEAN DEFAULT true,
      image_url TEXT,
      images JSONB,
      supplier_id UUID REFERENCES lats_suppliers(id),
      brand TEXT,
      model TEXT,
      warranty_period INTEGER,
      weight NUMERIC,
      dimensions TEXT,
      tax_rate NUMERIC DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('lats_product_variants', `
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
      variant_attributes JSONB,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('product_images', `
    CREATE TABLE IF NOT EXISTS product_images (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID REFERENCES lats_products(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      image_alt TEXT,
      display_order INTEGER DEFAULT 0,
      is_primary BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('lats_stock_movements', `
    CREATE TABLE IF NOT EXISTS lats_stock_movements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID REFERENCES lats_products(id),
      variant_id UUID REFERENCES lats_product_variants(id),
      movement_type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      reference_type TEXT,
      reference_id UUID,
      from_location TEXT,
      to_location TEXT,
      notes TEXT,
      created_by UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('lats_purchase_orders', `
    CREATE TABLE IF NOT EXISTS lats_purchase_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      po_number TEXT UNIQUE NOT NULL,
      supplier_id UUID REFERENCES lats_suppliers(id),
      status TEXT DEFAULT 'pending',
      total_amount NUMERIC DEFAULT 0,
      tax_amount NUMERIC DEFAULT 0,
      shipping_cost NUMERIC DEFAULT 0,
      discount_amount NUMERIC DEFAULT 0,
      final_amount NUMERIC DEFAULT 0,
      notes TEXT,
      order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      expected_delivery_date TIMESTAMP WITH TIME ZONE,
      received_date TIMESTAMP WITH TIME ZONE,
      created_by UUID,
      approved_by UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('lats_purchase_order_items', `
    CREATE TABLE IF NOT EXISTS lats_purchase_order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      purchase_order_id UUID REFERENCES lats_purchase_orders(id) ON DELETE CASCADE,
      product_id UUID REFERENCES lats_products(id),
      variant_id UUID REFERENCES lats_product_variants(id),
      quantity_ordered INTEGER NOT NULL,
      quantity_received INTEGER DEFAULT 0,
      unit_cost NUMERIC NOT NULL,
      subtotal NUMERIC NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // ==================== SALES & TRANSACTIONS ====================
  console.log('\n💰 SALES & TRANSACTIONS');
  console.log('─'.repeat(70));

  await createTable('lats_sales', `
    CREATE TABLE IF NOT EXISTS lats_sales (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sale_number TEXT UNIQUE NOT NULL,
      customer_id UUID REFERENCES customers(id),
      user_id UUID,
      cashier_name TEXT,
      sold_by TEXT,
      total_amount NUMERIC DEFAULT 0,
      discount_amount NUMERIC DEFAULT 0,
      discount_percentage NUMERIC DEFAULT 0,
      tax_amount NUMERIC DEFAULT 0,
      final_amount NUMERIC DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      payment_status TEXT DEFAULT 'completed',
      status TEXT DEFAULT 'completed',
      notes TEXT,
      receipt_number TEXT,
      invoice_number TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('lats_sale_items', `
    CREATE TABLE IF NOT EXISTS lats_sale_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sale_id UUID REFERENCES lats_sales(id) ON DELETE CASCADE,
      product_id UUID REFERENCES lats_products(id),
      variant_id UUID REFERENCES lats_product_variants(id),
      product_name TEXT NOT NULL,
      product_sku TEXT,
      quantity INTEGER NOT NULL,
      unit_price NUMERIC NOT NULL,
      cost_price NUMERIC DEFAULT 0,
      discount NUMERIC DEFAULT 0,
      discount_percentage NUMERIC DEFAULT 0,
      tax NUMERIC DEFAULT 0,
      subtotal NUMERIC NOT NULL,
      profit NUMERIC DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // ==================== PAYMENT SYSTEM ====================
  console.log('\n💳 PAYMENT SYSTEM');
  console.log('─'.repeat(70));

  await createTable('customer_payments', `
    CREATE TABLE IF NOT EXISTS customer_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID REFERENCES customers(id),
      device_id UUID REFERENCES devices(id),
      sale_id UUID REFERENCES lats_sales(id),
      amount NUMERIC NOT NULL,
      method TEXT DEFAULT 'cash',
      payment_type TEXT DEFAULT 'payment',
      status TEXT DEFAULT 'completed',
      reference_number TEXT,
      transaction_id TEXT,
      notes TEXT,
      payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_by UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('installment_payments', `
    CREATE TABLE IF NOT EXISTS installment_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id UUID REFERENCES devices(id),
      customer_id UUID REFERENCES customers(id),
      total_amount NUMERIC NOT NULL,
      paid_amount NUMERIC DEFAULT 0,
      remaining_amount NUMERIC NOT NULL,
      installment_count INTEGER DEFAULT 1,
      installment_amount NUMERIC NOT NULL,
      next_due_date DATE,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('gift_cards', `
    CREATE TABLE IF NOT EXISTS gift_cards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      card_number TEXT UNIQUE NOT NULL,
      initial_balance NUMERIC NOT NULL,
      current_balance NUMERIC NOT NULL,
      customer_id UUID REFERENCES customers(id),
      status TEXT DEFAULT 'active',
      issued_by UUID,
      issued_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      expiry_date TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('gift_card_transactions', `
    CREATE TABLE IF NOT EXISTS gift_card_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      gift_card_id UUID REFERENCES gift_cards(id) ON DELETE CASCADE,
      transaction_type TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      balance_after NUMERIC NOT NULL,
      sale_id UUID REFERENCES lats_sales(id),
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // ==================== FINANCIAL MANAGEMENT ====================
  console.log('\n💵 FINANCIAL MANAGEMENT');
  console.log('─'.repeat(70));

  await createTable('finance_accounts', `
    CREATE TABLE IF NOT EXISTS finance_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_name TEXT NOT NULL,
      account_type TEXT NOT NULL,
      account_number TEXT,
      bank_name TEXT,
      current_balance NUMERIC DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('finance_expense_categories', `
    CREATE TABLE IF NOT EXISTS finance_expense_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category_name TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('finance_expenses', `
    CREATE TABLE IF NOT EXISTS finance_expenses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      expense_category_id UUID REFERENCES finance_expense_categories(id),
      account_id UUID REFERENCES finance_accounts(id),
      expense_date DATE NOT NULL,
      amount NUMERIC NOT NULL,
      description TEXT,
      receipt_number TEXT,
      vendor TEXT,
      payment_method TEXT DEFAULT 'cash',
      created_by UUID,
      approved_by UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('finance_transfers', `
    CREATE TABLE IF NOT EXISTS finance_transfers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      from_account_id UUID REFERENCES finance_accounts(id),
      to_account_id UUID REFERENCES finance_accounts(id),
      transfer_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      amount NUMERIC NOT NULL,
      description TEXT,
      reference_number TEXT,
      created_by UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // ==================== COMMUNICATION ====================
  console.log('\n📧 COMMUNICATION');
  console.log('─'.repeat(70));

  await createTable('communication_templates', `
    CREATE TABLE IF NOT EXISTS communication_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_name TEXT NOT NULL,
      template_type TEXT NOT NULL,
      subject TEXT,
      body TEXT NOT NULL,
      variables JSONB,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('email_logs', `
    CREATE TABLE IF NOT EXISTS email_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      recipient_email TEXT NOT NULL,
      subject TEXT,
      body TEXT,
      status TEXT DEFAULT 'pending',
      sent_at TIMESTAMP WITH TIME ZONE,
      error_message TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('sms_logs', `
    CREATE TABLE IF NOT EXISTS sms_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      recipient_phone TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      provider TEXT,
      message_id TEXT,
      cost NUMERIC,
      sent_at TIMESTAMP WITH TIME ZONE,
      error_message TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('sms_triggers', `
    CREATE TABLE IF NOT EXISTS sms_triggers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trigger_name TEXT NOT NULL,
      trigger_event TEXT NOT NULL,
      template_id UUID REFERENCES communication_templates(id),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('chat_messages', `
    CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID,
      sender_id UUID,
      sender_type TEXT,
      recipient_id UUID,
      recipient_type TEXT,
      message_text TEXT NOT NULL,
      message_type TEXT DEFAULT 'text',
      is_read BOOLEAN DEFAULT false,
      read_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('whatsapp_message_templates', `
    CREATE TABLE IF NOT EXISTS whatsapp_message_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_name TEXT NOT NULL,
      template_content TEXT NOT NULL,
      variables JSONB,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('whatsapp_templates', `
    CREATE TABLE IF NOT EXISTS whatsapp_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id TEXT UNIQUE,
      template_name TEXT NOT NULL,
      language TEXT DEFAULT 'en',
      category TEXT,
      status TEXT,
      body_text TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // ==================== APPOINTMENTS & SCHEDULING ====================
  console.log('\n📅 APPOINTMENTS & SCHEDULING');
  console.log('─'.repeat(70));

  await createTable('appointments', `
    CREATE TABLE IF NOT EXISTS appointments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID REFERENCES customers(id),
      device_id UUID REFERENCES devices(id),
      technician_id UUID,
      appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
      end_time TIMESTAMP WITH TIME ZONE,
      duration_minutes INTEGER DEFAULT 60,
      status TEXT DEFAULT 'scheduled',
      appointment_type TEXT,
      priority TEXT DEFAULT 'normal',
      notes TEXT,
      reminder_sent BOOLEAN DEFAULT false,
      created_by UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // ==================== SYSTEM SETTINGS ====================
  console.log('\n⚙️  SYSTEM SETTINGS');
  console.log('─'.repeat(70));

  await createTable('system_settings', `
    CREATE TABLE IF NOT EXISTS system_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      setting_key TEXT UNIQUE NOT NULL,
      setting_value JSONB,
      setting_type TEXT,
      description TEXT,
      is_public BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('lats_pos_general_settings', `
    CREATE TABLE IF NOT EXISTS lats_pos_general_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key TEXT UNIQUE NOT NULL,
      value JSONB,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('lats_pos_receipt_settings', `
    CREATE TABLE IF NOT EXISTS lats_pos_receipt_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key TEXT UNIQUE NOT NULL,
      value JSONB,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('lats_pos_advanced_settings', `
    CREATE TABLE IF NOT EXISTS lats_pos_advanced_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key TEXT UNIQUE NOT NULL,
      value JSONB,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('notification_templates', `
    CREATE TABLE IF NOT EXISTS notification_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_name TEXT NOT NULL,
      notification_type TEXT NOT NULL,
      title TEXT,
      message TEXT NOT NULL,
      variables JSONB,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await createTable('integrations', `
    CREATE TABLE IF NOT EXISTS integrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      integration_name TEXT NOT NULL,
      integration_type TEXT NOT NULL,
      api_key TEXT,
      api_secret TEXT,
      config JSONB,
      is_active BOOLEAN DEFAULT true,
      last_sync TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // ==================== AUDIT & LOGGING ====================
  console.log('\n📋 AUDIT & LOGGING');
  console.log('─'.repeat(70));

  await createTable('audit_logs', `
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
      session_id TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // ==================== SUMMARY ====================
  console.log('\n' + '═'.repeat(70));
  console.log('\n📊 CREATION SUMMARY');
  console.log('─'.repeat(70));
  console.log(`✅ Successfully created: ${totalSuccess} tables`);
  console.log(`❌ Errors: ${totalErrors} tables`);
  
  // List all tables
  console.log('\n📋 ALL TABLES IN DATABASE:');
  console.log('─'.repeat(70));
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  
  tables.forEach((t: any, i: number) => {
    console.log(`${String(i + 1).padStart(3)}. ${t.table_name}`);
  });
  
  console.log('\n' + '═'.repeat(70));
  console.log(`\n🎉 Complete! Total tables: ${tables.length}\n`);
}

createCompleteSchema().catch(console.error);

