#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function testLogin() {
  console.log('\n🔍 TESTING LOGIN QUERY...\n');
  
  const testEmail = 'admin@pos.com';
  const testPassword = 'admin123';
  
  try {
    console.log(`Attempting to log in with:`);
    console.log(`  Email: ${testEmail}`);
    console.log(`  Password: ${testPassword}\n`);
    
    // This is the exact query used by the app
    const rawResult = await sql`
      SELECT id, email, full_name, role, is_active, created_at, updated_at 
      FROM users 
      WHERE email = ${testEmail}
      AND password = ${testPassword}
      AND is_active = true
      LIMIT 1
    `;
    
    console.log('Raw result:', rawResult);
    console.log('Result length:', rawResult?.length);
    
    if (rawResult && rawResult.length > 0) {
      console.log('\n✅ LOGIN SUCCESSFUL!\n');
      console.log('User data:', JSON.stringify(rawResult[0], null, 2));
    } else {
      console.log('\n❌ LOGIN FAILED - No matching user found\n');
      
      // Let's check what actually exists in the database
      console.log('Checking user record...');
      const userCheck = await sql`
        SELECT id, email, password, full_name, role, is_active 
        FROM users 
        WHERE email = ${testEmail}
      `;
      
      if (userCheck && userCheck.length > 0) {
        console.log('\n📋 User exists with these details:');
        console.log(`  Email: ${userCheck[0].email}`);
        console.log(`  Password in DB: "${userCheck[0].password}"`);
        console.log(`  Password trying: "${testPassword}"`);
        console.log(`  Passwords match: ${userCheck[0].password === testPassword}`);
        console.log(`  Role: ${userCheck[0].role}`);
        console.log(`  Is Active: ${userCheck[0].is_active}`);
        
        if (userCheck[0].password !== testPassword) {
          console.log('\n⚠️  PASSWORD MISMATCH DETECTED!');
          console.log('Updating password to "admin123"...');
          
          await sql`
            UPDATE users 
            SET password = 'admin123', updated_at = NOW()
            WHERE email = ${testEmail}
          `;
          
          console.log('✅ Password updated! Try logging in again with:');
          console.log('   Email: admin@pos.com');
          console.log('   Password: admin123\n');
        }
      } else {
        console.log('\n⚠️  User does not exist in database!');
      }
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Full error:', error);
  }
}

testLogin();

