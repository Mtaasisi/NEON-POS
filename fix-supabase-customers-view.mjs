import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.production') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jxhzveborezjhsmzsgbc.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

console.log('🔧 Fixing Supabase Customers View\n');
console.log('='.repeat(60));
console.log('📊 Checking database status...\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndFix() {
  // Step 1: Check if lats_customers exists
  console.log('1️⃣ Checking if lats_customers table exists...');
  const { data: latsCheck, error: latsError } = await supabase
    .from('lats_customers')
    .select('id')
    .limit(1);
  
  if (latsError) {
    if (latsError.code === '42P01') {
      console.log('   ❌ lats_customers table does not exist!');
      console.log('\n   ⚠️  You need to run database migrations first.');
      console.log('   The database schema needs to be set up.');
      return false;
    } else {
      console.log(`   ⚠️  Error checking lats_customers: ${latsError.message}`);
      return false;
    }
  } else {
    console.log('   ✅ lats_customers table exists');
  }
  
  // Step 2: Check if customers view/table exists
  console.log('\n2️⃣ Checking if customers view/table exists...');
  const { data: customersCheck, error: customersError } = await supabase
    .from('customers')
    .select('id')
    .limit(1);
  
  if (customersError) {
    if (customersError.code === '42P01') {
      console.log('   ❌ customers view does not exist');
      console.log('\n3️⃣ Creating customers view...');
      await createCustomersView();
    } else {
      console.log(`   ⚠️  Error: ${customersError.message}`);
      return false;
    }
  } else {
    console.log('   ✅ customers view/table exists');
    console.log('\n   💡 If you\'re still getting errors, the view might need to be recreated.');
    console.log('   You can run this script again or manually create the view.');
  }
  
  return true;
}

async function createCustomersView() {
  // SQL to create customers view
  const createViewSQL = `
-- Drop existing view if it exists
DROP VIEW IF EXISTS customers CASCADE;

-- Create customers view pointing to lats_customers
CREATE VIEW customers AS 
SELECT 
    id,
    name,
    email,
    phone,
    whatsapp,
    gender,
    city,
    country,
    location_description,
    color_tag,
    loyalty_level,
    points,
    total_spent,
    last_visit,
    is_active,
    referral_source,
    birth_month,
    birth_day,
    birthday,
    initial_notes,
    notes,
    customer_tag,
    national_id,
    joined_date,
    created_at,
    updated_at,
    branch_id,
    is_shared,
    created_by_branch_id,
    created_by_branch_name,
    profile_image,
    whatsapp_opt_out,
    referred_by,
    created_by,
    last_purchase_date,
    total_purchases,
    total_returns,
    total_calls,
    total_call_duration_minutes,
    incoming_calls,
    outgoing_calls,
    missed_calls,
    avg_call_duration_minutes,
    first_call_date,
    last_call_date,
    call_loyalty_level,
    last_activity_date,
    referrals,
    preferred_branch_id,
    visible_to_branches,
    sharing_mode
FROM lats_customers;
`;
  
  console.log('\n   📝 SQL to create customers view:');
  console.log('   ' + '─'.repeat(56));
  
  // Since we can't execute DDL via Supabase REST API, we need to provide instructions
  console.log('\n   ⚠️  IMPORTANT: You need to run this SQL in Supabase SQL Editor\n');
  console.log('   Steps:');
  console.log('   1. Open: https://app.supabase.com/project/jxhzveborezjhsmzsgbc/sql/new');
  console.log('   2. Copy the SQL below');
  console.log('   3. Paste and click "RUN"\n');
  console.log('   ' + '='.repeat(56));
  console.log(createViewSQL);
  console.log('   ' + '='.repeat(56));
  
  // Save SQL to file
  const sqlFilePath = join(__dirname, 'fix-customers-view.sql');
  require('fs').writeFileSync(sqlFilePath, createViewSQL);
  console.log(`\n   💾 SQL saved to: ${sqlFilePath}`);
  console.log('\n   ✅ Next: Run the SQL in Supabase SQL Editor');
}

checkAndFix().catch(console.error);
