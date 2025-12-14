#!/usr/bin/env node
/**
 * Ensure Supabase environment variables are set for build
 */

import { writeFileSync, existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = __dirname;

// Supabase credentials
const SUPABASE_URL = 'https://jxhzveborezjhsmzsgbc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

// Database URL (Supabase)
const DATABASE_URL = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const envProductionPath = join(projectRoot, '.env.production');
const envPath = join(projectRoot, '.env');

// Content for .env.production
const prodEnvContent = `# Production Environment Configuration
NODE_ENV=production
VITE_APP_ENV=production

# Supabase Database Connection
VITE_DATABASE_URL=${DATABASE_URL}
DATABASE_URL=${DATABASE_URL}

# Supabase API Configuration (REQUIRED for login)
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
`;

// Update .env.production
if (existsSync(envProductionPath)) {
  const existing = readFileSync(envProductionPath, 'utf-8');
  if (!existing.includes('VITE_SUPABASE_URL') || !existing.includes(SUPABASE_URL)) {
    console.log('📝 Updating .env.production with Supabase credentials...');
    writeFileSync(envProductionPath, prodEnvContent);
    console.log('✅ .env.production updated');
  } else {
    console.log('✅ .env.production already has Supabase credentials');
  }
} else {
  console.log('📝 Creating .env.production with Supabase credentials...');
  writeFileSync(envProductionPath, prodEnvContent);
  console.log('✅ .env.production created');
}

// Also update .env if it exists
if (existsSync(envPath)) {
  const existing = readFileSync(envPath, 'utf-8');
  if (!existing.includes('VITE_SUPABASE_URL')) {
    console.log('📝 Adding Supabase credentials to .env...');
    const updated = existing + '\n\n# Supabase API Configuration\n' +
      `VITE_SUPABASE_URL=${SUPABASE_URL}\n` +
      `VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}\n` +
      `SUPABASE_URL=${SUPABASE_URL}\n` +
      `SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}\n`;
    writeFileSync(envPath, updated);
    console.log('✅ .env updated');
  }
}

console.log('\n✅ Supabase credentials are now configured for build');
console.log('📦 You can now run: npm run build:hosting\n');

