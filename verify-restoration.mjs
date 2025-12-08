import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Production database (restored)
const PROD_DB = process.argv[2] || 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

// Development database (source)
const DEV_DB = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const prodClient = new Client({ 
  connectionString: PROD_DB,
  ssl: { rejectUnauthorized: false }
});

const devClient = new Client({ 
  connectionString: DEV_DB,
  ssl: { rejectUnauthorized: false }
});

async function getTableList(client, label) {
  try {
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    return result.rows.map(r => r.table_name);
  } catch (error) {
    console.error(`   ❌ Error getting tables from ${label}:`, error.message);
    return [];
  }
}

async function getRowCount(client, tableName) {
  try {
    const result = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    return parseInt(result.rows[0].count);
  } catch (error) {
    return null; // Table might not exist or have issues
  }
}

async function verifyRestoration() {
  console.log('🔍 Verifying Database Restoration\n');
  console.log('='.repeat(60));

  try {
    // Connect to both databases
    console.log('📊 Connecting to databases...');
    await prodClient.connect();
    console.log('   ✅ Connected to Production (restored)');
    
    await devClient.connect();
    console.log('   ✅ Connected to Development (source)\n');

    // Step 1: Compare table counts
    console.log('📋 Step 1: Comparing table counts...');
    const prodTables = await getTableList(prodClient, 'Production');
    const devTables = await getTableList(devClient, 'Development');
    
    console.log(`   Production (restored): ${prodTables.length} tables`);
    console.log(`   Development (source): ${devTables.length} tables`);
    
    const missingTables = devTables.filter(t => !prodTables.includes(t));
    const extraTables = prodTables.filter(t => !devTables.includes(t));
    
    if (missingTables.length > 0) {
      console.log(`\n   ⚠️  Missing tables in Production (${missingTables.length}):`);
      missingTables.slice(0, 20).forEach(t => console.log(`      - ${t}`));
      if (missingTables.length > 20) {
        console.log(`      ... and ${missingTables.length - 20} more`);
      }
    }
    
    if (extraTables.length > 0) {
      console.log(`\n   ℹ️  Extra tables in Production (${extraTables.length}):`);
      extraTables.slice(0, 10).forEach(t => console.log(`      - ${t}`));
    }
    
    if (missingTables.length === 0 && extraTables.length === 0) {
      console.log(`   ✅ All tables match!`);
    }

    // Step 2: Compare row counts for key tables
    console.log('\n📊 Step 2: Comparing row counts for key tables...');
    const keyTables = [
      'lats_products', 'products', 'lats_customers', 'customers',
      'lats_sales', 'lats_sale_items', 'lats_suppliers', 'lats_categories',
      'lats_branches', 'lats_purchase_orders', 'inventory_items',
      'users', 'employees', 'payment_methods', 'finance_accounts'
    ];
    
    console.log('\n   Table Name                    | Dev Rows | Prod Rows | Status');
    console.log('   ' + '-'.repeat(60));
    
    for (const table of keyTables) {
      const devCount = await getRowCount(devClient, table);
      const prodCount = await getRowCount(prodClient, table);
      
      if (devCount === null && prodCount === null) {
        // Table doesn't exist in either, skip
        continue;
      }
      
      const devStr = devCount !== null ? devCount.toString().padStart(8) : 'N/A'.padStart(8);
      const prodStr = prodCount !== null ? prodCount.toString().padStart(8) : 'N/A'.padStart(8);
      const status = (devCount === prodCount) ? '✅' : (devCount === null) ? '⚠️' : '❌';
      
      console.log(`   ${table.padEnd(28)} | ${devStr} | ${prodStr} | ${status}`);
    }

    // Step 3: Check specific important data
    console.log('\n📦 Step 3: Checking specific data...');
    
    // Products
    const prodProducts = await getRowCount(prodClient, 'lats_products');
    const devProducts = await getRowCount(devClient, 'lats_products');
    console.log(`   Products:`);
    console.log(`      Development: ${devProducts !== null ? devProducts : 'N/A'}`);
    console.log(`      Production: ${prodProducts !== null ? prodProducts : 'N/A'}`);
    if (prodProducts !== devProducts && devProducts !== null) {
      console.log(`      ⚠️  Mismatch: Expected ${devProducts}, got ${prodProducts}`);
    }

    // Customers
    const prodCustomers = await getRowCount(prodClient, 'customers');
    const devCustomers = await getRowCount(devClient, 'customers');
    console.log(`   Customers:`);
    console.log(`      Development: ${devCustomers !== null ? devCustomers : 'N/A'}`);
    console.log(`      Production: ${prodCustomers !== null ? prodCustomers : 'N/A'}`);
    if (prodCustomers !== devCustomers && devCustomers !== null) {
      console.log(`      ⚠️  Mismatch: Expected ${devCustomers}, got ${prodCustomers}`);
    }

    // Step 4: Check for data integrity issues
    console.log('\n🔍 Step 4: Checking data integrity...');
    
    // Check if products have required fields
    try {
      const sampleProduct = await prodClient.query('SELECT id, name, created_at FROM lats_products LIMIT 1');
      if (sampleProduct.rows.length > 0) {
        console.log(`   ✅ Products table has data`);
        console.log(`      Sample: ${sampleProduct.rows[0].name || 'No name'} (ID: ${sampleProduct.rows[0].id})`);
      } else {
        console.log(`   ⚠️  Products table is empty`);
      }
    } catch (error) {
      console.log(`   ❌ Error checking products: ${error.message}`);
    }

    // Step 5: Check JSON backup data
    console.log('\n📁 Step 5: Checking backup files...');
    const backupDir = path.join(__dirname, 'DEV BACKUP', 'json_data');
    if (fs.existsSync(backupDir)) {
      const jsonFiles = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
      console.log(`   Found ${jsonFiles.length} JSON backup files`);
      
      // Check a few key tables
      const keyJsonFiles = ['lats_products.json', 'customers.json', 'lats_customers.json'];
      for (const jsonFile of keyJsonFiles) {
        const jsonPath = path.join(backupDir, jsonFile);
        if (fs.existsSync(jsonPath)) {
          const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          console.log(`   ${jsonFile}: ${data.length} records in backup`);
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Tables in Production: ${prodTables.length}`);
    console.log(`✅ Tables in Development: ${devTables.length}`);
    console.log(`${missingTables.length === 0 ? '✅' : '⚠️'} Missing tables: ${missingTables.length}`);
    console.log(`✅ Restoration status: ${missingTables.length === 0 ? 'COMPLETE' : 'PARTIAL'}`);
    console.log('='.repeat(60));

    await prodClient.end();
    await devClient.end();
    
    if (missingTables.length > 0) {
      console.log('\n⚠️  Some tables may be missing. This could be due to:');
      console.log('   1. COPY statement errors during restore');
      console.log('   2. Tables that were empty in source');
      console.log('   3. Schema differences');
      console.log('\n💡 Recommendation: Check if missing tables are critical.');
    } else {
      console.log('\n✅ Restoration appears complete!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nStack:', error.stack);
    await prodClient.end().catch(() => {});
    await devClient.end().catch(() => {});
    process.exit(1);
  }
}

verifyRestoration().catch(error => {
  console.error('❌ Fatal Error:', error);
  process.exit(1);
});
