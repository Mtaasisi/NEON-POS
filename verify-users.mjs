#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

console.log('🔍 Checking users table...\n');

try {
  const users = await sql`SELECT email, password, role, is_active FROM users ORDER BY role`;
  
  console.log('📋 All users in database:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  users.forEach(u => {
    console.log(`${u.is_active ? '✅' : '❌'} Email: ${u.email.padEnd(25)} Password: ${u.password.padEnd(15)} Role: ${u.role}`);
  });
  
  console.log('\n🔍 Testing login for care@care.com with password 123456...');
  const testUser = await sql`
    SELECT id, email, full_name, role, is_active 
    FROM users 
    WHERE email = 'care@care.com'
    AND password = '123456'
    AND is_active = true
    LIMIT 1
  `;
  
  if (testUser.length > 0) {
    console.log('✅ User found! Login should work.');
    console.log('   User data:', testUser[0]);
  } else {
    console.log('❌ User NOT found! This is why login fails.');
    
    // Check if user exists with different password
    const userExists = await sql`SELECT email, password FROM users WHERE email = 'care@care.com'`;
    if (userExists.length > 0) {
      console.log('⚠️  User exists but password doesn\'t match!');
      console.log(`   Expected: 123456`);
      console.log(`   Actual:   ${userExists[0].password}`);
    } else {
      console.log('⚠️  User does not exist at all!');
    }
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
}

