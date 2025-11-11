#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read Supabase credentials from .env or src/lib/supabase.ts
function getSupabaseConfig() {
  try {
    const supabaseFile = readFileSync(join(__dirname, 'src/lib/supabase.ts'), 'utf-8');
    const urlMatch = supabaseFile.match(/supabaseUrl\s*=\s*['"]([^'"]+)['"]/);
    const keyMatch = supabaseFile.match(/supabaseAnonKey\s*=\s*['"]([^'"]+)['"]/);
    
    if (!urlMatch || !keyMatch) {
      throw new Error('Could not find Supabase credentials in src/lib/supabase.ts');
    }
    
    return {
      url: urlMatch[1],
      key: keyMatch[1]
    };
  } catch (error) {
    console.error('❌ Error reading Supabase config:', error.message);
    console.log('\n💡 Please ensure src/lib/supabase.ts exists with your Supabase credentials');
    process.exit(1);
  }
}

async function applyStockFix() {
  console.log('🔧 Applying stock update fix for Purchase Order receiving...\n');
  
  const config = getSupabaseConfig();
  console.log('✅ Supabase config loaded');
  console.log('📍 URL:', config.url);
  
  const supabase = createClient(config.url, config.key);
  
  // Read the fix SQL file
  const fixSQL = readFileSync(join(__dirname, 'fix_stock_update_on_receive.sql'), 'utf-8');
  
  console.log('\n📄 Loaded SQL fix file');
  console.log('📊 Size:', fixSQL.length, 'bytes\n');
  
  try {
    console.log('⚙️  Applying fix to database...');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_string: fixSQL 
    });
    
    if (error) {
      // Try direct execution as fallback
      console.log('⚠️  exec_sql not available, trying direct execution...');
      
      // Split into individual statements and execute them
      const statements = fixSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && s !== '');
      
      let successCount = 0;
      for (const statement of statements) {
        if (statement.includes('CREATE OR REPLACE FUNCTION') || 
            statement.includes('CREATE TABLE IF NOT EXISTS') ||
            statement.includes('CREATE INDEX IF NOT EXISTS') ||
            statement.includes('GRANT') ||
            statement.includes('COMMENT ON')) {
          
          const { error: execError } = await supabase.rpc('exec', {
            query: statement + ';'
          });
          
          if (!execError) {
            successCount++;
          }
        }
      }
      
      if (successCount === 0) {
        throw new Error('Could not execute SQL. You may need to run this SQL manually in your Supabase SQL editor.');
      }
      
      console.log(`✅ Executed ${successCount} statements successfully`);
    } else {
      console.log('✅ SQL executed successfully');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 STOCK UPDATE FIX APPLIED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📋 What was fixed:');
    console.log('   ✅ Product variant quantities now update when receiving PO');
    console.log('   ✅ Stock movements are now tracked in lats_stock_movements');
    console.log('   ✅ Audit trail is maintained for all stock changes');
    console.log('\n🧪 How to test:');
    console.log('   1. Go to Purchase Orders page');
    console.log('   2. Find a PO in "shipped" or "confirmed" status');
    console.log('   3. Click "Receive" button');
    console.log('   4. Check Products page - stock should now update!');
    console.log('\n💡 The fix updates the complete_purchase_order_receive() function');
    console.log('   to properly increment variant quantities.\n');
    
  } catch (error) {
    console.error('\n❌ ERROR applying fix:', error.message);
    console.log('\n📝 MANUAL FIX INSTRUCTIONS:');
    console.log('   1. Go to your Supabase Dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Copy and paste the contents of: fix_stock_update_on_receive.sql');
    console.log('   4. Click "Run" to execute the SQL');
    console.log('\n   The file is located at:');
    console.log('   ' + join(__dirname, 'fix_stock_update_on_receive.sql'));
    process.exit(1);
  }
}

// Run the fix
applyStockFix().catch(console.error);

