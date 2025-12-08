#!/usr/bin/env node
/**
 * Automated WhatsApp Tables Migration Script
 * Migrates all WhatsApp-related tables from source to target database
 * 
 * Usage:
 *   node migrate-whatsapp-tables.mjs
 * 
 * Or with custom connection strings:
 *   SOURCE_CONN="..." TARGET_CONN="..." node migrate-whatsapp-tables.mjs
 */

import { neon } from '@neondatabase/serverless';
import readline from 'readline';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';
const SOURCE_CONNECTION_STRING = process.env.SOURCE_CONN || process.env.DATABASE_URL;
const TARGET_CONNECTION_STRING = process.env.TARGET_CONN;

// All WhatsApp tables (in dependency order)
const WHATSAPP_TABLES = [
  // Core tables (no dependencies)
  'whatsapp_sessions',
  'whatsapp_antiban_settings',
  'whatsapp_blacklist',
  'whatsapp_media_library',
  'whatsapp_reply_templates',
  'whatsapp_customer_segments',
  
  // Dependent on customers/users
  'whatsapp_logs',
  'whatsapp_incoming_messages',
  'whatsapp_reactions',
  'whatsapp_calls',
  'whatsapp_poll_results',
  'whatsapp_campaigns',
  'whatsapp_bulk_campaigns',
  
  // Dependent on campaigns
  'whatsapp_campaign_metrics',
  'whatsapp_scheduled_campaigns',
  'whatsapp_ab_tests',
  'whatsapp_failed_queue',
  
  // Logs and supporting tables
  'whatsapp_session_logs',
  'whatsapp_api_health',
  'webhook_failures',
  'campaign_notifications',
  'user_whatsapp_preferences'
];

// High priority tables (must migrate)
const HIGH_PRIORITY_TABLES = [
  'whatsapp_logs',
  'whatsapp_incoming_messages',
  'whatsapp_campaigns',
  'whatsapp_bulk_campaigns',
  'whatsapp_scheduled_campaigns',
  'whatsapp_blacklist'
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

/**
 * Get all WhatsApp tables that exist in source database
 */
async function getWhatsAppTables(sourceConnString) {
  console.log('🔍 Scanning source database for WhatsApp tables...\n');
  
  const sql = neon(sourceConnString);
  
  try {
    // Get all tables starting with whatsapp_
    const tables = await sql`
      SELECT tablename as table_name
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename LIKE 'whatsapp_%'
      ORDER BY tablename
    `;
    
    // Also check for other related tables
    const otherTables = await sql`
      SELECT tablename as table_name
      FROM pg_tables
      WHERE schemaname = 'public'
        AND (tablename LIKE '%webhook%' 
             OR tablename LIKE '%campaign_notifications%'
             OR tablename LIKE '%user_whatsapp_preferences%')
      ORDER BY tablename
    `;
    
    const allTables = [...tables, ...otherTables].map(t => t.table_name);
    
    console.log(`✅ Found ${allTables.length} WhatsApp-related tables:\n`);
    allTables.forEach((table, idx) => {
      const priority = HIGH_PRIORITY_TABLES.includes(table) ? '⭐ HIGH' : '   MEDIUM';
      console.log(`   ${idx + 1}. ${table.padEnd(35)} ${priority}`);
    });
    console.log('');
    
    return allTables;
  } catch (error) {
    console.error('❌ Error scanning source database:', error.message);
    throw error;
  }
}

/**
 * Check if server is running
 */
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      signal: AbortSignal.timeout(3000)
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Migrate WhatsApp tables using the migration API
 */
async function migrateWhatsAppTables(sourceConn, targetConn, tables) {
  console.log(`\n🚀 Starting migration of ${tables.length} WhatsApp tables...\n`);
  console.log('📋 Migration details:');
  console.log(`   Source: ${sourceConn.substring(0, 50)}...`);
  console.log(`   Target: ${targetConn.substring(0, 50)}...`);
  console.log(`   Mode: Schema + All Data\n`);
  
  const requestBody = {
    sourceConnectionString: sourceConn,
    targetConnectionString: targetConn,
    tables: tables,
    migrationType: 'both', // Schema + All Data
    useDirectConnection: true
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/neon/migrate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Migration API error: ${response.status} - ${error}`);
    }
    
    // Stream progress updates
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            const message = data.message || data;
            
            // Format progress messages
            if (message.includes('Processing table:')) {
              const tableName = message.split('Processing table:')[1]?.trim() || '';
              process.stdout.write(`\n   📊 ${tableName}\n`);
            } else if (message.includes('✓') || message.includes('complete')) {
              process.stdout.write(`   ✅ ${message}\n`);
            } else if (message.includes('✗') || message.includes('Error')) {
              process.stdout.write(`   ❌ ${message}\n`);
            } else if (message.includes('Migrated') || message.includes('rows')) {
              process.stdout.write(`   📈 ${message}\n`);
            } else {
              process.stdout.write(`   ℹ️  ${message}\n`);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
    
    console.log('\n✅ Migration stream completed!\n');
    
  } catch (error) {
    console.error('\n❌ Migration error:', error.message);
    throw error;
  }
}

/**
 * Verify migrated tables
 */
async function verifyMigration(targetConn, tables) {
  console.log('🔍 Verifying migrated tables...\n');
  
  const sql = neon(targetConn);
  
  const results = [];
  
  for (const table of tables) {
    try {
      const count = await sql`
        SELECT COUNT(*) as count
        FROM ${sql(table)}
      `;
      results.push({
        table,
        exists: true,
        rowCount: parseInt(count[0].count)
      });
      console.log(`   ✅ ${table.padEnd(40)} ${count[0].count.toLocaleString().padStart(10)} rows`);
    } catch (error) {
      results.push({
        table,
        exists: false,
        error: error.message
      });
      console.log(`   ❌ ${table.padEnd(40)} ERROR: ${error.message}`);
    }
  }
  
  const successCount = results.filter(r => r.exists).length;
  const totalRows = results.reduce((sum, r) => sum + (r.rowCount || 0), 0);
  
  console.log(`\n📊 Verification Summary:`);
  console.log(`   Tables migrated: ${successCount}/${tables.length}`);
  console.log(`   Total rows: ${totalRows.toLocaleString()}`);
  
  return results;
}

/**
 * Main migration function
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     WhatsApp Tables Migration Tool                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Get connection strings
  let sourceConn = SOURCE_CONNECTION_STRING;
  let targetConn = TARGET_CONNECTION_STRING;
  
  if (!sourceConn) {
    sourceConn = await question('📥 Enter SOURCE connection string: ');
  }
  
  if (!targetConn) {
    targetConn = await question('📤 Enter TARGET connection string: ');
  }
  
  if (!sourceConn || !targetConn) {
    console.error('❌ Both source and target connection strings are required!');
    process.exit(1);
  }
  
  // Clean connection strings
  sourceConn = sourceConn.trim().replace(/^["']|["']$/g, '');
  targetConn = targetConn.trim().replace(/^["']|["']$/g, '');
  
  // Check server
  console.log('\n🔌 Checking migration server...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.error('❌ Migration server is not running!');
    console.error('   Please start the server with: cd server && npm run dev');
    console.error(`   Or set API_BASE_URL environment variable if server is elsewhere.`);
    process.exit(1);
  }
  console.log('✅ Server is running\n');
  
  // Get WhatsApp tables from source
  const whatsappTables = await getWhatsAppTables(sourceConn);
  
  if (whatsappTables.length === 0) {
    console.log('⚠️  No WhatsApp tables found in source database.');
    process.exit(0);
  }
  
  // Ask for confirmation
  console.log('⚠️  WARNING: This will migrate all WhatsApp data to the target database.');
  const confirm = await question('   Do you want to continue? (yes/no): ');
  
  if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
    console.log('\n❌ Migration cancelled.');
    rl.close();
    process.exit(0);
  }
  
  // Ask for migration mode
  console.log('\n📋 Migration Mode:');
  console.log('   1. Schema + All Data (recommended) - Creates tables and copies all data');
  console.log('   2. Schema + Selective Data - Only copies data that doesn\'t exist in target');
  console.log('   3. Schema Only - Creates tables but no data');
  
  const modeChoice = await question('\n   Select mode (1-3, default: 1): ') || '1';
  const migrationType = modeChoice === '2' ? 'schema-selective' : modeChoice === '3' ? 'schema' : 'both';
  
  console.log(`\n✅ Using mode: ${migrationType === 'both' ? 'Schema + All Data' : migrationType === 'schema-selective' ? 'Schema + Selective Data' : 'Schema Only'}\n`);
  
  // Start migration
  try {
    await migrateWhatsAppTables(sourceConn, targetConn, whatsappTables);
    
    // Verify migration
    if (migrationType !== 'schema') {
      console.log('\n');
      await verifyMigration(targetConn, whatsappTables);
    }
    
    console.log('\n✅ WhatsApp tables migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Verify data in target database');
    console.log('   2. Check media URLs are accessible');
    console.log('   3. Reconfigure webhooks if needed');
    console.log('   4. Test WhatsApp functionality in target environment\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Ensure both databases are accessible');
    console.error('   2. Check that dependent tables (customers, users) exist in target');
    console.error('   3. Verify connection strings are correct');
    console.error('   4. Check server logs for detailed error messages\n');
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run migration
main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  rl.close();
  process.exit(1);
});

