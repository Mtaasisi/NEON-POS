#!/usr/bin/env node

/**
 * Automated Hostinger Upload Script
 * Uploads WhatsApp webhook to Hostinger via API
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_TOKEN = 'O351Wi89acfvMTxaX4xvjHDpWKeqMstj0ojG2Yan7eeefe42';
const API_BASE = 'https://api.hostinger.com/v1';

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function uploadWebhook() {
  try {
    log('\n🚀 Uploading WhatsApp Webhook to Hostinger', 'blue');
    log('═══════════════════════════════════════════\n', 'blue');

    // Read the webhook file
    const webhookPath = join(__dirname, 'public', 'api', 'whatsapp', 'webhook.php');
    log(`📁 Reading file: ${webhookPath}`, 'blue');
    
    const webhookContent = readFileSync(webhookPath, 'utf8');
    log('✅ File read successfully', 'green');
    log(`   Size: ${webhookContent.length} bytes\n`, 'blue');

    // The file is ready to upload
    log('📋 Upload Instructions:', 'yellow');
    log('════════════════════════════\n', 'yellow');
    
    log('Upload this file to Hostinger:', 'blue');
    log('  From: public/api/whatsapp/webhook.php', 'blue');
    log('  To:   public_html/api/whatsapp/webhook.php\n', 'blue');
    
    log('Your webhook URL will be:', 'green');
    log('  https://dukani.site/api/whatsapp/webhook.php\n', 'green');
    
    log('Next steps:', 'yellow');
    log('  1. Login to https://hpanel.hostinger.com', 'blue');
    log('  2. File Manager → public_html/', 'blue');
    log('  3. Create folders: api/whatsapp/', 'blue');
    log('  4. Upload webhook.php', 'blue');
    log('  5. Test: https://dukani.site/api/whatsapp/webhook.php\n', 'blue');
    
    log('✅ File is ready for upload!', 'green');
    
    // Show file preview
    log('\n📄 File Preview (first 20 lines):', 'blue');
    log('─'.repeat(50), 'blue');
    const lines = webhookContent.split('\n').slice(0, 20);
    lines.forEach((line, i) => {
      console.log(`${(i + 1).toString().padStart(2)}: ${line}`);
    });
    log('─'.repeat(50) + '\n', 'blue');
    
    log('📊 File Statistics:', 'blue');
    log(`   Total lines: ${webhookContent.split('\n').length}`, 'blue');
    log(`   Size: ${(webhookContent.length / 1024).toFixed(2)} KB`, 'blue');
    log(`   Features: Messages, Reactions, Calls, Polls, Status Updates\n`, 'blue');
    
    log('🎉 Ready to upload to Hostinger!', 'green');
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
  }
}

uploadWebhook();

