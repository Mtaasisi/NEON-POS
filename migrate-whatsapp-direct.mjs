#!/usr/bin/env node
/**
 * Direct WhatsApp Tables Migration (Non-Interactive)
 * Automatically migrates all WhatsApp tables
 */

import { neon } from '@neondatabase/serverless';

const API_BASE_URL = 'http://localhost:8000';

// Connection strings
const SOURCE_CONN = process.env.SOURCE_CONN || 
  "postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const TARGET_CONN = process.env.TARGET_CONN || 
  "postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const MIGRATION_TYPE = process.env.MIGRATION_TYPE || 'both'; // both, schema-selective, schema

async function getWhatsAppTables(connString) {
  console.log('🔍 Scanning source database for WhatsApp tables...\n');
  const sql = neon(connString);
  
  const tables = await sql`
    SELECT tablename as table_name
    FROM pg_tables
    WHERE schemaname = 'public'
      AND (tablename LIKE 'whatsapp_%' 
           OR tablename LIKE '%webhook%' 
           OR tablename LIKE '%campaign_notifications%'
           OR tablename LIKE '%user_whatsapp_preferences%')
    ORDER BY tablename
  `;
  
  return tables.map(t => t.table_name);
}

async function migrate() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     WhatsApp Tables Migration (Automated)                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Get WhatsApp tables
  const tables = await getWhatsAppTables(SOURCE_CONN);
  
  if (tables.length === 0) {
    console.log('⚠️  No WhatsApp tables found.');
    return;
  }
  
  console.log(`✅ Found ${tables.length} WhatsApp tables:\n`);
  const highPriority = ['whatsapp_logs', 'whatsapp_incoming_messages', 'whatsapp_campaigns', 
                        'whatsapp_bulk_campaigns', 'whatsapp_scheduled_campaigns', 'whatsapp_blacklist'];
  
  tables.forEach((table, idx) => {
    const priority = highPriority.includes(table) ? '⭐' : '  ';
    console.log(`   ${(idx + 1).toString().padStart(2)}. ${priority} ${table}`);
  });
  
  console.log(`\n📥 Source: ${SOURCE_CONN.substring(0, 60)}...`);
  console.log(`📤 Target: ${TARGET_CONN.substring(0, 60)}...`);
  console.log(`📋 Mode: ${MIGRATION_TYPE === 'both' ? 'Schema + All Data' : MIGRATION_TYPE === 'schema-selective' ? 'Schema + Selective Data' : 'Schema Only'}\n`);
  
  console.log('🚀 Starting migration...\n');
  
  const requestBody = {
    sourceConnectionString: SOURCE_CONN,
    targetConnectionString: TARGET_CONN,
    tables: tables,
    migrationType: MIGRATION_TYPE,
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
    
    // Stream progress
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentTable = '';
    let tableCount = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            const msg = data.message || data;
            
            if (msg.includes('Processing table:')) {
              currentTable = msg.split('Processing table:')[1]?.trim() || '';
              tableCount++;
              console.log(`\n📊 [${tableCount}/${tables.length}] ${currentTable}`);
            } else if (msg.includes('✓') || msg.includes('complete')) {
              console.log(`   ✅ ${msg.replace(/✓/g, '').trim()}`);
            } else if (msg.includes('✗') || msg.includes('Error')) {
              console.log(`   ❌ ${msg.replace(/✗/g, '').trim()}`);
            } else if (msg.includes('Migrated') || msg.includes('rows')) {
              console.log(`   📈 ${msg}`);
            } else if (!msg.includes('Connecting') && msg.trim().length > 0) {
              console.log(`   ℹ️  ${msg}`);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
    
    console.log(`\n✅ Migration completed! Migrated ${tableCount} tables.\n`);
    
    // Verify
    if (MIGRATION_TYPE !== 'schema') {
      console.log('🔍 Verifying migrated tables...\n');
      const sql = neon(TARGET_CONN);
      
      let successCount = 0;
      let totalRows = 0;
      
      for (const table of tables) {
        try {
          // Use dynamic table name query (need to use unsafe for table names)
          const result = await sql.unsafe(`SELECT COUNT(*) as count FROM ${table}`);
          const rowCount = parseInt(result[0].count);
          totalRows += rowCount;
          successCount++;
          console.log(`   ✅ ${table.padEnd(40)} ${rowCount.toLocaleString().padStart(10)} rows`);
        } catch (error) {
          console.log(`   ❌ ${table.padEnd(40)} ${error.message.substring(0, 30)}...`);
        }
      }
      
      console.log(`\n📊 Summary:`);
      console.log(`   Tables verified: ${successCount}/${tables.length}`);
      console.log(`   Total rows: ${totalRows.toLocaleString()}\n`);
    }
    
    console.log('✅ WhatsApp migration completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate().catch(console.error);

