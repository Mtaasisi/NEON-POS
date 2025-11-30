#!/usr/bin/env node
// Fix store deletion constraint issue
import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

config();
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

async function runMigration() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    console.log('🚀 Running migration: Fix store deletion constraint\n');
    
    // Read the migration file
    const migrationSQL = readFileSync('./migrations/fix_store_deletion_constraint.sql', 'utf8');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('\n✅ Migration completed successfully!\n');
    
    console.log('🎉 Store deletion is now protected!');
    console.log('ℹ️  Stores with products cannot be deleted.');
    console.log('ℹ️  You must delete or transfer products first.\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

