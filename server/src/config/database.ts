/**
 * Database Configuration
 * Supports both Supabase and direct PostgreSQL (Neon)
 */

import { createClient } from '@supabase/supabase-js';

// Get database configuration from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
// Default to production Supabase database if not set
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

/**
 * Create database client
 * Works with both Supabase hosted and Neon PostgreSQL
 */
export function createDatabaseClient() {
  // If using Neon or direct PostgreSQL with DATABASE_URL
  if (databaseUrl && databaseUrl.includes('neon.tech')) {
    console.log('🗄️  Using Neon PostgreSQL database');
    
    // Extract connection details from DATABASE_URL
    const url = new URL(databaseUrl);
    const host = url.hostname;
    
    // Create Supabase client pointing to Neon
    // Note: Supabase client can work with any PostgreSQL database
    const neonClient = createClient(
      `https://${host}`,
      supabaseKey || 'dummy-key-for-neon', // Not needed for direct DB access
      {
        db: {
          schema: 'public'
        },
        auth: {
          persistSession: false
        }
      }
    );
    
    return neonClient;
  }
  
  // Standard Supabase connection
  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️  Database credentials not configured');
  } else {
    console.log('🗄️  Using Supabase database');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Export singleton instance
export const database = createDatabaseClient();

