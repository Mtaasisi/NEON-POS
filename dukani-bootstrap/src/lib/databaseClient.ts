/**
 * Database Client Wrapper
 * Conditionally uses local SQLite database or remote databases based on offline mode
 */

// Check if we're in offline mode
const isOfflineMode = (): boolean => {
  // Check environment variable first
  if (import.meta.env.VITE_OFFLINE_MODE === 'true') {
    return true;
  }

  // Check localStorage
  if (typeof window !== 'undefined') {
    const savedMode = localStorage.getItem('dukani-offline-mode');
    return savedMode === 'true';
  }

  return false;
};

// Conditionally export appropriate database client
if (isOfflineMode()) {
  console.log('🔌 Initializing offline local database mode');

  // Export local database API
  export { default as supabase, localDb as database } from './localDatabaseAPI';

  // Mock exports for compatibility
  export const sql = (strings: TemplateStringsArray, ...values: any[]) => {
    console.warn('⚠️ Direct SQL queries not supported in offline mode. Use database API instead.');
    return Promise.resolve([]);
  };

  export const pool = {
    query: () => Promise.resolve({ rows: [] }),
    connect: () => Promise.resolve({}),
    end: () => Promise.resolve()
  };

} else {
  console.log('🌐 Initializing online remote database mode');

  // Export remote database API
  export { supabase, sql, pool, default } from './supabaseClient';
}

// Common database types interface
export interface Database {
  public: {
    Tables: Record<string, any>;
    Views: Record<string, any>;
    Functions: Record<string, any>;
    Enums: Record<string, any>;
  };
}

// Re-export commonly used functions
export { initializeLocalDatabase, saveDatabase } from './localDatabase';
export { runMigrations, getMigrationStatus } from './databaseMigration';
