import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Production Environment Verification\n');
console.log('='.repeat(60));

// Check environment variables
const dbUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!dbUrl) {
  console.error('❌ ERROR: DATABASE_URL or VITE_DATABASE_URL not found!');
  console.error('\n💡 Solution:');
  console.error('   1. Check your .env file');
  console.error('   2. If deploying, set environment variables in your hosting platform');
  process.exit(1);
}

// Extract connection details
const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
if (!urlMatch) {
  console.error('❌ ERROR: Invalid connection string format!');
  process.exit(1);
}

const [, username, password, host, database] = urlMatch;

console.log('📊 Connection Details:');
console.log(`   Host: ${host}`);
console.log(`   Database: ${database}`);
console.log(`   Username: ${username}`);
console.log(`   Password: ${password.substring(0, 10)}...${password.substring(password.length - 4)}`);
console.log('');

// Test connection
const pool = new Pool({ connectionString: dbUrl });

async function testConnection() {
  try {
    console.log('🔄 Testing connection...');
    const result = await pool.query('SELECT current_user as user, current_database() as db, version() as version');
    
    if (result.rows.length > 0) {
      console.log('✅ Connection successful!');
      console.log('📋 Database Info:');
      console.log(`   User: ${result.rows[0].user}`);
      console.log(`   Database: ${result.rows[0].db}`);
      console.log(`   PostgreSQL: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
      console.log('\n✅ Your connection string is correct!');
      console.log('\n💡 If you still see errors in production:');
      console.log('   1. Make sure environment variables are set in your hosting platform');
      console.log('   2. Verify the variables are set for the correct environment (Production)');
      console.log('   3. Redeploy after updating environment variables');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Connection failed!');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    
    if (error.message.includes('password authentication failed')) {
      console.error('\n💡 Possible solutions:');
      console.error('   1. Verify the password in Neon Dashboard');
      console.error('   2. The password might have been changed');
      console.error('   3. Update your .env file and hosting platform environment variables');
      console.error('   4. Rebuild and redeploy after updating');
    }
    
    await pool.end();
    process.exit(1);
  }
}

testConnection();
