#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function verifyFixes() {
  console.log('\n🔍 VERIFYING ALL FIXES...\n');
  
  const checks = [];
  
  try {
    // Check 1: inventory_items.cost_price
    console.log('1️⃣  Checking inventory_items.cost_price column...');
    try {
      const result = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'inventory_items' 
        AND column_name = 'cost_price'
      `;
      
      if (result.length > 0) {
        checks.push('✅ inventory_items.cost_price exists');
        console.log(`   ✅ Found: ${result[0].column_name} (${result[0].data_type})\n`);
      } else {
        checks.push('❌ inventory_items.cost_price missing');
        console.log('   ❌ Column not found\n');
      }
    } catch (e) {
      checks.push('❌ Error checking inventory_items');
      console.log(`   ❌ ${e.message}\n`);
    }
    
    // Check 2: user_daily_goals.goal_type
    console.log('2️⃣  Checking user_daily_goals.goal_type column...');
    try {
      const result = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'user_daily_goals' 
        AND column_name = 'goal_type'
      `;
      
      if (result.length > 0) {
        checks.push('✅ user_daily_goals.goal_type exists');
        console.log(`   ✅ Found: ${result[0].column_name} (${result[0].data_type})\n`);
      } else {
        checks.push('❌ user_daily_goals.goal_type missing');
        console.log('   ❌ Column not found\n');
      }
    } catch (e) {
      checks.push('❌ Error checking user_daily_goals');
      console.log(`   ❌ ${e.message}\n`);
    }
    
    // Check 3: suppliers table and data
    console.log('3️⃣  Checking suppliers...');
    try {
      const count = await sql`SELECT COUNT(*) as count FROM suppliers WHERE is_active = true`;
      const activeCount = count[0].count;
      
      if (activeCount > 0) {
        checks.push(`✅ Found ${activeCount} active supplier(s)`);
        console.log(`   ✅ Found ${activeCount} active supplier(s)\n`);
      } else {
        checks.push('⚠️  No active suppliers');
        console.log('   ⚠️  No active suppliers\n');
      }
    } catch (e) {
      checks.push('❌ Error checking suppliers');
      console.log(`   ❌ ${e.message}\n`);
    }
    
    // Check 4: devices table
    console.log('4️⃣  Checking devices table...');
    try {
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'devices'
        ) as exists
      `;
      
      if (result[0].exists) {
        const count = await sql`SELECT COUNT(*) as count FROM devices`;
        checks.push(`✅ Devices table exists (${count[0].count} devices)`);
        console.log(`   ✅ Table exists with ${count[0].count} device(s)\n`);
      } else {
        checks.push('❌ Devices table missing');
        console.log('   ❌ Table not found\n');
      }
    } catch (e) {
      checks.push('❌ Error checking devices');
      console.log(`   ❌ ${e.message}\n`);
    }
    
    // Check 5: whatsapp_instances table
    console.log('5️⃣  Checking whatsapp_instances table...');
    try {
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'whatsapp_instances'
        ) as exists
      `;
      
      if (result[0].exists) {
        checks.push('✅ WhatsApp instances table exists');
        console.log('   ✅ Table exists\n');
      } else {
        checks.push('❌ WhatsApp instances table missing');
        console.log('   ❌ Table not found\n');
      }
    } catch (e) {
      checks.push('❌ Error checking whatsapp_instances');
      console.log(`   ❌ ${e.message}\n`);
    }
    
    // Check 6: notifications table
    console.log('6️⃣  Checking notifications table...');
    try {
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'notifications'
        ) as exists
      `;
      
      if (result[0].exists) {
        checks.push('✅ Notifications table exists');
        console.log('   ✅ Table exists\n');
      } else {
        checks.push('❌ Notifications table missing');
        console.log('   ❌ Table not found\n');
      }
    } catch (e) {
      checks.push('❌ Error checking notifications');
      console.log(`   ❌ ${e.message}\n`);
    }
    
    // Check 7: appointments table
    console.log('7️⃣  Checking appointments table...');
    try {
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'appointments'
        ) as exists
      `;
      
      if (result[0].exists) {
        checks.push('✅ Appointments table exists');
        console.log('   ✅ Table exists\n');
      } else {
        checks.push('❌ Appointments table missing');
        console.log('   ❌ Table not found\n');
      }
    } catch (e) {
      checks.push('❌ Error checking appointments');
      console.log(`   ❌ ${e.message}\n`);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 VERIFICATION SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    checks.forEach(check => console.log(`   ${check}`));
    
    const allGood = checks.every(c => c.startsWith('✅'));
    
    if (allGood) {
      console.log('\n🎉 ALL CHECKS PASSED!');
      console.log('\n💡 Next steps:');
      console.log('   1. Refresh your browser (Ctrl+R or Cmd+R)');
      console.log('   2. Clear browser cache if needed (Ctrl+Shift+R or Cmd+Shift+R)');
      console.log('   3. The dashboard should load without errors!\n');
    } else {
      console.log('\n⚠️  Some checks failed. Running additional fixes...\n');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

verifyFixes();

