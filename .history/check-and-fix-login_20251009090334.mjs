#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function checkAndFixLogin() {
  console.log('\n🔍 CHECKING LOGIN ISSUE...\n');
  
  try {
    // Check existing users
    console.log('📋 Checking existing users in the database...');
    const users = await sql`
      SELECT id, email, full_name, role, is_active, created_at 
      FROM users 
      ORDER BY created_at DESC
    `;
    
    console.log(`\n✅ Found ${users.length} user(s):\n`);
    users.forEach(user => {
      console.log(`  • ${user.email} (${user.role}) - Active: ${user.is_active}`);
    });
    
    // Check if admin user exists
    const adminExists = users.some(u => u.email === 'admin@pos.com');
    const careExists = users.some(u => u.email === 'care@care.com');
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 AVAILABLE LOGIN CREDENTIALS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (adminExists) {
      console.log('✅ Option 1:');
      console.log('   Email:    admin@pos.com');
      console.log('   Password: admin123\n');
    }
    
    if (careExists) {
      console.log('✅ Option 2:');
      console.log('   Email:    care@care.com');
      console.log('   Password: 123456\n');
    }
    
    // If no users exist or admin doesn't exist, create it
    if (users.length === 0 || !adminExists) {
      console.log('⚠️  Creating admin user...\n');
      
      await sql`
        INSERT INTO users (
          email,
          password,
          full_name,
          role,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          'admin@pos.com',
          'admin123',
          'Admin User',
          'admin',
          true,
          NOW(),
          NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
          password = 'admin123',
          full_name = 'Admin User',
          role = 'admin',
          is_active = true,
          updated_at = NOW()
      `;
      
      console.log('✅ Admin user created/updated!\n');
      console.log('🔐 LOGIN CREDENTIALS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 Email:    admin@pos.com');
      console.log('🔑 Password: admin123');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
    
    // Check if care@care.com exists, if not create it
    if (!careExists) {
      console.log('⚠️  Creating test user (care@care.com)...\n');
      
      await sql`
        INSERT INTO users (
          email,
          password,
          full_name,
          role,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          'care@care.com',
          '123456',
          'Care User',
          'admin',
          true,
          NOW(),
          NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
          password = '123456',
          full_name = 'Care User',
          role = 'admin',
          is_active = true,
          updated_at = NOW()
      `;
      
      console.log('✅ Test user created/updated!\n');
      console.log('🔐 ALTERNATIVE LOGIN CREDENTIALS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 Email:    care@care.com');
      console.log('🔑 Password: 123456');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
    
    console.log('\n✅ LOGIN CHECK COMPLETE!\n');
    console.log('💡 Try logging in with one of the credentials above.');
    console.log('🌐 Go to: http://localhost:5173/login\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    
    if (error.message.includes('relation "users" does not exist')) {
      console.error('\n⚠️  The "users" table does not exist!');
      console.error('Run the database setup first:');
      console.error('   node create-all-missing-tables.mjs\n');
    }
  }
}

checkAndFixLogin();

