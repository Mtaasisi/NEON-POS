#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();
const sql = neon(process.env.VITE_DATABASE_URL!);

async function runCompleteSchema() {
  console.log('🚀 Running Complete Database Schema Setup\n');
  console.log('═'.repeat(70));
  
  try {
    // Read the SQL file
    const sqlContent = readFileSync('complete-database-schema.sql', 'utf-8');
    
    // Split by semicolons but keep CREATE TABLE statements together
    const statements = sqlContent.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    let created = 0;
    let existing = 0;
    let errors = 0;
    
    for (const statement of statements) {
      // Skip comments
      if (statement.startsWith('--') || !statement.includes('CREATE TABLE')) {
        continue;
      }
      
      // Extract table name for better logging
      const match = statement.match(/CREATE TABLE IF NOT EXISTS\s+(\w+)/i);
      const tableName = match ? match[1] : 'unknown';
      
      try {
        await sql([statement]);
        console.log(`✅ ${tableName}`);
        created++;
      } catch (err: any) {
        if (err.message.includes('already exists')) {
          console.log(`ℹ️  ${tableName} (exists)`);
          existing++;
        } else {
          console.log(`❌ ${tableName}: ${err.message.substring(0, 60)}...`);
          errors++;
        }
      }
    }
    
    console.log('\n' + '═'.repeat(70));
    console.log('\n📊 SUMMARY');
    console.log(`✅ Created: ${created}`);
    console.log(`ℹ️  Already existed: ${existing}`);
    console.log(`❌ Errors: ${errors}`);
    
    // List all tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log(`\n📋 Total tables: ${tables.length}\n`);
    console.log('═'.repeat(70));
    console.log('\n✅ Schema setup complete!\n');
    
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

runCompleteSchema().catch(console.error);

