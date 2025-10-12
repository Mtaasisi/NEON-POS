#!/usr/bin/env node

/**
 * Add Security Passcode Migration
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { Pool } = require('pg');

async function runMigration() {
  console.log('🔐 Adding Security Passcode to POS Settings...\n');

  const sqlFile = path.join(__dirname, 'add-security-passcode.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('⚙️  Running migration...\n');
    await pool.query(sql);
    
    console.log('✅ Passcode column added successfully!');
    console.log('🔐 Default passcode: 1234');
    console.log('📝 You can now change it in POS Settings → Security\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}

runMigration();

