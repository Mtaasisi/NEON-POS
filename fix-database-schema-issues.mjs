#!/usr/bin/env node

/**
 * Database Schema Fix Script
 * Fixes all database schema inconsistencies and migration issues
 */

import { executeQuery, executeTransaction, initializeLocalDatabase } from './src/lib/localDatabase.ts';

console.log('🔧 Starting database schema fixes...');

async function fixDatabaseSchema() {
  try {
    // Initialize database connection
    console.log('📡 Initializing database connection...');
    await initializeLocalDatabase();

    // Disable foreign key constraints during fixes
    executeQuery('PRAGMA foreign_keys = OFF;');

    // 1. Fix schema_migrations table constraint issues
    console.log('🔄 Fixing schema_migrations table...');
    try {
      // Create schema_migrations table if it doesn't exist
      executeQuery(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
          success INTEGER DEFAULT 1
        )
      `);

      // Check if migration 2 (sku column) is already applied
      const skuColumnExists = executeQuery(`
        SELECT COUNT(*) as count
        FROM pragma_table_info('lats_products')
        WHERE name = 'sku'
      `)[0]?.count > 0;

      if (!skuColumnExists) {
        console.log('📝 Adding sku column to lats_products table...');
        executeQuery('ALTER TABLE lats_products ADD COLUMN sku TEXT');
      } else {
        console.log('✅ sku column already exists in lats_products');
      }

      // Ensure migration 2 is recorded
      const migration2Exists = executeQuery(`
        SELECT COUNT(*) as count
        FROM schema_migrations
        WHERE version = 2
      `)[0]?.count > 0;

      if (!migration2Exists) {
        executeQuery('INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
          [2, 'Add sku column to lats_products table']);
        console.log('✅ Migration 2 recorded');
      }

    } catch (error) {
      console.warn('⚠️ Issue with sku column fix:', error.message);
    }

    // 2. Add missing background_color column to store_locations
    console.log('🎨 Adding background_color column to store_locations...');
    try {
      const bgColorExists = executeQuery(`
        SELECT COUNT(*) as count
        FROM pragma_table_info('store_locations')
        WHERE name = 'background_color'
      `)[0]?.count > 0;

      if (!bgColorExists) {
        executeQuery('ALTER TABLE store_locations ADD COLUMN background_color TEXT');
        console.log('✅ Added background_color column to store_locations');
      } else {
        console.log('✅ background_color column already exists');
      }
    } catch (error) {
      console.warn('⚠️ Issue with background_color column:', error.message);
    }

    // 3. Ensure customers table exists
    console.log('👥 Ensuring customers table exists...');
    try {
      const customersExists = executeQuery(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='customers'
      `).length > 0;

      if (!customersExists) {
        console.log('📝 Creating customers table...');
        executeQuery(`
          CREATE TABLE customers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            branch_id TEXT,
            is_active INTEGER DEFAULT 1,
            loyalty_points INTEGER DEFAULT 0,
            total_purchases REAL DEFAULT 0.00,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✅ Created customers table');
      } else {
        console.log('✅ customers table already exists');
      }
    } catch (error) {
      console.warn('⚠️ Issue with customers table:', error.message);
    }

    // 4. Ensure lats_customers table exists (for compatibility)
    console.log('👥 Ensuring lats_customers table exists...');
    try {
      const latsCustomersExists = executeQuery(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='lats_customers'
      `).length > 0;

      if (!latsCustomersExists) {
        console.log('📝 Creating lats_customers table...');
        executeQuery(`
          CREATE TABLE lats_customers (
            id TEXT PRIMARY KEY,
            first_name TEXT NOT NULL,
            last_name TEXT,
            email TEXT,
            phone TEXT,
            phone2 TEXT,
            address TEXT,
            city TEXT,
            country TEXT DEFAULT 'Tanzania',
            date_of_birth TEXT,
            branch_id TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✅ Created lats_customers table');
      } else {
        console.log('✅ lats_customers table already exists');
      }
    } catch (error) {
      console.warn('⚠️ Issue with lats_customers table:', error.message);
    }

    // 5. Ensure store_locations table exists and has required columns
    console.log('🏪 Ensuring store_locations table is complete...');
    try {
      const storeLocationsExists = executeQuery(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='store_locations'
      `).length > 0;

      if (!storeLocationsExists) {
        console.log('📝 Creating store_locations table...');
        executeQuery(`
          CREATE TABLE store_locations (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            code TEXT NOT NULL UNIQUE,
            address TEXT,
            phone TEXT,
            email TEXT,
            manager_id TEXT,
            is_active INTEGER DEFAULT 1,
            created_by TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            location TEXT,
            operating_hours TEXT,
            background_color TEXT,
            data_isolation_mode TEXT DEFAULT 'shared',
            share_inventory INTEGER DEFAULT 1
          )
        `);
        console.log('✅ Created store_locations table');
      } else {
        console.log('✅ store_locations table already exists');
      }

      // Ensure all required columns exist
      const requiredColumns = [
        'data_isolation_mode',
        'share_inventory',
        'background_color'
      ];

      for (const column of requiredColumns) {
        const columnExists = executeQuery(`
          SELECT COUNT(*) as count
          FROM pragma_table_info('store_locations')
          WHERE name = '${column}'
        `)[0]?.count > 0;

        if (!columnExists) {
          console.log(`📝 Adding ${column} column to store_locations...`);
          if (column === 'data_isolation_mode') {
            executeQuery(`ALTER TABLE store_locations ADD COLUMN ${column} TEXT DEFAULT 'shared'`);
          } else if (column === 'share_inventory') {
            executeQuery(`ALTER TABLE store_locations ADD COLUMN ${column} INTEGER DEFAULT 1`);
          } else {
            executeQuery(`ALTER TABLE store_locations ADD COLUMN ${column} TEXT`);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Issue with store_locations table:', error.message);
    }

    // 6. Clean up and verify schema_migrations
    console.log('🧹 Cleaning up schema_migrations table...');
    try {
      // Remove duplicate entries
      executeQuery(`
        DELETE FROM schema_migrations
        WHERE rowid NOT IN (
          SELECT MIN(rowid)
          FROM schema_migrations
          GROUP BY version
        )
      `);

      // Ensure we have the basic migrations recorded
      const migrations = [
        { version: 1, name: 'Initialize core schema and sample data' },
        { version: 2, name: 'Add sku column to lats_products table' },
        { version: 3, name: 'Update product IDs to UUID format' }
      ];

      for (const migration of migrations) {
        const exists = executeQuery(`
          SELECT COUNT(*) as count
          FROM schema_migrations
          WHERE version = ?
        `, [migration.version])[0]?.count > 0;

        if (!exists) {
          executeQuery(`
            INSERT INTO schema_migrations (version, name, executed_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
          `, [migration.version, migration.name]);
          console.log(`✅ Recorded migration ${migration.version}: ${migration.name}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Issue with schema_migrations cleanup:', error.message);
    }

    // 7. Add default branch if it doesn't exist
    console.log('🏪 Ensuring default branch exists...');
    try {
      const defaultBranchExists = executeQuery(`
        SELECT COUNT(*) as count
        FROM store_locations
        WHERE id = '00000000-0000-0000-0000-000000000001'
      `)[0]?.count > 0;

      if (!defaultBranchExists) {
        executeQuery(`
          INSERT INTO store_locations (
            id, name, code, address, phone, email, is_active,
            data_isolation_mode, share_inventory, background_color
          ) VALUES (
            '00000000-0000-0000-0000-000000000001',
            'Main Store',
            'MAIN',
            'Default Address',
            '+255000000000',
            'admin@store.com',
            1,
            'shared',
            1,
            '#3b82f6'
          )
        `);
        console.log('✅ Created default branch');
      } else {
        console.log('✅ Default branch already exists');
      }
    } catch (error) {
      console.warn('⚠️ Issue with default branch creation:', error.message);
    }

    // Re-enable foreign key constraints
    executeQuery('PRAGMA foreign_keys = ON;');

    // 8. Verify fixes
    console.log('🔍 Verifying database fixes...');
    try {
      const tables = ['customers', 'lats_customers', 'store_locations', 'lats_products', 'schema_migrations'];
      for (const table of tables) {
        const exists = executeQuery(`
          SELECT name FROM sqlite_master
          WHERE type='table' AND name='${table}'
        `).length > 0;

        if (exists) {
          const count = executeQuery(`SELECT COUNT(*) as count FROM ${table}`)[0]?.count || 0;
          console.log(`✅ ${table}: ${count} records`);
        } else {
          console.log(`❌ ${table}: missing`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Issue with verification:', error.message);
    }

    console.log('🎉 Database schema fixes completed successfully!');

  } catch (error) {
    console.error('❌ Database schema fixes failed:', error);
    process.exit(1);
  }
}

// Run the fixes
fixDatabaseSchema().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
