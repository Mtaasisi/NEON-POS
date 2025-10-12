// Database utilities for Neon PostgreSQL
import supabase from './supabaseClient';

export const initializeDatabaseCheck = async () => {
  try {
    console.log('Checking database connection...');
    
    // Simple connection test - try to query a common table
    // This will fail gracefully if tables don't exist yet
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .limit(1);
    
    if (error && !error.message?.includes('does not exist')) {
      console.warn('Database check warning:', error.message);
      return { success: false, error };
    }
    
    console.log('Database connection verified ✅');
    return { success: true, data };
  } catch (error) {
    console.error('Database check error:', error);
    return { success: false, error };
  }
};

export const checkTableExists = async (tableName: string) => {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    return !error || !error.message?.includes('does not exist');
  } catch (error) {
    return false;
  }
};

export const testDatabaseConnection = async () => {
  try {
    // Try a simple query to test connection
    const { data, error } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .limit(1);
    
    if (error) {
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
};

export default {
  initializeDatabaseCheck,
  checkTableExists,
  testDatabaseConnection
};

