import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Production database
const PROD_DB = process.argv[2] || 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const client = new Client({ 
  connectionString: PROD_DB,
  ssl: { rejectUnauthorized: false }
});

// JSON backup directory
const backupDir = path.join(__dirname, 'DEV BACKUP', 'json_data');

async function restoreTableFromJSON(tableName) {
  const jsonFile = path.join(backupDir, `${tableName}.json`);
  
  if (!fs.existsSync(jsonFile)) {
    return { restored: 0, error: 'File not found' };
  }

  try {
    const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    
    if (data.length === 0) {
      return { restored: 0, skipped: true };
    }

    // Get column names from first record
    const columns = Object.keys(data[0]);
    
    // Insert data in batches
    const batchSize = 100;
    let totalInserted = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      // Build INSERT statement
      const values = batch.map((row, idx) => {
        const rowValues = columns.map((col, colIdx) => {
          const value = row[col];
          const paramNum = i * batchSize + idx * columns.length + colIdx + 1;
          return `$${paramNum}`;
        });
        return `(${rowValues.join(', ')})`;
      }).join(', ');
      
      // Flatten values for parameterized query
      const params = batch.flatMap(row => 
        columns.map(col => {
          const value = row[col];
          if (value === null || value === undefined) return null;
          if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
          }
          return value;
        })
      );
      
      const insertQuery = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES ${values}
        ON CONFLICT DO NOTHING
      `;
      
      try {
        await client.query(insertQuery, params);
        totalInserted += batch.length;
      } catch (error) {
        // Try without ON CONFLICT for tables without primary keys
        try {
          const insertQuerySimple = `
            INSERT INTO ${tableName} (${columns.join(', ')})
            VALUES ${values}
          `;
          await client.query(insertQuerySimple, params);
          totalInserted += batch.length;
        } catch (error2) {
          console.error(`      ⚠️  Error inserting batch: ${error2.message.substring(0, 100)}`);
          // Try inserting one by one
          for (const row of batch) {
            try {
              const singleParams = columns.map(col => {
                const value = row[col];
                if (value === null || value === undefined) return null;
                if (typeof value === 'object' && value !== null) {
                  return JSON.stringify(value);
                }
                return value;
              });
              const singleQuery = `
                INSERT INTO ${tableName} (${columns.join(', ')})
                VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})
                ON CONFLICT DO NOTHING
              `;
              await client.query(singleQuery, singleParams);
              totalInserted++;
            } catch (error3) {
              // Skip this row
            }
          }
        }
      }
    }
    
    return { restored: totalInserted };
  } catch (error) {
    return { restored: 0, error: error.message };
  }
}

async function restoreMissingData() {
  console.log('🔍 Restoring Missing Data from JSON Backups\n');
  console.log('='.repeat(60));

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get list of JSON files
    const jsonFiles = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort();

    console.log(`📁 Found ${jsonFiles.length} JSON backup files\n`);

    // Priority tables to restore first
    const priorityTables = [
      'lats_products', 'customers', 'lats_customers',
      'lats_sales', 'lats_sale_items', 'lats_suppliers',
      'lats_categories', 'lats_branches', 'lats_purchase_orders',
      'inventory_items', 'users', 'finance_accounts'
    ];

    // Restore priority tables first
    console.log('📦 Step 1: Restoring priority tables...\n');
    for (const table of priorityTables) {
      if (jsonFiles.includes(table)) {
        console.log(`   Restoring ${table}...`);
        const result = await restoreTableFromJSON(table);
        if (result.error) {
          console.log(`      ❌ Error: ${result.error}`);
        } else if (result.skipped) {
          console.log(`      ⏭️  Skipped (empty)`);
        } else {
          console.log(`      ✅ Restored ${result.restored} records`);
        }
      }
    }

    // Restore remaining tables
    console.log('\n📦 Step 2: Restoring remaining tables...\n');
    const remainingTables = jsonFiles.filter(t => !priorityTables.includes(t));
    
    for (const table of remainingTables) {
      console.log(`   Restoring ${table}...`);
      const result = await restoreTableFromJSON(table);
      if (result.error) {
        console.log(`      ❌ Error: ${result.error}`);
      } else if (result.skipped) {
        console.log(`      ⏭️  Skipped (empty)`);
      } else {
        console.log(`      ✅ Restored ${result.restored} records`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Data restoration completed!');
    console.log('='.repeat(60));

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

restoreMissingData().catch(error => {
  console.error('❌ Fatal Error:', error);
  process.exit(1);
});
