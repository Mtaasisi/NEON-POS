#!/usr/bin/env node

/**
 * Run Notifications Migration (PostgreSQL)
 * This script creates the notifications table using direct PostgreSQL connection
 */

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ Missing DATABASE_URL');
  console.error('Please check your .env file for DATABASE_URL');
  process.exit(1);
}

async function runNotificationsMigration() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🚀 Starting Notifications Migration...');
    
    // Connect to database
    await client.connect();
    console.log('✅ Connected to database');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'create_notifications_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Executing notifications table creation...');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Notifications table created successfully!');
    
    // Test the notifications system
    console.log('🧪 Testing notifications system...');
    
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'notifications' 
      AND table_schema = 'public'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ Notifications table exists');
      
      // Check if we have any notifications
      const notificationsCheck = await client.query(`
        SELECT COUNT(*) as count FROM notifications
      `);
      
      console.log(`📊 Current notifications count: ${notificationsCheck.rows[0].count}`);
    } else {
      console.error('❌ Notifications table was not created');
      throw new Error('Table creation failed');
    }
    
    console.log('🎉 Notifications migration completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. The notifications table is now available');
    console.log('2. Dashboard will now fetch real notification data');
    console.log('3. You can create notifications programmatically');
    console.log('4. The NotificationWidget will display actual data');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the migration
runNotificationsMigration();
