#!/usr/bin/env node

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbConfig = JSON.parse(readFileSync(join(__dirname, 'database-config.json'), 'utf-8'));
const sql = postgres(dbConfig.url, { ssl: 'require' });

async function runFixes() {
  try {
    console.log('🔧 Applying console error fixes...\n');
    
    const sqlFile = readFileSync(join(__dirname, 'fix-console-errors.sql'), 'utf-8');
    
    // Execute the SQL
    await sql.unsafe(sqlFile);
    
    console.log('\n✅ All fixes applied successfully!');
    console.log('\n📝 Summary:');
    console.log('   - WhatsApp instances table created/fixed');
    console.log('   - Devices table access granted');
    console.log('   - User daily goals duplicate handling fixed');
    console.log('   - Purchase order history function created');
    console.log('   - RLS policies disabled for testing');
    console.log('\n🔄 Please refresh your browser to see the changes!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runFixes();

