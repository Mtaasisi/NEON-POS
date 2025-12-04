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

// Correct database configuration
const CORRECT_DB_CONFIG = {
  host: 'ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech',
  user: 'neondb_owner',
  password: 'npg_vABqUKk73tEW',
  database: 'neondb',
  connectionString: 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
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

# Production Database URL (using same database as development)
VITE_DATABASE_URL=${CORRECT_DB_CONFIG.connectionString}

# Backend Database URL (for server)
DATABASE_URL=${CORRECT_DB_CONFIG.connectionString}
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

  // Check .env file
  const envOk = verifyEnvFile(envPath, false);
  
  // Check .env.production file
  const prodEnvOk = verifyEnvFile(prodEnvPath, true);

  if (!prodEnvOk) {
    console.log('\n🔧 Fixing .env.production...');
    fixProductionEnv();
    console.log('\n✅ Configuration fixed! You can now run: npm run build:prod');
    process.exit(0);
  }

  if (envOk && prodEnvOk) {
    console.log('\n✅ All database configurations are correct!');
    console.log('✅ Ready to build: npm run build:prod');
    process.exit(0);
  } else {
    console.error('\n❌ Configuration issues found. Please check your .env files.');
    process.exit(1);
  }
}

main();

