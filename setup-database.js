// Setup Database - Create all base tables
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable not set');
  console.error('Please ensure your .env file contains DATABASE_URL');
  process.exit(1);
}

async function setupDatabase() {
  console.log('🚀 Setting up LATS CHANCE POS Database...\n');
  console.log('📍 Database:', DATABASE_URL.substring(0, 60) + '...\n');

  const sql = neon(DATABASE_URL, {
    fetchOptions: { cache: 'no-store' },
    fullResults: true,
  });

  try {
    // Read the base schema file
    const schemaPath = join(__dirname, 'migrations', '000_create_base_schema.sql');
    console.log(`📄 Reading schema file: ${schemaPath}\n`);
    const schemaSQL = readFileSync(schemaPath, 'utf8');

    // Execute the schema
    console.log('⚙️  Creating database tables...\n');
    console.log('⏳ This may take a minute...\n');
    
    await sql.unsafe(schemaSQL);

    console.log('\n✅ Database setup completed successfully!\n');

    // Verify tables were created
    console.log('🔍 Verifying created tables...\n');
    
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;

    console.log(`📋 Created ${tables.rows.length} tables:\n`);
    
    // Group tables by category
    const coreTableslist = tables.rows.filter(t => 
      t.table_name.startsWith('lats_') || 
      ['users', 'customers', 'employees', 'devices', 'appointments', 'settings'].includes(t.table_name)
    );
    
    console.log('Core Tables:');
    coreTableslist.forEach(table => {
      console.log(`   ✓ ${table.table_name}`);
    });

    console.log('\n================================================');
    console.log('✅ DATABASE READY!');
    console.log('================================================');
    console.log('You can now start your application with:');
    console.log('  npm run dev');
    console.log('================================================\n');

  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  }
}

setupDatabase();

