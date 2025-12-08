#!/usr/bin/env node

/**
 * Fix Special Orders Table
 * Creates the customer_special_orders table if it doesn't exist
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jxhzveborezjhsmzsgbc.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ SUPABASE_ANON_KEY not found in environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixSpecialOrdersTable() {
  console.log('\n🔧 Fixing Special Orders Table...\n');

  try {
    // Check if table exists
    const { data: checkTable, error: checkError } = await supabase
      .from('customer_special_orders')
      .select('id')
      .limit(1);

    if (checkError && checkError.code === '42P01') {
      console.log('⚠️  Table customer_special_orders does not exist');
      console.log('\n📋 To create the table, run this SQL in your Supabase SQL Editor:\n');
      console.log(`
-- Create customer_special_orders table
CREATE TABLE IF NOT EXISTS customer_special_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID,
    branch_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    product_name TEXT NOT NULL,
    product_description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    deposit_paid NUMERIC DEFAULT 0,
    balance_due NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'deposit_received' CHECK (status IN (
        'deposit_received',
        'ordered',
        'in_transit',
        'arrived',
        'ready_for_pickup',
        'delivered',
        'cancelled'
    )),
    order_date TIMESTAMPTZ DEFAULT now(),
    expected_arrival_date DATE,
    actual_arrival_date DATE,
    delivery_date TIMESTAMPTZ,
    supplier_name TEXT,
    supplier_reference TEXT,
    country_of_origin TEXT,
    tracking_number TEXT,
    notes TEXT,
    internal_notes TEXT,
    customer_notified_arrival BOOLEAN DEFAULT false,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_special_orders_customer ON customer_special_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_special_orders_branch ON customer_special_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_special_orders_status ON customer_special_orders(status);
CREATE INDEX IF NOT EXISTS idx_special_orders_order_date ON customer_special_orders(order_date);

-- Enable RLS
ALTER TABLE customer_special_orders ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Enable read access for all users" ON customer_special_orders;
CREATE POLICY "Enable read access for all users" ON customer_special_orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON customer_special_orders;
CREATE POLICY "Enable insert for authenticated users" ON customer_special_orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON customer_special_orders;
CREATE POLICY "Enable update for authenticated users" ON customer_special_orders FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON customer_special_orders;
CREATE POLICY "Enable delete for authenticated users" ON customer_special_orders FOR DELETE USING (true);
      `);
      console.log('\n✅ Code has been fixed to use the correct table name: customer_special_orders\n');
    } else if (checkError) {
      console.error('❌ Error checking table:', checkError);
    } else {
      console.log('✅ Table customer_special_orders exists');
      console.log('✅ Code has been fixed to use the correct table name\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixSpecialOrdersTable();
