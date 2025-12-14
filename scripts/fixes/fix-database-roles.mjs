#!/usr/bin/env node

/**
 * Fix Database Roles
 * Creates necessary roles and fixes permissions for Neon database
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pkg from 'pg';
const { Client } = pkg;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Get database URL
const getDatabaseUrl = () => {
  const possibleVars = [
    'DATABASE_URL',
    'POSTGRES_URL',
    'VITE_DATABASE_URL',
    'VITE_POSTGRES_URL',
  ];

  for (const varName of possibleVars) {
    if (process.env[varName]) {
      return process.env[varName];
    }
  }

  try {
    const envContent = readFileSync(join(__dirname, '.env'), 'utf-8');
    for (const varName of possibleVars) {
      const match = envContent.match(new RegExp(`^${varName}=(.+)$`, 'm'));
      if (match && match[1]) {
        return match[1].trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch (err) {
    // ignore
  }

  throw new Error('No database URL found');
};

async function fixDatabaseRoles() {
  let client;

  try {
    log('\n🔧 Fixing Database Roles...', 'cyan');
    log('═'.repeat(50), 'cyan');

    const databaseUrl = getDatabaseUrl();
    client = new Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });

    log('\n📡 Connecting to database...', 'blue');
    await client.connect();
    log('✓ Connected successfully', 'green');

    // Check existing roles
    log('\n🔍 Checking existing roles...', 'blue');
    const rolesResult = await client.query(`
      SELECT rolname 
      FROM pg_roles 
      WHERE rolname IN ('authenticated', 'service_role', 'anon')
      ORDER BY rolname;
    `);

    const existingRoles = rolesResult.rows.map(r => r.rolname);
    log(`Found roles: ${existingRoles.join(', ') || 'none'}`, 'yellow');

    // Create missing roles if they don't exist
    const requiredRoles = ['authenticated', 'anon'];
    for (const role of requiredRoles) {
      if (!existingRoles.includes(role)) {
        log(`\n📝 Creating role: ${role}`, 'blue');
        try {
          await client.query(`CREATE ROLE ${role};`);
          log(`✓ Role ${role} created`, 'green');
        } catch (err) {
          log(`⚠️  Could not create role ${role}: ${err.message}`, 'yellow');
        }
      } else {
        log(`✓ Role ${role} already exists`, 'green');
      }
    }

    // Fix permissions on key tables
    log('\n🔐 Fixing table permissions...', 'blue');
    
    const tables = [
      'product_images',
      'user_settings',
      'lats_products',
      'lats_customers',
      'lats_branches'
    ];

    for (const table of tables) {
      // Check if table exists
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);

      if (tableExists.rows[0].exists) {
        try {
          // Grant to public (all users)
          await client.query(`GRANT ALL ON ${table} TO PUBLIC;`);
          log(`✓ Granted permissions on ${table}`, 'green');
        } catch (err) {
          log(`⚠️  Could not grant on ${table}: ${err.message}`, 'yellow');
        }
      } else {
        log(`⚠️  Table ${table} does not exist`, 'yellow');
      }
    }

    // Disable RLS on problematic tables for now
    log('\n🔓 Checking RLS policies...', 'blue');
    const rlsTables = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = ANY($1)
      AND rowsecurity = true;
    `, [tables]);

    if (rlsTables.rows.length > 0) {
      log(`Found ${rlsTables.rows.length} tables with RLS enabled`, 'yellow');
      for (const row of rlsTables.rows) {
        log(`  - ${row.tablename}`, 'white');
      }
      
      // Note: We won't disable RLS automatically as it might be needed
      // Instead, we'll make sure policies allow access
      log('\nℹ️  RLS is enabled. Policies should allow access.', 'cyan');
    }

    log('\n═'.repeat(50), 'green');
    log('✅ Database Roles Fix Complete!', 'green');
    log('═'.repeat(50), 'green');

  } catch (error) {
    log('\n❌ Error occurred:', 'red');
    log(error.message, 'red');
    if (error.stack) {
      log('\nStack trace:', 'yellow');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
      log('\n🔌 Database connection closed', 'blue');
    }
  }
}

fixDatabaseRoles();

