// Standard Supabase Client for Browser Use
// This uses Supabase's PostgREST API which doesn't have CORS issues
import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Supabase credentials not configured!');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
  console.error('');
  console.error('To fix this:');
  console.error('1. Go to your Supabase project dashboard');
  console.error('2. Go to Settings → API');
  console.error('3. Copy the Project URL and anon/public key');
  console.error('4. Add them to your .env file');
  throw new Error('Supabase credentials are required');
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'lats-chance-pos',
    },
  },
});

console.log('✅ Supabase client initialized successfully');

export default supabase;

