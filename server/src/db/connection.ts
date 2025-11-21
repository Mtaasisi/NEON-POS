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

// Create connection with pooling (only if DATABASE_URL is set)
// This allows the server to start for SMS proxy functionality without a database
let sqlInstance: ReturnType<typeof postgres> | null = null;

if (databaseUrl) {
  sqlInstance = postgres(databaseUrl, {
    max: 10, // Maximum number of connections
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: 'require',
    // Connection lifecycle logging
    onnotice: () => {}, // Suppress notices in production
    debug: process.env.NODE_ENV === 'development',
  });
  console.log('✅ Database connection initialized');
} else {
  console.warn('⚠️  DATABASE_URL not set - database features will be unavailable');
  console.warn('📝 SMS proxy will still work without a database');
}

// Export sql with lazy initialization check
// This allows template literal calls like sql`SELECT 1` to work
export const sql = new Proxy(function() {} as any, {
  apply(target, thisArg, argumentsList) {
    if (!sqlInstance) {
      throw new Error('DATABASE_URL environment variable is not set. Database features are unavailable.');
    }
    return (sqlInstance as any).apply(thisArg, argumentsList);
  },
  get(target, prop) {
    if (!sqlInstance) {
      throw new Error('DATABASE_URL environment variable is not set. Database features are unavailable.');
    }
    return (sqlInstance as any)[prop];
  }
}) as ReturnType<typeof postgres>;

// Test connection
export const testConnection = async () => {
  if (!sqlInstance) {
    console.warn('⚠️  Database not configured - skipping connection test');
    return false;
  }
  try {
    await sqlInstance`SELECT 1`;
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  if (sqlInstance) {
    console.log('\n🔌 Closing database connection...');
    await sqlInstance.end();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (sqlInstance) {
    console.log('\n🔌 Closing database connection...');
    await sqlInstance.end();
  }
  process.exit(0);
});

