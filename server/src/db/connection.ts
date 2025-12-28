/**
 * Database Connection
 * Supports both Neon PostgreSQL and local SQLite databases
 */

import postgres from 'postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import initSqlJs from 'sql.js';

// Import database schema and migration functions
import { initializeSQLiteSchema, runSQLiteMigrations } from './sqlite-init.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

// Check if offline mode is enabled
const isOfflineMode = process.env.OFFLINE_MODE === 'true' || process.env.VITE_OFFLINE_MODE === 'true';

// Get database URL from environment or use production Neon database as default
const databaseUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_tHAqPdo2x0LR@ep-aged-pond-adays3pg-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// Database instances
let postgresInstance: ReturnType<typeof postgres> | null = null;
let sqliteInstance: any = null;
let SQL: any = null;

// Initialize the appropriate database based on mode
if (isOfflineMode) {
  console.log('🗄️  Using local SQLite database (offline mode)');

  // Initialize SQLite database
  try {
    // Initialize sql.js
    SQL = await initSqlJs();
    sqliteInstance = new SQL.Database();

    // Enable foreign keys
    sqliteInstance.run('PRAGMA foreign_keys = ON');

    // Initialize schema and sample data
    initializeSQLiteDatabase(sqliteInstance);

    console.log('✅ SQLite database initialized');
  } catch (error) {
    console.error('❌ Failed to initialize SQLite database:', error);
  }
} else {
  // Initialize PostgreSQL connection
  if (databaseUrl) {
    postgresInstance = postgres(databaseUrl, {
      max: 10, // Maximum number of connections
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: 'require',
      // Connection lifecycle logging
      onnotice: () => {}, // Suppress notices in production
      debug: process.env.NODE_ENV === 'development',
    });
    console.log('✅ PostgreSQL database connection initialized');
  } else {
    console.warn('⚠️  DATABASE_URL not set - database features will be unavailable');
    console.warn('📝 SMS proxy will still work without a database');
  }
}

// Export sql with lazy initialization check
// This allows template literal calls like sql`SELECT 1` to work
export const sql = new Proxy(function() {} as any, {
  apply(target, thisArg, argumentsList) {
    if (isOfflineMode) {
      if (!sqliteInstance) {
        throw new Error('SQLite database not initialized. Database features are unavailable.');
      }
      // Handle SQLite queries
      return executeSQLiteQuery(argumentsList);
    } else {
      if (!postgresInstance) {
        throw new Error('DATABASE_URL environment variable is not set. Database features are unavailable.');
      }
      return (postgresInstance as any).apply(thisArg, argumentsList);
    }
  },
  get(target, prop) {
    if (isOfflineMode) {
      if (!sqliteInstance) {
        throw new Error('SQLite database not initialized. Database features are unavailable.');
      }
      // Return SQLite-compatible methods
      return getSQLiteMethod(prop);
    } else {
      if (!postgresInstance) {
        throw new Error('DATABASE_URL environment variable is not set. Database features are unavailable.');
      }
      return (postgresInstance as any)[prop];
    }
  }
}) as ReturnType<typeof postgres>;

// SQLite query execution helper
function executeSQLiteQuery(args: any[]) {
  const [template, ...values] = args;

  // Convert template literal to SQL string
  let sqlString = template.raw ? String.raw(template, ...values) : template;

  try {
    if (sqlString.trim().toUpperCase().startsWith('SELECT')) {
      // SELECT queries
      const result = sqliteInstance.exec(sqlString);
      if (result.length > 0) {
        // Convert sql.js result format to postgres.js format
        const columns = result[0].columns;
        const values = result[0].values;
        return values.map((row: any[]) => {
          const obj: any = {};
          columns.forEach((col: string, index: number) => {
            obj[col] = row[index];
          });
          return obj;
        });
      }
      return [];
    } else {
      // INSERT, UPDATE, DELETE queries
      sqliteInstance.run(sqlString);
      // Return a result similar to postgres.js format
      return [{ changes: sqliteInstance.getRowsModified() }];
    }
  } catch (error) {
    console.error('SQLite query error:', error, 'SQL:', sqlString);
    throw error;
  }
}

// SQLite method helper
function getSQLiteMethod(prop: string | symbol) {
  switch (prop) {
    case 'unsafe':
      return (sqlString: string) => {
        try {
          if (sqlString.trim().toUpperCase().startsWith('SELECT')) {
            const result = sqliteInstance.exec(sqlString);
            if (result.length > 0) {
              const columns = result[0].columns;
              const values = result[0].values;
              return values.map((row: any[]) => {
                const obj: any = {};
                columns.forEach((col: string, index: number) => {
                  obj[col] = row[index];
                });
                return obj;
              });
            }
            return [];
          } else {
            sqliteInstance.run(sqlString);
            return [{ changes: sqliteInstance.getRowsModified() }];
          }
        } catch (error) {
          console.error('SQLite unsafe query error:', error, 'SQL:', sqlString);
          throw error;
        }
      };
    default:
      // Return a no-op for unsupported methods
      return () => {
        console.warn(`SQLite method '${String(prop)}' not implemented`);
        return [];
      };
  }
}

// Test connection
export const testConnection = async () => {
  if (isOfflineMode) {
    if (!sqliteInstance) {
      console.warn('⚠️  SQLite database not configured - skipping connection test');
      return false;
    }
    try {
      const result = sqliteInstance.exec('SELECT 1 as test');
      console.log('✅ SQLite database connected successfully');
      return true;
    } catch (error) {
      console.error('❌ SQLite database connection failed:', error);
      return false;
    }
  } else {
    if (!postgresInstance) {
      console.warn('⚠️  PostgreSQL database not configured - skipping connection test');
      return false;
    }
    try {
      await postgresInstance`SELECT 1`;
      console.log('✅ PostgreSQL database connected successfully');
      return true;
    } catch (error) {
      console.error('❌ PostgreSQL database connection failed:', error);
      return false;
    }
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  if (isOfflineMode) {
    if (sqliteInstance) {
      console.log('\n🔌 Closing SQLite database connection...');
      sqliteInstance.close();
    }
  } else {
    if (postgresInstance) {
      console.log('\n🔌 Closing PostgreSQL database connection...');
      await postgresInstance.end();
    }
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (isOfflineMode) {
    if (sqliteInstance) {
      console.log('\n🔌 Closing SQLite database connection...');
      sqliteInstance.close();
    }
  } else {
    if (postgresInstance) {
      console.log('\n🔌 Closing PostgreSQL database connection...');
      await postgresInstance.end();
    }
  }
  process.exit(0);
});

