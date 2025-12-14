import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Production Database Configuration Check\n');
console.log('='.repeat(60));

// Check .env file
const envContent = readFileSync('.env', 'utf-8');
const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
const viteDbUrlMatch = envContent.match(/VITE_DATABASE_URL=(.+)/);

if (dbUrlMatch) {
  const url = dbUrlMatch[1].trim();
  const host = url.match(/@([^/]+)/)?.[1] || 'unknown';
  console.log('📊 DATABASE_URL (Server-side):');
  console.log(`   Host: ${host}`);
  console.log(`   Full URL: ${url.substring(0, 60)}...`);
}

if (viteDbUrlMatch) {
  const url = viteDbUrlMatch[1].trim();
  const host = url.match(/@([^/]+)/)?.[1] || 'unknown';
  console.log('\n📊 VITE_DATABASE_URL (Frontend):');
  console.log(`   Host: ${host}`);
  console.log(`   Full URL: ${url.substring(0, 60)}...`);
}

// Check server/api.mjs fallback
const apiContent = readFileSync('server/api.mjs', 'utf-8');
const prodFallback = apiContent.match(/production.*?@([^/]+)/)?.[1];
const devFallback = apiContent.match(/else.*?@([^/]+)/)?.[1];

console.log('\n📊 Server API Fallbacks (server/api.mjs):');
if (prodFallback) {
  console.log(`   Production fallback: ${prodFallback}`);
}
if (devFallback) {
  console.log(`   Development fallback: ${devFallback}`);
}

console.log('\n' + '='.repeat(60));
console.log('✅ Summary:');
console.log('   Your production build will use:');
if (viteDbUrlMatch) {
  const url = viteDbUrlMatch[1].trim();
  const host = url.match(/@([^/]+)/)?.[1] || 'unknown';
  console.log(`   🎯 ${host}`);
}
console.log('\n');
