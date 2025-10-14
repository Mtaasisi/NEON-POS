#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

(async () => {
  const sql = neon(DATABASE_URL);
  
  console.log('\n📋 Checking finance_expenses table structure...\n');
  
  const columns = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'finance_expenses'
    ORDER BY ordinal_position
  `;
  
  if (columns.length === 0) {
    console.log('❌ Table finance_expenses does not exist!\n');
    process.exit(1);
  }
  
  console.log('Columns in finance_expenses:');
  columns.forEach(col => {
    console.log(`  - ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
  });
  
  console.log('\n');
})();

