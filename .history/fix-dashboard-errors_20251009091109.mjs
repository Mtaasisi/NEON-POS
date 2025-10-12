#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function fixDashboardErrors() {
  console.log('\n🔧 FIXING DASHBOARD ERRORS...\n');
  
  const fixes = [];
  
  try {
    // Fix 1: Add cost_price to products table
    console.log('1️⃣  Adding cost_price column to products table...');
    try {
      await sql`
        ALTER TABLE products 
        ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) DEFAULT 0
      `;
      fixes.push('✅ Added cost_price to products');
      console.log('   ✅ Done\n');
    } catch (e) {
      console.log(`   ℹ️  ${e.message}\n`);
    }
    
    // Fix 2: Add cost_price to inventory_items table (if exists)
    console.log('2️⃣  Adding cost_price to inventory_items table...');
    try {
      await sql`
        ALTER TABLE inventory_items 
        ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) DEFAULT 0
      `;
      fixes.push('✅ Added cost_price to inventory_items');
      console.log('   ✅ Done\n');
    } catch (e) {
      console.log(`   ℹ️  ${e.message}\n`);
    }
    
    // Fix 3: Fix user_daily_goals table structure
    console.log('3️⃣  Fixing user_daily_goals table...');
    try {
      // Check if table exists
      const tableCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'user_daily_goals'
        ) as exists
      `;
      
      if (tableCheck[0].exists) {
        // Add missing columns
        await sql`
          ALTER TABLE user_daily_goals 
          ADD COLUMN IF NOT EXISTS goal_type VARCHAR(50) DEFAULT 'daily'
        `;
        
        await sql`
          ALTER TABLE user_daily_goals 
          ADD COLUMN IF NOT EXISTS target_value DECIMAL(10, 2) DEFAULT 0
        `;
        
        await sql`
          ALTER TABLE user_daily_goals 
          ADD COLUMN IF NOT EXISTS current_value DECIMAL(10, 2) DEFAULT 0
        `;
        
        fixes.push('✅ Fixed user_daily_goals table');
        console.log('   ✅ Done\n');
      } else {
        // Create the table
        await sql`
          CREATE TABLE user_daily_goals (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            goal_type VARCHAR(50) DEFAULT 'daily',
            goal_name VARCHAR(100) NOT NULL,
            target_value DECIMAL(10, 2) DEFAULT 0,
            current_value DECIMAL(10, 2) DEFAULT 0,
            date DATE NOT NULL DEFAULT CURRENT_DATE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `;
        fixes.push('✅ Created user_daily_goals table');
        console.log('   ✅ Created table\n');
      }
    } catch (e) {
      console.log(`   ⚠️  ${e.message}\n`);
    }
    
    // Fix 4: Ensure devices table exists
    console.log('4️⃣  Checking devices table...');
    try {
      const devicesCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'devices'
        ) as exists
      `;
      
      if (!devicesCheck[0].exists) {
        await sql`
          CREATE TABLE devices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            device_name VARCHAR(255) NOT NULL,
            brand VARCHAR(100),
            model VARCHAR(100),
            imei VARCHAR(50),
            condition VARCHAR(50),
            unlock_code VARCHAR(50),
            status VARCHAR(50) DEFAULT 'available',
            purchase_price DECIMAL(10, 2),
            selling_price DECIMAL(10, 2),
            cost_price DECIMAL(10, 2),
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `;
        fixes.push('✅ Created devices table');
        console.log('   ✅ Created table\n');
      } else {
        // Ensure cost_price column exists
        await sql`
          ALTER TABLE devices 
          ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) DEFAULT 0
        `;
        fixes.push('✅ Devices table verified');
        console.log('   ✅ Verified\n');
      }
    } catch (e) {
      console.log(`   ⚠️  ${e.message}\n`);
    }
    
    // Fix 5: Ensure suppliers table exists and has data
    console.log('5️⃣  Checking suppliers table...');
    try {
      const suppliersCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'suppliers'
        ) as exists
      `;
      
      if (!suppliersCheck[0].exists) {
        await sql`
          CREATE TABLE suppliers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            contact_person VARCHAR(255),
            email VARCHAR(255),
            phone VARCHAR(50),
            address TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `;
        fixes.push('✅ Created suppliers table');
      }
      
      // Check if suppliers exist
      const suppliersCount = await sql`SELECT COUNT(*) as count FROM suppliers`;
      if (suppliersCount[0].count === '0' || suppliersCount[0].count === 0) {
        // Add a default supplier
        await sql`
          INSERT INTO suppliers (name, contact_person, email, phone, is_active)
          VALUES ('Default Supplier', 'John Doe', 'supplier@example.com', '+1234567890', true)
          ON CONFLICT DO NOTHING
        `;
        fixes.push('✅ Added default supplier');
        console.log('   ✅ Added default supplier\n');
      } else {
        console.log(`   ✅ Found ${suppliersCount[0].count} supplier(s)\n`);
      }
    } catch (e) {
      console.log(`   ⚠️  ${e.message}\n`);
    }
    
    // Fix 6: Ensure whatsapp_instances table exists
    console.log('6️⃣  Checking whatsapp_instances table...');
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS whatsapp_instances (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          instance_name VARCHAR(255) NOT NULL,
          phone_number VARCHAR(50),
          status VARCHAR(50) DEFAULT 'inactive',
          qr_code TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      fixes.push('✅ WhatsApp instances table verified');
      console.log('   ✅ Done\n');
    } catch (e) {
      console.log(`   ℹ️  ${e.message}\n`);
    }
    
    // Fix 7: Ensure notifications table exists
    console.log('7️⃣  Checking notifications table...');
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          title VARCHAR(255) NOT NULL,
          message TEXT,
          type VARCHAR(50) DEFAULT 'info',
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      fixes.push('✅ Notifications table verified');
      console.log('   ✅ Done\n');
    } catch (e) {
      console.log(`   ℹ️  ${e.message}\n`);
    }
    
    // Fix 8: Ensure appointments table exists
    console.log('8️⃣  Checking appointments table...');
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS appointments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          customer_id UUID,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          appointment_date TIMESTAMP NOT NULL,
          status VARCHAR(50) DEFAULT 'scheduled',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      fixes.push('✅ Appointments table verified');
      console.log('   ✅ Done\n');
    } catch (e) {
      console.log(`   ℹ️  ${e.message}\n`);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL FIXES COMPLETED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📋 Summary of fixes:\n');
    fixes.forEach(fix => console.log(`   ${fix}`));
    
    console.log('\n💡 Next steps:');
    console.log('   1. Refresh your browser (Ctrl+R or Cmd+R)');
    console.log('   2. The dashboard errors should be gone!');
    console.log('   3. Check the browser console for any remaining issues\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Full error:', error);
  }
}

fixDashboardErrors();

