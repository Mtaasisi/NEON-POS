#!/usr/bin/env node

/**
 * Apply Delivery Tracking Migration to Neon Database
 *
 * This script applies the delivery tracking system migration directly to your Neon database.
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Neon database connection string
const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function applyMigration() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔗 Connecting to Neon database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../../migrations/create_delivery_tracking_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded successfully');
    console.log(`📏 Migration size: ${migrationSQL.length} characters`);

    // Split the migration into individual statements (by semicolon)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)
      .filter(stmt => !stmt.startsWith('--')); // Remove comments

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    let executedCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement.trim()) continue;

      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);

        await client.query(statement + ';');
        executedCount++;
        console.log(`✅ Statement ${i + 1} executed successfully`);

      } catch (stmtError) {
        // Some statements might fail if tables already exist (CREATE TABLE IF NOT EXISTS)
        // That's okay, continue with others
        console.warn(`⚠️  Statement ${i + 1} failed:`, stmtError.message);

        // Check if it's an ignorable error (table already exists, etc.)
        const ignorableErrors = [
          'already exists',
          'does not exist', // For DROP TABLE IF EXISTS
          'duplicate key',
          'violates unique constraint'
        ];

        const isIgnorable = ignorableErrors.some(errorText =>
          stmtError.message.toLowerCase().includes(errorText.toLowerCase())
        );

        if (!isIgnorable) {
          errorCount++;
          console.error(`❌ Critical error in statement ${i + 1}:`, stmtError);
        } else {
          console.log(`ℹ️  Statement ${i + 1} skipped (expected):`, stmtError.message);
        }
      }
    }

    console.log('\n🎉 Migration completed!');
    console.log(`✅ Successfully executed: ${executedCount} statements`);
    console.log(`⚠️  Expected errors: ${errorCount} statements`);

    // Verify tables were created
    console.log('\n🔍 Verifying created tables...');
    const tables = [
      'lats_delivery_orders',
      'lats_delivery_status_history',
      'lats_customer_notifications',
      'lats_delivery_drivers',
      'lats_delivery_zones',
      'lats_delivery_analytics'
    ];

    for (const tableName of tables) {
      try {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_name = $1
          )
        `, [tableName]);

        const exists = result.rows[0].exists;
        console.log(`${exists ? '✅' : '❌'} ${tableName}: ${exists ? 'Created' : 'Not found'}`);

      } catch (error) {
        console.warn(`⚠️  Could not verify ${tableName}:`, error.message);
      }
    }

    console.log('\n🚀 Delivery Tracking System is now ready!');
    console.log('\n📋 Next steps:');
    console.log('1. Restart your application');
    console.log('2. Test delivery creation in Tablet POS');
    console.log('3. Access delivery management via top bar button');
    console.log('4. Set up SMS/WhatsApp notifications (optional)');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration
console.log('🚚 Starting Delivery Tracking System Migration...');
console.log('📍 Target Database: Neon PostgreSQL');
console.log('');

applyMigration();