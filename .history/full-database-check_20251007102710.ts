#!/usr/bin/env node
/**
 * Full Database Check - Shows what exists and what's missing
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();
const sql = neon(process.env.VITE_DATABASE_URL!);

// All tables that the POS application expects
const EXPECTED_TABLES = {
  'Authentication & Users': [
    'users', 'auth_users', 'user_settings', 'user_daily_goals', 'employees'
  ],
  'Customer Management': [
    'customers', 'customer_notes', 'customer_checkins', 'customer_revenue'
  ],
  'Contact Management': [
    'contact_methods', 'contact_preferences', 'contact_history'
  ],
  'Device Management': [
    'devices', 'device_attachments', 'device_checklists', 'device_ratings',
    'device_remarks', 'device_transitions'
  ],
  'Diagnostic System': [
    'diagnostic_templates', 'diagnostic_requests', 'diagnostic_checks', 'diagnostic_devices'
  ],
  'Product & Inventory': [
    'lats_categories', 'lats_suppliers', 'lats_products', 'lats_product_variants',
    'product_images', 'lats_stock_movements', 'lats_purchase_orders', 'lats_purchase_order_items'
  ],
  'Sales & Transactions': [
    'lats_sales', 'lats_sale_items'
  ],
  'Payment System': [
    'customer_payments', 'installment_payments', 'gift_cards', 'gift_card_transactions'
  ],
  'Financial Management': [
    'finance_accounts', 'finance_expense_categories', 'finance_expenses', 'finance_transfers'
  ],
  'Communication': [
    'communication_templates', 'email_logs', 'sms_logs', 'sms_triggers',
    'chat_messages', 'whatsapp_message_templates', 'whatsapp_templates'
  ],
  'Appointments': ['appointments'],
  'System Settings': [
    'system_settings', 'lats_pos_general_settings', 'lats_pos_receipt_settings',
    'lats_pos_advanced_settings', 'notification_templates', 'integrations'
  ],
  'Audit & Logging': ['audit_logs']
};

async function fullDatabaseCheck() {
  console.log('🔍 FULL DATABASE CHECK');
  console.log('═'.repeat(80));
  console.log('');

  try {
    // Get all existing tables
    const existingTablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    const existingTables = new Set(existingTablesResult.map((t: any) => t.table_name));
    
    console.log('📊 DATABASE OVERVIEW');
    console.log('─'.repeat(80));
    console.log(`Total tables in database: ${existingTables.size}`);
    console.log('');

    // Check each category
    let totalExpected = 0;
    let totalExists = 0;
    let totalMissing = 0;
    const missingTables: string[] = [];
    
    for (const [category, tables] of Object.entries(EXPECTED_TABLES)) {
      console.log(`\n${category}`);
      console.log('─'.repeat(80));
      
      const exists: string[] = [];
      const missing: string[] = [];
      
      for (const table of tables) {
        totalExpected++;
        if (existingTables.has(table)) {
          exists.push(table);
          totalExists++;
        } else {
          missing.push(table);
          totalMissing++;
          missingTables.push(table);
        }
      }
      
      console.log(`✅ Exists: ${exists.length}/${tables.length}`);
      if (exists.length > 0) {
        exists.forEach(t => console.log(`   ✓ ${t}`));
      }
      
      if (missing.length > 0) {
        console.log(`\n❌ Missing: ${missing.length}`);
        missing.forEach(t => console.log(`   ✗ ${t}`));
      }
    }

    // Summary
    console.log('\n' + '═'.repeat(80));
    console.log('\n📊 SUMMARY');
    console.log('─'.repeat(80));
    console.log(`Total Expected:  ${totalExpected} tables`);
    console.log(`✅ Exists:       ${totalExists} tables (${Math.round(totalExists/totalExpected*100)}%)`);
    console.log(`❌ Missing:      ${totalMissing} tables (${Math.round(totalMissing/totalExpected*100)}%)`);

    // Data check for existing tables
    console.log('\n' + '═'.repeat(80));
    console.log('\n📋 DATA CHECK (Existing Tables)');
    console.log('─'.repeat(80));

    const importantTables = [
      'users', 'auth_users', 'customers', 'devices', 'lats_products',
      'lats_categories', 'lats_sales', 'customer_payments', 'employees'
    ];

    for (const table of importantTables) {
      if (existingTables.has(table)) {
        try {
          const count = await sql`SELECT COUNT(*) as count FROM ${sql(table)}`;
          const recordCount = count[0].count;
          
          if (recordCount > 0) {
            console.log(`✅ ${table.padEnd(30)} ${recordCount} records`);
          } else {
            console.log(`⚠️  ${table.padEnd(30)} 0 records (empty)`);
          }
        } catch (err: any) {
          console.log(`❌ ${table.padEnd(30)} Error: ${err.message.substring(0, 40)}...`);
        }
      }
    }

    // Users check
    console.log('\n' + '═'.repeat(80));
    console.log('\n👥 USER ACCOUNTS');
    console.log('─'.repeat(80));
    
    try {
      const users = await sql`
        SELECT id, email, full_name, role, is_active 
        FROM users 
        ORDER BY role
      `;
      
      console.log(`Total users: ${users.length}\n`);
      users.forEach((u: any) => {
        const emoji = u.role === 'admin' ? '👑' : 
                      u.role === 'manager' ? '📊' : 
                      u.role === 'technician' ? '🔧' : '💬';
        const status = u.is_active ? '🟢' : '🔴';
        console.log(`${status} ${emoji} ${u.full_name?.padEnd(20)} ${u.email.padEnd(25)} (${u.role})`);
      });

      // Check auth_users sync
      const authUsers = await sql`SELECT COUNT(*) as count FROM auth_users`;
      console.log(`\n✅ Auth_users synced: ${authUsers[0].count} users`);
      
    } catch (err: any) {
      console.log(`❌ Error checking users: ${err.message}`);
    }

    // Database statistics
    console.log('\n' + '═'.repeat(80));
    console.log('\n📈 DATABASE STATISTICS');
    console.log('─'.repeat(80));
    
    try {
      const stats = await sql`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as db_size,
          (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as total_tables,
          (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public') as total_columns
      `;
      
      console.log(`Database Size:    ${stats[0].db_size}`);
      console.log(`Total Tables:     ${stats[0].total_tables}`);
      console.log(`Total Columns:    ${stats[0].total_columns}`);
    } catch (err: any) {
      console.log(`⚠️  Could not fetch statistics`);
    }

    // Recommendations
    console.log('\n' + '═'.repeat(80));
    console.log('\n💡 RECOMMENDATIONS');
    console.log('─'.repeat(80));

    if (totalMissing > 0) {
      console.log(`\n⚠️  You have ${totalMissing} missing tables`);
      console.log('\n   To fix this:');
      console.log('   1. Open complete-database-schema.sql');
      console.log('   2. Go to https://console.neon.tech/');
      console.log('   3. Open SQL Editor');
      console.log('   4. Copy & paste the SQL file');
      console.log('   5. Run it');
      console.log('\n   Missing tables:');
      missingTables.forEach(t => console.log(`      - ${t}`));
    } else {
      console.log('✅ All expected tables exist!');
      console.log('✅ Your database schema is complete!');
    }

    // Check for empty important tables
    console.log('\n' + '═'.repeat(80));
    console.log('\n⚠️  EMPTY TABLES WARNING');
    console.log('─'.repeat(80));
    
    const emptyImportant: string[] = [];
    for (const table of ['lats_categories', 'lats_products']) {
      if (existingTables.has(table)) {
        const count = await sql`SELECT COUNT(*) as count FROM ${sql(table)}`;
        if (count[0].count === 0) {
          emptyImportant.push(table);
        }
      }
    }
    
    if (emptyImportant.length > 0) {
      console.log('These important tables are empty:');
      emptyImportant.forEach(t => console.log(`   ⚠️  ${t}`));
      console.log('\nYou\'ll need to add data to use POS features!');
    } else {
      console.log('✅ All important tables have data');
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n✅ Full check complete!\n');

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

fullDatabaseCheck().catch(console.error);

