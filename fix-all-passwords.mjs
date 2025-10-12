#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function fixAllPasswords() {
  console.log('\n🔧 FIXING ALL USER PASSWORDS...\n');
  
  try {
    // Check all current users
    console.log('📋 Current users before fix:');
    const beforeUsers = await sql`
      SELECT email, password, role, is_active 
      FROM users 
      ORDER BY email
    `;
    
    beforeUsers.forEach(u => {
      console.log(`  ${u.email} → Password: "${u.password}" (${u.role})`);
    });
    
    console.log('\n🔧 Updating passwords to known values...\n');
    
    // Update admin@pos.com
    await sql`
      UPDATE users 
      SET password = 'admin123', updated_at = NOW()
      WHERE email = 'admin@pos.com'
    `;
    console.log('✅ admin@pos.com → admin123');
    
    // Update care@care.com
    await sql`
      UPDATE users 
      SET password = '123456', updated_at = NOW()
      WHERE email = 'care@care.com'
    `;
    console.log('✅ care@care.com → 123456');
    
    // Update care@pos.com
    await sql`
      UPDATE users 
      SET password = 'care123', updated_at = NOW()
      WHERE email = 'care@pos.com'
    `;
    console.log('✅ care@pos.com → care123');
    
    // Update tech@pos.com
    await sql`
      UPDATE users 
      SET password = 'tech123', updated_at = NOW()
      WHERE email = 'tech@pos.com'
    `;
    console.log('✅ tech@pos.com → tech123');
    
    // Update manager@pos.com
    await sql`
      UPDATE users 
      SET password = 'manager123', updated_at = NOW()
      WHERE email = 'manager@pos.com'
    `;
    console.log('✅ manager@pos.com → manager123');
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL PASSWORDS UPDATED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('🔐 AVAILABLE LOGIN CREDENTIALS:\n');
    console.log('1️⃣  ADMIN (Recommended)');
    console.log('   📧 Email:    admin@pos.com');
    console.log('   🔑 Password: admin123\n');
    
    console.log('2️⃣  TEST USER');
    console.log('   📧 Email:    care@care.com');
    console.log('   🔑 Password: 123456\n');
    
    console.log('3️⃣  CUSTOMER CARE');
    console.log('   📧 Email:    care@pos.com');
    console.log('   🔑 Password: care123\n');
    
    console.log('4️⃣  TECHNICIAN');
    console.log('   📧 Email:    tech@pos.com');
    console.log('   🔑 Password: tech123\n');
    
    console.log('5️⃣  MANAGER');
    console.log('   📧 Email:    manager@pos.com');
    console.log('   🔑 Password: manager123\n');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 Go to: http://localhost:5173/login');
    console.log('🚀 Try logging in with admin@pos.com / admin123\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

fixAllPasswords();

