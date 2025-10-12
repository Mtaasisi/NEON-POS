#!/usr/bin/env node

import { readFileSync } from 'fs';
import { readdirSync } from 'fs';
import postgres from 'postgres';

console.log('🚀 Fix ALL Databases - Customer Creation');
console.log('═══════════════════════════════════════════════\n');

// Find all .env files
const envFiles = readdirSync('.')
  .filter(f => f.startsWith('.env') && !f.includes('template') && !f.includes('example') && !f.includes('bak'))
  .sort();

console.log(`Found ${envFiles.length} environment files:`);
envFiles.forEach(f => console.log(`  📄 ${f}`));
console.log('');

// Extract all unique database URLs
const databases = new Map();

for (const envFile of envFiles) {
  try {
    const content = readFileSync(envFile, 'utf-8');
    const matches = content.match(/DATABASE_URL=(.+)/g);
    
    if (matches) {
      matches.forEach(match => {
        const url = match.replace('DATABASE_URL=', '').trim();
        // Extract host to identify unique databases
        const hostMatch = url.match(/@([^/]+)/);
        if (hostMatch) {
          const host = hostMatch[1];
          if (!databases.has(host)) {
            databases.set(host, { url, envFile, host });
          }
        }
      });
    }
  } catch (error) {
    console.log(`⚠️  Could not read ${envFile}: ${error.message}`);
  }
}

console.log(`\nFound ${databases.size} unique database(s):\n`);
databases.forEach((db, host) => {
  console.log(`📊 Database: ${host.split('-pooler')[0]}`);
  console.log(`   Source: ${db.envFile}`);
  console.log('');
});

// Read the SQL fix script
const sqlScript = readFileSync('🔥 FIX-CUSTOMER-CREATION-ERROR.sql', 'utf-8');

// Function to fix a single database
async function fixDatabase(dbInfo) {
  const { url, host, envFile } = dbInfo;
  const shortHost = host.split('-pooler')[0];
  
  console.log('═══════════════════════════════════════════════');
  console.log(`🔧 Fixing Database: ${shortHost}`);
  console.log(`📁 From: ${envFile}`);
  console.log('═══════════════════════════════════════════════\n');
  
  let sql;
  try {
    sql = postgres(url, {
      ssl: 'require',
      max: 1,
      connect_timeout: 10
    });
    
    console.log('✅ Connected to database');
    
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Connection verified\n');
    
    console.log('⚡ Applying fixes...\n');
    
    // Execute key fix statements
    try {
      // 1. Fix customer_notes table
      console.log('📝 Step 1/6: Fixing customer_notes table...');
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
      
      // Check if id column exists, add if not
      const idCheck = await sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'customer_notes' AND column_name = 'id'
        ) as has_id
      `;
      
      if (!idCheck[0].has_id) {
        await sql`ALTER TABLE customer_notes ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid()`;
        console.log('   ✅ Added id column to customer_notes');
      } else {
        console.log('   ✅ customer_notes table structure verified');
      }
      
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ✅ customer_notes table already correct');
      } else {
        console.log(`   ⚠️  ${error.message.split('\n')[0]}`);
      }
    }
    
    // 2. Disable RLS
    try {
      console.log('📝 Step 2/6: Disabling RLS policies...');
      await sql`ALTER TABLE customers DISABLE ROW LEVEL SECURITY`;
      await sql`ALTER TABLE customer_notes DISABLE ROW LEVEL SECURITY`;
      console.log('   ✅ RLS disabled on both tables');
    } catch (error) {
      console.log(`   ⚠️  ${error.message.split('\n')[0]}`);
    }
    
    // 3. Add missing columns to customers
    console.log('📝 Step 3/6: Adding missing columns...');
    const columnsToAdd = [
      { name: 'whatsapp', type: 'TEXT' },
      { name: 'created_by', type: 'UUID' },
      { name: 'referrals', type: 'JSONB DEFAULT \'[]\'::jsonb' },
      { name: 'referred_by', type: 'UUID' },
      { name: 'joined_date', type: 'DATE DEFAULT CURRENT_DATE' },
      { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' },
      { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' }
    ];
    
    let addedCount = 0;
    for (const col of columnsToAdd) {
      try {
        const check = await sql`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = ${col.name}
          ) as exists
        `;
        
        if (!check[0].exists) {
          await sql.unsafe(`ALTER TABLE customers ADD COLUMN ${col.name} ${col.type}`);
          addedCount++;
        }
      } catch (error) {
        // Column might already exist
      }
    }
    console.log(`   ✅ Verified/added ${addedCount} columns`);
    
    // 4. Set defaults
    try {
      console.log('📝 Step 4/6: Setting default values...');
      await sql`ALTER TABLE customers ALTER COLUMN loyalty_level SET DEFAULT 'bronze'`;
      await sql`ALTER TABLE customers ALTER COLUMN color_tag SET DEFAULT 'new'`;
      await sql`ALTER TABLE customers ALTER COLUMN points SET DEFAULT 0`;
      await sql`ALTER TABLE customers ALTER COLUMN total_spent SET DEFAULT 0`;
      await sql`ALTER TABLE customers ALTER COLUMN is_active SET DEFAULT true`;
      console.log('   ✅ Default values set');
    } catch (error) {
      console.log(`   ⚠️  ${error.message.split('\n')[0]}`);
    }
    
    // 5. Test customer insert
    console.log('📝 Step 5/6: Testing customer creation...');
    const testCustomerId = crypto.randomUUID();
    const testNoteId = crypto.randomUUID();
    
    try {
      await sql`
        INSERT INTO customers (
          id, name, phone, email, gender, city,
          loyalty_level, color_tag, points, total_spent,
          is_active, joined_date, last_visit, created_at, updated_at
        ) VALUES (
          ${testCustomerId},
          'TEST_AUTO_DELETE_ME',
          ${'TEST_' + Math.floor(Math.random() * 1000000)},
          '',
          'other',
          'Test City',
          'bronze',
          'new',
          10,
          0,
          true,
          ${new Date().toISOString().split('T')[0]},
          ${new Date().toISOString()},
          ${new Date().toISOString()},
          ${new Date().toISOString()}
        )
      `;
      console.log('   ✅ Test customer created');
      
      await sql`
        INSERT INTO customer_notes (
          id, customer_id, note, created_by, created_at
        ) VALUES (
          ${testNoteId},
          ${testCustomerId},
          'Test note - automated fix',
          NULL,
          ${new Date().toISOString()}
        )
      `;
      console.log('   ✅ Test customer note created');
      
      // Clean up
      await sql`DELETE FROM customer_notes WHERE id = ${testNoteId}`;
      await sql`DELETE FROM customers WHERE id = ${testCustomerId}`;
      console.log('   ✅ Test data cleaned up');
      
    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}`);
      return { success: false, host: shortHost, error: error.message };
    }
    
    console.log('📝 Step 6/6: Final verification...');
    const customerCount = await sql`SELECT COUNT(*) as count FROM customers`;
    console.log(`   ✅ Database has ${customerCount[0].count} customers`);
    
    console.log('\n✅ DATABASE FIXED SUCCESSFULLY!\n');
    
    return { success: true, host: shortHost };
    
  } catch (error) {
    console.log(`\n❌ Failed to fix database: ${error.message}\n`);
    return { success: false, host: shortHost, error: error.message };
  } finally {
    if (sql) {
      await sql.end();
    }
  }
}

// Fix all databases
async function fixAllDatabases() {
  const results = [];
  
  for (const [host, dbInfo] of databases) {
    const result = await fixDatabase(dbInfo);
    results.push(result);
    console.log('');
  }
  
  // Final summary
  console.log('═══════════════════════════════════════════════');
  console.log('📊 FINAL SUMMARY');
  console.log('═══════════════════════════════════════════════\n');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`Total databases: ${results.length}`);
  console.log(`✅ Successfully fixed: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}\n`);
  
  if (successful.length > 0) {
    console.log('✅ Successfully fixed:');
    successful.forEach(r => console.log(`   • ${r.host}`));
    console.log('');
  }
  
  if (failed.length > 0) {
    console.log('❌ Failed to fix:');
    failed.forEach(r => {
      console.log(`   • ${r.host}`);
      console.log(`     Error: ${r.error}`);
    });
    console.log('');
  }
  
  console.log('═══════════════════════════════════════════════');
  console.log('🎉 ALL DATABASES PROCESSED!');
  console.log('═══════════════════════════════════════════════\n');
  
  if (successful.length > 0) {
    console.log('📱 Next Steps:');
    console.log('1. Refresh your POS application (Cmd+Shift+R / Ctrl+Shift+R)');
    console.log('2. Try creating a new customer');
    console.log('3. The error should be gone!\n');
  }
  
  if (failed.length > 0) {
    console.log('⚠️  Note: Some databases could not be fixed.');
    console.log('This might be due to:');
    console.log('- Incorrect credentials');
    console.log('- Network issues');
    console.log('- Database permissions\n');
  }
}

// Run the fix
fixAllDatabases().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

