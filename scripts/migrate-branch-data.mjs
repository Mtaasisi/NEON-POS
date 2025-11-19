#!/usr/bin/env node

/**
 * CLI Tool for Neon Database Branch Migration
 * 
 * Usage:
 *   node scripts/migrate-branch-data.mjs --help
 *   node scripts/migrate-branch-data.mjs --from dev --to main --tables products,customers --type both
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// Parse command line arguments
const args = process.argv.slice(2);
const config = {
  from: null,
  to: null,
  tables: null,
  type: 'both', // schema, data, or both
  help: false
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--from':
      config.from = args[++i];
      break;
    case '--to':
      config.to = args[++i];
      break;
    case '--tables':
      config.tables = args[++i]?.split(',').map(t => t.trim());
      break;
    case '--type':
      config.type = args[++i];
      break;
    case '--help':
    case '-h':
      config.help = true;
      break;
  }
}

// Show help
if (config.help || !config.from || !config.to) {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║          Neon Database Branch Migration Tool                   ║
╚════════════════════════════════════════════════════════════════╝

Usage:
  node scripts/migrate-branch-data.mjs [options]

Options:
  --from <branch>     Source branch name (required)
  --to <branch>       Target branch name (required)
  --tables <list>     Comma-separated list of tables (optional, migrates all if not specified)
  --type <type>       Migration type: schema, data, or both (default: both)
  --help, -h          Show this help message

Examples:
  # Migrate all tables (schema + data) from dev to main
  node scripts/migrate-branch-data.mjs --from dev --to main

  # Migrate specific tables only
  node scripts/migrate-branch-data.mjs --from dev --to main --tables products,customers,orders

  # Migrate schema only
  node scripts/migrate-branch-data.mjs --from dev --to main --type schema

Environment Variables Required:
  NEON_API_KEY              Your Neon API key
  NEON_PROJECT_ID           Your Neon project ID
  SOURCE_DATABASE_URL       Source branch connection string (or use --from branch name)
  TARGET_DATABASE_URL       Target branch connection string (or use --to branch name)

Note: You can also create a .env file with these variables.
  `);
  process.exit(config.help ? 0 : 1);
}

// Load branch configuration
function getBranchConfig() {
  const configPath = join(__dirname, '../neon-branches.json');
  
  if (existsSync(configPath)) {
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  }
  
  return {
    branches: {
      dev: process.env.SOURCE_DATABASE_URL,
      main: process.env.TARGET_DATABASE_URL,
      production: process.env.PRODUCTION_DATABASE_URL
    }
  };
}

async function migrateTable(sourceSql, targetSql, tableName, type) {
  console.log(`\n📦 Processing table: ${tableName}`);

  try {
    // Migrate Schema
    if (type === 'schema' || type === 'both') {
      console.log(`  ├─ Migrating schema...`);

      // Get table schema from source
      const tableSchema = await sourceSql`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          column_default,
          is_nullable,
          udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tableName}
        ORDER BY ordinal_position
      `;

      // Check if table exists in target
      const tableExists = await targetSql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = ${tableName}
        ) as exists
      `;

      if (!tableExists[0].exists) {
        // Create table in target
        console.log(`  ├─ Creating table...`);
        
        const columns = tableSchema.map(col => {
          let colDef = `"${col.column_name}" ${col.data_type}`;
          if (col.character_maximum_length) {
            colDef += `(${col.character_maximum_length})`;
          }
          if (col.is_nullable === 'NO') {
            colDef += ' NOT NULL';
          }
          if (col.column_default) {
            colDef += ` DEFAULT ${col.column_default}`;
          }
          return colDef;
        }).join(', ');

        await targetSql.unsafe(`CREATE TABLE IF NOT EXISTS "${tableName}" (${columns})`);
        console.log(`  ├─ ✓ Table created`);
      } else {
        // Add missing columns to existing table
        const targetColumns = await targetSql`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${tableName}
        `;

        const targetColNames = targetColumns.map(c => c.column_name);
        const missingColumns = tableSchema.filter(
          col => !targetColNames.includes(col.column_name)
        );

        if (missingColumns.length > 0) {
          console.log(`  ├─ Adding ${missingColumns.length} missing column(s)...`);
          
          for (const col of missingColumns) {
            let colDef = `${col.data_type}`;
            if (col.character_maximum_length) {
              colDef += `(${col.character_maximum_length})`;
            }
            if (col.column_default) {
              colDef += ` DEFAULT ${col.column_default}`;
            }
            
            await targetSql.unsafe(
              `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${col.column_name}" ${colDef}`
            );
          }
          
          console.log(`  ├─ ✓ Columns added`);
        } else {
          console.log(`  ├─ ✓ Schema up to date`);
        }
      }
    }

    // Migrate Data
    if (type === 'data' || type === 'both') {
      console.log(`  ├─ Migrating data...`);

      // Get data from source
      const data = await sourceSql.unsafe(`SELECT * FROM "${tableName}"`);

      if (data.length > 0) {
        console.log(`  ├─ Copying ${data.length} rows...`);

        // Get column names
        const columns = Object.keys(data[0]);
        const columnList = columns.map(c => `"${c}"`).join(', ');
        const valuePlaceholders = columns.map((_, i) => `$${i + 1}`).join(', ');

        // Insert data in batches
        const batchSize = 100;
        let successCount = 0;
        let skipCount = 0;

        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);
          
          for (const row of batch) {
            const values = columns.map(col => row[col]);
            try {
              await targetSql.unsafe(
                `INSERT INTO "${tableName}" (${columnList}) VALUES (${valuePlaceholders}) ON CONFLICT DO NOTHING`,
                values
              );
              successCount++;
            } catch (err) {
              skipCount++;
              // Continue on error
            }
          }

          if (i + batchSize < data.length) {
            process.stdout.write(`\r  ├─ Progress: ${Math.min(i + batchSize, data.length)}/${data.length} rows`);
          }
        }

        console.log(`\r  └─ ✓ Data migration complete: ${successCount} inserted, ${skipCount} skipped`);
      } else {
        console.log(`  └─ ✓ No data to migrate`);
      }
    }

    console.log(`✅ Completed: ${tableName}`);
    return { success: true, table: tableName };
  } catch (error) {
    console.error(`\n❌ Error migrating ${tableName}:`, error.message);
    return { success: false, table: tableName, error: error.message };
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║          Starting Branch Migration                             ║
╚════════════════════════════════════════════════════════════════╝
  `);

  console.log(`Configuration:`);
  console.log(`  Source Branch: ${config.from}`);
  console.log(`  Target Branch: ${config.to}`);
  console.log(`  Migration Type: ${config.type}`);
  console.log(`  Tables: ${config.tables ? config.tables.join(', ') : 'All'}`);
  console.log('');

  try {
    // Get branch configurations
    const branchConfig = getBranchConfig();
    const sourceUrl = branchConfig.branches[config.from];
    const targetUrl = branchConfig.branches[config.to];

    if (!sourceUrl || !targetUrl) {
      throw new Error('Branch configuration not found. Please set up neon-branches.json or environment variables.');
    }

    console.log('🔌 Connecting to databases...');
    const sourceSql = neon(sourceUrl);
    const targetSql = neon(targetUrl);
    console.log('✓ Connected\n');

    // Get list of tables to migrate
    let tablesToMigrate = config.tables;
    
    if (!tablesToMigrate) {
      console.log('📋 Fetching table list from source...');
      const tables = await sourceSql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;
      tablesToMigrate = tables.map(t => t.table_name);
      console.log(`✓ Found ${tablesToMigrate.length} tables\n`);
    }

    console.log(`🚀 Starting migration of ${tablesToMigrate.length} table(s)...\n`);

    // Migrate each table
    const results = [];
    for (const tableName of tablesToMigrate) {
      const result = await migrateTable(sourceSql, targetSql, tableName, config.type);
      results.push(result);
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║          Migration Summary                                     ║
╚════════════════════════════════════════════════════════════════╝

Total Tables: ${results.length}
Successful: ${successful}
Failed: ${failed}
    `);

    if (failed > 0) {
      console.log('Failed tables:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  ❌ ${r.table}: ${r.error}`);
      });
    }

    console.log('\n✨ Migration process completed!\n');
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run migration
main();

