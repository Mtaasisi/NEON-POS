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
    // Drop existing function if it exists
    console.log('📋 Dropping old search function if exists...');
    await sql`DROP FUNCTION IF EXISTS search_customers_fn(TEXT, INTEGER, INTEGER)`;
    console.log('✅ Old function dropped\n');
    
    // Create the new search function
    console.log('📋 Creating new search function...');
    await sql`
      CREATE FUNCTION search_customers_fn(
        search_query TEXT,
        page_number INTEGER DEFAULT 1,
        page_size INTEGER DEFAULT 50
      )
      RETURNS TABLE (
        id UUID,
        name TEXT,
        phone TEXT,
        email TEXT,
        city TEXT,
        color_tag TEXT,
        points INTEGER,
        created_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE,
        total_count BIGINT
      ) AS $$
      DECLARE
        offset_val INTEGER;
      BEGIN
        offset_val := (page_number - 1) * page_size;
        
        RETURN QUERY
        WITH search_results AS (
          SELECT 
            c.id,
            c.name,
            c.phone,
            c.email,
            c.city,
            c.color_tag,
            c.points,
            c.created_at,
            c.updated_at,
            COUNT(*) OVER() as total_count
          FROM customers c
          WHERE 
            c.name ILIKE '%' || search_query || '%' OR
            c.phone ILIKE '%' || search_query || '%' OR
            COALESCE(c.email, '') ILIKE '%' || search_query || '%' OR
            COALESCE(c.city, '') ILIKE '%' || search_query || '%' OR
            COALESCE(c.referral_source, '') ILIKE '%' || search_query || '%' OR
            COALESCE(c.customer_tag, '') ILIKE '%' || search_query || '%' OR
            COALESCE(c.initial_notes, '') ILIKE '%' || search_query || '%'
          ORDER BY c.created_at DESC
          LIMIT page_size
          OFFSET offset_val
        )
        SELECT * FROM search_results;
      END;
      $$ LANGUAGE plpgsql
    `;
    
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

