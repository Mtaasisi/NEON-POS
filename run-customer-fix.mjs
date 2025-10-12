/**
 * Run Customer Status Functions Fix
 * This script applies the customer status system fixes to your Neon database
 */

import postgres from 'postgres';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, 'server/.env') });
dotenv.config({ path: join(__dirname, '.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('📝 Please add DATABASE_URL to .env or server/.env file');
  process.exit(1);
}

async function runFix() {
  console.log('🚀 Starting Customer Status System Fix...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const sql = postgres(databaseUrl, {
    ssl: 'require',
    max: 1,
  });

  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    await sql`SELECT 1`;
    console.log('✅ Database connection successful\n');

    // Read the SQL file
    console.log('📖 Reading SQL fix file...');
    const sqlContent = await readFile(
      join(__dirname, '🔧 FIX-CUSTOMER-STATUS-FUNCTIONS.sql'),
      'utf-8'
    );
    console.log('✅ SQL file loaded successfully\n');

    // Execute the SQL
    console.log('⚙️  Applying fixes to database...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await sql.unsafe(sqlContent);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Customer Status System Fix Applied Successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📋 What was fixed:');
    console.log('   ✓ Created customer_preferences table');
    console.log('   ✓ Created returns table');
    console.log('   ✓ Created customer_checkins table');
    console.log('   ✓ Added get_customer_status() function');
    console.log('   ✓ Added track_customer_activity() function');
    console.log('   ✓ Added update_customer_activity() function');
    console.log('   ✓ Added deactivate_inactive_customers() function');
    console.log('   ✓ Added get_inactive_customers() function');
    console.log('   ✓ Created necessary indexes');
    console.log('   ✓ Set up triggers for automatic updates');
    console.log('   ✓ Initialized data for existing customers\n');
    
    console.log('🎯 Next steps:');
    console.log('   1. Restart your application');
    console.log('   2. Clear your browser cache');
    console.log('   3. Test customer features');
    console.log('   4. The errors should now be resolved!\n');

  } catch (error) {
    console.error('\n❌ Error applying fixes:', error);
    console.error('\n💡 Troubleshooting:');
    console.error('   - Check that your DATABASE_URL is correct');
    console.error('   - Ensure you have necessary permissions');
    console.error('   - Verify the customers table exists');
    console.error('   - Check the error message above for details\n');
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the fix
runFix().catch(console.error);

