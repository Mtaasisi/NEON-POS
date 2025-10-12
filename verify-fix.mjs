/**
 * Verify Customer Status Fix
 * Quick verification that the fix was applied correctly
 */

import postgres from 'postgres';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, 'server/.env') });
dotenv.config({ path: join(__dirname, '.env') });

async function verify() {
  console.log('🔍 Verifying Customer Status Fix...\n');
  
  const sql = postgres(process.env.DATABASE_URL, { 
    ssl: 'require', 
    max: 1,
    prepare: false  // Disable prepared statements to avoid cache issues
  });
  
  try {
    // Check tables
    console.log('1️⃣  Checking tables...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('customer_preferences', 'returns', 'customer_checkins')
      ORDER BY table_name
    `;
    console.log(`   ✅ Found ${tables.length}/3 tables:`, tables.map(t => t.table_name).join(', '));
    
    // Check functions
    console.log('\n2️⃣  Checking functions...');
    const functions = await sql`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name IN (
        'get_customer_status',
        'track_customer_activity',
        'update_customer_activity',
        'deactivate_inactive_customers',
        'get_inactive_customers'
      )
      ORDER BY routine_name
    `;
    console.log(`   ✅ Found ${functions.length}/5 functions:`, functions.map(f => f.routine_name).join(', '));
    
    // Check indexes
    console.log('\n3️⃣  Checking indexes...');
    const indexes = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname LIKE 'idx_customer%'
      OR indexname LIKE 'idx_returns%'
      ORDER BY indexname
    `;
    console.log(`   ✅ Found ${indexes.length} indexes`);
    
    // Check customers table columns
    console.log('\n4️⃣  Checking customers table columns...');
    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'customers'
      AND column_name IN ('is_active', 'last_activity_date', 'last_visit')
      ORDER BY column_name
    `;
    console.log(`   ✅ Found ${columns.length}/3 required columns:`, columns.map(c => c.column_name).join(', '));
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (tables.length === 3 && functions.length === 5 && columns.length === 3) {
      console.log('✅ ALL VERIFICATIONS PASSED!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('🎉 Your customer status system is fully set up!');
      console.log('🔄 Restart your application and the errors should be gone.\n');
    } else {
      console.log('⚠️  SOME CHECKS FAILED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('Please review the output above and run the fix script again.\n');
    }
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
  } finally {
    await sql.end();
  }
}

verify();

