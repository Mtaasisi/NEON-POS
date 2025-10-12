#!/usr/bin/env node

/**
 * Automatic Day Sessions Migration Script
 * Run this to automatically apply the day sessions migration to your database
 */

const fs = require('fs');
const path = require('path');

// Try to load environment variables
try {
  require('dotenv').config();
} catch (e) {
  console.log('⚠️  dotenv not available, using environment variables directly');
}

async function runMigration() {
  console.log('🚀 Starting Day Sessions Migration...\n');

  // Read the SQL file
  const sqlFile = path.join(__dirname, 'setup-day-sessions-SIMPLE.sql');
  
  if (!fs.existsSync(sqlFile)) {
    console.error('❌ Error: setup-day-sessions-SIMPLE.sql not found!');
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlFile, 'utf8');
  console.log('✅ SQL migration file loaded\n');

  // Get database connection from environment
  const DATABASE_URL = process.env.DATABASE_URL || 
                       process.env.VITE_SUPABASE_URL ||
                       process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!DATABASE_URL) {
    console.error('❌ Error: No database connection string found!');
    console.log('\n📝 Please set one of these environment variables:');
    console.log('   - DATABASE_URL');
    console.log('   - VITE_SUPABASE_URL');
    console.log('   - NEXT_PUBLIC_SUPABASE_URL\n');
    console.log('💡 Or run the SQL manually in your Neon dashboard SQL Editor\n');
    process.exit(1);
  }

  try {
    // Try using node-postgres if available
    const { Pool } = require('pg');
    
    const pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    console.log('🔌 Connected to database\n');
    console.log('⚙️  Running migration...\n');

    // Execute the SQL
    const result = await pool.query(sql);
    
    console.log('✅ Migration completed successfully!\n');
    console.log('🎉 Day Sessions table created!');
    console.log('📊 You can now use session-based day management in your POS\n');
    
    await pool.end();
    process.exit(0);

  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      // pg module not installed
      console.log('⚠️  pg module not found. Installing it now...\n');
      console.log('Run this command:');
      console.log('   npm install pg\n');
      console.log('Or manually run the SQL in your Neon dashboard:\n');
      console.log('   1. Open Neon dashboard');
      console.log('   2. Go to SQL Editor');
      console.log('   3. Copy/paste setup-day-sessions-SIMPLE.sql');
      console.log('   4. Click Run\n');
    } else {
      console.error('❌ Migration failed:', error.message);
      console.log('\n💡 Try running the SQL manually in your Neon dashboard\n');
    }
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

