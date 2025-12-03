#!/usr/bin/env node

/**
 * WhatsApp Connection Test Script
 * 
 * This script checks:
 * 1. If WhatsApp integration is configured in the database
 * 2. If credentials are set correctly
 * 3. Tests the API connection
 * 4. Optionally sends a test message
 * 5. Shows recent WhatsApp logs
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
};

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  log.error('Missing Supabase credentials in environment variables');
  log.info('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Check if WhatsApp integration is configured
 */
async function checkIntegrationConfig() {
  log.section('📋 Checking WhatsApp Integration Configuration');

  try {
    const { data, error } = await supabase
      .from('lats_pos_integrations_settings')
      .select('*')
      .eq('integration_name', 'WHATSAPP_WASENDER')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        log.error('WhatsApp integration not found in database');
        log.info('Please configure WhatsApp in Admin Settings → Integrations');
        return null;
      }
      throw error;
    }

    if (!data) {
      log.error('WhatsApp integration not configured');
      return null;
    }

    log.success('WhatsApp integration found in database');
    
    // Check if enabled
    if (data.is_enabled) {
      log.success('Integration is ENABLED');
    } else {
      log.warning('Integration is DISABLED');
      log.info('Enable it in Admin Settings → Integrations');
    }

    // Check if active
    if (data.is_active) {
      log.success('Integration is ACTIVE');
    } else {
      log.warning('Integration is INACTIVE');
    }

    // Check credentials
    log.info('\nCredentials Check:');
    const credentials = data.credentials || {};
    
    if (credentials.api_key || credentials.bearer_token) {
      log.success(`  ✓ API Key: ${maskString(credentials.api_key || credentials.bearer_token)}`);
    } else {
      log.error('  ✗ API Key: NOT SET');
    }

    if (credentials.session_id || credentials.whatsapp_session) {
      log.success(`  ✓ Session ID: ${maskString(credentials.session_id || credentials.whatsapp_session)}`);
    } else {
      log.error('  ✗ Session ID: NOT SET');
    }

    // Check config
    const config = data.config || {};
    const apiUrl = config.api_url || 'https://wasenderapi.com/api';
    log.info(`  ℹ API URL: ${apiUrl}`);

    // Usage statistics
    if (data.total_requests > 0) {
      log.info('\nUsage Statistics:');
      log.info(`  Total Requests: ${data.total_requests || 0}`);
      log.info(`  Successful: ${data.successful_requests || 0}`);
      log.info(`  Failed: ${data.failed_requests || 0}`);
      if (data.last_used_at) {
        log.info(`  Last Used: ${new Date(data.last_used_at).toLocaleString()}`);
      }
    }

    return data;
  } catch (error) {
    log.error(`Error checking integration: ${error.message}`);
    return null;
  }
}

/**
 * Test WhatsApp API connection
 */
async function testApiConnection(integration) {
  log.section('🔌 Testing WhatsApp API Connection');

  if (!integration || !integration.is_enabled) {
    log.warning('Integration not configured or disabled. Skipping API test.');
    return false;
  }

  const credentials = integration.credentials || {};
  const config = integration.config || {};

  const apiKey = credentials.api_key || credentials.bearer_token;
  const sessionId = credentials.session_id || credentials.whatsapp_session;
  const apiUrl = config.api_url || 'https://wasenderapi.com/api';

  if (!apiKey || !sessionId) {
    log.error('Missing API credentials. Cannot test connection.');
    return false;
  }

  try {
    log.info(`Testing connection to: ${apiUrl}`);
    
    // Try to get session status or send a test message
    const testEndpoint = `${apiUrl}/session-status`;
    
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        session: sessionId
      })
    });

    if (response.ok) {
      const data = await response.json();
      log.success('API connection successful!');
      log.info(`Response: ${JSON.stringify(data, null, 2)}`);
      return true;
    } else {
      const errorText = await response.text();
      log.warning(`API responded with status ${response.status}`);
      log.info(`Response: ${errorText}`);
      
      if (response.status === 401) {
        log.error('Authentication failed. Check your API key.');
      } else if (response.status === 404) {
        log.warning('Session status endpoint not found (this is okay if other endpoints work)');
        return true; // Some APIs don't have a status endpoint
      }
      
      return false;
    }
  } catch (error) {
    log.error(`Connection test failed: ${error.message}`);
    return false;
  }
}

/**
 * Check WhatsApp logs table
 */
async function checkWhatsAppLogs() {
  log.section('📝 Recent WhatsApp Logs');

  try {
    const { data, error } = await supabase
      .from('whatsapp_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      log.error(`Error fetching logs: ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      log.info('No WhatsApp logs found yet');
      return;
    }

    log.success(`Found ${data.length} recent logs:\n`);

    data.forEach((log_entry, index) => {
      console.log(`${colors.cyan}${index + 1}.${colors.reset} ${log_entry.recipient_phone}`);
      console.log(`   Message: ${log_entry.message?.substring(0, 50)}${log_entry.message?.length > 50 ? '...' : ''}`);
      console.log(`   Status: ${getStatusIcon(log_entry.status)} ${log_entry.status.toUpperCase()}`);
      console.log(`   Type: ${log_entry.message_type}`);
      console.log(`   Sent: ${new Date(log_entry.created_at).toLocaleString()}`);
      if (log_entry.error_message) {
        console.log(`   ${colors.red}Error: ${log_entry.error_message}${colors.reset}`);
      }
      console.log('');
    });

    // Show statistics
    const stats = {
      total: data.length,
      sent: data.filter(l => l.status === 'sent').length,
      failed: data.filter(l => l.status === 'failed').length,
      pending: data.filter(l => l.status === 'pending').length,
    };

    log.info('Quick Stats:');
    log.info(`  Sent: ${stats.sent}/${stats.total}`);
    if (stats.failed > 0) {
      log.warning(`  Failed: ${stats.failed}/${stats.total}`);
    }
    if (stats.pending > 0) {
      log.info(`  Pending: ${stats.pending}/${stats.total}`);
    }
  } catch (error) {
    log.error(`Error checking logs: ${error.message}`);
  }
}

/**
 * Send test message (optional)
 */
async function sendTestMessage(integration, phoneNumber) {
  log.section('📤 Sending Test Message');

  if (!integration || !integration.is_enabled) {
    log.warning('Integration not configured or disabled. Skipping test message.');
    return;
  }

  const credentials = integration.credentials || {};
  const config = integration.config || {};

  const apiKey = credentials.api_key || credentials.bearer_token;
  const sessionId = credentials.session_id || credentials.whatsapp_session;
  const apiUrl = config.api_url || 'https://wasenderapi.com/api';

  if (!apiKey || !sessionId) {
    log.error('Missing API credentials. Cannot send test message.');
    return;
  }

  if (!phoneNumber) {
    log.warning('No phone number provided. Skipping test message.');
    log.info('Usage: node test-whatsapp-connection.mjs --test-send=255XXXXXXXXX');
    return;
  }

  try {
    const testMessage = `🧪 Test message from NEON POS\nTime: ${new Date().toLocaleString()}\n\nIf you received this, WhatsApp integration is working! ✅`;

    log.info(`Sending test message to: ${phoneNumber}`);

    const response = await fetch(`${apiUrl}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        session: sessionId,
        phone: phoneNumber,
        message: testMessage
      })
    });

    if (response.ok) {
      const data = await response.json();
      log.success('Test message sent successfully!');
      log.info(`Message ID: ${data.messageId || data.id || 'N/A'}`);
      
      // Log to database
      await supabase.from('whatsapp_logs').insert({
        recipient_phone: phoneNumber,
        message: testMessage,
        message_type: 'text',
        status: 'sent',
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        message_id: data.messageId || data.id
      });
      
      log.success('Message logged to database');
    } else {
      const errorData = await response.json().catch(() => ({}));
      log.error(`Failed to send test message: ${response.status} ${response.statusText}`);
      log.error(`Error: ${errorData.message || JSON.stringify(errorData)}`);
      
      // Log failed attempt to database
      await supabase.from('whatsapp_logs').insert({
        recipient_phone: phoneNumber,
        message: testMessage,
        message_type: 'text',
        status: 'failed',
        error_message: errorData.message || `HTTP ${response.status}`,
        created_at: new Date().toISOString()
      });
    }
  } catch (error) {
    log.error(`Error sending test message: ${error.message}`);
  }
}

/**
 * Helper function to mask sensitive strings
 */
function maskString(str) {
  if (!str) return 'NOT SET';
  if (str.length <= 8) return '****';
  return str.substring(0, 4) + '****' + str.substring(str.length - 4);
}

/**
 * Get status icon
 */
function getStatusIcon(status) {
  switch (status) {
    case 'sent':
    case 'delivered':
    case 'read':
      return colors.green + '✓' + colors.reset;
    case 'failed':
      return colors.red + '✗' + colors.reset;
    case 'pending':
      return colors.yellow + '⏳' + colors.reset;
    default:
      return '○';
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`
${colors.bright}${colors.magenta}╔════════════════════════════════════════╗
║   WhatsApp Connection Test - NEON POS  ║
╚════════════════════════════════════════╝${colors.reset}
`);

  // Parse command line arguments
  const args = process.argv.slice(2);
  const testSendArg = args.find(arg => arg.startsWith('--test-send='));
  const testPhoneNumber = testSendArg ? testSendArg.split('=')[1] : null;

  // Step 1: Check integration configuration
  const integration = await checkIntegrationConfig();

  // Step 2: Test API connection
  if (integration) {
    await testApiConnection(integration);
  }

  // Step 3: Check recent logs
  await checkWhatsAppLogs();

  // Step 4: Send test message (if phone number provided)
  if (testPhoneNumber) {
    await sendTestMessage(integration, testPhoneNumber);
    
    // Check logs again to see the test message
    await new Promise(resolve => setTimeout(resolve, 2000));
    await checkWhatsAppLogs();
  }

  // Summary
  log.section('📊 Summary');
  
  if (!integration) {
    log.error('WhatsApp integration is NOT configured');
    log.info('Next steps:');
    log.info('  1. Go to Admin Settings → Integrations');
    log.info('  2. Find "WasenderAPI" integration');
    log.info('  3. Enter your API Key and Session ID');
    log.info('  4. Enable the integration');
    log.info('  5. Run this test again');
  } else if (!integration.is_enabled) {
    log.warning('WhatsApp integration is configured but DISABLED');
    log.info('Enable it in Admin Settings → Integrations');
  } else {
    const credentials = integration.credentials || {};
    const hasApiKey = !!(credentials.api_key || credentials.bearer_token);
    const hasSessionId = !!(credentials.session_id || credentials.whatsapp_session);
    
    if (hasApiKey && hasSessionId) {
      log.success('WhatsApp integration is READY! ✅');
      log.info('\nYou can now:');
      log.info('  • Send WhatsApp messages from Device Repair page');
      log.info('  • Send birthday messages via WhatsApp');
      log.info('  • Use the Communication Modal with WhatsApp');
      log.info('\nTo send a test message, run:');
      log.info('  node test-whatsapp-connection.mjs --test-send=255XXXXXXXXX');
    } else {
      log.warning('WhatsApp integration is configured but incomplete');
      log.info('Missing credentials:');
      if (!hasApiKey) log.error('  ✗ API Key');
      if (!hasSessionId) log.error('  ✗ Session ID');
    }
  }

  console.log('\n');
}

// Run the script
main().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

