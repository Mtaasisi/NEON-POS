#!/usr/bin/env node
import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import ws from 'ws';

dotenv.config();

if (typeof WebSocket === 'undefined') {
  global.WebSocket = ws;
}

const pool = new Pool({ connectionString: process.env.VITE_DATABASE_URL || process.env.DATABASE_URL });

async function checkBranches() {
  try {
    console.log('🔍 Checking Branch/Store Location Tables...\n');
    
    // Check lats_branches
    console.log('1️⃣ lats_branches table:');
    const latsBranches = await pool.query('SELECT id, name FROM lats_branches LIMIT 5');
    if (latsBranches.rows.length > 0) {
      latsBranches.rows.forEach(b => console.log(`   - ${b.name} (${b.id})`));
    } else {
      console.log('   (empty)');
    }
    
    // Check store_locations
    console.log('\n2️⃣ store_locations table:');
    const storeLocations = await pool.query('SELECT id, name FROM store_locations LIMIT 5');
    if (storeLocations.rows.length > 0) {
      storeLocations.rows.forEach(s => console.log(`   - ${s.name} (${s.id})`));
    } else {
      console.log('   (empty)');
    }
    
    // Check foreign key
    console.log('\n3️⃣ Foreign Key Constraint:');
    const fkQuery = await pool.query(`
      SELECT 
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name='lats_products' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'branch_id';
    `);
    
    if (fkQuery.rows.length > 0) {
      const fk = fkQuery.rows[0];
      console.log(`   lats_products.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    }
    
    // Check what the current branch in localStorage might be
    console.log('\n4️⃣ Recommendation:');
    console.log('   The product insert should use a valid branch_id from store_locations table');
    console.log('   OR set branch_id to NULL if branches are optional');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkBranches();

