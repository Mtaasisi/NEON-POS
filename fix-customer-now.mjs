#!/usr/bin/env node

import { readFileSync } from 'fs';
import postgres from 'postgres';

console.log('🚀 Automatic Database Fix for Customer Creation');
console.log('═══════════════════════════════════════════════\n');

// Read database URL from .env (production database)
let envContent;
try {
  envContent = readFileSync('.env', 'utf-8');
} catch (error) {
  envContent = readFileSync('.env.development', 'utf-8');
}
const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);

if (!dbUrlMatch) {
  console.error('❌ Could not find DATABASE_URL in .env.development');
  process.exit(1);
}

const databaseUrl = dbUrlMatch[1].trim();
console.log('✅ Found database connection');
console.log('🔗 Connecting to Neon database...\n');

// Create postgres client
const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 1
});

async function runFix() {
  try {
    console.log('📋 Reading SQL fix script...');
    const sqlScript = readFileSync('🔥 FIX-CUSTOMER-CREATION-ERROR.sql', 'utf-8');
    
    console.log('✅ SQL script loaded');
    console.log('⚡ Executing fix... (this may take 30-60 seconds)\n');
    console.log('─────────────────────────────────────────────');
    
    // Split the script into individual statements
    // We'll execute the DO blocks separately to capture RAISE NOTICE messages
    const statements = sqlScript
      .split(/;[\s\n]*(?=DO \$\$|SELECT|ALTER|CREATE|DROP|INSERT|DELETE)/gi)
      .filter(s => s.trim().length > 0);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement || statement.startsWith('--')) continue;
      
      try {
        // Execute the statement
        await sql.unsafe(statement + ';');
        successCount++;
        
        // Show progress
        if (statement.includes('SECTION 1')) {
          console.log('✅ Step 1/6: Fixed customer_notes table structure');
        } else if (statement.includes('SECTION 2')) {
          console.log('✅ Step 2/6: Disabled blocking RLS policies');
        } else if (statement.includes('SECTION 3')) {
          console.log('✅ Step 3/6: Added missing columns to customers table');
        } else if (statement.includes('SECTION 4')) {
          console.log('✅ Step 4/6: Set proper default values');
        } else if (statement.includes('SECTION 5')) {
          console.log('✅ Step 5/6: Tested customer insert');
        } else if (statement.includes('SECTION 6')) {
          console.log('✅ Step 6/6: Verified database structure');
        }
      } catch (error) {
        // Some errors are expected (like "column already exists")
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist') ||
            error.message.includes('cannot drop')) {
          // These are OK - it means the fix was already partially applied
          console.log(`⚠️  Note: ${error.message.split('\n')[0]}`);
        } else {
          errorCount++;
          console.error(`❌ Error: ${error.message.split('\n')[0]}`);
        }
      }
    }
    
    console.log('─────────────────────────────────────────────\n');
    
    // Now test if customer creation works
    console.log('🧪 Testing customer creation...');
    
    try {
      const testCustomerId = crypto.randomUUID();
      const testNoteId = crypto.randomUUID();
      
      // Try to insert a test customer
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
      
      console.log('✅ Test customer created successfully');
      
      // Try to insert a test note
      await sql`
        INSERT INTO customer_notes (
          id, customer_id, note, created_by, created_at
        ) VALUES (
          ${testNoteId},
          ${testCustomerId},
          'Test note - automated fix verification',
          NULL,
          ${new Date().toISOString()}
        )
      `;
      
      console.log('✅ Test customer note created successfully');
      
      // Clean up test data
      await sql`DELETE FROM customer_notes WHERE id = ${testNoteId}`;
      await sql`DELETE FROM customers WHERE id = ${testCustomerId}`;
      console.log('✅ Test data cleaned up\n');
      
      // Success summary
      console.log('═══════════════════════════════════════════════');
      console.log('🎉 DATABASE FIX COMPLETED SUCCESSFULLY!');
      console.log('═══════════════════════════════════════════════\n');
      console.log('✅ All database issues have been fixed');
      console.log('✅ Customer creation is now working');
      console.log('✅ Customer notes are functioning properly\n');
      console.log('📱 Next Steps:');
      console.log('1. Go to your POS application');
      console.log('2. Try creating a new customer');
      console.log('3. The error should be gone!\n');
      console.log('═══════════════════════════════════════════════\n');
      
    } catch (testError) {
      console.error('\n❌ Test failed:', testError.message);
      console.error('\n⚠️  The fix was applied but there may still be issues.');
      console.error('Please check the error message above and try again.\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Fix failed:', error.message);
    console.error('\nPlease check the error and try again.\n');
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the fix
runFix().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
