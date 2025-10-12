#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('\n🔍 DIAGNOSING DEVICE CREATION ERROR\n');
  
  const sql = neon(DATABASE_URL);
  
  try {
    // 1. Check all columns in devices table
    console.log('1️⃣ Checking devices table schema...');
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'devices'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    console.log(`\n📊 Found ${columns.length} columns:\n`);
    
    const requiredColumns = columns.filter(c => c.is_nullable === 'NO' && !c.column_default);
    if (requiredColumns.length > 0) {
      console.log('⚠️  REQUIRED COLUMNS (NOT NULL, NO DEFAULT):');
      requiredColumns.forEach(col => {
        console.log(`   ❗ ${col.column_name} (${col.data_type})`);
      });
    }
    
    console.log('\n📋 All columns:');
    columns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '✓' : '✗';
      const hasDefault = col.column_default ? `= ${col.column_default.substring(0, 30)}...` : '';
      console.log(`   ${nullable} ${col.column_name} (${col.data_type}) ${hasDefault}`);
    });
    
    // 2. Check RLS policies
    console.log('\n\n2️⃣ Checking RLS policies on devices table...');
    const policies = await sql`
      SELECT 
        policyname,
        permissive,
        roles,
        cmd,
        qual
      FROM pg_policies 
      WHERE tablename = 'devices'
    `;
    
    if (policies.length === 0) {
      console.log('   ✅ No RLS policies found (RLS may be disabled)');
    } else {
      console.log(`\n   Found ${policies.length} policies:`);
      policies.forEach(p => {
        console.log(`   - ${p.policyname} (${p.cmd})`);
      });
    }
    
    // 3. Check if RLS is enabled
    const rlsEnabled = await sql`
      SELECT relrowsecurity 
      FROM pg_class 
      WHERE relname = 'devices'
    `;
    console.log(`\n   RLS Enabled: ${rlsEnabled[0]?.relrowsecurity ? '⚠️  YES' : '✅ NO'}`);
    
    // 4. Try a test insert to see exact error
    console.log('\n\n3️⃣ Testing device insert...');
    const testDeviceId = crypto.randomUUID();
    const testCustomerId = crypto.randomUUID();
    
    console.log('   Attempting minimal insert...');
    try {
      await sql`
        INSERT INTO devices (
          id,
          device_name
        ) VALUES (
          ${testDeviceId},
          'Test Device'
        )
      `;
      console.log('   ✅ Minimal insert successful!');
      
      // Clean up
      await sql`DELETE FROM devices WHERE id = ${testDeviceId}`;
    } catch (err) {
      console.log(`   ❌ Minimal insert failed: ${err.message}`);
    }
    
    // 5. Try insert with all fields
    console.log('\n   Attempting full insert (like the app does)...');
    const testDeviceId2 = crypto.randomUUID();
    
    try {
      await sql`
        INSERT INTO devices (
          id,
          customer_id,
          device_name,
          brand,
          model,
          serial_number,
          problem_description,
          issue_description,
          status,
          technician_id,
          assigned_to,
          expected_return_date,
          estimated_completion_date,
          unlock_code,
          repair_cost,
          repair_price,
          deposit_amount,
          diagnosis_required,
          device_notes,
          device_cost,
          estimated_hours,
          created_at,
          updated_at
        ) VALUES (
          ${testDeviceId2},
          ${testCustomerId},
          'iPhone 15 Pro',
          'Apple',
          'iPhone 15 Pro',
          'TEST123456',
          'Screen broken',
          'Screen broken',
          'assigned',
          NULL,
          NULL,
          NULL,
          NULL,
          '1234',
          100.00,
          150.00,
          50.00,
          false,
          'Test notes',
          200.00,
          2,
          NOW(),
          NOW()
        )
      `;
      console.log('   ✅ Full insert successful!');
      
      // Clean up
      await sql`DELETE FROM devices WHERE id = ${testDeviceId2}`;
    } catch (err) {
      console.log(`   ❌ Full insert failed: ${err.message}`);
      console.log(`   Error code: ${err.code}`);
      console.log(`   Error detail: ${err.detail || 'N/A'}`);
    }
    
    console.log('\n✅ DIAGNOSTIC COMPLETE\n');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

main();

