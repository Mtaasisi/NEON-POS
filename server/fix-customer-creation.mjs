#!/usr/bin/env node

/**
 * Server-Side Automatic Customer Creation Fix
 * Uses the server's database connection
 */

import { sql, testConnection } from './src/db/connection.js';

console.log('🚀 Starting automatic customer creation fix...\n');

async function fixCustomerCreation() {
  try {
    // Test connection first
    console.log('📡 Testing database connection...');
    const connected = await testConnection();
    
    if (!connected) {
      throw new Error('Could not connect to database');
    }
    
    console.log('\n📋 Step 1: Fixing customer_notes table...');
    
    // Check if customer_notes table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'customer_notes'
      ) as exists
    `;
    
    if (!tableExists[0].exists) {
      console.log('   Creating customer_notes table...');
      await sql`
        CREATE TABLE customer_notes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
          note TEXT NOT NULL,
          note_type TEXT DEFAULT 'general',
          created_by UUID,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;
      console.log('   ✅ customer_notes table created');
    } else {
      // Check if id column exists
      const idExists = await sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'customer_notes' AND column_name = 'id'
        ) as exists
      `;
      
      if (!idExists[0].exists) {
        console.log('   Adding id column to customer_notes...');
        await sql`ALTER TABLE customer_notes ADD COLUMN id UUID DEFAULT gen_random_uuid()`;
        await sql`ALTER TABLE customer_notes ADD PRIMARY KEY (id)`;
        console.log('   ✅ Added id column to customer_notes');
      } else {
        console.log('   ✅ customer_notes table is properly configured');
      }
    }

    console.log('\n🔓 Step 2: Disabling RLS on customer tables...');
    await sql`ALTER TABLE customers DISABLE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE customer_notes DISABLE ROW LEVEL SECURITY`;
    console.log('   ✅ RLS disabled');

    console.log('\n🔧 Step 3: Adding missing columns to customers table...');
    
    // Check and add whatsapp column
    const whatsappExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'whatsapp'
      ) as exists
    `;
    if (!whatsappExists[0].exists) {
      await sql`ALTER TABLE customers ADD COLUMN whatsapp TEXT`;
      console.log('   ✅ Added whatsapp column');
    }

    // Check and add created_by column
    const createdByExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'created_by'
      ) as exists
    `;
    if (!createdByExists[0].exists) {
      await sql`ALTER TABLE customers ADD COLUMN created_by UUID`;
      console.log('   ✅ Added created_by column');
    }

    // Check referrals column
    const referralsInfo = await sql`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'customers' AND column_name = 'referrals'
    `;
    
    if (referralsInfo.length === 0) {
      await sql`ALTER TABLE customers ADD COLUMN referrals JSONB DEFAULT '[]'::jsonb`;
      console.log('   ✅ Added referrals column');
    } else if (referralsInfo[0].data_type === 'integer') {
      console.log('   Converting referrals from INTEGER to JSONB...');
      await sql`ALTER TABLE customers DROP COLUMN referrals`;
      await sql`ALTER TABLE customers ADD COLUMN referrals JSONB DEFAULT '[]'::jsonb`;
      console.log('   ✅ Converted referrals to JSONB');
    }

    // Check and add referred_by column
    const referredByExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'referred_by'
      ) as exists
    `;
    if (!referredByExists[0].exists) {
      await sql`ALTER TABLE customers ADD COLUMN referred_by UUID`;
      console.log('   ✅ Added referred_by column');
    }

    // Check and add joined_date column
    const joinedDateExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'joined_date'
      ) as exists
    `;
    if (!joinedDateExists[0].exists) {
      await sql`ALTER TABLE customers ADD COLUMN joined_date DATE DEFAULT CURRENT_DATE`;
      console.log('   ✅ Added joined_date column');
    }

    // Check and add created_at column
    const createdAtExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'created_at'
      ) as exists
    `;
    if (!createdAtExists[0].exists) {
      await sql`ALTER TABLE customers ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`;
      console.log('   ✅ Added created_at column');
    }

    // Check and add updated_at column
    const updatedAtExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'updated_at'
      ) as exists
    `;
    if (!updatedAtExists[0].exists) {
      await sql`ALTER TABLE customers ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`;
      console.log('   ✅ Added updated_at column');
    }

    console.log('\n⚙️  Step 4: Setting proper defaults for required fields...');
    await sql`ALTER TABLE customers ALTER COLUMN loyalty_level SET DEFAULT 'bronze'`;
    await sql`ALTER TABLE customers ALTER COLUMN color_tag SET DEFAULT 'new'`;
    await sql`ALTER TABLE customers ALTER COLUMN points SET DEFAULT 0`;
    await sql`ALTER TABLE customers ALTER COLUMN total_spent SET DEFAULT 0`;
    await sql`ALTER TABLE customers ALTER COLUMN is_active SET DEFAULT true`;
    await sql`ALTER TABLE customers ALTER COLUMN joined_date SET DEFAULT CURRENT_DATE`;
    await sql`ALTER TABLE customers ALTER COLUMN created_at SET DEFAULT NOW()`;
    await sql`ALTER TABLE customers ALTER COLUMN updated_at SET DEFAULT NOW()`;
    console.log('   ✅ Set proper defaults for all required fields');

    console.log('\n🧪 Step 5: Testing customer insert...');
    
    const testCustomerId = crypto.randomUUID();
    const testPhone = `TEST_PHONE_${Math.floor(Math.random() * 1000000)}`;
    
    const testResult = await sql`
      INSERT INTO customers (
        id, name, phone, email, gender, city, 
        loyalty_level, color_tag, points, total_spent, 
        is_active, joined_date, last_visit, created_at, updated_at
      ) VALUES (
        ${testCustomerId}, 
        'Test Customer (AUTO-DELETE)', 
        ${testPhone}, 
        '', 
        'other', 
        'Test City',
        'bronze', 
        'new', 
        10, 
        0, 
        true, 
        CURRENT_DATE, 
        NOW(), 
        NOW(), 
        NOW()
      )
      RETURNING id
    `;
    console.log('   ✅ Test customer insert successful!');
    
    // Test note insert
    const testNoteId = crypto.randomUUID();
    await sql`
      INSERT INTO customer_notes (
        id, customer_id, note, created_by, created_at
      ) VALUES (
        ${testNoteId},
        ${testCustomerId},
        'Test welcome note',
        NULL,
        NOW()
      )
    `;
    console.log('   ✅ Test customer note insert successful!');
    
    // Clean up test data
    await sql`DELETE FROM customer_notes WHERE id = ${testNoteId}`;
    await sql`DELETE FROM customers WHERE id = ${testCustomerId}`;
    console.log('   ✅ Test data cleaned up');

    console.log('\n✅ Step 6: Final verification...');
    
    // Verify customers table structure
    const customerColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'customers'
      ORDER BY ordinal_position
    `;
    console.log(`   ✅ Customers table has ${customerColumns.length} columns`);
    
    // Verify customer_notes table structure
    const notesColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'customer_notes'
      ORDER BY ordinal_position
    `;
    console.log(`   ✅ Customer_notes table has ${notesColumns.length} columns`);

    console.log('\n═════════════════════════════════════════════════════════');
    console.log('🎉 ALL FIXES APPLIED SUCCESSFULLY!');
    console.log('═════════════════════════════════════════════════════════');
    console.log('\n✨ You can now create customers without errors!');
    console.log('📝 Try creating a customer in your application.\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error during fix:', error);
    console.error('\nError details:', error.message);
    console.error('\n💡 Try running the SQL fix manually in Neon SQL Editor:');
    console.error('   File: 🎯 COPY-PASTE-THIS-SQL-FIX.sql\n');
    process.exit(1);
  }
}

// Run the fix
fixCustomerCreation();

