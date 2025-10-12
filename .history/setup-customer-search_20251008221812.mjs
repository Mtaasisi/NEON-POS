#!/usr/bin/env node
/**
 * Setup Customer Search RPC Function in Neon Database
 * This script creates the search_customers_fn function for better search performance
 */

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read database config
const configPath = path.join(__dirname, 'database-config.json');
let DATABASE_URL;

try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  DATABASE_URL = config.connectionString;
} catch (error) {
  console.error('❌ Could not read database-config.json');
  console.error('Please create database-config.json with your Neon connection string');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function setupSearchFunction() {
  console.log('🚀 Setting up customer search RPC function...\n');

  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'CREATE-CUSTOMER-SEARCH-FUNCTION.sql');
    const searchFunctionSQL = fs.readFileSync(sqlFilePath, 'utf8');

    // Execute the SQL to create the function
    console.log('📝 Creating search_customers_fn function...');
    await sql(searchFunctionSQL);
    console.log('✅ Function created successfully!\n');

    // Test the function
    console.log('🧪 Testing the function...');
    const testResults = await sql`
      SELECT * FROM search_customers_fn('test', 1, 5)
    `;
    console.log(`✅ Test passed! Found ${testResults.length} results\n`);

    console.log('🎉 Customer search function is ready to use!');
    console.log('   Your app will now use the optimized RPC function for searches.');
    
  } catch (error) {
    console.error('❌ Error setting up search function:');
    console.error(error.message);
    
    if (error.message.includes('already exists')) {
      console.log('\n✅ Function already exists - no action needed!');
    } else {
      console.log('\n💡 Your app will use the fallback search method instead.');
      console.log('   Search will still work, but may be slightly slower.');
    }
  }
}

setupSearchFunction();

