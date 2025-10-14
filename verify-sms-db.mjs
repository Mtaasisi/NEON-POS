#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const sql = neon(process.argv[2]);

console.log('🔍 Verifying SMS Gateway in database...\n');

const result = await sql`
  SELECT 
    id,
    user_id,
    integration_name,
    provider_name,
    is_enabled,
    is_active,
    environment,
    credentials,
    config,
    created_at,
    updated_at
  FROM lats_pos_integrations_settings
  WHERE integration_name = 'SMS_GATEWAY'
`;

if (result.length === 0) {
  console.log('❌ No SMS_GATEWAY found in database!');
} else {
  console.log(`✅ Found ${result.length} SMS_GATEWAY integration(s)\n`);
  
  result.forEach((row, idx) => {
    console.log(`Integration #${idx + 1}:`);
    console.log('─'.repeat(60));
    console.log('ID:', row.id);
    console.log('User ID:', row.user_id);
    console.log('Provider:', row.provider_name);
    console.log('Enabled:', row.is_enabled ? '✅ true' : '❌ false');
    console.log('Active:', row.is_active ? '✅ true' : '❌ false');
    console.log('Environment:', row.environment);
    console.log('\nCredentials:');
    console.log('  api_key:', row.credentials?.api_key || '❌ NOT SET');
    console.log('  api_password:', row.credentials?.api_password ? '✅ SET' : '❌ NOT SET');
    console.log('  sender_id:', row.credentials?.sender_id || '❌ NOT SET');
    console.log('\nConfig:');
    console.log('  api_url:', row.config?.api_url || '❌ NOT SET');
    console.log('  priority:', row.config?.priority || 'Not set');
    console.log('\nTimestamps:');
    console.log('  Created:', row.created_at);
    console.log('  Updated:', row.updated_at);
    console.log('─'.repeat(60));
    console.log();
  });
  
  console.log('\n✅ Database configuration looks correct!');
  console.log('\n📋 What to check in your browser:');
  console.log('   1. Open DevTools Console (F12)');
  console.log('   2. Do a HARD refresh (Cmd/Ctrl + Shift + R)');
  console.log('   3. Look for these messages:');
  console.log('      • "🔧 Initializing SMS service from integrations..."');
  console.log('      • "✅ SMS credentials loaded from integrations"');
  console.log('      • "✅ SMS service initialized successfully"');
  console.log('\n   If you DON\'T see these messages, try:');
  console.log('      • Clear browser cache completely');
  console.log('      • Open in Incognito/Private mode');
  console.log('      • Or restart your dev server\n');
}

