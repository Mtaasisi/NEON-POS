import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = postgres(DATABASE_URL, { ssl: 'require' });

const SYNC_TABLES = [
  'lats_products',
  'lats_product_variants',
  'lats_customers',
  'lats_sales',
  'lats_sale_items',
  'store_locations',
  'users'
];

async function checkSyncTables() {
  console.log('🔍 Checking updated_at columns for all sync tables...\n');

  try {
    for (const tableName of SYNC_TABLES) {
      console.log(`📊 Checking ${tableName}:`);

      // Check if updated_at column exists
      const columns = await sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = ${tableName} AND column_name = 'updated_at'
      `;

      if (columns.length > 0) {
        console.log(`   ✅ updated_at column exists`);
      } else {
        console.log(`   ❌ MISSING: updated_at column`);

        // Add the updated_at column
        console.log(`   🔧 Adding updated_at column...`);
        try {
          await sql`
            ALTER TABLE ${sql(tableName)}
            ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now()
          `;
          console.log(`   ✅ Successfully added updated_at column!`);
        } catch (error) {
          console.log(`   ❌ Failed to add updated_at column: ${error.message}`);
        }
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkSyncTables();
