#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read database URL from .env file
const envFile = readFileSync(join(__dirname, '.env'), 'utf-8');
const dbUrlMatch = envFile.match(/VITE_DATABASE_URL=(.+)/);

if (!dbUrlMatch) {
  console.error('❌ Could not find VITE_DATABASE_URL in .env file');
  process.exit(1);
}

const DATABASE_URL = dbUrlMatch[1].trim();

async function fixCustomerSearch() {
  console.log('🔧 Fixing Customer Search Function...\n');
  
  const sql = neon(DATABASE_URL);
  
  try {
    // Read the SQL file
    const sqlContent = readFileSync(join(__dirname, 'CREATE-CUSTOMER-SEARCH-FUNCTION.sql'), 'utf-8');
    
    console.log('📋 Executing SQL to create search function...');
    
    // Execute the SQL
    await sql(sqlContent);
    
    console.log('✅ Customer search function created successfully!\n');
    
    // Test the function
    console.log('🧪 Testing the search function...');
    const testResults = await sql`SELECT * FROM search_customers_fn('test', 1, 5)`;
    console.log(`✅ Search function works! Found ${testResults.length} results\n`);
    
    console.log('🎉 SUCCESS! Customer search is now fixed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Refresh your browser');
    console.log('   2. Try searching for customers');
    console.log('   3. The error should be gone!\n');
    
  } catch (error) {
    console.error('❌ Error fixing customer search:', error.message);
    console.error('\n💡 Manual Fix:');
    console.error('   1. Go to your Neon Database console');
    console.error('   2. Run the SQL from: CREATE-CUSTOMER-SEARCH-FUNCTION.sql');
    process.exit(1);
  }
}

fixCustomerSearch().catch(console.error);

