#!/usr/bin/env node

/**
 * Database Connection Checker
 * Verifies Neon database configuration and connection
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '.env') });

console.log('🔍 Checking Neon Database Configuration...\n');

// Check if DATABASE_URL is set
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: Database URL not configured!');
  console.error('');
  console.error('Please create a .env file with:');
  console.error('VITE_DATABASE_URL=your_neon_connection_string');
  console.error('');
  console.error('Get your connection string from: https://console.neon.tech');
  process.exit(1);
}

console.log('✅ Database URL is configured');

// Parse connection string
let connectionInfo;
try {
  const url = new URL(DATABASE_URL);
  connectionInfo = {
    protocol: url.protocol.replace(':', ''),
    host: url.hostname,
    port: url.port || '5432',
    database: url.pathname.replace('/', ''),
    user: url.username,
    hasPassword: !!url.password,
  };

  console.log('');
  console.log('📋 Connection Details:');
  console.log(`   Protocol: ${connectionInfo.protocol}`);
  console.log(`   Host: ${connectionInfo.host}`);
  console.log(`   Port: ${connectionInfo.port}`);
  console.log(`   Database: ${connectionInfo.database}`);
  console.log(`   User: ${connectionInfo.user}`);
  console.log(`   Password: ${connectionInfo.hasPassword ? '✅ Set' : '❌ Not set'}`);
  console.log('');

  // Check connection type
  if (connectionInfo.port === '6543' || connectionInfo.host.includes('pooler')) {
    console.log('✅ Using POOLED connection (recommended for browsers)');
  } else if (connectionInfo.port === '5432') {
    console.log('⚠️  Using DIRECT connection');
    console.log('   For better browser compatibility, consider using pooled connection (port 6543)');
    console.log('   Enable "Pooled connection" in Neon dashboard → Connection Details');
  }
  console.log('');

} catch (error) {
  console.error('❌ ERROR: Invalid database URL format');
  console.error('   Expected format: postgres://user:password@host:port/database?sslmode=require');
  console.error('   Error:', error.message);
  process.exit(1);
}

// Test connection (import dynamically to avoid issues)
console.log('🔌 Testing connection...\n');

try {
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(DATABASE_URL);

  const result = await sql`SELECT 1 as test, NOW() as current_time`;
  
  if (result && result.length > 0) {
    console.log('✅ Connection successful!');
    console.log(`   Database time: ${result[0].current_time}`);
    console.log('');
    console.log('🎉 Everything looks good!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Restart your dev server: npm run dev');
    console.log('2. Check browser console for WebSocket connection status');
    console.log('3. If you still see CORS errors, read CORS_FIX_GUIDE.md');
  } else {
    console.error('❌ Connection failed: No results returned');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Connection test failed!');
  console.error('');
  console.error('Error:', error.message);
  console.error('');
  console.error('Possible causes:');
  console.error('- Database is paused (check Neon dashboard)');
  console.error('- Incorrect credentials');
  console.error('- Network/firewall issues');
  console.error('- SSL certificate problems');
  console.error('');
  console.error('Solutions:');
  console.error('1. Verify connection string in Neon dashboard');
  console.error('2. Make sure database is active (not suspended)');
  console.error('3. Check your internet connection');
  console.error('4. Try regenerating the connection string');
  process.exit(1);
}

