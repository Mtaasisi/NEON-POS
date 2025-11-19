import dotenv from 'dotenv';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function checkTable() {
  try {
    // Get table columns
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'store_locations'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 store_locations table columns:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });
    
    // Check if table has any rows
    const count = await sql`SELECT COUNT(*) as count FROM store_locations`;
    console.log(`\n📊 Total rows: ${count[0].count}`);
    
    // Get sample data if exists
    if (count[0].count > 0) {
      const sample = await sql`SELECT * FROM store_locations LIMIT 1`;
      console.log('\n📄 Sample row:');
      console.log(JSON.stringify(sample[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkTable();
