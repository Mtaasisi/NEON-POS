#!/usr/bin/env node

/**
 * Fix returns table - ensure customer_id column exists
 * This script fixes the "column customer_id does not exist" error
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load DATABASE_URL from .env if available
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set');
  console.error('Please set DATABASE_URL in your .env file');
  process.exit(1);
}

console.log('🔧 Fixing returns table - adding customer_id column if missing...\n');

const sql = neon(DATABASE_URL);

async function applyFix() {
  try {
    console.log('📝 Checking returns table status...\n');

    // First, check if the returns table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'returns'
      ) as table_exists
    `;

    const tableExists = tableCheck[0]?.table_exists || false;
    console.log(`Table exists: ${tableExists}`);

    if (!tableExists) {
      console.log('\n📝 Creating returns table with all columns...\n');
      
      // Create the returns table
      await sql`
        CREATE TABLE public.returns (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          device_id UUID,
          manual_device_brand VARCHAR(255),
          manual_device_model VARCHAR(255),
          manual_device_serial VARCHAR(255),
          customer_id UUID NOT NULL,
          reason TEXT NOT NULL,
          intake_checklist JSONB,
          status VARCHAR(50) DEFAULT 'under-return-review',
          attachments JSONB,
          resolution TEXT,
          staff_signature TEXT,
          customer_signature TEXT,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now(),
          purchase_date DATE,
          return_type VARCHAR(50),
          branch VARCHAR(255),
          staff_name VARCHAR(255),
          contact_confirmed BOOLEAN DEFAULT false,
          accessories JSONB,
          condition_description TEXT,
          customer_reported_issue TEXT,
          staff_observed_issue TEXT,
          customer_satisfaction INTEGER,
          preferred_contact VARCHAR(50),
          return_auth_number VARCHAR(100),
          return_method VARCHAR(50),
          return_shipping_fee NUMERIC(10,2),
          expected_pickup_date DATE,
          geo_location JSONB,
          policy_acknowledged BOOLEAN DEFAULT false,
          device_locked VARCHAR(50),
          privacy_wiped BOOLEAN DEFAULT false,
          internal_notes TEXT,
          escalation_required BOOLEAN DEFAULT false,
          additional_docs JSONB,
          refund_amount NUMERIC(10,2),
          exchange_device_id UUID,
          restocking_fee NUMERIC(10,2),
          refund_method VARCHAR(50),
          user_ip VARCHAR(50),
          user_location VARCHAR(255)
        )
      `;

      // Add indexes
      await sql`CREATE INDEX IF NOT EXISTS idx_returns_customer_id ON public.returns(customer_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_returns_status ON public.returns(status)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_returns_created_at ON public.returns(created_at DESC)`;

      console.log('✅ Returns table created successfully!');
    } else {
      // Check if customer_id column exists
      const columnCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'returns' 
          AND column_name = 'customer_id'
        ) as column_exists
      `;

      const columnExists = columnCheck[0]?.column_exists || false;
      console.log(`customer_id column exists: ${columnExists}`);

      if (!columnExists) {
        console.log('\n📝 Adding customer_id column to returns table...\n');
        
        // Add the customer_id column
        await sql`ALTER TABLE public.returns ADD COLUMN customer_id UUID`;
        
        // Add index
        await sql`CREATE INDEX IF NOT EXISTS idx_returns_customer_id ON public.returns(customer_id)`;
        
        console.log('✅ customer_id column added successfully!');
      } else {
        console.log('\n✅ customer_id column already exists!');
      }
    }

    console.log('\n✅ Fix applied successfully!');

    // Verify the fix by checking if customer_id column exists
    console.log('\n🔍 Verifying fix...');
    const verification = await sql`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'returns'
      AND column_name = 'customer_id'
    `;

    if (verification && verification.length > 0) {
      console.log('✅ Verification successful! customer_id column exists:');
      console.log('   Column name:', verification[0].column_name);
      console.log('   Data type:', verification[0].data_type);
      console.log('   Nullable:', verification[0].is_nullable);
      console.log('   Default:', verification[0].column_default || 'None');
    } else {
      console.log('❌ Verification failed - customer_id column still does not exist');
      process.exit(1);
    }

    // Also check the full returns table structure
    console.log('\n📊 Full returns table structure:');
    const tableStructure = await sql`
      SELECT 
        column_name, 
        data_type, 
        is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'returns'
      ORDER BY ordinal_position
    `;

    console.table(tableStructure);

    console.log('\n🎉 Fix applied successfully!');
    console.log('You can now refresh your application and the error should be gone.');

  } catch (error) {
    console.error('\n❌ Error applying fix:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

// Run the fix
applyFix();

