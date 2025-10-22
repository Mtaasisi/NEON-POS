#!/usr/bin/env node

/**
 * Migration Runner Script
 * Runs SQL migration files against the Neon database
 */

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Please provide a migration file path');
  console.error('Usage: node run-migration.mjs <migration-file>');
  process.exit(1);
}

async function runMigration() {
  console.log('🚀 Starting migration...');
  console.log(`📄 Migration file: ${migrationFile}`);
  
  // Create SQL client
  const sql = postgres(DATABASE_URL, {
    max: 1,
    ssl: 'require'
  });

  try {
    // Read migration file
    const migrationPath = join(__dirname, migrationFile);
    console.log(`📂 Reading from: ${migrationPath}`);
    
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('⚙️  Executing migration...');
    
    // Execute migration
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the migration
runMigration();

