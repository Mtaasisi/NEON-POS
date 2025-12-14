// Neon Database Client - Supabase-compatible API
// This file re-exports the Neon-based client that mimics Supabase's API
// No Supabase credentials required - uses direct Neon database connection

import { supabase, sql, retryWithBackoff, testSupabaseConnection } from './supabaseClient';

console.log('✅ Using Neon database client (Supabase-compatible API)');

// Re-export everything from supabaseClient for backward compatibility
export { supabase, sql, retryWithBackoff, testSupabaseConnection };
export default supabase;

