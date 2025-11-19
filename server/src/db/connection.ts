/**
 * Database Connection
 * Neon PostgreSQL connection with connection pooling
 */

import postgres from 'postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('📝 Please add DATABASE_URL to server/.env file');
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create connection with pooling
export const sql = postgres(databaseUrl, {
  max: 10, // Maximum number of connections
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: 'require',
  // Connection lifecycle logging
  onnotice: () => {}, // Suppress notices in production
  debug: process.env.NODE_ENV === 'development',
});

// Test connection
export const testConnection = async () => {
  try {
    await sql`SELECT 1`;
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔌 Closing database connection...');
  await sql.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔌 Closing database connection...');
  await sql.end();
  process.exit(0);
});

