#!/usr/bin/env node

/**
 * Apply whatsapp_sessions table migration
 */

import { readFileSync } from 'fs';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

console.log('🚀 Applying whatsapp_sessions table migration...');
console.log(`📊 Database: ${DATABASE_URL.substring(0, 50)}...`);

const sql = neon(DATABASE_URL);

try {
  const migrationSQL = readFileSync('migrations/create_whatsapp_sessions_table.sql', 'utf8');
  console.log(`📄 Migration SQL loaded (${migrationSQL.length} characters)`);

  // Split the SQL into individual statements
  const statements = migrationSQL.split(';').map(stmt => stmt.trim()).filter(stmt => stmt.length > 0);

  console.log(`📋 Found ${statements.length} SQL statements to execute`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (statement.trim()) {
      console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`);
      try {
        await sql.unsafe(statement + ';');
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (stmtError) {
        // Check if it's a "already exists" error, which is OK
        if (stmtError.message.includes('already exists') || stmtError.message.includes('duplicate')) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists):`, stmtError.message.split('\n')[0]);
        } else {
          throw stmtError;
        }
      }
    }
  }

  console.log('🎉 Migration completed successfully!');
  console.log('✅ whatsapp_sessions table should now exist');

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
