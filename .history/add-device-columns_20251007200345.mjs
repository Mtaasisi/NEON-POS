#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('\n🔧 ADDING MISSING COLUMNS TO DEVICES TABLE\n');
  
  const sql = neon(DATABASE_URL);
  
  try {
    // Add issue_description (duplicate of problem_description for compatibility)
    console.log('→ Adding issue_description column...');
    await sql`ALTER TABLE devices ADD COLUMN IF NOT EXISTS issue_description TEXT`;
    console.log('✅ Added issue_description');
    
    // Copy existing problem_description to issue_description
    console.log('→ Copying problem_description to issue_description...');
    await sql`UPDATE devices SET issue_description = problem_description WHERE problem_description IS NOT NULL`;
    console.log('✅ Copied data');
    
    // Add assigned_to
    console.log('→ Adding assigned_to column...');
    await sql`ALTER TABLE devices ADD COLUMN IF NOT EXISTS assigned_to UUID`;
    console.log('✅ Added assigned_to');
    
    // Add expected_return_date  
    console.log('→ Adding expected_return_date column...');
    await sql`ALTER TABLE devices ADD COLUMN IF NOT EXISTS expected_return_date TIMESTAMP WITH TIME ZONE`;
    console.log('✅ Added expected_return_date');
    
    // Add estimated_hours
    console.log('→ Adding estimated_hours column...');
    await sql`ALTER TABLE devices ADD COLUMN IF NOT EXISTS estimated_hours INTEGER`;
    console.log('✅ Added estimated_hours');
    
    // Add diagnosis_required
    console.log('→ Adding diagnosis_required column...');
    await sql`ALTER TABLE devices ADD COLUMN IF NOT EXISTS diagnosis_required BOOLEAN DEFAULT false`;
    console.log('✅ Added diagnosis_required');
    
    // Add device_notes
    console.log('→ Adding device_notes column...');
    await sql`ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_notes TEXT`;
    console.log('✅ Added device_notes');
    
    // Add device_cost
    console.log('→ Adding device_cost column...');
    await sql`ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_cost NUMERIC DEFAULT 0`;
    console.log('✅ Added device_cost');
    
    // Add repair_cost
    console.log('→ Adding repair_cost column...');
    await sql`ALTER TABLE devices ADD COLUMN IF NOT EXISTS repair_cost NUMERIC DEFAULT 0`;
    console.log('✅ Added repair_cost');
    
    // Add repair_price
    console.log('→ Adding repair_price column...');
    await sql`ALTER TABLE devices ADD COLUMN IF NOT EXISTS repair_price NUMERIC DEFAULT 0`;
    console.log('✅ Added repair_price');
    
    console.log('\n✨ ALL COLUMNS ADDED SUCCESSFULLY!\n');
    
    // Verify
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'devices'
      ORDER BY ordinal_position
    `;
    
    console.log(`📊 Devices table now has ${columns.length} columns\n`);
    
    const neededCols = [
      'issue_description',
      'assigned_to', 
      'expected_return_date',
      'estimated_hours',
      'diagnosis_required',
      'device_notes',
      'device_cost',
      'repair_cost',
      'repair_price'
    ];
    
    console.log('✅ VERIFICATION:');
    const colNames = columns.map(c => c.column_name);
    for (const col of neededCols) {
      if (colNames.includes(col)) {
        console.log(`   ✓ ${col}`);
      } else {
        console.log(`   ✗ ${col} - MISSING!`);
      }
    }
    
    console.log('\n');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

main();

