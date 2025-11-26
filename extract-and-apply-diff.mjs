#!/usr/bin/env node

import pg from 'pg';
import fs from 'fs';
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

async function getFunctionDefinition(client, functionName, functionArgs) {
  try {
    const result = await client.query(`
      SELECT pg_get_functiondef(p.oid) as function_definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = $1
        AND pg_get_function_identity_arguments(p.oid) = $2
      LIMIT 1;
    `, [functionName, functionArgs || '']);
    
    return result.rows[0]?.function_definition || null;
  } catch (error) {
    console.warn(`Could not get function ${functionName}: ${error.message}`);
    return null;
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
    
    // Get all functions from dev
    console.log('Getting functions from developer database...');
    const devFunctions = await devClient.query(`
      SELECT
        p.proname as function_name,
        pg_get_function_identity_arguments(p.oid) as function_args,
        p.oid as function_oid
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      ORDER BY p.proname, p.oid;
    `);
    
    console.log(`Found ${devFunctions.rows.length} functions in developer DB\n`);
    
    // Get all functions from prod
    console.log('Getting functions from production database...');
    const prodFunctions = await prodClient.query(`
      SELECT
        p.proname as function_name,
        pg_get_function_identity_arguments(p.oid) as function_args,
        p.oid as function_oid
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      ORDER BY p.proname, p.oid;
    `);
    
    console.log(`Found ${prodFunctions.rows.length} functions in production DB\n`);
    
    // Find missing or different functions
    const prodFunctionMap = new Map();
    prodFunctions.rows.forEach(f => {
      const key = `${f.function_name}(${f.function_args || ''})`;
      prodFunctionMap.set(key, f);
    });
    
    const missingFunctions = [];
    const sqlStatements = [];
    
    console.log('Comparing functions...\n');
    
    for (const devFunc of devFunctions.rows) {
      const key = `${devFunc.function_name}(${devFunc.function_args || ''})`;
      const prodFunc = prodFunctionMap.get(key);
      
      if (!prodFunc) {
        console.log(`  Missing: ${key}`);
        missingFunctions.push(devFunc);
        
        // Get full function definition
        const funcDef = await getFunctionDefinition(devClient, devFunc.function_name, devFunc.function_args);
        if (funcDef) {
          sqlStatements.push(funcDef + ';');
        }
      }
    }
    
    // Check for missing extensions
    console.log('\nChecking extensions...');
    const devExts = await devClient.query(`
      SELECT extname FROM pg_extension 
      WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_session_jwt')
      ORDER BY extname;
    `);
    
    const prodExts = await prodClient.query(`
      SELECT extname FROM pg_extension 
      WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_session_jwt')
      ORDER BY extname;
    `);
    
    const prodExtNames = new Set(prodExts.rows.map(e => e.extname));
    const missingExts = devExts.rows.filter(e => !prodExtNames.has(e.extname));
    
    if (missingExts.length > 0) {
      console.log(`  Missing extensions: ${missingExts.map(e => e.extname).join(', ')}`);
      missingExts.forEach(ext => {
        sqlStatements.unshift(`CREATE EXTENSION IF NOT EXISTS "${ext.extname}" WITH SCHEMA public;`);
      });
    }
    
    if (missingFunctions.length === 0 && missingExts.length === 0) {
      console.log('\n✓ All functions and extensions are in sync!');
      return;
    }
    
    // Generate SQL file
    const sqlFile = `sync-functions-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
    const sqlContent = `-- Function and extension sync from developer to production
-- Generated: ${new Date().toISOString()}
-- Missing: ${missingFunctions.length} functions, ${missingExts.length} extensions

BEGIN;

${sqlStatements.join('\n\n')}

COMMIT;
`;
    
    fs.writeFileSync(sqlFile, sqlContent);
    console.log(`\n✓ SQL script saved to: ${sqlFile}`);
    console.log(`\nTo apply to production, run:`);
    console.log(`psql "${PROD_DB_URL}" -f ${sqlFile}`);
    console.log(`\nOr use: node apply-schema-diff.mjs ${sqlFile}`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await devClient.end();
    await prodClient.end();
  }
}

main();

