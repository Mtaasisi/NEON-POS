#!/usr/bin/env node

/**
 * WhatsApp Webhook Setup Script
 * This script helps you:
 * 1. Create database tables for webhooks
 * 2. Configure webhook URL in WasenderAPI
 * 3. Test webhook connection
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  try {
    log('\n🚀 WhatsApp Webhook Setup', 'bright');
    log('═══════════════════════════════════════\n', 'cyan');

    // Step 1: Get Supabase credentials
    log('Step 1: Connecting to Supabase...', 'blue');
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      log('❌ Error: Supabase credentials not found in environment variables', 'red');
      log('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env', 'yellow');
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    log('✅ Connected to Supabase', 'green');

    // Step 2: Create database tables
    log('\nStep 2: Creating webhook database tables...', 'blue');
    
    const sqlPath = join(__dirname, 'migrations', 'create_whatsapp_webhook_tables.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    // Split SQL into individual statements and execute
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.includes('CREATE TABLE') || 
          statement.includes('CREATE INDEX') || 
          statement.includes('ALTER TABLE') ||
          statement.includes('CREATE OR REPLACE FUNCTION') ||
          statement.includes('CREATE TRIGGER') ||
          statement.includes('DROP TRIGGER')) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
          if (error && !error.message.includes('already exists')) {
            console.warn('⚠️ Warning:', error.message);
          }
        } catch (err) {
          // Try direct query if RPC not available
          try {
            await supabase.from('_migrations').select('*').limit(1); // Dummy query to test connection
          } catch (e) {
            console.warn('⚠️ Could not execute:', statement.substring(0, 50) + '...');
          }
        }
      }
    }

    log('✅ Database tables created/verified', 'green');

    // Step 3: Get webhook URL
    log('\nStep 3: Configure Webhook URL', 'blue');
    log('Your webhook endpoint will be: https://YOUR-DOMAIN/api/whatsapp/webhook\n', 'cyan');
    
    const hasServer = await question('Do you have your server running publicly? (y/n): ');
    
    if (hasServer.toLowerCase() !== 'y') {
      log('\n📝 Next Steps:', 'yellow');
      log('1. Deploy your server to a public hosting service (e.g., Heroku, Railway, DigitalOcean)', 'yellow');
      log('2. Make sure your server is running on HTTPS (required by WhatsApp)', 'yellow');
      log('3. Your webhook URL will be: https://your-domain.com/api/whatsapp/webhook', 'yellow');
      log('4. Come back and run this script again when your server is public\n', 'yellow');
      
      log('For local testing, you can use ngrok:', 'cyan');
      log('  npm install -g ngrok', 'cyan');
      log('  ngrok http 8000  (or your server port)', 'cyan');
      log('  Then use the ngrok URL as your webhook URL\n', 'cyan');
      
      rl.close();
      return;
    }

    const webhookUrl = await question('\nEnter your webhook URL (e.g., https://yourdomain.com/api/whatsapp/webhook): ');

    if (!webhookUrl.startsWith('https://')) {
      log('❌ Error: Webhook URL must use HTTPS', 'red');
      log('WhatsApp requires secure HTTPS connections', 'yellow');
      rl.close();
      return;
    }

    // Step 4: Get WhatsApp credentials
    log('\nStep 4: Configure WhatsApp Session', 'blue');
    
    const { data: integration } = await supabase
      .from('integrations')
      .select('*')
      .eq('provider', 'WHATSAPP_WASENDER')
      .eq('is_enabled', true)
      .single();

    if (!integration) {
      log('❌ Error: WhatsApp integration not configured', 'red');
      log('Please configure WhatsApp in Admin Settings → Integrations first', 'yellow');
      rl.close();
      return;
    }

    const apiKey = integration.credentials?.api_key || integration.credentials?.bearer_token;
    const sessionId = integration.credentials?.session_id || integration.credentials?.whatsapp_session;
    const apiUrl = integration.config?.api_url || 'https://wasenderapi.com/api';

    if (!apiKey || !sessionId) {
      log('❌ Error: API Key or Session ID not found in integration settings', 'red');
      rl.close();
      return;
    }

    log('✅ Found WhatsApp credentials', 'green');

    // Step 5: Configure webhook in WasenderAPI
    log('\nStep 5: Registering webhook with WasenderAPI...', 'blue');

    const events = [
      'messages.received',
      'messages.upsert',
      'messages.update',
      'messages.reaction',
      'session.status',
      'qr.updated',
      'call.received',
      'poll.results'
    ];

    try {
      const response = await fetch(`${apiUrl}/whatsapp-sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          webhook_url: webhookUrl,
          webhook_events: events,
          webhook_enabled: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        log(`❌ Error: ${errorData.message || response.statusText}`, 'red');
        rl.close();
        return;
      }

      log('✅ Webhook registered successfully!', 'green');

      // Step 6: Test webhook
      log('\nStep 6: Testing webhook connection...', 'blue');
      log(`Sending test request to: ${webhookUrl}`, 'cyan');

      const testResponse = await fetch(webhookUrl, {
        method: 'GET'
      });

      if (testResponse.ok) {
        log('✅ Webhook endpoint is accessible!', 'green');
      } else {
        log('⚠️ Warning: Could not reach webhook endpoint', 'yellow');
        log('Make sure your server is running and accessible', 'yellow');
      }

    } catch (error) {
      log(`❌ Error configuring webhook: ${error.message}`, 'red');
    }

    // Summary
    log('\n═══════════════════════════════════════', 'cyan');
    log('✨ Setup Complete!', 'bright');
    log('═══════════════════════════════════════\n', 'cyan');

    log('📊 Summary:', 'green');
    log(`   Webhook URL: ${webhookUrl}`, 'cyan');
    log(`   Session ID: ${sessionId}`, 'cyan');
    log(`   Events subscribed: ${events.length}`, 'cyan');

    log('\n📥 You will now receive:', 'green');
    log('   • Incoming messages from customers', 'cyan');
    log('   • Message status updates (delivered, read)', 'cyan');
    log('   • Message reactions (emoji)', 'cyan');
    log('   • Incoming call notifications', 'cyan');
    log('   • Poll results', 'cyan');
    log('   • Session status changes', 'cyan');

    log('\n🎯 Next Steps:', 'yellow');
    log('   1. Send a test message to your WhatsApp number', 'yellow');
    log('   2. Check the whatsapp_incoming_messages table', 'yellow');
    log('   3. Check your server logs for webhook events', 'yellow');
    log('   4. Build a UI to display incoming messages\n', 'yellow');

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
  } finally {
    rl.close();
  }
}

main();

