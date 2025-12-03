#!/usr/bin/env node

/**
 * Quick WhatsApp Status Check
 * Checks the WhatsApp integration configuration in your database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
};

// Try to extract Supabase URL from the TypeScript config
function extractSupabaseConfig() {
  try {
    const clientPath = join(__dirname, 'src/lib/supabaseClient.ts');
    const content = readFileSync(clientPath, 'utf-8');
    
    // Look for VITE_DATABASE_URL
    const urlMatch = content.match(/VITE_DATABASE_URL[^'"]+'([^'"]+)'/);
    if (urlMatch && urlMatch[1]) {
      log.info('Found database URL in supabaseClient.ts');
      return urlMatch[1];
    }
  } catch (e) {
    log.warning('Could not read supabaseClient.ts');
  }
  
  return null;
}

async function checkWhatsAppStatus() {
  console.log(`
${colors.bright}${colors.cyan}╔════════════════════════════════════════╗
║   WhatsApp Integration Status Check    ║
╚════════════════════════════════════════╝${colors.reset}
`);

  // Try to get database URL
  const dbUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || extractSupabaseConfig();
  
  if (!dbUrl) {
    log.error('Could not find database URL');
    log.info('\nPlease run this with DATABASE_URL:');
    log.info('DATABASE_URL=your_connection_string node check-whatsapp-status.mjs');
    log.info('\nOr add it to your .env file as VITE_DATABASE_URL');
    process.exit(1);
  }

  try {
    // Parse connection string to get host and credentials
    const urlParts = new URL(dbUrl);
    const host = urlParts.hostname;
    log.success(`Connected to database: ${host}`);
    
    // For Neon/PostgreSQL direct connection
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: dbUrl });
    
    log.section('📋 Checking WhatsApp Integration...');
    
    // Query the integrations table
    const result = await pool.query(`
      SELECT 
        integration_name,
        integration_type,
        provider_name,
        is_enabled,
        is_active,
        credentials,
        config,
        last_used_at,
        total_requests,
        successful_requests,
        failed_requests
      FROM lats_pos_integrations_settings
      WHERE integration_name = 'WHATSAPP_WASENDER'
    `);
    
    if (result.rows.length === 0) {
      log.warning('WhatsApp integration NOT found in database');
      log.info('\nTo configure WhatsApp:');
      log.info('1. Log into your NEON POS admin panel');
      log.info('2. Go to Admin Settings → Integrations');
      log.info('3. Find "WasenderAPI" integration');
      log.info('4. Enter your API Key and Session ID');
      log.info('5. Enable the integration');
      await pool.end();
      return;
    }
    
    const integration = result.rows[0];
    
    log.success('WhatsApp integration found!');
    log.info(`Provider: ${integration.provider_name}`);
    log.info(`Status: ${integration.is_enabled ? colors.green + 'ENABLED' : colors.red + 'DISABLED'}${colors.reset}`);
    log.info(`Active: ${integration.is_active ? colors.green + 'YES' : colors.red + 'NO'}${colors.reset}`);
    
    // Check credentials
    log.section('🔑 Credentials Check');
    const creds = integration.credentials || {};
    
    if (creds.api_key || creds.bearer_token) {
      const key = creds.api_key || creds.bearer_token;
      log.success(`API Key: ${key.substring(0, 6)}...${key.substring(key.length - 4)}`);
    } else {
      log.error('API Key: NOT SET');
    }
    
    if (creds.session_id || creds.whatsapp_session) {
      const sessionId = creds.session_id || creds.whatsapp_session;
      log.success(`Session ID: ${sessionId.substring(0, 6)}...${sessionId.substring(sessionId.length - 4)}`);
    } else {
      log.error('Session ID: NOT SET');
    }
    
    // Check config
    const config = integration.config || {};
    const apiUrl = config.api_url || 'https://wasenderapi.com/api';
    log.info(`API URL: ${apiUrl}`);
    
    // Check usage stats
    if (integration.total_requests && integration.total_requests > 0) {
      log.section('📊 Usage Statistics');
      log.info(`Total Requests: ${integration.total_requests}`);
      log.info(`Successful: ${colors.green}${integration.successful_requests || 0}${colors.reset}`);
      if (integration.failed_requests > 0) {
        log.info(`Failed: ${colors.red}${integration.failed_requests}${colors.reset}`);
      }
      if (integration.last_used_at) {
        log.info(`Last Used: ${new Date(integration.last_used_at).toLocaleString()}`);
      }
    }
    
    // Check recent WhatsApp logs
    log.section('📝 Recent WhatsApp Logs');
    try {
      const logsResult = await pool.query(`
        SELECT 
          recipient_phone,
          message,
          message_type,
          status,
          error_message,
          created_at
        FROM whatsapp_logs
        ORDER BY created_at DESC
        LIMIT 5
      `);
      
      if (logsResult.rows.length === 0) {
        log.info('No WhatsApp messages sent yet');
      } else {
        log.success(`Found ${logsResult.rows.length} recent messages:\n`);
        logsResult.rows.forEach((msg, i) => {
          const statusIcon = msg.status === 'sent' || msg.status === 'delivered' ? '✓' : 
                           msg.status === 'failed' ? '✗' : '⏳';
          console.log(`${i + 1}. ${msg.recipient_phone} - ${statusIcon} ${msg.status.toUpperCase()}`);
          console.log(`   ${msg.message.substring(0, 50)}${msg.message.length > 50 ? '...' : ''}`);
          console.log(`   ${new Date(msg.created_at).toLocaleString()}\n`);
        });
      }
    } catch (logError) {
      log.warning('Could not fetch WhatsApp logs (table may not exist yet)');
    }
    
    // Summary
    log.section('📊 Summary');
    
    const hasApiKey = !!(creds.api_key || creds.bearer_token);
    const hasSessionId = !!(creds.session_id || creds.whatsapp_session);
    
    if (integration.is_enabled && hasApiKey && hasSessionId) {
      log.success('WhatsApp integration is READY! ✅');
      log.info('\nYou can now:');
      log.info('  • Send WhatsApp messages from Device Repair status updates');
      log.info('  • Send birthday messages via WhatsApp');
      log.info('  • Use the Communication Modal with WhatsApp option');
    } else if (!integration.is_enabled) {
      log.warning('WhatsApp integration is configured but DISABLED');
      log.info('Enable it in Admin Settings → Integrations');
    } else {
      log.warning('WhatsApp integration is incomplete');
      log.info('\nMissing:');
      if (!hasApiKey) log.error('  ✗ API Key');
      if (!hasSessionId) log.error('  ✗ Session ID');
      log.info('\nConfigure in Admin Settings → Integrations');
    }
    
    await pool.end();
    
  } catch (error) {
    log.error(`Error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

checkWhatsAppStatus();

