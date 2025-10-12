#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

console.log('🔍 Verifying schema changes...\n');

try {
  // Check whatsapp_instances_comprehensive
  console.log('📱 Checking whatsapp_instances_comprehensive...');
  const whatsappCols = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'whatsapp_instances_comprehensive'
    AND column_name IN ('user_id')
    ORDER BY ordinal_position
  `;
  console.log('  Columns found:', whatsappCols.length > 0 ? whatsappCols.map(c => c.column_name).join(', ') : 'NONE');
  
  // Check devices
  console.log('\n🔧 Checking devices table...');
  const devicesCols = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'devices'
    AND column_name IN ('assigned_to', 'issue_description')
    ORDER BY ordinal_position
  `;
  console.log('  Columns found:', devicesCols.length > 0 ? devicesCols.map(c => c.column_name).join(', ') : 'NONE');
  
  // Check user_daily_goals
  console.log('\n✓ Checking user_daily_goals table...');
  const goalsCols = await sql`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'user_daily_goals'
    AND column_name = 'is_active'
    ORDER BY ordinal_position
  `;
  console.log('  Columns found:', goalsCols.length > 0 ? goalsCols.map(c => `${c.column_name} (${c.data_type})`).join(', ') : 'NONE');
  
  // Check user_daily_goals constraints
  console.log('\n🔑 Checking user_daily_goals constraints...');
  const constraints = await sql`
    SELECT constraint_name, constraint_type
    FROM information_schema.table_constraints
    WHERE table_name = 'user_daily_goals'
    AND constraint_type = 'UNIQUE'
  `;
  console.log('  Unique constraints:');
  constraints.forEach(c => console.log(`    - ${c.constraint_name}`));
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Verification complete');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}

