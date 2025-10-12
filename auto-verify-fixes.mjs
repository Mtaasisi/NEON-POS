#!/usr/bin/env node

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbConfig = JSON.parse(readFileSync(join(__dirname, 'database-config.json'), 'utf-8'));
const sql = postgres(dbConfig.url, { ssl: 'require', max: 10 });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

async function verifyAll() {
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    details: []
  };

  try {
    log.title('🔍 Automated Verification of All Fixes');

    // 1. Check WhatsApp Instances
    log.info('Checking WhatsApp instances...');
    try {
      const tableCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'whatsapp_instances'
        )
      `;
      
      const viewCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.views 
          WHERE table_name = 'whatsapp_instances_comprehensive'
        )
      `;

      if (tableCheck[0].exists && viewCheck[0].exists) {
        // Test actual query
        const testQuery = await sql`
          SELECT * FROM whatsapp_instances_comprehensive LIMIT 1
        `;
        log.success('WhatsApp instances: Table and view exist, query works');
        results.passed++;
      } else {
        log.error('WhatsApp instances: Missing table or view');
        results.failed++;
      }
    } catch (error) {
      log.error(`WhatsApp instances: ${error.message}`);
      results.failed++;
    }

    // 2. Check Devices
    log.info('Checking devices table...');
    try {
      const devicesCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'devices'
        )
      `;
      
      if (devicesCheck[0].exists) {
        const testQuery = await sql`SELECT * FROM devices LIMIT 1`;
        log.success('Devices: Table exists and accessible');
        results.passed++;
      } else {
        log.error('Devices: Table does not exist');
        results.failed++;
      }
    } catch (error) {
      log.error(`Devices: ${error.message}`);
      results.failed++;
    }

    // 3. Check User Daily Goals Function
    log.info('Checking user daily goals function...');
    try {
      const funcCheck = await sql`
        SELECT EXISTS (
          SELECT FROM pg_proc 
          WHERE proname = 'get_or_create_user_goal'
        )
      `;
      
      if (funcCheck[0].exists) {
        log.success('User daily goals: Function exists');
        results.passed++;
      } else {
        log.error('User daily goals: Function missing');
        results.failed++;
      }
    } catch (error) {
      log.error(`User daily goals: ${error.message}`);
      results.failed++;
    }

    // 4. Check Purchase Order Function
    log.info('Checking purchase order history function...');
    try {
      const funcCheck = await sql`
        SELECT EXISTS (
          SELECT FROM pg_proc 
          WHERE proname = 'get_purchase_order_history'
        )
      `;
      
      if (funcCheck[0].exists) {
        log.success('Purchase order history: Function exists');
        results.passed++;
      } else {
        log.error('Purchase order history: Function missing');
        results.failed++;
      }
    } catch (error) {
      log.error(`Purchase order history: ${error.message}`);
      results.failed++;
    }

    // 5. Check Message Queue
    log.info('Checking message queue table...');
    try {
      const tableCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'green_api_message_queue'
        )
      `;
      
      if (tableCheck[0].exists) {
        const testQuery = await sql`SELECT * FROM green_api_message_queue LIMIT 1`;
        log.success('Message queue: Table exists and accessible');
        results.passed++;
      } else {
        log.error('Message queue: Table missing');
        results.failed++;
      }
    } catch (error) {
      log.error(`Message queue: ${error.message}`);
      results.failed++;
    }

    // 6. Check Campaigns
    log.info('Checking campaigns table...');
    try {
      const tableCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'green_api_bulk_campaigns'
        )
      `;
      
      if (tableCheck[0].exists) {
        const testQuery = await sql`SELECT * FROM green_api_bulk_campaigns LIMIT 1`;
        log.success('Campaigns: Table exists and accessible');
        results.passed++;
      } else {
        log.error('Campaigns: Table missing');
        results.failed++;
      }
    } catch (error) {
      log.error(`Campaigns: ${error.message}`);
      results.failed++;
    }

    // 7. Check Products
    log.info('Checking imported products...');
    try {
      const productCount = await sql`SELECT COUNT(*) as count FROM lats_products`;
      const variantCount = await sql`SELECT COUNT(*) as count FROM lats_product_variants`;
      const imageCount = await sql`SELECT COUNT(*) as count FROM product_images`;
      
      log.success(`Products: ${productCount[0].count} products, ${variantCount[0].count} variants, ${imageCount[0].count} images`);
      results.passed++;
    } catch (error) {
      log.error(`Products: ${error.message}`);
      results.failed++;
    }

    // 8. Check RLS Status
    log.info('Checking RLS policies...');
    try {
      const rlsCheck = await sql`
        SELECT 
          tablename,
          rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename IN (
          'whatsapp_instances',
          'devices',
          'user_daily_goals',
          'lats_purchase_orders',
          'green_api_message_queue',
          'green_api_bulk_campaigns'
        )
      `;
      
      const disabled = rlsCheck.filter(t => !t.rowsecurity).length;
      const total = rlsCheck.length;
      
      if (disabled === total) {
        log.success(`RLS: Disabled on all ${total} key tables for development`);
        results.passed++;
      } else {
        log.error(`RLS: Only ${disabled}/${total} tables have RLS disabled`);
        results.warnings++;
      }
    } catch (error) {
      log.error(`RLS: ${error.message}`);
      results.warnings++;
    }

    // Final Summary
    log.title('📊 Verification Summary');
    
    const total = results.passed + results.failed + results.warnings;
    const percentage = total > 0 ? Math.round((results.passed / total) * 100) : 0;

    console.log(`
${colors.bright}Test Results:${colors.reset}
  ${colors.green}✓ Passed:${colors.reset} ${results.passed}
  ${colors.red}✗ Failed:${colors.reset} ${results.failed}
  ${colors.yellow}⚠ Warnings:${colors.reset} ${results.warnings}
  
${colors.bright}Success Rate:${colors.reset} ${percentage}%

${colors.bright}Status:${colors.reset} ${results.failed === 0 ? 
  `${colors.green}ALL SYSTEMS GO! ✅${colors.reset}` : 
  `${colors.red}SOME ISSUES DETECTED ❌${colors.reset}`}
    `);

    if (results.failed === 0) {
      console.log(`${colors.bright}${colors.green}
╔══════════════════════════════════════════╗
║  🎉 ALL CONSOLE ERRORS SHOULD BE FIXED! ║
║                                          ║
║  Please refresh your browser to verify  ║
║  (Cmd+Shift+R or Ctrl+Shift+R)         ║
╚══════════════════════════════════════════╝
${colors.reset}`);
    } else {
      console.log(`${colors.bright}${colors.red}
╔══════════════════════════════════════════╗
║  ⚠️  SOME FIXES MAY NEED RE-RUNNING     ║
║                                          ║
║  Run: node auto-fix-all-console-errors.mjs ║
╚══════════════════════════════════════════╝
${colors.reset}`);
    }

  } catch (error) {
    log.error(`Fatal error during verification: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

verifyAll();

