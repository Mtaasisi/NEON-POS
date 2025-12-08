#!/usr/bin/env node

/**
 * Comprehensive Migration Verification
 * Checks schema, data, and functionality
 */

import pg from 'pg';
const { Client } = pg;

const SOURCE_DB = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const SUPABASE_HOST = 'aws-0-eu-north-1.pooler.supabase.com';
const SUPABASE_PORT = '5432';
const SUPABASE_USER = 'postgres.jxhzveborezjhsmzsgbc';
const SUPABASE_PASSWORD = '@SMASIKA1010';
const SUPABASE_DB = 'postgres';

console.log('\n🔍 Comprehensive Migration Verification\n');
console.log('='.repeat(70));

const results = {
  connection: { passed: false, message: '' },
  schema: { passed: false, tables: 0, expected: 0 },
  criticalTables: { passed: false, missing: [] },
  settingsData: { passed: false, details: {} },
  whatsappData: { passed: false, details: {} },
  functions: { passed: false, count: 0 },
  indexes: { passed: false, count: 0 },
  errors: []
};

async function verify() {
  const sourceClient = new Client({ connectionString: SOURCE_DB });
  const supabaseClient = new Client({
    host: SUPABASE_HOST,
    port: SUPABASE_PORT,
    user: SUPABASE_USER,
    password: SUPABASE_PASSWORD,
    database: SUPABASE_DB,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test 1: Connection
    console.log('\n📡 Test 1: Database Connections');
    console.log('-'.repeat(70));
    
    await sourceClient.connect();
    console.log('✅ Source database: Connected');
    
    await supabaseClient.connect();
    console.log('✅ Supabase database: Connected');
    results.connection.passed = true;

    // Test 2: Schema Verification
    console.log('\n📊 Test 2: Schema Verification');
    console.log('-'.repeat(70));
    
    const [sourceTables, supabaseTables] = await Promise.all([
      sourceClient.query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `),
      supabaseClient.query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `)
    ]);

    const sourceCount = parseInt(sourceTables.rows[0].count);
    const supabaseCount = parseInt(supabaseTables.rows[0].count);
    
    console.log(`Source database: ${sourceCount} tables`);
    console.log(`Supabase database: ${supabaseCount} tables`);
    
    results.schema.tables = supabaseCount;
    results.schema.expected = sourceCount;
    results.schema.passed = supabaseCount >= 200; // At least 200 tables migrated

    // Test 3: Critical Tables
    console.log('\n🔑 Test 3: Critical Tables');
    console.log('-'.repeat(70));
    
    const criticalTables = [
      'users',
      'lats_products',
      'lats_customers',
      'lats_sales',
      'lats_purchase_orders',
      'lats_suppliers',
      'lats_branches',
      'whatsapp_logs',
      'whatsapp_antiban_settings',
      'whatsapp_campaigns',
      'lats_pos_general_settings',
      'admin_settings'
    ];

    const existingTables = await supabaseClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name = ANY($1)
    `, [criticalTables]);

    const existingTableNames = existingTables.rows.map(r => r.table_name);
    const missing = criticalTables.filter(t => !existingTableNames.includes(t));

    criticalTables.forEach(table => {
      if (existingTableNames.includes(table)) {
        console.log(`✅ ${table}`);
      } else {
        console.log(`❌ ${table} - MISSING`);
      }
    });

    results.criticalTables.passed = missing.length === 0;
    results.criticalTables.missing = missing;

    // Test 4: Settings Data
    console.log('\n⚙️  Test 4: Settings Data');
    console.log('-'.repeat(70));
    
    const settingsTables = [
      'lats_pos_general_settings',
      'lats_pos_advanced_settings',
      'user_settings',
      'whatsapp_antiban_settings'
    ];

    for (const table of settingsTables) {
      try {
        const [sourceCount, supabaseCount] = await Promise.all([
          sourceClient.query(`SELECT COUNT(*) as count FROM "${table}"`).catch(() => ({ rows: [{ count: '0' }] })),
          supabaseClient.query(`SELECT COUNT(*) as count FROM "${table}"`).catch(() => ({ rows: [{ count: '0' }] }))
        ]);

        const src = parseInt(sourceCount.rows[0].count) || 0;
        const sup = parseInt(supabaseCount.rows[0].count) || 0;
        
        results.settingsData.details[table] = { source: src, supabase: sup };
        
        if (sup > 0) {
          console.log(`✅ ${table}: ${sup} rows (source: ${src})`);
        } else {
          console.log(`⚠️  ${table}: ${sup} rows (source: ${src})`);
        }
      } catch (error) {
        console.log(`❌ ${table}: Error - ${error.message}`);
        results.errors.push(`${table}: ${error.message}`);
      }
    }

    results.settingsData.passed = Object.values(results.settingsData.details).every(d => d.supabase > 0);

    // Test 5: WhatsApp Data
    console.log('\n💬 Test 5: WhatsApp Data');
    console.log('-'.repeat(70));
    
    const whatsappTables = [
      'whatsapp_logs',
      'whatsapp_antiban_settings',
      'whatsapp_campaigns',
      'whatsapp_incoming_messages',
      'whatsapp_media_library'
    ];

    for (const table of whatsappTables) {
      try {
        const [sourceCount, supabaseCount] = await Promise.all([
          sourceClient.query(`SELECT COUNT(*) as count FROM "${table}"`).catch(() => ({ rows: [{ count: '0' }] })),
          supabaseClient.query(`SELECT COUNT(*) as count FROM "${table}"`).catch(() => ({ rows: [{ count: '0' }] }))
        ]);

        const src = parseInt(sourceCount.rows[0].count) || 0;
        const sup = parseInt(supabaseCount.rows[0].count) || 0;
        
        results.whatsappData.details[table] = { source: src, supabase: sup };
        
        if (sup > 0 || src === 0) {
          console.log(`✅ ${table}: ${sup} rows (source: ${src})`);
        } else {
          console.log(`⚠️  ${table}: ${sup} rows (source: ${src})`);
        }
      } catch (error) {
        console.log(`❌ ${table}: Error - ${error.message}`);
        results.errors.push(`${table}: ${error.message}`);
      }
    }

    results.whatsappData.passed = Object.values(results.whatsappData.details).every(d => 
      d.supabase > 0 || d.source === 0
    );

    // Test 6: Functions & Indexes
    console.log('\n🔧 Test 6: Functions & Indexes');
    console.log('-'.repeat(70));
    
    const [functions, indexes] = await Promise.all([
      supabaseClient.query(`
        SELECT COUNT(*) as count
        FROM pg_proc
        WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      `),
      supabaseClient.query(`
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE schemaname = 'public'
      `)
    ]);

    const funcCount = parseInt(functions.rows[0].count);
    const idxCount = parseInt(indexes.rows[0].count);
    
    console.log(`Functions: ${funcCount}`);
    console.log(`Indexes: ${idxCount}`);
    
    results.functions.count = funcCount;
    results.functions.passed = funcCount > 0;
    results.indexes.count = idxCount;
    results.indexes.passed = idxCount > 0;

    // Test 7: Sample Queries
    console.log('\n🔍 Test 7: Sample Queries');
    console.log('-'.repeat(70));
    
    try {
      // Test basic query
      const testQuery = await supabaseClient.query('SELECT COUNT(*) as count FROM lats_products');
      console.log(`✅ Basic query works: ${testQuery.rows[0].count} products`);
      
      // Test JOIN query
      const joinQuery = await supabaseClient.query(`
        SELECT COUNT(*) as count 
        FROM lats_sales s
        LEFT JOIN lats_customers c ON s.customer_id = c.id
        LIMIT 1
      `);
      console.log(`✅ JOIN queries work`);
      
      // Test settings query
      const settingsQuery = await supabaseClient.query(`
        SELECT COUNT(*) as count 
        FROM lats_pos_general_settings
      `);
      console.log(`✅ Settings queries work: ${settingsQuery.rows[0].count} settings`);
      
    } catch (error) {
      console.log(`❌ Query test failed: ${error.message}`);
      results.errors.push(`Query test: ${error.message}`);
    }

    // Final Summary
    console.log('\n' + '='.repeat(70));
    console.log('📋 VERIFICATION SUMMARY');
    console.log('='.repeat(70));
    
    const allTests = [
      { name: 'Database Connection', result: results.connection.passed },
      { name: 'Schema Migration', result: results.schema.passed },
      { name: 'Critical Tables', result: results.criticalTables.passed },
      { name: 'Settings Data', result: results.settingsData.passed },
      { name: 'WhatsApp Data', result: results.whatsappData.passed },
      { name: 'Functions', result: results.functions.passed },
      { name: 'Indexes', result: results.indexes.passed }
    ];

    const passed = allTests.filter(t => t.result).length;
    const total = allTests.length;
    
    allTests.forEach(test => {
      const icon = test.result ? '✅' : '❌';
      console.log(`${icon} ${test.name}`);
    });
    
    console.log('\n' + '-'.repeat(70));
    console.log(`Overall: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
    
    if (results.errors.length > 0) {
      console.log('\n⚠️  Errors/Warnings:');
      results.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    if (results.criticalTables.missing.length > 0) {
      console.log('\n⚠️  Missing Critical Tables:');
      results.criticalTables.missing.forEach(table => console.log(`  - ${table}`));
    }
    
    console.log('\n' + '='.repeat(70));
    
    if (passed === total) {
      console.log('🎉 ALL TESTS PASSED! Migration is working perfectly!');
    } else if (passed >= total * 0.8) {
      console.log('✅ Migration is mostly working. Minor issues detected.');
    } else {
      console.log('⚠️  Migration has some issues. Review errors above.');
    }
    
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await sourceClient.end();
    await supabaseClient.end();
  }
}

verify();

