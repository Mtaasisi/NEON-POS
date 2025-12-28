import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function verifySyncColumns() {
  console.log('🔍 Verifying sync-critical columns after fixes...\n');

  const SYNC_TABLES = [
    'lats_products',
    'lats_product_variants',
    'lats_customers',
    'lats_sales',
    'lats_sale_items',
    'store_locations',
    'users'
  ];

  let allGood = true;

  try {
    for (const tableName of SYNC_TABLES) {
      console.log(`📊 Checking ${tableName}:`);

      try {
        // Check if updated_at column exists
        const columns = await sql`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = ${tableName} AND column_name = 'updated_at'
        `;

        if (columns.length > 0) {
          console.log(`   ✅ updated_at: ${columns[0].data_type}`);
        } else {
          console.log(`   ❌ MISSING: updated_at column`);
          allGood = false;
        }
      } catch (error) {
        console.log(`   ❌ ERROR checking ${tableName}: ${error.message}`);
        allGood = false;
      }

      console.log('');
    }

    // Special check for lats_products brand_id
    console.log('🔍 Special check for lats_products.brand_id:');
    try {
      const brandColumns = await sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'lats_products' AND column_name = 'brand_id'
      `;

      if (brandColumns.length > 0) {
        console.log(`   ✅ brand_id: ${brandColumns[0].data_type}`);
      } else {
        console.log(`   ❌ MISSING: brand_id column`);
        allGood = false;
      }
    } catch (error) {
      console.log(`   ❌ ERROR checking brand_id: ${error.message}`);
      allGood = false;
    }

  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }

  console.log('\n' + '='.repeat(50));

  if (allGood) {
    console.log('✅ ALL SYNC COLUMNS VERIFIED!');
    console.log('🎉 Data synchronization should now work without column errors.');
    console.log('💡 Next step: Test the sync through the app UI.');
  } else {
    console.log('❌ SOME COLUMNS ARE STILL MISSING!');
    console.log('🔧 Additional fixes needed before sync will work.');
  }

  console.log('='.repeat(50));
}

verifySyncColumns();
