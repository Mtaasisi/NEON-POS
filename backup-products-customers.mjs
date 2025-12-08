import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get connection string from command line or use default
const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Please provide a database connection string');
  console.error('Usage: node backup-products-customers.mjs "postgresql://postgres:PASSWORD@host:5432/postgres"');
  console.error('Or set DATABASE_URL environment variable');
  process.exit(1);
}

// Replace [YOUR_PASSWORD] if present
let dbUrl = connectionString.replace('[YOUR_PASSWORD]', process.env.DB_PASSWORD || '');

if (dbUrl.includes('[YOUR_PASSWORD]')) {
  console.error('❌ Error: Password not provided');
  console.error('Please provide password in connection string or set DB_PASSWORD environment variable');
  process.exit(1);
}

const client = new Client({ 
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

// Create backup directory with date
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
const backupDir = path.join(__dirname, `supabase backup ${today}`);
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`📁 Created backup directory: ${backupDir}`);
}

async function backupTable(tableName, displayName) {
  console.log(`\n📦 Backing up ${displayName}...`);
  
  try {
    // First, get all column names from the table to ensure we backup everything
    const columnResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);
    
    const allColumns = columnResult.rows.map(r => r.column_name);
    console.log(`   📋 Table has ${allColumns.length} columns`);
    
    // Get all data from table using SELECT * to ensure all columns are included
    const result = await client.query(`SELECT * FROM ${tableName} ORDER BY created_at DESC, id`);
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
    
    // Generate timestamp for filenames
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
    
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
      sqlStatements.push('');
      
      // Generate INSERT statements in batches for better performance
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

async function backupDatabase() {
  console.log('🔍 Starting Database Backup\n');
  console.log('📊 Connecting to database...\n');

  try {
    await client.connect();
    console.log('✅ Connected successfully!\n');

    const results = {
      products: null,
      customers: null
    };

    // Try to backup products from lats_products first, then products
    console.log('📦 Checking for products table...');
    try {
      const testResult = await client.query('SELECT COUNT(*) FROM lats_products');
      results.products = await backupTable('lats_products', 'Products (lats_products)');
    } catch (error) {
      try {
        const testResult = await client.query('SELECT COUNT(*) FROM products');
        results.products = await backupTable('products', 'Products (products)');
      } catch (error2) {
        console.error('   ❌ Neither lats_products nor products table found');
      }
    }

    // Try to backup customers from customers first, then lats_customers
    console.log('\n👥 Checking for customers table...');
    try {
      const testResult = await client.query('SELECT COUNT(*) FROM customers');
      results.customers = await backupTable('customers', 'Customers (customers)');
    } catch (error) {
      try {
        const testResult = await client.query('SELECT COUNT(*) FROM lats_customers');
        results.customers = await backupTable('lats_customers', 'Customers (lats_customers)');
      } catch (error2) {
        console.error('   ❌ Neither customers nor lats_customers table found');
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 BACKUP SUMMARY');
    console.log('='.repeat(60));
    
    if (results.products) {
      console.log(`✅ Products: ${results.products.count} records`);
      console.log(`   JSON: ${path.basename(results.products.jsonFile)}`);
      console.log(`   SQL: ${path.basename(results.products.sqlFile)}`);
    } else {
      console.log('❌ Products: Backup failed or table not found');
    }
    
    if (results.customers) {
      console.log(`✅ Customers: ${results.customers.count} records`);
      console.log(`   JSON: ${path.basename(results.customers.jsonFile)}`);
      console.log(`   SQL: ${path.basename(results.customers.sqlFile)}`);
    } else {
      console.log('❌ Customers: Backup failed or table not found');
    }
    
    console.log(`\n📁 Backup location: ${backupDir}`);
    console.log('='.repeat(60));

    // Clean up old backups (keep only the latest)
    console.log('\n🧹 Cleaning up old backups...');
    const allFiles = fs.readdirSync(backupDir);
    const jsonFiles = allFiles.filter(f => f.endsWith('.json'));
    
    const productsBackups = jsonFiles.filter(f => f.startsWith('lats_products_') || f.startsWith('products_')).sort();
    const customersBackups = jsonFiles.filter(f => f.startsWith('customers_') || f.startsWith('lats_customers_')).sort();
    
    let deletedCount = 0;
    
    // Delete old products backups (keep only the latest)
    if (productsBackups.length > 1) {
      const toDelete = productsBackups.slice(0, -1);
      for (const file of toDelete) {
        const jsonFile = path.join(backupDir, file);
        const sqlFile = path.join(backupDir, file.replace('.json', '.sql'));
        
        try {
          if (fs.existsSync(jsonFile)) {
            fs.unlinkSync(jsonFile);
            deletedCount++;
            console.log(`   🗑️  Deleted old backup: ${file}`);
          }
          if (fs.existsSync(sqlFile)) {
            fs.unlinkSync(sqlFile);
            deletedCount++;
          }
        } catch (err) {
          console.log(`   ⚠️  Could not delete ${file}: ${err.message}`);
        }
      }
    }
    
    // Delete old customers backups (keep only the latest)
    if (customersBackups.length > 1) {
      const toDelete = customersBackups.slice(0, -1);
      for (const file of toDelete) {
        const jsonFile = path.join(backupDir, file);
        const sqlFile = path.join(backupDir, file.replace('.json', '.sql'));
        
        try {
          if (fs.existsSync(jsonFile)) {
            fs.unlinkSync(jsonFile);
            deletedCount++;
            console.log(`   🗑️  Deleted old backup: ${file}`);
          }
          if (fs.existsSync(sqlFile)) {
            fs.unlinkSync(sqlFile);
            deletedCount++;
          }
        } catch (err) {
          console.log(`   ⚠️  Could not delete ${file}: ${err.message}`);
        }
      }
    }
    
    if (deletedCount === 0) {
      console.log(`   ✅ No old backups to clean up`);
    } else {
      console.log(`   ✅ Cleaned up ${deletedCount} old backup files`);
    }

    await client.end();
    console.log('\n✅ Backup completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nPlease check:');
    console.error('  1. Database connection string is correct');
    console.error('  2. Password is correct');
    console.error('  3. Database is accessible');
    console.error('  4. Network connection is working');
    await client.end().catch(() => {});
    process.exit(1);
  }
}

backupDatabase().catch(error => {
  console.error('❌ Fatal Error:', error);
  process.exit(1);
});
