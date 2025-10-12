#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  console.log('\n📋 DEVICES TABLE - ALL COLUMNS:\n');
  
  const sql = neon(DATABASE_URL);
  
  const columns = await sql`
    SELECT 
      column_name, 
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns 
    WHERE table_name = 'devices'
    ORDER BY ordinal_position
  `;
  
  console.log('Total columns:', columns.length);
  console.log('\nColumn List:');
  console.log('─'.repeat(80));
  
  for (const col of columns) {
    const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
    const def = col.column_default ? ` DEFAULT ${col.column_default.substring(0, 30)}` : '';
    console.log(`${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${nullable}${def}`);
  }
  
  console.log('\n✨ Done!\n');
}

main();

