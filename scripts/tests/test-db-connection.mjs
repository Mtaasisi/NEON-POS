import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

console.log('🔍 Testing database connection...\n');
console.log(`📊 Database Host: ${DATABASE_URL.match(/@([^/]+)/)?.[1] || 'unknown'}`);
console.log(`📊 Username: ${DATABASE_URL.match(/:\/\/([^:]+)/)?.[1] || 'unknown'}\n`);

const pool = new Pool({ connectionString: DATABASE_URL });

async function testConnection() {
  try {
    console.log('🔄 Attempting to connect...');
    const result = await pool.query('SELECT 1 as test, current_database() as db_name, current_user as user_name');
    
    if (result.rows.length > 0) {
      console.log('✅ Connection successful!');
      console.log('📋 Connection Details:');
      console.log(`   Database: ${result.rows[0].db_name}`);
      console.log(`   User: ${result.rows[0].user_name}`);
      console.log(`   Test Query: ${result.rows[0].test}`);
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Connection failed!');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    
    if (error.message.includes('password authentication failed')) {
      console.error('\n💡 Possible solutions:');
      console.error('   1. Check if the password in your connection string is correct');
      console.error('   2. Verify the database credentials in your Neon dashboard');
      console.error('   3. The password might have been reset or changed');
      console.error('   4. Make sure you\'re using the correct connection string');
    }
    
    await pool.end();
    process.exit(1);
  }
}

testConnection();
