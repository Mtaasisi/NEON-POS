import pg from 'pg';
const { Client } = pg;

// Get connection string from command line or use default
const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Please provide a database connection string');
  console.error('Usage: node check-database-counts.mjs "postgresql://postgres:PASSWORD@host:5432/postgres"');
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

async function checkDatabaseCounts() {
  console.log('🔍 Checking Database Counts\n');
  console.log('📊 Connecting to database...\n');

  try {
    // Test connection
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Check products - try both table names
    console.log('📦 Checking Products...');
    let productsCount = null;
    let productsTable = null;
    
    try {
      const result = await client.query('SELECT COUNT(*) as count FROM lats_products');
      productsCount = parseInt(result.rows[0].count);
      productsTable = 'lats_products';
    } catch (error) {
      try {
        const result = await client.query('SELECT COUNT(*) as count FROM products');
        productsCount = parseInt(result.rows[0].count);
        productsTable = 'products';
      } catch (error2) {
        console.error(`   ❌ Error: Neither 'lats_products' nor 'products' table found`);
        console.error(`   Error 1: ${error.message}`);
        console.error(`   Error 2: ${error2.message}`);
      }
    }

    if (productsCount !== null) {
      console.log(`   ✅ Found ${productsCount} products in '${productsTable}' table`);
      
      // Get additional product stats
      try {
        const stats = await client.query(`
          SELECT 
            COUNT(*) FILTER (WHERE is_active = true) as active,
            COUNT(*) FILTER (WHERE is_active = false) as inactive
          FROM ${productsTable}
        `);
        const s = stats.rows[0];
        console.log(`   📊 Active products: ${s.active}`);
        console.log(`   📊 Inactive products: ${s.inactive}`);
      } catch (error) {
        // Ignore if is_active column doesn't exist
      }
    }

    // Check customers - try both table names
    console.log('\n👥 Checking Customers...');
    let customersCount = null;
    let customersTable = null;
    
    try {
      const result = await client.query('SELECT COUNT(*) as count FROM customers');
      customersCount = parseInt(result.rows[0].count);
      customersTable = 'customers';
    } catch (error) {
      try {
        const result = await client.query('SELECT COUNT(*) as count FROM lats_customers');
        customersCount = parseInt(result.rows[0].count);
        customersTable = 'lats_customers';
      } catch (error2) {
        console.error(`   ❌ Error: Neither 'customers' nor 'lats_customers' table found`);
        console.error(`   Error 1: ${error.message}`);
        console.error(`   Error 2: ${error2.message}`);
      }
    }

    if (customersCount !== null) {
      console.log(`   ✅ Found ${customersCount} customers in '${customersTable}' table`);
      
      // Get additional customer stats
      try {
        const stats = await client.query(`
          SELECT 
            COUNT(*) FILTER (WHERE is_active = true) as active,
            COUNT(*) FILTER (WHERE is_active = false) as inactive
          FROM ${customersTable}
        `);
        const s = stats.rows[0];
        console.log(`   📊 Active customers: ${s.active}`);
        console.log(`   📊 Inactive customers: ${s.inactive}`);
      } catch (error) {
        // Ignore if is_active column doesn't exist
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    if (productsCount !== null) {
      console.log(`Products: ${productsCount}`);
    } else {
      console.log('Products: ❌ Table not found');
    }
    if (customersCount !== null) {
      console.log(`Customers: ${customersCount}`);
    } else {
      console.log('Customers: ❌ Table not found');
    }
    console.log('='.repeat(50));

    await client.end();
    console.log('\n✅ Done!');
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

checkDatabaseCounts().catch(error => {
  console.error('❌ Fatal Error:', error);
  process.exit(1);
});
