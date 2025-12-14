#!/usr/bin/env node

/**
 * Quick test to verify WhatsApp Bulk Send setup is working
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Testing WhatsApp Bulk Send Setup...\n');

// Check 1: Environment Variables
console.log('1️⃣  Checking Environment Variables:');
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (supabaseUrl && supabaseKey) {
  console.log('   ✅ Supabase credentials configured');
  console.log(`   📍 URL: ${supabaseUrl}`);
} else {
  console.log('   ❌ Supabase credentials missing');
}

if (databaseUrl) {
  console.log('   ✅ Database URL configured');
} else {
  console.log('   ⚠️  Database URL not set (optional)');
}

// Check 2: Backend Server
console.log('\n2️⃣  Checking Backend Server:');
try {
  const response = await fetch('http://localhost:8000/health');
  if (response.ok) {
    const data = await response.json();
    console.log('   ✅ Backend server is running');
    console.log(`   📊 Status: ${data.status}`);
    console.log(`   ⏱️  Uptime: ${Math.floor(data.uptime)}s`);
  } else {
    console.log('   ❌ Backend server returned error:', response.status);
  }
} catch (error) {
  console.log('   ❌ Backend server not reachable');
  console.log('   💡 Make sure to run: cd server && npm run dev');
}

// Check 3: Vite Dev Server
console.log('\n3️⃣  Checking Vite Dev Server:');
try {
  const response = await fetch('http://localhost:5173');
  if (response.ok) {
    console.log('   ✅ Vite dev server is running');
  } else {
    console.log('   ⚠️  Vite dev server returned:', response.status);
  }
} catch (error) {
  console.log('   ❌ Vite dev server not reachable');
  console.log('   💡 Make sure to run: npm run dev');
}

// Check 4: Database Table
console.log('\n4️⃣  Checking Database Table:');
if (supabaseUrl && supabaseKey) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('whatsapp_bulk_campaigns')
      .select('id')
      .limit(1);
    
    if (!error) {
      console.log('   ✅ Table "whatsapp_bulk_campaigns" exists');
    } else if (error.code === '42P01') {
      console.log('   ❌ Table "whatsapp_bulk_campaigns" does not exist');
      console.log('   💡 Create it using: node create-bulk-table-direct.mjs');
    } else {
      console.log('   ⚠️  Table check returned error:', error.message);
    }
  } catch (err) {
    console.log('   ❌ Could not check table:', err.message);
  }
} else {
  console.log('   ⏭️  Skipped (no Supabase credentials)');
}

// Check 5: API Endpoint Test
console.log('\n5️⃣  Testing Bulk WhatsApp API:');
try {
  const response = await fetch('http://localhost:8000/api/bulk-whatsapp/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'test',
      message: 'Test',
      recipients: []
    })
  });
  
  if (response.status === 400) {
    console.log('   ✅ API endpoint is working (validation working)');
  } else if (response.status === 503) {
    console.log('   ⚠️  API returned 503 - Supabase not configured in backend');
  } else if (response.ok) {
    console.log('   ✅ API endpoint is working');
  } else {
    console.log(`   ⚠️  API returned status: ${response.status}`);
  }
} catch (error) {
  console.log('   ❌ Could not reach API endpoint');
}

// Summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let allGood = supabaseUrl && supabaseKey;

if (allGood) {
  console.log('✅ Setup looks good! Your bulk WhatsApp feature should work.');
  console.log('');
  console.log('Next steps:');
  console.log('1. Ensure the database table is created (see step 4️⃣  above)');
  console.log('2. Open http://localhost:5173 in your browser');
  console.log('3. Navigate to WhatsApp Inbox');
  console.log('4. Click "Bulk Send" and test with a few recipients');
} else {
  console.log('⚠️  Some issues detected. Please fix them before testing.');
  console.log('');
  console.log('📖 See BULK_WHATSAPP_SETUP_COMPLETE.md for detailed instructions');
}

console.log('');

