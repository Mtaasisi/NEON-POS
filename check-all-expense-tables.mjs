#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

(async () => {
  const sql = neon(DATABASE_URL);
  
  console.log('\n📋 Checking all expense-related tables...\n');
  
  // Find all expense tables
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND (table_name LIKE '%expense%' OR table_name LIKE '%category%')
    ORDER BY table_name
  `;
  
  console.log('Tables found:');
  tables.forEach(t => console.log(`  - ${t.table_name}`));
  console.log('');
  
  // Check each table's structure
  for (const table of tables) {
    console.log(`\n📊 Structure of ${table.table_name}:`);
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = ${table.table_name}
      ORDER BY ordinal_position
    `;
    
    columns.forEach(col => {
      console.log(`  ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
  }
  
  console.log('\n');
})();

