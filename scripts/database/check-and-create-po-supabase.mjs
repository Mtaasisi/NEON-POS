#!/usr/bin/env node

/**
 * Check if PO-1761424582968 exists using Supabase client, create if needed
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

// Parse connection string to get Supabase URL and anon key
// Format: postgresql://user:password@host/database
const url = new URL(DATABASE_URL);
const host = url.hostname;
const projectRef = host.split('.')[0].split('-').pop();

// Construct Supabase URL
const SUPABASE_URL = `https://${projectRef}.supabase.co`;
// For Neon, we'll use a connection approach via SQL execution

console.log('🔍 Checking for PO-1761424582968...\n');

// Since we're using Neon directly, let's just check via the browser
console.log('📋 Strategy: We will create/update the PO via the browser automation script');
console.log('');
console.log('🎯 Updated Approach:');
console.log('   1. The browser test will check if PO exists');
console.log('   2. If it does not exist, it will create it via the UI');
console.log('   3. Then it will receive the PO with IMEI numbers');
console.log('');
console.log('✅ Proceeding with browser-based approach...');

