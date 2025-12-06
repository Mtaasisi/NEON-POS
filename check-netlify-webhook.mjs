#!/usr/bin/env node
/**
 * Check Netlify WhatsApp Webhook Configuration
 * Diagnoses common issues with webhook setup
 */

import fs from 'fs';
import path from 'path';

console.log('\n🔍 Checking Netlify WhatsApp Webhook Configuration\n');
console.log('═'.repeat(60));

let issues = [];
let success = [];

// Check 1: Function file exists
console.log('\n📁 Check 1: Function File');
try {
  const functionPath = path.join(process.cwd(), 'netlify/functions/whatsapp-webhook.js');
  
  if (fs.existsSync(functionPath)) {
    console.log('✅ Function file exists: netlify/functions/whatsapp-webhook.js');
    success.push('Function file exists');
  } else {
    console.log('❌ Function file NOT found');
    issues.push('Function file missing: netlify/functions/whatsapp-webhook.js');
  }
} catch (err) {
  console.log('❌ Error checking function file:', err.message);
  issues.push('Cannot check function file');
}

// Check 2: netlify.toml configuration
console.log('\n⚙️  Check 2: Netlify Configuration');
try {
  const tomlPath = path.join(process.cwd(), 'netlify.toml');
  
  if (fs.existsSync(tomlPath)) {
    const tomlContent = fs.readFileSync(tomlPath, 'utf8');
    
    if (tomlContent.includes('[functions]')) {
      console.log('✅ Functions section found in netlify.toml');
      success.push('Functions configured in netlify.toml');
    } else {
      console.log('⚠️  Functions section missing in netlify.toml');
      issues.push('Add [functions] section to netlify.toml');
    }
    
    if (tomlContent.includes('/api/whatsapp/webhook')) {
      console.log('✅ Webhook redirect found in netlify.toml');
      success.push('Webhook redirect configured');
    } else {
      console.log('⚠️  Webhook redirect missing in netlify.toml');
      issues.push('Add webhook redirect to netlify.toml');
    }
  } else {
    console.log('❌ netlify.toml NOT found');
    issues.push('netlify.toml file missing');
  }
} catch (err) {
  console.log('❌ Error checking netlify.toml:', err.message);
  issues.push('Cannot check netlify.toml');
}

// Check 3: Function dependencies
console.log('\n📦 Check 3: Function Dependencies');
try {
  const packagePath = path.join(process.cwd(), 'netlify/functions/package.json');
  
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    if (packageJson.dependencies && packageJson.dependencies['@supabase/supabase-js']) {
      console.log('✅ @supabase/supabase-js in dependencies');
      success.push('Supabase dependency configured');
    } else {
      console.log('⚠️  @supabase/supabase-js missing from dependencies');
      issues.push('Add @supabase/supabase-js to netlify/functions/package.json');
    }
  } else {
    console.log('⚠️  netlify/functions/package.json NOT found');
    console.log('   Run: cd netlify/functions && npm install');
    issues.push('Function package.json missing - run npm install');
  }
} catch (err) {
  console.log('❌ Error checking dependencies:', err.message);
  issues.push('Cannot check dependencies');
}

// Check 4: Environment variables (local check)
console.log('\n🔐 Check 4: Environment Variables');
const envVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY'
];

let foundEnvVars = 0;
for (const envVar of envVars) {
  if (process.env[envVar]) {
    foundEnvVars++;
    console.log(`✅ ${envVar} is set`);
  }
}

if (foundEnvVars === 0) {
  console.log('⚠️  No Supabase environment variables found locally');
  console.log('   (This is OK - set them in Netlify dashboard)');
  issues.push('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify dashboard');
} else {
  success.push(`${foundEnvVars} environment variable(s) found`);
}

// Check 5: WasenderAPI configuration (if API key available)
console.log('\n🔗 Check 5: WasenderAPI Configuration');
console.log('   (Manual check required)');
console.log('   1. Go to: https://wasenderapi.com/whatsapp/37637/edit');
console.log('   2. Verify webhook URL is set to your Netlify URL');
console.log('   3. Verify events are enabled (messages.received, messages.upsert)');
console.log('   4. Verify webhook is enabled');

// Summary
console.log('\n' + '═'.repeat(60));
console.log('\n📊 Summary\n');

if (success.length > 0) {
  console.log('✅ Successes:');
  success.forEach(item => console.log(`   ✓ ${item}`));
}

if (issues.length > 0) {
  console.log('\n⚠️  Issues Found:');
  issues.forEach(item => console.log(`   ✗ ${item}`));
  
  console.log('\n🔧 Next Steps:');
  console.log('   1. Fix the issues listed above');
  console.log('   2. Deploy to Netlify');
  console.log('   3. Set environment variables in Netlify dashboard');
  console.log('   4. Configure webhook URL in WasenderAPI');
} else {
  console.log('\n🎉 All checks passed!');
  console.log('\n📋 Final Steps:');
  console.log('   1. Deploy to Netlify (if not already deployed)');
  console.log('   2. Set environment variables in Netlify dashboard:');
  console.log('      - VITE_SUPABASE_URL');
  console.log('      - VITE_SUPABASE_ANON_KEY');
  console.log('   3. Get your webhook URL:');
  console.log('      https://YOUR-SITE.netlify.app/api/whatsapp/webhook');
  console.log('   4. Configure in WasenderAPI:');
  console.log('      https://wasenderapi.com/whatsapp/37637/edit');
}

console.log('\n' + '═'.repeat(60));
console.log('\n📖 Full setup guide: NETLIFY_WEBHOOK_SETUP.md\n');
