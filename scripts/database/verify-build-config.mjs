#!/usr/bin/env node

/**
 * Build Configuration Verification Script
 * Ensures database credentials are correct before production builds
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Correct database configuration - PRODUCTION NEON DATABASE
const CORRECT_DB_CONFIG = {
  host: 'ep-aged-pond-adays3pg-pooler.c-2.us-east-1.aws.neon.tech',
  user: 'neondb_owner',
  password: 'npg_tHAqPdo2x0LR',
  database: 'neondb',
  connectionString: 'postgresql://neondb_owner:npg_tHAqPdo2x0LR@ep-aged-pond-adays3pg-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
};

function verifyEnvFile(filePath, isProduction = false) {
  if (!existsSync(filePath)) {
    console.log(`⚠️  ${filePath} does not exist`);
    return false;
  }

  const content = readFileSync(filePath, 'utf-8');
  const hasCorrectUrl = content.includes(CORRECT_DB_CONFIG.connectionString);
  const hasCorrectHost = content.includes(CORRECT_DB_CONFIG.host);
  const hasCorrectPassword = content.includes(CORRECT_DB_CONFIG.password);

  if (isProduction) {
    console.log(`\n📋 Checking ${filePath}...`);
  }

  if (hasCorrectUrl || (hasCorrectHost && hasCorrectPassword)) {
    if (isProduction) {
      console.log(`   ✅ Database URL is correct`);
    }
    return true;
  } else {
    console.error(`   ❌ Database URL is incorrect in ${filePath}`);
    console.error(`   Expected: ${CORRECT_DB_CONFIG.connectionString.substring(0, 60)}...`);
    return false;
  }
}

function fixProductionEnv() {
  // Get project root (two levels up from scripts/database/)
  const projectRoot = join(__dirname, '..', '..');
  const prodEnvPath = join(projectRoot, '.env.production');
  
  if (!existsSync(prodEnvPath)) {
    console.log('📝 Creating .env.production...');
  } else {
    console.log('📝 Updating .env.production...');
    // Backup existing file
    const backupPath = `${prodEnvPath}.backup.${Date.now()}`;
    const existingContent = readFileSync(prodEnvPath, 'utf-8');
    writeFileSync(backupPath, existingContent);
    console.log(`   💾 Backed up to ${backupPath}`);
  }

  const prodEnvContent = `# Production Environment Configuration
NODE_ENV=production
VITE_APP_ENV=production

# Production Neon Database
VITE_DATABASE_URL=${CORRECT_DB_CONFIG.connectionString}
DATABASE_URL=${CORRECT_DB_CONFIG.connectionString}

# Supabase Configuration
VITE_SUPABASE_URL=https://jxhzveborezjhsmzsgbc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw
SUPABASE_URL=https://jxhzveborezjhsmzsgbc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw
`;

  writeFileSync(prodEnvPath, prodEnvContent);
  console.log('   ✅ Updated .env.production with correct database credentials');
}

function main() {
  console.log('🔍 Verifying build configuration...\n');

  // Get project root (two levels up from scripts/database/)
  const projectRoot = join(__dirname, '..', '..');
  const envPath = join(projectRoot, '.env');
  const prodEnvPath = join(projectRoot, '.env.production');

  // Check .env.production file (required for production builds)
  const prodEnvOk = verifyEnvFile(prodEnvPath, true);

  if (!prodEnvOk) {
    console.log('\n🔧 Fixing .env.production...');
    fixProductionEnv();
    console.log('\n✅ Configuration fixed! You can now run: npm run build:prod');
    process.exit(0);
  }

  // For production builds, only .env.production is required
  console.log('\n✅ Production database configuration is correct!');
  console.log('✅ Ready to build: npm run build:prod');
  process.exit(0);
}

main();

