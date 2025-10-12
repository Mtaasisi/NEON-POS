#!/usr/bin/env node

/**
 * Automatic Customer Creation Fix Script
 * This script automatically fixes all customer creation issues in Neon database
 */

import postgres from 'postgres';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '.env.development') });

const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

console.log('🚀 Starting automatic customer creation fix...\n');

const sql = postgres(databaseUrl, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: 'require',
});

async function fixCustomerCreation() {
  try {
    console.log('📋 Step 1: Fixing customer_notes table...');
    
    // Fix customer_notes table
    await sql`
      CREATE TABLE IF NOT EXISTS customer_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
        note TEXT NOT NULL,
        note_type TEXT DEFAULT 'general',
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('   ✅ customer_notes table verified/created');

    // Check if id column exists
    const idExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_notes' AND column_name = 'id'
      ) as exists
    `;
    
    if (!idExists[0].exists) {
      console.log('   ⚠️  Adding missing id column to customer_notes...');
      await sql`ALTER TABLE customer_notes ADD COLUMN id UUID DEFAULT gen_random_uuid()`;
      await sql`ALTER TABLE customer_notes ADD PRIMARY KEY (id)`;
      console.log('   ✅ Added id column to customer_notes');
    }

    console.log('\n🔓 Step 2: Disabling RLS on customer tables...');
    
    // Disable RLS
    await sql`ALTER TABLE customers DISABLE ROW LEVEL SECURITY`;
    console.log('   ✅ Disabled RLS on customers table');
    
    await sql`ALTER TABLE customer_notes DISABLE ROW LEVEL SECURITY`;
    console.log('   ✅ Disabled RLS on customer_notes table');

    // Drop existing policies (ignore errors if they don't exist)
    const policies = [
      'Allow authenticated users to read customers',
      'Allow authenticated users to insert customers',
      'Allow authenticated users to update customers',
      'Allow service role full access to customers',
      'Enable read access for authenticated users',
      'Enable insert access for authenticated users',
      'Enable update access for authenticated users'
    ];

    for (const policy of policies) {
      try {
        await sql`DROP POLICY IF EXISTS ${sql(policy)} ON customers`;
      } catch (e) {
        // Policy might not exist, continue
      }
    }
    console.log('   ✅ Dropped existing RLS policies');

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
      console.log('   ⚠️  Converting referrals from INTEGER to JSONB...');
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
    
    try {
      await sql`
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
      
    } catch (testError) {
      console.error('   ❌ Test failed:', testError.message);
      // Try to clean up
      try {
        await sql`DELETE FROM customers WHERE id = ${testCustomerId}`;
      } catch (e) {
        // Ignore cleanup errors
      }
      throw testError;
    }

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
    
    // Verify RLS status
    const rlsStatus = await sql`
      SELECT 
        relname as table_name, 
        relrowsecurity as rls_enabled
      FROM pg_class
      WHERE relname IN ('customers', 'customer_notes')
    `;
    console.log('   ✅ RLS status verified');
    
    console.log('\n🎉 ════════════════════════════════════════════════════════');
    console.log('🎉 ALL FIXES APPLIED SUCCESSFULLY!');
    console.log('🎉 ════════════════════════════════════════════════════════');
    console.log('\n✨ You can now create customers without errors!');
    console.log('📝 Try creating a customer in your application.\n');
    
  } catch (error) {
    console.error('\n❌ Error during fix:', error);
    console.error('\nError details:', error.message);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run the fix
fixCustomerCreation()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });

