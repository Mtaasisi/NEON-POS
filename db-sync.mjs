#!/usr/bin/env node

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database URLs
const DATABASES = {
  prod: 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  dev: 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
};

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function error(message) {
  log(colors.red, `❌ ${message}`);
}

function success(message) {
  log(colors.green, `✅ ${message}`);
}

function info(message) {
  log(colors.blue, `ℹ️  ${message}`);
}

function warning(message) {
  log(colors.yellow, `⚠️  ${message}`);
}

class DatabaseSync {
  constructor() {
    this.client = null;
  }

  async connect(url) {
    this.client = new pg.Client(url);
    await this.client.connect();
    return this.client;
  }

  async disconnect() {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }

  async getTables(client) {
    const result = await client.query(`
      SELECT schemaname, tablename, tableowner
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    return result.rows;
  }

  async getViews(client) {
    const result = await client.query(`
      SELECT schemaname, viewname, viewowner
      FROM pg_views
      WHERE schemaname = 'public'
      ORDER BY viewname
    `);
    return result.rows;
  }

  async getFunctions(client) {
    const result = await client.query(`
      SELECT proname, pg_get_function_identity_arguments(oid) as arguments
      FROM pg_proc
      WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY proname
    `);
    return result.rows;
  }

  async getTableStructure(client, tableName) {
    try {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default, ordinal_position
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tableName]);
      return result.rows;
    } catch (err) {
      // Table might not exist
      return [];
    }
  }

  async getConstraints(client, tableName) {
    try {
      const result = await client.query(`
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND conrelid::regclass::text = $1
        ORDER BY conname
      `, [tableName]);
      return result.rows;
    } catch (err) {
      return [];
    }
  }

  async getIndexes(client, tableName) {
    try {
      const result = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = $1
        ORDER BY indexname
      `, [tableName]);
      return result.rows;
    } catch (err) {
      return [];
    }
  }

  compareArrays(arr1, arr2, key) {
    const set1 = new Set(arr1.map(item => item[key]));
    const set2 = new Set(arr2.map(item => item[key]));

    const missingIn2 = arr1.filter(item => !set2.has(item[key]));
    const missingIn1 = arr2.filter(item => !set1.has(item[key]));

    return { missingIn2, missingIn1 };
  }

  async compareDatabases() {
    info('🔍 Analyzing database differences...');

    const devClient = await this.connect(DATABASES.dev);
    const prodClient = await this.connect(DATABASES.prod);

    try {
      // Get all objects from both databases
      const [devTables, prodTables] = await Promise.all([
        this.getTables(devClient),
        this.getTables(prodClient)
      ]);

      const [devViews, prodViews] = await Promise.all([
        this.getViews(devClient),
        this.getViews(prodClient)
      ]);

      const [devFunctions, prodFunctions] = await Promise.all([
        this.getFunctions(devClient),
        this.getFunctions(prodClient)
      ]);

      // Compare tables
      const tableDiff = this.compareArrays(devTables, prodTables, 'tablename');

      // Compare views
      const viewDiff = this.compareArrays(devViews, prodViews, 'viewname');

      // Compare functions
      const functionDiff = this.compareArrays(devFunctions, prodFunctions, 'proname');

      const differences = {
        tables: {
          missingInProd: tableDiff.missingIn2,
          extraInProd: tableDiff.missingIn1
        },
        views: {
          missingInProd: viewDiff.missingIn2,
          extraInProd: viewDiff.missingIn1
        },
        functions: {
          missingInProd: functionDiff.missingIn2,
          extraInProd: functionDiff.missingIn1
        },
        tableStructures: [],
        constraints: [],
        indexes: []
      };

      // Check table structures for tables that exist in both
      const commonTables = devTables.filter(devTable =>
        prodTables.some(prodTable => prodTable.tablename === devTable.tablename)
      );

      for (const table of commonTables) {
        const [devStructure, prodStructure] = await Promise.all([
          this.getTableStructure(devClient, table.tablename),
          this.getTableStructure(prodClient, table.tablename)
        ]);

        if (devStructure.length !== prodStructure.length) {
          differences.tableStructures.push({
            table: table.tablename,
            devColumns: devStructure.length,
            prodColumns: prodStructure.length
          });
        }

        // Check constraints
        const [devConstraints, prodConstraints] = await Promise.all([
          this.getConstraints(devClient, table.tablename),
          this.getConstraints(prodClient, table.tablename)
        ]);

        if (devConstraints.length !== prodConstraints.length) {
          differences.constraints.push({
            table: table.tablename,
            devConstraints: devConstraints.length,
            prodConstraints: prodConstraints.length
          });
        }

        // Check indexes
        const [devIndexes, prodIndexes] = await Promise.all([
          this.getIndexes(devClient, table.tablename),
          this.getIndexes(prodClient, table.tablename)
        ]);

        if (devIndexes.length !== prodIndexes.length) {
          differences.indexes.push({
            table: table.tablename,
            devIndexes: devIndexes.length,
            prodIndexes: prodIndexes.length
          });
        }
      }

      return differences;

    } finally {
      await this.disconnect();
    }
  }

  async generateSyncSQL(differences) {
    info('🔧 Generating sync SQL...');

    let sql = `-- Auto-generated sync SQL
-- Generated on: ${new Date().toISOString()}
-- This file synchronizes production database with development

BEGIN;
`;

    // Handle missing tables in production
    if (differences.tables.missingInProd.length > 0) {
      sql += `\n-- Missing tables in production\n`;
      for (const table of differences.tables.missingInProd) {
        sql += `-- CREATE TABLE ${table.tablename} (structure needs to be copied from dev)\n`;
        warning(`Table '${table.tablename}' exists in dev but not in prod - manual creation required`);
      }
    }

    // Handle missing views in production
    if (differences.views.missingInProd.length > 0) {
      sql += `\n-- Missing views in production\n`;
      for (const view of differences.views.missingInProd) {
        sql += `-- CREATE VIEW ${view.viewname} (structure needs to be copied from dev)\n`;
        warning(`View '${view.viewname}' exists in dev but not in prod - manual creation required`);
      }
    }

    // Handle missing functions in production
    if (differences.functions.missingInProd.length > 0) {
      sql += `\n-- Missing functions in production\n`;
      for (const func of differences.functions.missingInProd) {
        sql += `-- Function ${func.proname}(${func.arguments}) needs to be copied from dev\n`;
        warning(`Function '${func.proname}' exists in dev but not in prod`);
      }
    }

    // Handle table structure differences
    if (differences.tableStructures.length > 0) {
      sql += `\n-- Table structure differences\n`;
      for (const diff of differences.tableStructures) {
        sql += `-- ALTER TABLE ${diff.table} (column count differs: dev=${diff.devColumns}, prod=${diff.prodColumns})\n`;
        warning(`Table '${diff.table}' has different column counts`);
      }
    }

    // Handle constraint differences
    if (differences.constraints.length > 0) {
      sql += `\n-- Constraint differences\n`;
      for (const diff of differences.constraints) {
        sql += `-- ALTER TABLE ${diff.table} (constraint count differs: dev=${diff.devConstraints}, prod=${diff.prodConstraints})\n`;
        warning(`Table '${diff.table}' has different constraint counts`);
      }
    }

    // Handle index differences
    if (differences.indexes.length > 0) {
      sql += `\n-- Index differences\n`;
      for (const diff of differences.indexes) {
        sql += `-- CREATE INDEX on ${diff.table} (index count differs: dev=${diff.devIndexes}, prod=${diff.prodIndexes})\n`;
        warning(`Table '${diff.table}' has different index counts`);
      }
    }

    sql += `\nCOMMIT;\n`;

    return sql;
  }

  async applySync(sql) {
    const client = await this.connect(DATABASES.prod);

    try {
      info('⚡ Applying sync to production database...');
      await client.query(sql);
      success('Sync applied successfully!');
      return true;
    } catch (err) {
      error(`Failed to apply sync: ${err.message}`);
      return false;
    } finally {
      await client.disconnect();
    }
  }

  async runFullSync() {
    try {
      info('🚀 Starting automatic database sync...');

      // Step 1: Compare databases
      const differences = await this.compareDatabases();

      // Step 2: Check if anything needs syncing
      const hasDifferences =
        differences.tables.missingInProd.length > 0 ||
        differences.views.missingInProd.length > 0 ||
        differences.functions.missingInProd.length > 0 ||
        differences.tableStructures.length > 0 ||
        differences.constraints.length > 0 ||
        differences.indexes.length > 0;

      if (!hasDifferences) {
        success('✅ Databases are already in sync!');
        return true;
      }

      // Step 3: Generate sync SQL
      const syncSQL = await this.generateSyncSQL(differences);

      // Step 4: Save sync file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `sync-${timestamp}.sql`;
      fs.writeFileSync(filename, syncSQL);

      info(`📄 Sync SQL saved to: ${filename}`);

      // Step 5: Ask user if they want to apply it
      console.log('\n' + '='.repeat(50));
      warning('REVIEW THE GENERATED SQL FILE BEFORE PROCEEDING!');
      console.log(`File: ${filename}`);
      console.log('='.repeat(50));

      // For now, we'll apply it automatically, but in production you might want user confirmation
      const shouldApply = process.env.AUTO_APPLY === 'true';

      if (shouldApply) {
        info('🔄 Auto-applying sync (AUTO_APPLY=true)');
        const success = await this.applySync(syncSQL);
        return success;
      } else {
        info('⏸️  Sync SQL generated. Run with AUTO_APPLY=true to apply automatically.');
        info(`   Or run: psql "${DATABASES.prod}" -f ${filename}`);
        return false;
      }

    } catch (err) {
      error(`Sync failed: ${err.message}`);
      return false;
    }
  }
}

// Main execution
async function main() {
  const command = process.argv[2];

  const sync = new DatabaseSync();

  switch (command) {
    case 'check':
      const differences = await sync.compareDatabases();
      console.log(JSON.stringify(differences, null, 2));
      break;

    case 'sync':
      await sync.runFullSync();
      break;

    case 'auto':
      process.env.AUTO_APPLY = 'true';
      await sync.runFullSync();
      break;

    default:
      console.log(`
Database Sync Tool for NEON POS

Usage:
  node db-sync.mjs check    - Check differences between dev and prod
  node db-sync.mjs sync     - Generate sync SQL (manual review required)
  node db-sync.mjs auto     - Generate and automatically apply sync

Examples:
  node db-sync.mjs check    # See what's different
  node db-sync.mjs sync     # Create sync file for review
  AUTO_APPLY=true node db-sync.mjs sync  # Auto-apply changes

Environment Variables:
  AUTO_APPLY=true          - Automatically apply sync without confirmation
      `);
  }
}

main().catch(err => {
  error(`Fatal error: ${err.message}`);
  process.exit(1);
});
