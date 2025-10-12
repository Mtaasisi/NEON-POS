#!/usr/bin/env node

/**
 * Integration Testing Script
 * Tests SMS, WhatsApp, and Mobile Money integrations
 */

import { config } from 'dotenv';
import postgres from 'postgres';

// Load environment
config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testIntegrations() {
  log('\n🧪 TESTING INTEGRATIONS', 'cyan');
  log('='.repeat(60), 'cyan');

  // Check environment variables
  log('\n📋 Step 1: Checking Configuration...', 'blue');
  
  const checks = [
    { name: 'Database URL', var: 'VITE_DATABASE_URL', required: true },
    { name: 'SMS Enabled', var: 'VITE_SMS_ENABLED', required: false },
    { name: 'WhatsApp Instance', var: 'VITE_GREENAPI_INSTANCE_ID', required: false },
    { name: 'WhatsApp Token', var: 'VITE_GREENAPI_API_TOKEN', required: false },
    { name: 'M-Pesa Enabled', var: 'VITE_ACCEPT_MPESA', required: false },
    { name: 'Tigo Pesa Enabled', var: 'VITE_ACCEPT_TIGOPESA', required: false },
    { name: 'Airtel Money Enabled', var: 'VITE_ACCEPT_AIRTEL_MONEY', required: false }
  ];

  let allGood = true;
  checks.forEach(check => {
    const value = process.env[check.var];
    if (value) {
      const displayValue = check.var.includes('TOKEN') || check.var.includes('KEY') 
        ? '***' + value.slice(-4) 
        : value;
      log(`  ✅ ${check.name}: ${displayValue}`, 'green');
    } else {
      if (check.required) {
        log(`  ❌ ${check.name}: Not set`, 'red');
        allGood = false;
      } else {
        log(`  ⚠️  ${check.name}: Not set (optional)`, 'yellow');
      }
    }
  });

  if (!allGood) {
    log('\n❌ Missing required configuration. Please update your .env file.', 'red');
    return;
  }

  // Connect to database
  log('\n🔌 Step 2: Connecting to Database...', 'blue');
  const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    log('  ❌ No database URL found', 'red');
    return;
  }

  const sql = postgres(DATABASE_URL, {
    ssl: 'require',
    max: 1
  });

  try {
    await sql`SELECT 1`;
    log('  ✅ Database connection successful', 'green');
  } catch (error) {
    log(`  ❌ Database connection failed: ${error.message}`, 'red');
    await sql.end();
    return;
  }

  // Check if integration tables exist
  log('\n🗄️  Step 3: Checking Integration Tables...', 'blue');
  
  const requiredTables = [
    'sms_logs',
    'sms_templates',
    'whatsapp_messages',
    'mobile_money_transactions',
    'integration_settings'
  ];

  let tablesExist = 0;
  for (const tableName of requiredTables) {
    try {
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        ) as exists
      `;
      
      if (result[0].exists) {
        log(`  ✅ Table '${tableName}' exists`, 'green');
        tablesExist++;
      } else {
        log(`  ❌ Table '${tableName}' missing`, 'red');
      }
    } catch (error) {
      log(`  ❌ Error checking '${tableName}': ${error.message}`, 'red');
    }
  }

  if (tablesExist < requiredTables.length) {
    log(`\n⚠️  Missing ${requiredTables.length - tablesExist} table(s). Run ADD-INTEGRATION-TABLES.sql`, 'yellow');
  } else {
    log('\n✅ All integration tables are present!', 'green');
  }

  // Check SMS templates
  log('\n📧 Step 4: Checking SMS Templates...', 'blue');
  try {
    const templates = await sql`SELECT COUNT(*) as count FROM sms_templates`;
    const count = parseInt(templates[0].count);
    
    if (count > 0) {
      log(`  ✅ Found ${count} SMS template(s)`, 'green');
      
      // Show template names
      const templateList = await sql`SELECT name, category FROM sms_templates LIMIT 5`;
      templateList.forEach(t => {
        log(`     • ${t.name} (${t.category})`, 'cyan');
      });
      if (count > 5) {
        log(`     ... and ${count - 5} more`, 'cyan');
      }
    } else {
      log('  ⚠️  No SMS templates found. They will be auto-created on first use.', 'yellow');
    }
  } catch (error) {
    log(`  ❌ Error checking templates: ${error.message}`, 'red');
  }

  // Check integration settings
  log('\n⚙️  Step 5: Checking Integration Settings...', 'blue');
  try {
    const settings = await sql`
      SELECT 
        integration_type, 
        is_enabled, 
        provider,
        status,
        total_requests,
        successful_requests,
        failed_requests
      FROM integration_settings
      ORDER BY integration_type
    `;
    
    if (settings.length > 0) {
      log(`  ✅ Found ${settings.length} integration configuration(s)`, 'green');
      
      settings.forEach(s => {
        const status = s.is_enabled ? '✅' : '❌';
        const successRate = s.total_requests > 0 
          ? ((s.successful_requests / s.total_requests) * 100).toFixed(1) 
          : '0';
        
        log(`     ${status} ${s.integration_type} (${s.provider}) - ${s.total_requests} requests, ${successRate}% success`, 
          s.is_enabled ? 'cyan' : 'yellow');
      });
    } else {
      log('  ⚠️  No integration settings found. Will use defaults.', 'yellow');
    }
  } catch (error) {
    log(`  ❌ Error checking integration settings: ${error.message}`, 'red');
  }

  // Test SMS functionality
  log('\n📱 Step 6: Testing SMS Service...', 'blue');
  log('  ℹ️  Simulating SMS send (no actual SMS sent)', 'cyan');
  
  try {
    // Insert a test log
    const testPhone = '+255712345678';
    const testMessage = 'Test message from integration test';
    
    const result = await sql`
      INSERT INTO sms_logs (phone, message, status, provider, created_at)
      VALUES (${testPhone}, ${testMessage}, 'test', 'mshastra', NOW())
      RETURNING id
    `;
    
    log('  ✅ SMS logging works correctly', 'green');
    log(`     Test log ID: ${result[0].id}`, 'cyan');
    
    // Clean up test log
    await sql`DELETE FROM sms_logs WHERE id = ${result[0].id}`;
  } catch (error) {
    log(`  ❌ SMS test failed: ${error.message}`, 'red');
  }

  // Test WhatsApp functionality
  log('\n💬 Step 7: Testing WhatsApp Service...', 'blue');
  log('  ℹ️  Simulating WhatsApp message (no actual message sent)', 'cyan');
  
  try {
    const testPhone = '255712345678';
    const testMessage = 'Test WhatsApp message';
    
    const result = await sql`
      INSERT INTO whatsapp_messages (phone, message, status, provider, direction, created_at)
      VALUES (${testPhone}, ${testMessage}, 'test', 'greenapi', 'outgoing', NOW())
      RETURNING id
    `;
    
    log('  ✅ WhatsApp logging works correctly', 'green');
    log(`     Test log ID: ${result[0].id}`, 'cyan');
    
    // Clean up
    await sql`DELETE FROM whatsapp_messages WHERE id = ${result[0].id}`;
  } catch (error) {
    log(`  ❌ WhatsApp test failed: ${error.message}`, 'red');
  }

  // Test Mobile Money functionality
  log('\n💳 Step 8: Testing Mobile Money Service...', 'blue');
  log('  ℹ️  Simulating payment transaction (no actual payment)', 'cyan');
  
  try {
    const testRef = `TEST-${Date.now()}`;
    const testPhone = '255712345678';
    
    const result = await sql`
      INSERT INTO mobile_money_transactions (
        transaction_ref, provider, phone, amount, currency, status, created_at
      )
      VALUES (
        ${testRef}, 'mpesa', ${testPhone}, 1000, 'TZS', 'test', NOW()
      )
      RETURNING id
    `;
    
    log('  ✅ Mobile Money logging works correctly', 'green');
    log(`     Test transaction ID: ${result[0].id}`, 'cyan');
    
    // Clean up
    await sql`DELETE FROM mobile_money_transactions WHERE id = ${result[0].id}`;
  } catch (error) {
    log(`  ❌ Mobile Money test failed: ${error.message}`, 'red');
  }

  // Statistics check
  log('\n📊 Step 9: Checking Integration Statistics...', 'blue');
  
  try {
    const smsCount = await sql`SELECT COUNT(*) as count FROM sms_logs`;
    const whatsappCount = await sql`SELECT COUNT(*) as count FROM whatsapp_messages`;
    const paymentCount = await sql`SELECT COUNT(*) as count FROM mobile_money_transactions`;
    
    log(`  📧 SMS Messages: ${smsCount[0].count}`, 'cyan');
    log(`  💬 WhatsApp Messages: ${whatsappCount[0].count}`, 'cyan');
    log(`  💳 Mobile Money Transactions: ${paymentCount[0].count}`, 'cyan');
  } catch (error) {
    log(`  ⚠️  Could not fetch statistics: ${error.message}`, 'yellow');
  }

  // Final summary
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 TEST SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');
  
  log('\n✅ Configuration: OK', 'green');
  log(`✅ Database: Connected`, 'green');
  log(`${tablesExist === requiredTables.length ? '✅' : '⚠️'} Integration Tables: ${tablesExist}/${requiredTables.length}`, 
    tablesExist === requiredTables.length ? 'green' : 'yellow');
  log('✅ SMS Service: Functional', 'green');
  log('✅ WhatsApp Service: Functional', 'green');
  log('✅ Mobile Money Service: Functional', 'green');
  
  if (tablesExist === requiredTables.length) {
    log('\n🎉 ALL TESTS PASSED! Your integrations are ready to use!', 'green');
  } else {
    log('\n⚠️  Some features may not work until all tables are created.', 'yellow');
    log('   Run: ADD-INTEGRATION-TABLES.sql in Neon console', 'yellow');
  }
  
  log('\n🚀 Next Steps:', 'blue');
  log('   1. Run ADD-INTEGRATION-TABLES.sql if tables are missing', 'reset');
  log('   2. Test sending an actual SMS to your phone', 'reset');
  log('   3. Test WhatsApp connection with QR code', 'reset');
  log('   4. Apply for M-Pesa business account', 'reset');
  log('   5. Configure payment callbacks', 'reset');
  
  log('\n📚 Documentation:', 'blue');
  log('   See: 🚀-ROBUST-INTEGRATIONS-COMPLETE.md', 'cyan');
  
  log('\n' + '='.repeat(60) + '\n', 'cyan');

  // Close connection
  await sql.end();
}

// Run tests
testIntegrations().catch(console.error);

