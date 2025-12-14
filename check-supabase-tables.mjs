import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.production') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jxhzveborezjhsmzsgbc.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.production');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('🔍 Checking Supabase database tables...\n');
  console.log(`Supabase URL: ${supabaseUrl}\n`);
  
  const tablesToCheck = [
    'customers',
    'lats_customers',
    'products',
    'lats_products',
    'lats_sales',
    'lats_storage_rooms',
    'special_orders'
  ];
  
  const results = {};
  
  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          results[table] = { exists: false, error: error.message };
        } else {
          results[table] = { exists: false, error: error.message };
        }
      } else {
        results[table] = { exists: true };
      }
    } catch (err) {
      results[table] = { exists: false, error: err.message };
    }
  }
  
  console.log('📊 Table Status:\n');
  console.log('='.repeat(60));
  
  for (const [table, status] of Object.entries(results)) {
    if (status.exists) {
      console.log(`✅ ${table.padEnd(30)} EXISTS`);
    } else {
      console.log(`❌ ${table.padEnd(30)} MISSING`);
      if (status.error) {
        console.log(`   Error: ${status.error.substring(0, 60)}...`);
      }
    }
  }
  
  console.log('='.repeat(60));
  
  // Summary
  const missing = Object.entries(results).filter(([_, status]) => !status.exists);
  const existing = Object.entries(results).filter(([_, status]) => status.exists);
  
  console.log(`\n📈 Summary:`);
  console.log(`   ✅ Existing: ${existing.length}/${tablesToCheck.length}`);
  console.log(`   ❌ Missing: ${missing.length}/${tablesToCheck.length}`);
  
  if (missing.length > 0) {
    console.log(`\n⚠️  Missing tables:`);
    missing.forEach(([table]) => console.log(`   - ${table}`));
    console.log(`\n💡 Solution: You need to run database migrations to create these tables.`);
  }
  
  return results;
}

checkTables().catch(console.error);
