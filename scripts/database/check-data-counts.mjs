#!/usr/bin/env node

import pg from 'pg';
const { Client } = pg;

const DEV_DB_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const PROD_DB_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

function parseConnectionString(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port || 5432,
    database: parsed.pathname.slice(1),
    user: parsed.username,
    password: parsed.password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000
  };
}

async function getTableRowCounts(client, tableName) {
  try {
    const result = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    return -1; // Error indicator
  }
}

async function main() {
  const devClient = new Client(parseConnectionString(DEV_DB_URL));
  const prodClient = new Client(parseConnectionString(PROD_DB_URL));
  
  try {
    console.log('Connecting to databases...');
    await devClient.connect();
    await prodClient.connect();
    console.log('✓ Connected\n');
    
    // Get all tables
    const devTables = await devClient.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);
    
    console.log(`Checking ${devTables.rows.length} tables...\n`);
    
    const tablesWithData = [];
    const emptyTables = [];
    const errorTables = [];
    
    for (let i = 0; i < devTables.rows.length; i++) {
      const table = devTables.rows[i].tablename;
      if (i % 20 === 0) {
        console.log(`Progress: ${i}/${devTables.rows.length}...`);
      }
      
      const devCount = await getTableRowCounts(devClient, table);
      const prodCount = await getTableRowCounts(prodClient, table);
      
      if (devCount === -1) {
        errorTables.push({ table, error: 'Could not read from dev' });
      } else if (devCount > 0) {
        tablesWithData.push({ table, devCount, prodCount });
      } else {
        emptyTables.push(table);
      }
    }
    
    console.log('\n=== SUMMARY ===\n');
    console.log(`Tables with data in DEV: ${tablesWithData.length}`);
    console.log(`Empty tables: ${emptyTables.length}`);
    console.log(`Error tables: ${errorTables.length}\n`);
    
    if (tablesWithData.length > 0) {
      console.log('=== TABLES WITH DATA ===\n');
      console.log('Table Name'.padEnd(40), 'DEV Rows'.padEnd(12), 'PROD Rows'.padEnd(12), 'Diff');
      console.log('-'.repeat(80));
      
      tablesWithData
        .sort((a, b) => b.devCount - a.devCount)
        .slice(0, 50) // Show top 50
        .forEach(({ table, devCount, prodCount }) => {
          const diff = devCount - prodCount;
          const diffStr = diff > 0 ? `+${diff}` : diff.toString();
          console.log(
            table.padEnd(40),
            devCount.toString().padEnd(12),
            prodCount.toString().padEnd(12),
            diffStr
          );
        });
      
      if (tablesWithData.length > 50) {
        console.log(`\n... and ${tablesWithData.length - 50} more tables`);
      }
    }
    
    // Find tables that need migration
    const needsMigration = tablesWithData.filter(t => t.devCount > t.prodCount);
    if (needsMigration.length > 0) {
      console.log(`\n=== TABLES NEEDING MIGRATION: ${needsMigration.length} ===\n`);
      needsMigration.slice(0, 20).forEach(({ table, devCount, prodCount }) => {
        console.log(`  ${table}: ${prodCount} → ${devCount} (+${devCount - prodCount})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await devClient.end();
    await prodClient.end();
  }
}

main();

