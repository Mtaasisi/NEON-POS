#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('\n🧪 TESTING DEVICE CREATION\n');
  
  const sql = neon(DATABASE_URL);
  
  try {
    const testDeviceId = crypto.randomUUID();
    
    console.log('→ Creating test device (exactly like the app does)...\n');
    
    // This mimics exactly what addDeviceToDb does
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
        ${testDeviceId},
        ${testCustomerId},
        'iPhone 15 Pro',
        'Apple',
        'iPhone 15 Pro',
        'TEST-' || ${Date.now()},
        'Screen cracked, needs replacement',
        'Screen cracked, needs replacement',
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
        'Test device notes',
        200.00,
        2,
        NOW(),
        NOW()
      )
    `;
    
    console.log('✅ Device created successfully!');
    console.log(`   ID: ${testDeviceId}\n`);
    
    // Verify we can read it back
    const device = await sql`
      SELECT id, device_name, brand, model, unlock_code 
      FROM devices 
      WHERE id = ${testDeviceId}
    `;
    
    if (device.length > 0) {
      console.log('✅ Device verified:');
      console.log(`   Name: ${device[0].device_name}`);
      console.log(`   Brand: ${device[0].brand}`);
      console.log(`   Model: ${device[0].model}`);
      console.log(`   Unlock Code: ${device[0].unlock_code}\n`);
    }
    
    // Clean up
    console.log('→ Cleaning up test data...');
    await sql`DELETE FROM devices WHERE id = ${testDeviceId}`;
    console.log('✅ Cleanup complete\n');
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ SUCCESS! Device creation is working perfectly!');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('🎉 You can now create devices in your app!\n');
    
  } catch (err) {
    console.error('\n❌ TEST FAILED');
    console.error(`   Error: ${err.message}`);
    console.error(`   Code: ${err.code || 'N/A'}\n`);
    process.exit(1);
  }
}

main();

