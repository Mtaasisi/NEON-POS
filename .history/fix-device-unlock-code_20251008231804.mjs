#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('\n🔧 FIXING DEVICE CREATION ERROR\n');
  
  const sql = neon(DATABASE_URL);
  
  try {
    console.log('→ Adding unlock_code column to devices table...');
    await sql`ALTER TABLE devices ADD COLUMN IF NOT EXISTS unlock_code TEXT`;
    console.log('✅ Added unlock_code column');
    
    // Copy existing password data to unlock_code
    console.log('→ Migrating password data to unlock_code...');
    await sql`
      UPDATE devices 
      SET unlock_code = password 
      WHERE password IS NOT NULL AND unlock_code IS NULL
    `;
    console.log('✅ Migrated data');
    
    // Verify
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'devices' AND column_name = 'unlock_code'
    `;
    
    if (columns.length > 0) {
      console.log('\n✅ SUCCESS! unlock_code column is now available\n');
      console.log('🎉 Device creation should now work!\n');
      console.log('Try creating a device again in your app.\n');
    } else {
      console.log('\n❌ Column not found. Something went wrong.\n');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

main();

