#!/usr/bin/env node
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env.production') });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const pool = new Pool({ connectionString: DATABASE_URL });

async function updateBranchNames() {
  try {
    console.log('🔄 Updating Branch Names\n');
    
    console.log('📋 Current branches:');
    const current = await pool.query('SELECT id, name FROM lats_branches ORDER BY name');
    current.rows.forEach(b => console.log(`   - ${b.name} (${b.id})`));
    console.log('');
    
    console.log('🔄 Updating "Main Branch" to "Arusha"...');
    const result = await pool.query(`
      UPDATE lats_branches 
      SET name = 'Arusha', updated_at = NOW()
      WHERE name = 'Main Branch' OR id = '00000000-0000-0000-0000-000000000001'
    `);
    console.log(`   ✅ Updated ${result.rowCount} branch(es)\n`);
    
    console.log('✅ Updated branches:');
    const updated = await pool.query('SELECT id, name FROM lats_branches ORDER BY name');
    updated.rows.forEach(b => console.log(`   - ${b.name} (${b.id})`));
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateBranchNames();

