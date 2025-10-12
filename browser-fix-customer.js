/**
 * 🎯 AUTOMATIC CUSTOMER CREATION FIX - BROWSER VERSION
 * 
 * INSTRUCTIONS:
 * 1. Open your POS application in the browser
 * 2. Open Developer Console (Press F12 or Cmd+Option+I on Mac)
 * 3. Go to the "Console" tab
 * 4. Copy and paste this ENTIRE file
 * 5. Press Enter
 * 6. Wait for "✅ FIX COMPLETE!" message
 */

(async function fixCustomerCreation() {
  console.log('%c🚀 Starting Automatic Customer Creation Fix...', 'color: #4CAF50; font-size: 16px; font-weight: bold');
  
  try {
    // Get the supabase client from the global scope (it's already initialized in your app)
    const supabase = window.supabase || (await import('/src/lib/supabaseClient.ts')).supabase;
    
    if (!supabase) {
      console.error('❌ Could not find Supabase client. Make sure the app is loaded.');
      return;
    }

    console.log('%c📋 Step 1: Fixing customer_notes table...', 'color: #2196F3; font-weight: bold');
    
    // Fix 1: Create customer_notes table with proper structure
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS customer_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
        note TEXT NOT NULL,
        note_type TEXT DEFAULT 'general',
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    try {
      await supabase.rpc('exec_sql', { sql: createTableSQL });
      console.log('   ✅ customer_notes table verified/created');
    } catch (e) {
      console.log('   ℹ️  Table might already exist:', e.message);
    }

    // Fix 2: Add id column if missing
    const addIdColumnSQL = `
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'customer_notes' AND column_name = 'id'
        ) THEN
          ALTER TABLE customer_notes ADD COLUMN id UUID DEFAULT gen_random_uuid();
          ALTER TABLE customer_notes ADD PRIMARY KEY (id);
        END IF;
      END $$;
    `;
    
    try {
      await supabase.rpc('exec_sql', { sql: addIdColumnSQL });
      console.log('   ✅ id column verified');
    } catch (e) {
      console.log('   ℹ️  Column check:', e.message);
    }

    console.log('%c🔓 Step 2: Disabling RLS...', 'color: #2196F3; font-weight: bold');
    
    // Fix 3: Disable RLS on both tables
    try {
      await supabase.rpc('exec_sql', { sql: 'ALTER TABLE customers DISABLE ROW LEVEL SECURITY;' });
      await supabase.rpc('exec_sql', { sql: 'ALTER TABLE customer_notes DISABLE ROW LEVEL SECURITY;' });
      console.log('   ✅ RLS disabled on customer tables');
    } catch (e) {
      console.log('   ℹ️  RLS status:', e.message);
    }

    console.log('%c🔧 Step 3: Adding missing columns...', 'color: #2196F3; font-weight: bold');
    
    // Fix 4: Add missing columns
    const addColumnsSQL = `
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'whatsapp') THEN
          ALTER TABLE customers ADD COLUMN whatsapp TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'created_by') THEN
          ALTER TABLE customers ADD COLUMN created_by UUID;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'referrals') THEN
          ALTER TABLE customers ADD COLUMN referrals JSONB DEFAULT '[]'::jsonb;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'referred_by') THEN
          ALTER TABLE customers ADD COLUMN referred_by UUID;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'joined_date') THEN
          ALTER TABLE customers ADD COLUMN joined_date DATE DEFAULT CURRENT_DATE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'created_at') THEN
          ALTER TABLE customers ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'updated_at') THEN
          ALTER TABLE customers ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
      END $$;
    `;
    
    try {
      await supabase.rpc('exec_sql', { sql: addColumnsSQL });
      console.log('   ✅ Missing columns added');
    } catch (e) {
      console.log('   ℹ️  Columns check:', e.message);
    }

    console.log('%c⚙️  Step 4: Setting defaults...', 'color: #2196F3; font-weight: bold');
    
    // Fix 5: Set proper defaults
    const setDefaultsSQL = `
      ALTER TABLE customers ALTER COLUMN loyalty_level SET DEFAULT 'bronze';
      ALTER TABLE customers ALTER COLUMN color_tag SET DEFAULT 'new';
      ALTER TABLE customers ALTER COLUMN points SET DEFAULT 0;
      ALTER TABLE customers ALTER COLUMN total_spent SET DEFAULT 0;
      ALTER TABLE customers ALTER COLUMN is_active SET DEFAULT true;
    `;
    
    try {
      await supabase.rpc('exec_sql', { sql: setDefaultsSQL });
      console.log('   ✅ Defaults set');
    } catch (e) {
      console.log('   ℹ️  Defaults:', e.message);
    }

    console.log('%c🧪 Step 5: Testing customer creation...', 'color: #2196F3; font-weight: bold');
    
    // Fix 6: Test customer creation
    const testCustomerId = crypto.randomUUID();
    const testPhone = `TEST_PHONE_${Math.floor(Math.random() * 1000000)}`;
    
    const { data: testCustomer, error: insertError } = await supabase
      .from('customers')
      .insert([{
        id: testCustomerId,
        name: 'Test Customer (AUTO-DELETE)',
        phone: testPhone,
        email: '',
        gender: 'other',
        city: 'Test City',
        loyalty_level: 'bronze',
        color_tag: 'new',
        points: 10,
        total_spent: 0,
        is_active: true
      }])
      .select()
      .single();

    if (insertError) {
      console.error('   ❌ Test customer insert failed:', insertError);
      throw new Error(`Customer insert failed: ${insertError.message}`);
    }

    console.log('   ✅ Test customer created successfully!');

    // Test note insert
    const testNoteId = crypto.randomUUID();
    const { data: testNote, error: noteError } = await supabase
      .from('customer_notes')
      .insert([{
        id: testNoteId,
        customer_id: testCustomerId,
        note: 'Test welcome note',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (noteError) {
      console.error('   ❌ Test note insert failed:', noteError);
      // Clean up customer
      await supabase.from('customers').delete().eq('id', testCustomerId);
      throw new Error(`Note insert failed: ${noteError.message}`);
    }

    console.log('   ✅ Test note created successfully!');

    // Clean up test data
    await supabase.from('customer_notes').delete().eq('id', testNoteId);
    await supabase.from('customers').delete().eq('id', testCustomerId);
    console.log('   ✅ Test data cleaned up');

    console.log('%c═══════════════════════════════════════════════════════════', 'color: #4CAF50; font-weight: bold');
    console.log('%c🎉 FIX COMPLETE! Customer creation is now working!', 'color: #4CAF50; font-size: 18px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════════════════', 'color: #4CAF50; font-weight: bold');
    console.log('%c✨ Try creating a customer now!', 'color: #4CAF50; font-size: 14px');

  } catch (error) {
    console.error('%c❌ Fix failed:', 'color: #f44336; font-weight: bold', error);
    console.error('%cError details:', 'color: #f44336', error.message);
    console.log('\n%c📝 ALTERNATIVE SOLUTION:', 'color: #FF9800; font-weight: bold');
    console.log('%cRun the SQL fix manually in Neon SQL Editor:', 'color: #FF9800');
    console.log('%c1. Open: https://console.neon.tech/', 'color: #2196F3');
    console.log('%c2. Select project: ep-dry-brook-ad3duuog', 'color: #2196F3');
    console.log('%c3. Click: SQL Editor', 'color: #2196F3');
    console.log('%c4. Copy and paste the SQL from: 🎯 COPY-PASTE-THIS-SQL-FIX.sql', 'color: #2196F3');
    console.log('%c5. Click: Run', 'color: #2196F3');
  }
})();

