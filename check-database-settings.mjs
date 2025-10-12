#!/usr/bin/env node

/**
 * Database Settings Checker
 * Checks which settings tables exist and their structure
 */

import postgres from 'postgres';
import { config } from 'dotenv';

// Load environment variables
config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1
});

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

async function checkDatabase() {
  try {
    log('\n🔍 CHECKING DATABASE SETTINGS TABLES...', 'cyan');
    log('=' .repeat(60), 'cyan');

    // 1. Check for settings tables
    log('\n📊 Step 1: Finding Settings Tables...', 'blue');
    const settingsTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%settings%'
      ORDER BY table_name;
    `;

    if (settingsTables.length === 0) {
      log('❌ No settings tables found in database!', 'red');
      log('⚠️  You need to run: QUICK-START-SETTINGS-UPDATE.sql', 'yellow');
      return;
    }

    log(`✅ Found ${settingsTables.length} settings table(s):`, 'green');
    settingsTables.forEach(table => {
      log(`   • ${table.table_name}`, 'cyan');
    });

    // 2. Check each settings table structure
    log('\n📋 Step 2: Checking Table Structures...', 'blue');
    
    for (const table of settingsTables) {
      const tableName = table.table_name;
      
      log(`\n🔹 Table: ${tableName}`, 'magenta');
      
      // Get columns
      const columns = await sql`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        ORDER BY ordinal_position;
      `;
      
      log(`   Columns: ${columns.length}`, 'cyan');
      
      // Get row count
      const countResult = await sql`
        SELECT COUNT(*) as count 
        FROM ${sql(tableName)};
      `;
      const count = parseInt(countResult[0].count);
      
      log(`   Records: ${count}`, count > 0 ? 'green' : 'yellow');
      
      // Show first few columns
      const displayColumns = columns.slice(0, 10);
      displayColumns.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(required)';
        log(`      - ${col.column_name}: ${col.data_type} ${nullable}`, 'reset');
      });
      
      if (columns.length > 10) {
        log(`      ... and ${columns.length - 10} more columns`, 'yellow');
      }
    }

    // 3. Check for recommended tables from our SQL script
    log('\n🎯 Step 3: Checking for Recommended Tables...', 'blue');
    
    const recommendedTables = [
      'business_settings',
      'customer_feedback',
      'stock_alerts',
      'audit_log',
      'employee_performance',
      'backup_log',
      'lats_pos_general_settings',
      'lats_pos_dynamic_pricing_settings',
      'lats_pos_receipt_settings'
    ];
    
    const existingTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
        AND table_name = ANY(${recommendedTables});
    `;
    
    const existingTableNames = existingTables.map(t => t.table_name);
    
    log('\nRecommended Tables Status:', 'cyan');
    for (const tableName of recommendedTables) {
      if (existingTableNames.includes(tableName)) {
        log(`   ✅ ${tableName} - EXISTS`, 'green');
      } else {
        log(`   ❌ ${tableName} - MISSING`, 'red');
      }
    }

    // 4. Check for specific new columns we want to add
    log('\n🔧 Step 4: Checking for New Columns in inventory_items...', 'blue');
    
    const inventoryTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'inventory_items'
      ) as exists;
    `;
    
    if (inventoryTableExists[0].exists) {
      const newColumns = [
        'reorder_point',
        'reorder_quantity',
        'supplier_lead_time_days',
        'last_restock_date',
        'expiry_date',
        'batch_number',
        'warranty_months'
      ];
      
      const existingColumns = await sql`
        SELECT column_name 
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'inventory_items'
          AND column_name = ANY(${newColumns});
      `;
      
      const existingColumnNames = existingColumns.map(c => c.column_name);
      
      log('New Inventory Columns Status:', 'cyan');
      for (const colName of newColumns) {
        if (existingColumnNames.includes(colName)) {
          log(`   ✅ ${colName} - EXISTS`, 'green');
        } else {
          log(`   ❌ ${colName} - MISSING`, 'red');
        }
      }
    } else {
      log('   ⚠️  inventory_items table not found', 'yellow');
    }

    // 5. Check transactions table for payment tracking
    log('\n💳 Step 5: Checking for Payment Tracking in transactions...', 'blue');
    
    const transactionsExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'transactions'
      ) as exists;
    `;
    
    if (transactionsExists[0].exists) {
      const paymentColumns = [
        'payment_provider',
        'payment_reference',
        'payment_phone',
        'payment_status',
        'payment_completed_at'
      ];
      
      const existingPaymentCols = await sql`
        SELECT column_name 
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'transactions'
          AND column_name = ANY(${paymentColumns});
      `;
      
      const existingPaymentColNames = existingPaymentCols.map(c => c.column_name);
      
      log('Payment Tracking Columns Status:', 'cyan');
      for (const colName of paymentColumns) {
        if (existingPaymentColNames.includes(colName)) {
          log(`   ✅ ${colName} - EXISTS`, 'green');
        } else {
          log(`   ❌ ${colName} - MISSING`, 'red');
        }
      }
    } else {
      log('   ⚠️  transactions table not found', 'yellow');
    }

    // 6. Check for views
    log('\n👁️  Step 6: Checking for Useful Views...', 'blue');
    
    const recommendedViews = [
      'low_stock_items',
      'expiring_items',
      'daily_sales_summary'
    ];
    
    const existingViews = await sql`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
        AND table_name = ANY(${recommendedViews});
    `;
    
    const existingViewNames = existingViews.map(v => v.table_name);
    
    log('Recommended Views Status:', 'cyan');
    for (const viewName of recommendedViews) {
      if (existingViewNames.includes(viewName)) {
        log(`   ✅ ${viewName} - EXISTS`, 'green');
      } else {
        log(`   ❌ ${viewName} - MISSING`, 'red');
      }
    }

    // 7. Check for triggers
    log('\n⚡ Step 7: Checking for Automated Triggers...', 'blue');
    
    const triggers = await sql`
      SELECT 
        trigger_name,
        event_object_table,
        action_timing,
        event_manipulation
      FROM information_schema.triggers
      WHERE trigger_schema = 'public';
    `;
    
    if (triggers.length > 0) {
      log(`✅ Found ${triggers.length} trigger(s):`, 'green');
      triggers.forEach(trigger => {
        log(`   • ${trigger.trigger_name} on ${trigger.event_object_table}`, 'cyan');
      });
    } else {
      log('❌ No triggers found', 'red');
      log('   ⚠️  Stock alerts won\'t be automatic', 'yellow');
    }

    // Summary
    log('\n' + '='.repeat(60), 'cyan');
    log('📊 SUMMARY', 'cyan');
    log('='.repeat(60), 'cyan');
    
    const missingTables = recommendedTables.filter(t => !existingTableNames.includes(t));
    const missingViews = recommendedViews.filter(v => !existingViewNames.includes(v));
    
    if (missingTables.length === 0 && missingViews.length === 0 && triggers.length > 0) {
      log('\n✅ DATABASE IS FULLY CONFIGURED!', 'green');
      log('   All recommended tables, views, and triggers are in place.', 'green');
      log('   Your settings are ready to use!', 'green');
    } else {
      log('\n⚠️  DATABASE NEEDS UPDATES', 'yellow');
      
      if (missingTables.length > 0) {
        log(`\n❌ Missing ${missingTables.length} table(s):`, 'red');
        missingTables.forEach(t => log(`   • ${t}`, 'yellow'));
      }
      
      if (missingViews.length > 0) {
        log(`\n❌ Missing ${missingViews.length} view(s):`, 'red');
        missingViews.forEach(v => log(`   • ${v}`, 'yellow'));
      }
      
      if (triggers.length === 0) {
        log('\n❌ Missing automated triggers', 'red');
        log('   • Stock alerts won\'t work automatically', 'yellow');
        log('   • Transaction audit logs won\'t be recorded', 'yellow');
      }
      
      log('\n🔧 ACTION REQUIRED:', 'yellow');
      log('   Run this SQL script in Neon console:', 'yellow');
      log('   👉 QUICK-START-SETTINGS-UPDATE.sql', 'cyan');
      log('\n   Steps:', 'yellow');
      log('   1. Open https://console.neon.tech/', 'reset');
      log('   2. Go to SQL Editor', 'reset');
      log('   3. Copy/paste QUICK-START-SETTINGS-UPDATE.sql', 'reset');
      log('   4. Click Run', 'reset');
    }
    
    log('\n' + '='.repeat(60) + '\n', 'cyan');

  } catch (error) {
    log(`\n❌ Error checking database: ${error.message}`, 'red');
    console.error(error);
  } finally {
    await sql.end();
  }
}

// Run the check
checkDatabase().catch(console.error);

