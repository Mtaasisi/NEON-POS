import pg from 'pg';
const { Client } = pg;

const connectionString = process.argv[2] || 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const client = new Client({ 
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkColumns() {
  try {
    await client.connect();
    console.log('✅ Connected!\n');

    // Check products table columns
    console.log('📦 Checking lats_products columns...');
    const productsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'lats_products'
      ORDER BY ordinal_position
    `);
    console.log(`   Found ${productsColumns.rows.length} columns:`);
    productsColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    // Check customers table columns
    console.log('\n👥 Checking customers columns...');
    const customersColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'customers'
      ORDER BY ordinal_position
    `);
    console.log(`   Found ${customersColumns.rows.length} columns:`);
    customersColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    // Check a sample record to see what's actually in the backup
    console.log('\n📊 Checking sample records...');
    const sampleProduct = await client.query('SELECT * FROM lats_products LIMIT 1');
    if (sampleProduct.rows.length > 0) {
      console.log(`   Products: ${Object.keys(sampleProduct.rows[0]).length} columns in actual data`);
      console.log(`   Columns: ${Object.keys(sampleProduct.rows[0]).join(', ')}`);
    }

    const sampleCustomer = await client.query('SELECT * FROM customers LIMIT 1');
    if (sampleCustomer.rows.length > 0) {
      console.log(`   Customers: ${Object.keys(sampleCustomer.rows[0]).length} columns in actual data`);
      console.log(`   Columns: ${Object.keys(sampleCustomer.rows[0]).join(', ')}`);
    }

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

checkColumns();
