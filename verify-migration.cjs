#!/usr/bin/env node

/**
 * Verify Day Sessions Migration
 */

require('dotenv').config();
const { Pool } = require('pg');

async function verify() {
  console.log('🔍 Verifying Day Sessions Migration...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'daily_opening_sessions'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('✅ daily_opening_sessions table exists');
      
      // Get table structure
      const structure = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'daily_opening_sessions'
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📊 Table Structure:');
      structure.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
      
      // Check indexes
      const indexes = await pool.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'daily_opening_sessions';
      `);
      
      console.log('\n📑 Indexes:');
      indexes.rows.forEach(idx => {
        console.log(`   - ${idx.indexname}`);
      });
      
      // Check if any sessions exist
      const count = await pool.query(`
        SELECT COUNT(*) FROM daily_opening_sessions;
      `);
      
      console.log(`\n📈 Current sessions: ${count.rows[0].count}`);
      
      console.log('\n✅ Migration verification complete!');
      console.log('🎯 Your POS is ready to use session-based day management!\n');
      
    } else {
      console.log('❌ Table not found. Migration may have failed.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verify();

