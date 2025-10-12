#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();
const sql = neon(process.env.VITE_DATABASE_URL!);

async function diagnoseErrors() {
  console.log('🔍 Diagnosing Database Issues...\n');
  console.log('═'.repeat(60));
  
  try {
    // Check 1: Verify user_daily_goals table
    console.log('\n📊 Check 1: user_daily_goals table...');
    try {
      const goalsCount = await sql`SELECT COUNT(*) as count FROM user_daily_goals`;
      console.log(`✅ Table exists with ${goalsCount[0].count} records`);
      
      // Check table structure
      const tableInfo = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'user_daily_goals'
        ORDER BY ordinal_position
      `;
      console.log('   Columns:', tableInfo.map((c: any) => c.column_name).join(', '));
    } catch (err: any) {
      console.log(`❌ Error: ${err.message}`);
    }
    
    // Check 2: Verify customers table
    console.log('\n👥 Check 2: customers table...');
    try {
      const customersCount = await sql`SELECT COUNT(*) as count FROM customers`;
      console.log(`✅ Table exists with ${customersCount[0].count} records`);
      
      if (customersCount[0].count === 0) {
        console.log('   ⚠️  No customers in database - this is why customer loading is retrying');
      }
    } catch (err: any) {
      console.log(`❌ Error: ${err.message}`);
    }
    
    // Check 3: Verify devices table
    console.log('\n🔧 Check 3: devices table...');
    try {
      const devicesCount = await sql`SELECT COUNT(*) as count FROM devices`;
      console.log(`✅ Table exists with ${devicesCount[0].count} records`);
      
      if (devicesCount[0].count === 0) {
        console.log('   ℹ️  No devices in database yet');
      }
    } catch (err: any) {
      console.log(`❌ Error: ${err.message}`);
    }
    
    // Check 4: List all tables
    console.log('\n📋 Check 4: All tables in database...');
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log(`   Found ${tables.length} tables:`);
    tables.forEach((t: any) => {
      console.log(`      - ${t.table_name}`);
    });
    
    // Check 5: Auth users verification
    console.log('\n🔐 Check 5: Auth users...');
    const authUsers = await sql`
      SELECT id, email, name, role, is_active
      FROM auth_users
      ORDER BY role
    `;
    console.log(`   Total auth users: ${authUsers.length}`);
    authUsers.forEach((u: any) => {
      const emoji = u.role === 'admin' ? '👑' : u.role === 'manager' ? '📊' : u.role === 'technician' ? '🔧' : '💬';
      console.log(`   ${emoji} ${u.name} - ${u.role} (${u.email})`);
    });
    
    // Check 6: Create a test customer to stop the retrying
    console.log('\n🧪 Check 6: Creating test customer...');
    try {
      const testCustomer = await sql`
        INSERT INTO customers (name, email, phone, is_active, created_at, updated_at)
        VALUES ('Test Customer', 'test@example.com', '1234567890', true, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
        RETURNING *
      `;
      
      if (testCustomer.length > 0) {
        console.log(`✅ Created test customer: ${testCustomer[0].name}`);
      } else {
        console.log('ℹ️  Test customer may already exist');
      }
    } catch (err: any) {
      console.log(`⚠️  ${err.message}`);
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Diagnosis complete!\n');
    
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

diagnoseErrors().catch(console.error);

