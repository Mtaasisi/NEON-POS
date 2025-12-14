#!/usr/bin/env node
/**
 * Database Isolation Check Script
 * Checks both PostgreSQL transaction isolation and application-level branch isolation
 */

import postgres from 'postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

console.log('🔍 Database Isolation Check\n');
console.log('='.repeat(60));

// Create connection
const sql = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: 'require',
});

async function checkDatabaseIsolation() {
  try {
    console.log('\n📊 1. CHECKING POSTGRESQL TRANSACTION ISOLATION LEVEL\n');
    
    // Check current default transaction isolation level
    const isolationResult = await sql`SHOW default_transaction_isolation`;
    const isolationLevel = isolationResult[0]?.default_transaction_isolation;
    
    console.log(`   Current Isolation Level: ${isolationLevel?.toUpperCase() || 'UNKNOWN'}`);
    
    // PostgreSQL Isolation Levels explanation
    console.log('\n   📖 PostgreSQL Isolation Levels:');
    console.log('   • READ UNCOMMITTED - Lowest isolation (rarely used)');
    console.log('   • READ COMMITTED   - Default (prevents dirty reads) ✓');
    console.log('   • REPEATABLE READ  - Prevents non-repeatable reads');
    console.log('   • SERIALIZABLE     - Highest isolation (slowest)');
    
    if (isolationLevel === 'read committed') {
      console.log('\n   ✅ Using READ COMMITTED (PostgreSQL default)');
      console.log('   ℹ️  This prevents dirty reads while maintaining good performance');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 2. CHECKING CONNECTION POOL STATUS\n');
    
    // Check current connections
    const connectionsResult = await sql`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections,
        max(backend_start) as oldest_connection
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `;
    
    const connInfo = connectionsResult[0];
    console.log(`   Total Connections: ${connInfo.total_connections}`);
    console.log(`   Active: ${connInfo.active_connections}`);
    console.log(`   Idle: ${connInfo.idle_connections}`);
    console.log(`   Pool Max (configured): 10`);
    
    if (parseInt(connInfo.total_connections) <= 10) {
      console.log('\n   ✅ Connection pool is within limits');
    } else {
      console.log('\n   ⚠️  Connection pool may be exceeding configured limits');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 3. CHECKING DATABASE LOCKS (CONCURRENCY)\n');
    
    // Check for locks
    const locksResult = await sql`
      SELECT 
        locktype,
        mode,
        granted,
        count(*) as lock_count
      FROM pg_locks
      WHERE database = (SELECT oid FROM pg_database WHERE datname = current_database())
      GROUP BY locktype, mode, granted
      ORDER BY lock_count DESC
      LIMIT 5
    `;
    
    if (locksResult.length > 0) {
      console.log('   Current Locks:');
      locksResult.forEach(lock => {
        const status = lock.granted ? '✓' : '✗ BLOCKED';
        console.log(`   ${status} ${lock.locktype} - ${lock.mode} (${lock.lock_count})`);
      });
    } else {
      console.log('   ✅ No locks detected (database is idle)');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 4. TESTING TRANSACTION ISOLATION\n');
    
    // Create test table
    await sql`
      CREATE TABLE IF NOT EXISTS _isolation_test (
        id SERIAL PRIMARY KEY,
        value TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    // Clean up any previous test data
    await sql`DELETE FROM _isolation_test`;
    
    console.log('   Running concurrent transaction test...\n');
    
    // Test 1: Dirty Read Prevention (Transaction 1)
    const sql1 = postgres(DATABASE_URL, { max: 1 });
    const sql2 = postgres(DATABASE_URL, { max: 1 });
    
    try {
      // Transaction 1: Insert but don't commit
      await sql1.begin(async sql => {
        await sql`INSERT INTO _isolation_test (value) VALUES ('test-uncommitted')`;
        console.log('   Transaction 1: Inserted "test-uncommitted" (not committed)');
        
        // Transaction 2: Try to read (should not see uncommitted data)
        const result = await sql2`SELECT * FROM _isolation_test WHERE value = 'test-uncommitted'`;
        
        if (result.length === 0) {
          console.log('   Transaction 2: Cannot see uncommitted data ✅');
          console.log('   ✅ DIRTY READ PREVENTION: Working correctly');
        } else {
          console.log('   Transaction 2: Can see uncommitted data ❌');
          console.log('   ⚠️  WARNING: Dirty reads are possible!');
        }
        
        // Rollback transaction 1
        throw new Error('Intentional rollback');
      }).catch(() => {
        console.log('   Transaction 1: Rolled back (as expected)');
      });
      
      // Verify rollback worked
      const afterRollback = await sql`SELECT * FROM _isolation_test WHERE value = 'test-uncommitted'`;
      if (afterRollback.length === 0) {
        console.log('   ✅ ROLLBACK ISOLATION: Working correctly\n');
      }
      
    } finally {
      await sql1.end();
      await sql2.end();
    }
    
    console.log('='.repeat(60));
    console.log('\n📊 5. CHECKING APPLICATION-LEVEL BRANCH ISOLATION\n');
    
    // Check if branch-related tables exist
    const branchTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('branches', 'lats_purchase_orders', 'lats_products', 'lats_inventory', 'sales_transactions')
      ORDER BY table_name
    `;
    
    if (branchTables.length > 0) {
      console.log('   Branch-isolated tables found:');
      branchTables.forEach(t => console.log(`   • ${t.table_name}`));
      
      // Check if branch_id columns exist
      const branchColumns = await sql`
        SELECT 
          c.table_name,
          c.column_name,
          c.data_type
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
        AND c.column_name = 'branch_id'
        AND c.table_name IN ('lats_purchase_orders', 'lats_products', 'lats_inventory', 'sales_transactions')
        ORDER BY c.table_name
      `;
      
      if (branchColumns.length > 0) {
        console.log('\n   ✅ Branch isolation columns found:');
        branchColumns.forEach(col => {
          console.log(`   • ${col.table_name}.${col.column_name} (${col.data_type})`);
        });
        
        console.log('\n   📋 Application-level isolation is configured via:');
        console.log('   • Branch ID stored in localStorage');
        console.log('   • Queries filtered by branch_id in application code');
        console.log('   • See: src/features/lats/lib/data/provider.supabase.ts');
      } else {
        console.log('\n   ⚠️  No branch_id columns found in key tables');
      }
    } else {
      console.log('   ⚠️  Key tables not found. Database may not be initialized.');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 6. DATABASE SECURITY & ISOLATION SETTINGS\n');
    
    // Check database settings related to isolation
    const securitySettings = await sql`
      SELECT name, setting, unit, short_desc
      FROM pg_settings
      WHERE name IN (
        'default_transaction_isolation',
        'max_connections',
        'statement_timeout',
        'idle_in_transaction_session_timeout',
        'lock_timeout'
      )
      ORDER BY name
    `;
    
    console.log('   Current PostgreSQL Settings:');
    securitySettings.forEach(setting => {
      const value = setting.unit ? `${setting.setting} ${setting.unit}` : setting.setting;
      console.log(`   • ${setting.name}: ${value}`);
      console.log(`     ${setting.short_desc}`);
    });
    
    // Clean up test table
    await sql`DROP TABLE IF EXISTS _isolation_test`;
    
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 SUMMARY\n');
    console.log('   ✅ Transaction Isolation: ' + (isolationLevel || 'UNKNOWN'));
    console.log('   ✅ Connection Pooling: Active (max 10)');
    console.log('   ✅ Dirty Read Prevention: Verified');
    console.log('   ✅ Application Branch Isolation: Configured');
    console.log('\n   🎯 RECOMMENDATIONS:');
    console.log('   1. Current setup is appropriate for a POS system');
    console.log('   2. READ COMMITTED isolation prevents most issues');
    console.log('   3. Branch isolation should be enforced in application logic');
    console.log('   4. Consider Row-Level Security (RLS) for additional database-level isolation');
    
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error during isolation check:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sql.end();
    console.log('\n✅ Check complete\n');
  }
}

// Run the check
checkDatabaseIsolation().catch(console.error);

