#!/usr/bin/env node
/**
 * Backup branches and all their associated data
 * Backs up lats_branches, store_locations, and related data
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get connection string from command line or use provided one
const connectionString = process.argv[2] || 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = new Client({ 
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

// Create backup directory with date
const today = new Date().toISOString().split('T')[0];
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                 new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
const backupDir = path.join(__dirname, `branches-backup-${today}`);
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`📁 Created backup directory: ${backupDir}`);
}

async function backupTable(tableName, displayName, whereClause = '') {
  console.log(`\n📦 Backing up ${displayName}...`);
  
  try {
    // First, get all column names from the table
    const columnResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);
    
    const allColumns = columnResult.rows.map(r => r.column_name);
    console.log(`   📋 Table has ${allColumns.length} columns`);
    
    // Get all data from table
    const query = whereClause 
      ? `SELECT * FROM ${tableName} WHERE ${whereClause} ORDER BY created_at DESC, id`
      : `SELECT * FROM ${tableName} ORDER BY created_at DESC, id`;
    
    const result = await client.query(query);
    const data = result.rows;
    
    console.log(`   ✅ Found ${data.length} records`);
    
    // Verify all columns are present in the backup
    if (data.length > 0) {
      const backupColumns = Object.keys(data[0]);
      const missingColumns = allColumns.filter(col => !backupColumns.includes(col));
      if (missingColumns.length > 0) {
        console.log(`   ⚠️  Warning: ${missingColumns.length} columns missing in backup: ${missingColumns.join(', ')}`);
      } else {
        console.log(`   ✅ All ${allColumns.length} columns are included in backup`);
      }
    }
    
    // Save as JSON
    const jsonFilename = path.join(backupDir, `${tableName}_${timestamp}.json`);
    fs.writeFileSync(jsonFilename, JSON.stringify(data, null, 2), 'utf8');
    console.log(`   💾 JSON saved: ${path.basename(jsonFilename)}`);
    console.log(`      Size: ${(fs.statSync(jsonFilename).size / 1024).toFixed(2)} KB`);
    
    // Generate SQL INSERT statements
    let sqlFilename = null;
    if (data.length > 0) {
      const columns = Object.keys(data[0]);
      const sqlStatements = [];
      
      // Add table structure comment
      sqlStatements.push(`-- Backup of ${tableName} table`);
      sqlStatements.push(`-- Generated: ${new Date().toISOString()}`);
      sqlStatements.push(`-- Total records: ${data.length}`);
      if (whereClause) {
        sqlStatements.push(`-- Filter: ${whereClause}`);
      }
      sqlStatements.push('');
      
      // Generate INSERT statements in batches
      const batchSize = 100;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const values = batch.map(row => {
          const rowValues = columns.map(col => {
            const value = row[col];
            if (value === null || value === undefined) return 'NULL';
            if (typeof value === 'boolean') return value ? 'true' : 'false';
            if (typeof value === 'number') return value.toString();
            if (value instanceof Date) return `'${value.toISOString()}'::timestamptz`;
            if (Array.isArray(value)) {
              return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
            }
            if (typeof value === 'object' && value !== null) {
              return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
            }
            // Escape single quotes in strings
            return `'${String(value).replace(/'/g, "''")}'`;
          });
          return `(${rowValues.join(', ')})`;
        });
        
        sqlStatements.push(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES`);
        sqlStatements.push(values.join(',\n') + ';');
        sqlStatements.push('');
      }
      
      // Save as SQL
      sqlFilename = path.join(backupDir, `${tableName}_${timestamp}.sql`);
      fs.writeFileSync(sqlFilename, sqlStatements.join('\n'), 'utf8');
      console.log(`   💾 SQL saved: ${path.basename(sqlFilename)}`);
      console.log(`      Size: ${(fs.statSync(sqlFilename).size / 1024).toFixed(2)} KB`);
    } else {
      console.log(`   ⚠️  No data to backup for ${tableName}`);
    }
    
    return { count: data.length, jsonFile: jsonFilename, sqlFile: sqlFilename };
  } catch (error) {
    console.error(`   ❌ Error backing up ${tableName}:`, error.message);
    return null;
  }
}

async function backupBranchesData() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  💾 BACKING UP BRANCHES AND DATA                     ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    await client.connect();
    console.log('✅ Connected successfully!\n');

    const results = {};

    // 1. Backup lats_branches
    console.log('1️⃣ Backing up lats_branches...');
    results.lats_branches = await backupTable('lats_branches', 'Branches (lats_branches)');
    
    // 2. Backup store_locations
    console.log('\n2️⃣ Backing up store_locations...');
    results.store_locations = await backupTable('store_locations', 'Store Locations');

    // 3. Get all branch IDs to backup related data
    console.log('\n3️⃣ Getting branch IDs for related data backup...');
    const branchesResult = await client.query('SELECT id FROM lats_branches');
    const branchIds = branchesResult.rows.map(r => r.id);
    console.log(`   ✅ Found ${branchIds.length} branch(es): ${branchIds.join(', ')}`);

    if (branchIds.length > 0) {
      const branchIdsStr = branchIds.map(id => `'${id}'`).join(',');
      
      // 4. Backup products associated with branches
      console.log('\n4️⃣ Backing up products associated with branches...');
      results.products = await backupTable(
        'lats_products', 
        'Products', 
        `branch_id IN (${branchIdsStr})`
      );

      // 5. Backup customers associated with branches
      console.log('\n5️⃣ Backing up customers associated with branches...');
      try {
        results.customers = await backupTable(
          'lats_customers', 
          'Customers (lats_customers)', 
          `branch_id IN (${branchIdsStr})`
        );
      } catch (error) {
        // Try customers table if lats_customers doesn't exist
        try {
          results.customers = await backupTable(
            'customers', 
            'Customers', 
            `branch_id IN (${branchIdsStr})`
          );
        } catch (error2) {
          console.log(`   ⚠️  Could not backup customers: ${error2.message}`);
        }
      }

      // 6. Backup categories associated with branches
      console.log('\n6️⃣ Backing up categories associated with branches...');
      try {
        results.categories = await backupTable(
          'lats_categories', 
          'Categories', 
          `branch_id IN (${branchIdsStr})`
        );
      } catch (error) {
        console.log(`   ⚠️  Could not backup categories: ${error.message}`);
      }

      // 7. Backup sales associated with branches
      console.log('\n7️⃣ Backing up sales associated with branches...');
      try {
        results.sales = await backupTable(
          'lats_sales', 
          'Sales', 
          `branch_id IN (${branchIdsStr})`
        );
      } catch (error) {
        console.log(`   ⚠️  Could not backup sales: ${error.message}`);
      }

      // 8. Backup inventory associated with branches
      console.log('\n8️⃣ Backing up inventory associated with branches...');
      try {
        results.inventory = await backupTable(
          'inventory', 
          'Inventory', 
          `branch_id IN (${branchIdsStr})`
        );
      } catch (error) {
        console.log(`   ⚠️  Could not backup inventory: ${error.message}`);
      }

      // 9. Backup inventory items associated with branches
      console.log('\n9️⃣ Backing up inventory items associated with branches...');
      try {
        results.inventory_items = await backupTable(
          'inventory_items', 
          'Inventory Items', 
          `branch_id IN (${branchIdsStr})`
        );
      } catch (error) {
        console.log(`   ⚠️  Could not backup inventory items: ${error.message}`);
      }

      // 10. Backup suppliers associated with branches
      console.log('\n🔟 Backing up suppliers associated with branches...');
      try {
        results.suppliers = await backupTable(
          'lats_suppliers', 
          'Suppliers', 
          `branch_id IN (${branchIdsStr})`
        );
      } catch (error) {
        console.log(`   ⚠️  Could not backup suppliers: ${error.message}`);
      }

      // 11. Backup users associated with branches
      console.log('\n1️⃣1️⃣ Backing up users associated with branches...');
      try {
        results.users = await backupTable(
          'users', 
          'Users', 
          `branch_id IN (${branchIdsStr})`
        );
      } catch (error) {
        console.log(`   ⚠️  Could not backup users: ${error.message}`);
      }
    }

    // Create a summary file
    console.log('\n📝 Creating backup summary...');
    const summary = {
      backup_date: new Date().toISOString(),
      timestamp: timestamp,
      branches: branchIds,
      tables_backed_up: Object.keys(results).filter(k => results[k] !== null),
      record_counts: {}
    };

    Object.keys(results).forEach(key => {
      if (results[key]) {
        summary.record_counts[key] = results[key].count;
      }
    });

    const summaryFile = path.join(backupDir, `backup-summary-${timestamp}.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');
    console.log(`   ✅ Summary saved: ${path.basename(summaryFile)}`);

    // Final summary
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  📊 BACKUP SUMMARY                                      ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`Backup Date: ${new Date().toLocaleString()}`);
    console.log(`Backup Location: ${backupDir}\n`);
    
    Object.keys(results).forEach(key => {
      if (results[key]) {
        console.log(`✅ ${key}: ${results[key].count} records`);
        console.log(`   JSON: ${path.basename(results[key].jsonFile)}`);
        if (results[key].sqlFile) {
          console.log(`   SQL: ${path.basename(results[key].sqlFile)}`);
        }
      } else {
        console.log(`❌ ${key}: Backup failed or table not found`);
      }
    });
    
    console.log(`\n📁 All files saved to: ${backupDir}`);
    console.log('╚════════════════════════════════════════════════════════╝\n');

    await client.end();
    console.log('✅ Backup completed successfully!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nPlease check:');
    console.error('  1. Database connection string is correct');
    console.error('  2. Database is accessible');
    console.error('  3. Network connection is working');
    await client.end().catch(() => {});
    process.exit(1);
  }
}

backupBranchesData().catch(error => {
  console.error('❌ Fatal Error:', error);
  process.exit(1);
});
