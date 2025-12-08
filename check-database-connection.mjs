#!/usr/bin/env node
/**
 * Check which database the app is using in development
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Checking database configuration...\n');

// Check .env file
const envPath = join(__dirname, '.env');
let envVars = {};

if (existsSync(envPath)) {
  try {
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    console.log('✅ Found .env file');
  } catch (error) {
    console.log('⚠️  Could not read .env file:', error.message);
  }
} else {
  console.log('⚠️  No .env file found');
}

// Check .env.development
const envDevPath = join(__dirname, '.env.development');
if (existsSync(envDevPath)) {
  try {
    const envContent = readFileSync(envDevPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    console.log('✅ Found .env.development file');
  } catch (error) {
    console.log('⚠️  Could not read .env.development file:', error.message);
  }
}

console.log('\n📊 Database Configuration:\n');

// Check VITE_DATABASE_URL (frontend)
const viteDbUrl = envVars.VITE_DATABASE_URL || process.env.VITE_DATABASE_URL;
if (viteDbUrl) {
  console.log('✅ VITE_DATABASE_URL (Frontend):');
  console.log('   ' + maskUrl(viteDbUrl));
  console.log('   Type: ' + detectDatabaseType(viteDbUrl));
} else {
  console.log('❌ VITE_DATABASE_URL: Not set');
}

// Check DATABASE_URL (backend/fallback)
const dbUrl = envVars.DATABASE_URL || process.env.DATABASE_URL;
if (dbUrl) {
  console.log('\n✅ DATABASE_URL (Backend/Fallback):');
  console.log('   ' + maskUrl(dbUrl));
  console.log('   Type: ' + detectDatabaseType(dbUrl));
} else {
  console.log('\n❌ DATABASE_URL: Not set');
}

// Check Supabase URL
const supabaseUrl = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
if (supabaseUrl) {
  console.log('\n✅ VITE_SUPABASE_URL:');
  console.log('   ' + supabaseUrl);
} else {
  console.log('\n❌ VITE_SUPABASE_URL: Not set');
}

// Show default fallback from code
console.log('\n📋 Default Fallback (from supabaseClient.ts):');
console.log('   postgresql://postgres.jxhzveborezjhsmzsgbc:***@aws-0-eu-north-1.pooler.supabase.com:5432/postgres');
console.log('   Type: Supabase (Production)');

// Determine which database will be used
console.log('\n🎯 Database Being Used:');
const activeUrl = viteDbUrl || dbUrl;
if (activeUrl) {
  console.log('   ' + maskUrl(activeUrl));
  console.log('   Type: ' + detectDatabaseType(activeUrl));
} else {
  console.log('   Using default fallback: Supabase Production');
  console.log('   ⚠️  WARNING: No database URL configured, using hardcoded fallback!');
}

// Check if it matches the cleaned database
const cleanedDbUrl = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb';
console.log('\n🔍 Comparison with Cleaned Database:');
if (activeUrl && activeUrl.includes('ep-icy-mouse-adshjg5n-pooler')) {
  console.log('   ✅ MATCH: App is using the cleaned Neon database');
} else {
  console.log('   ❌ MISMATCH: App is NOT using the cleaned Neon database');
  console.log('   The cleaned database is:');
  console.log('   postgresql://neondb_owner:***@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb');
}

console.log('\n💡 To use the cleaned Neon database, set in .env:');
console.log('   VITE_DATABASE_URL=postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

function maskUrl(url) {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    if (urlObj.password) {
      urlObj.password = '***';
    }
    return urlObj.toString();
  } catch (e) {
    // If URL parsing fails, just mask password-like strings
    return url.replace(/:([^:@]+)@/, ':***@');
  }
}

function detectDatabaseType(url) {
  if (!url) return 'Unknown';
  const lower = url.toLowerCase();
  if (lower.includes('neon.tech') || lower.includes('neondb')) {
    return 'Neon';
  } else if (lower.includes('supabase')) {
    return 'Supabase';
  } else if (lower.includes('postgresql://') || lower.includes('postgres://')) {
    return 'PostgreSQL';
  }
  return 'Unknown';
}
