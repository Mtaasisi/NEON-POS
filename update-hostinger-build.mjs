#!/usr/bin/env node
/**
 * Update build configuration for Hostinger with specific Supabase database
 */

import { writeFileSync, existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = __dirname;

// Database connection string (password is @SMASIKA1010, URL encoded as %40SMASIKA1010)
// Using direct database connection: db.jxhzveborezjhsmzsgbc.supabase.co
const DATABASE_URL = 'postgresql://postgres:%40SMASIKA1010@db.jxhzveborezjhsmzsgbc.supabase.co:5432/postgres';

// Supabase API credentials
const SUPABASE_URL = 'https://jxhzveborezjhsmzsgbc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

const envProductionPath = join(projectRoot, '.env.production');

// Content for .env.production
const prodEnvContent = `# Production Environment Configuration for Hostinger
NODE_ENV=production
VITE_APP_ENV=production

# Supabase Database Connection (Direct Connection)
VITE_DATABASE_URL=${DATABASE_URL}
DATABASE_URL=${DATABASE_URL}

# Supabase API Configuration (REQUIRED for login and REST API)
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
`;

console.log('📝 Updating .env.production for Hostinger deployment...\n');
console.log('🔗 Database URL:', DATABASE_URL.substring(0, 50) + '...');
console.log('🔗 Supabase URL:', SUPABASE_URL);
console.log('');

// Update .env.production
if (existsSync(envProductionPath)) {
  const existing = readFileSync(envProductionPath, 'utf-8');
  writeFileSync(envProductionPath, prodEnvContent);
  console.log('✅ .env.production updated');
} else {
  writeFileSync(envProductionPath, prodEnvContent);
  console.log('✅ .env.production created');
}

console.log('\n✅ Configuration ready for Hostinger build!');
console.log('📦 Run: npm run build:hosting\n');

