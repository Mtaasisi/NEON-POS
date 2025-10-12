#!/usr/bin/env node
/**
 * AUTO-FIX DATABASE SCRIPT
 * This script automatically fixes your database:
 * 1. Checks if users table exists
 * 2. Creates it if missing
 * 3. Creates admin user with correct credentials
 * 4. Configures SMS settings
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

console.log('🚀 Starting database auto-fix...\n');

try {
  // Step 1: Create users table
  console.log('👥 Step 1: Creating/fixing users table...');
  await sql`
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
  `;
  
  await sql`ALTER TABLE users DISABLE ROW LEVEL SECURITY`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
  console.log('✅ Users table ready\n');

  // Step 2: Create settings table
  console.log('⚙️  Step 2: Creating/fixing settings table...');
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  
  await sql`ALTER TABLE settings DISABLE ROW LEVEL SECURITY`;
  await sql`CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key)`;
  console.log('✅ Settings table ready\n');

  // Step 3: Delete and recreate users
  console.log('👤 Step 3: Creating users...');
  
  // Delete existing users
  await sql`DELETE FROM users WHERE email IN ('care@care.com', 'admin@pos.com', 'manager@pos.com', 'tech@pos.com', 'care@pos.com')`;
  
  // Insert users
  await sql`
    INSERT INTO users (id, email, password, full_name, role, is_active) VALUES
      ('287ec561-d5f2-4113-840e-e9335b9d3f69', 'care@care.com', '123456', 'Admin User', 'admin', true),
      ('a780f924-8343-46ec-a127-d7477165b0a8', 'manager@pos.com', 'manager123', 'Manager User', 'manager', true),
      ('762f6db8-e738-480f-a9d3-9699c440e2d9', 'tech@pos.com', 'tech123456', 'Technician User', 'technician', true),
      ('4813e4c7-771e-43e9-a8fd-e69db13a3322', 'care@pos.com', 'care123456', 'Customer Care', 'customer-care', true)
  `;
  console.log('✅ Users created\n');

  // Step 4: Configure SMS settings
  console.log('📱 Step 4: Configuring SMS settings...');
  
  // Delete existing SMS settings
  await sql`DELETE FROM settings WHERE key IN ('sms_api_url', 'sms_provider_api_key', 'sms_provider_password')`;
  
  // Insert SMS settings
  await sql`
    INSERT INTO settings (key, value, description) VALUES
      ('sms_api_url', 'https://mshastra.com/sendurl.aspx', 'SMS provider API URL'),
      ('sms_provider_api_key', 'Inauzwa', 'API key for SMS provider'),
      ('sms_provider_password', '@Masika10', 'SMS provider password')
  `;
  console.log('✅ SMS settings configured\n');

  // Step 5: Verify
  console.log('🔍 Verification:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const users = await sql`SELECT email, role, is_active FROM users ORDER BY role`;
  console.log('👥 Users:');
  users.forEach(u => {
    console.log(`   ${u.is_active ? '✅' : '❌'} ${u.email.padEnd(20)} (${u.role})`);
  });
  
  console.log('');
  const settings = await sql`SELECT key, value FROM settings WHERE key LIKE 'sms%'`;
  console.log('📱 SMS Settings:');
  settings.forEach(s => {
    const value = s.key === 'sms_provider_password' 
      ? '****' + s.value.slice(-4) 
      : s.value;
    console.log(`   ✅ ${s.key}: ${value}`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 DATABASE AUTO-FIX COMPLETE!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🔐 LOGIN CREDENTIALS:');
  console.log('   📧 Email:    care@care.com');
  console.log('   🔑 Password: 123456\n');
  console.log('💡 Next: Refresh your browser and login!\n');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

