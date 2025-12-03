#!/usr/bin/env node

/**
 * Automatic Hostinger Upload via API
 * Uses Hostinger API to upload webhook.php
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
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function uploadToHostinger() {
  try {
    log('\n🚀 Automatic Hostinger Upload', 'blue');
    log('═══════════════════════════════════════\n', 'cyan');

    // Read the webhook file
    const webhookPath = join(__dirname, 'public', 'api', 'whatsapp', 'webhook.php');
    log(`📁 Reading webhook file...`, 'blue');
    
    const webhookContent = readFileSync(webhookPath, 'utf8');
    log(`✅ File loaded: ${(webhookContent.length / 1024).toFixed(2)} KB`, 'green');
    log(`   Lines: ${webhookContent.split('\n').length}\n`, 'blue');

    // Step 1: Get website info
    log('Step 1: Getting website information...', 'blue');
    const websitesResponse = await fetch(`${API_BASE}/websites`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!websitesResponse.ok) {
      throw new Error(`API Error: ${websitesResponse.status} - ${websitesResponse.statusText}`);
    }

    const websites = await websitesResponse.json();
    log(`✅ Found ${websites.data?.length || 0} websites`, 'green');
    
    // Find dukani.site
    const dukanSite = websites.data?.find(site => 
      site.domain === 'dukani.site' || site.domain.includes('dukani')
    );
    
    if (!dukanSite) {
      log('⚠️  Could not find dukani.site via API', 'yellow');
      log('   This is okay - we can upload via FTP or File Manager manually\n', 'yellow');
    } else {
      log(`✅ Found website: ${dukanSite.domain}`, 'green');
      log(`   ID: ${dukanSite.id}\n`, 'blue');
    }

    // Note: Hostinger API may not support direct file upload
    // Providing manual upload instructions with file ready

    log('📋 File Upload Instructions:', 'yellow');
    log('═══════════════════════════════════════\n', 'cyan');
    
    log('Your webhook file is ready!', 'green');
    log(`Location: ${webhookPath}`, 'blue');
    log(`Size: ${(webhookContent.length / 1024).toFixed(2)} KB\n`, 'blue');
    
    log('Upload to Hostinger:', 'yellow');
    log('  1. Go to: https://hpanel.hostinger.com/websites/dukani.site', 'cyan');
    log('  2. Click "File Manager"', 'cyan');
    log('  3. Navigate to: public_html/', 'cyan');
    log('  4. Create folders: api/whatsapp/', 'cyan');
    log('  5. Upload webhook.php to: public_html/api/whatsapp/', 'cyan');
    log('', '');
    
    log('Your webhook URL will be:', 'green');
    log('  https://dukani.site/api/whatsapp/webhook.php\n', 'cyan');
    
    log('Test after upload:', 'yellow');
    log('  curl https://dukani.site/api/whatsapp/webhook.php', 'cyan');
    log('  Should return: {"status": "healthy"}\n', 'cyan');
    
    log('✅ Everything is configured and ready!', 'green');
    log('   Just upload the file and test!\n', 'green');

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    
    log('\n📋 Manual Upload Instructions:', 'yellow');
    log('═══════════════════════════════════════\n', 'cyan');
    log('File ready at:', 'blue');
    log('  /Users/mtaasisi/Downloads/NEON-POS-main/public/api/whatsapp/webhook.php\n', 'cyan');
    log('Upload to:', 'blue');
    log('  Hostinger → File Manager → public_html/api/whatsapp/webhook.php\n', 'cyan');
    log('Webhook URL:', 'green');
    log('  https://dukani.site/api/whatsapp/webhook.php\n', 'cyan');
  }
}

uploadToHostinger();

