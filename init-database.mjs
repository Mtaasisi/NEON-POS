#!/usr/bin/env node

/**
 * Database Initialization Script
 * This script runs the base schema migration to create all required tables
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get database URL from environment
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not found in environment variables');
  console.error('');
  console.error('Please set VITE_DATABASE_URL in your .env file:');
  console.error('VITE_DATABASE_URL=postgresql://user:password@host/database');
  process.exit(1);
}

console.log('🚀 Database Initialization Starting...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📡 Connecting to:', DATABASE_URL.substring(0, 50) + '...');
console.log('');

// Create postgres connection
const sql = postgres(DATABASE_URL, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

async function initDatabase() {
  try {
    // Read the base schema file
    const schemaPath = join(__dirname, 'migrations', '000_create_base_schema.sql');
    console.log('📄 Reading schema file:', schemaPath);
    
    const schemaSql = readFileSync(schemaPath, 'utf-8');
    console.log('✅ Schema file loaded successfully');
    console.log('');
    
    // Execute the schema
    console.log('⚙️  Creating database tables...');
    console.log('   This may take a few moments...');
    console.log('');
    
    await sql.unsafe(schemaSql);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DATABASE INITIALIZATION COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📊 Tables created:');
    console.log('   ✓ Users & Authentication');
    console.log('   ✓ Branches');
    console.log('   ✓ Products & Variants');
    console.log('   ✓ Categories & Brands');
    console.log('   ✓ Suppliers');
    console.log('   ✓ Customers');
    console.log('   ✓ Sales & Sale Items');
    console.log('   ✓ Employees');
    console.log('   ✓ Purchase Orders');
    console.log('   ✓ Stock Movements');
    console.log('   ✓ Devices');
    console.log('   ✓ Appointments');
    console.log('   ✓ Payments');
    console.log('   ✓ Settings');
    console.log('   ✓ Notifications');
    console.log('   ✓ Audit Logs');
    console.log('');
    console.log('🎉 You can now start using your POS system!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Run: npm run dev');
    console.log('  2. Open your browser to http://localhost:5173');
    console.log('');
    
  } catch (error) {
    console.error('');
    console.error('❌ ERROR during database initialization:');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(error.message);
    console.error('');
    
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Note: Some tables already exist. This is normal if you\'re re-running the script.');
      console.log('   The database should still be functional.');
      console.log('');
    } else if (error.message.includes('connection')) {
      console.error('💡 Connection issue detected. Please check:');
      console.error('   - Your internet connection');
      console.error('   - The DATABASE_URL is correct');
      console.error('   - The database server is accessible');
      console.error('');
    } else {
      console.error('Full error:', error);
    }
    
    process.exit(1);
  } finally {
    // Close the connection
    await sql.end();
  }
}

// Run the initialization
initDatabase();

