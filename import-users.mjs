#!/usr/bin/env node

import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';

const connectionString = process.argv[2];
const jsonFilePath = process.argv[3];

if (!connectionString || !jsonFilePath) {
  console.error('Usage: node import-users.mjs <connection_string> <json_file_path>');
  process.exit(1);
}

try {
  // Read and parse JSON file
  console.log(`Reading JSON file: ${jsonFilePath}`);
  const jsonContent = readFileSync(jsonFilePath, 'utf-8');
  const users = JSON.parse(jsonContent);

  if (!Array.isArray(users)) {
    console.error('Error: JSON file must contain an array of users');
    process.exit(1);
  }

  console.log(`Found ${users.length} users to import`);

  // Generate SQL INSERT statements with ON CONFLICT handling
  const insertStatements = users.map((user) => {
    // Escape single quotes in text fields
    const escape = (value) => {
      if (value === null || value === undefined) return 'NULL';
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') return value;
      if (Array.isArray(value)) {
        // Format as PostgreSQL text array: ARRAY['value1', 'value2']
        const arrayValues = value.map(v => `'${String(v).replace(/'/g, "''")}'`).join(', ');
        return `ARRAY[${arrayValues}]`;
      }
      return `'${String(value).replace(/'/g, "''")}'`;
    };

    // Helper to format timestamp
    const formatTimestamp = (value) => {
      if (value === null || value === undefined) return 'NULL';
      return `'${String(value).replace(/'/g, "''")}'::timestamptz`;
    };

    return `
      INSERT INTO users (
        id, email, password, full_name, role, is_active, created_at, updated_at,
        username, permissions, max_devices_allowed, require_approval,
        failed_login_attempts, two_factor_enabled, two_factor_secret,
        last_login, phone, department, branch_id
      ) VALUES (
        ${escape(user.id)}::uuid,
        ${escape(user.email)},
        ${escape(user.password)},
        ${escape(user.full_name)},
        ${escape(user.role)},
        ${user.is_active},
        ${formatTimestamp(user.created_at)},
        ${formatTimestamp(user.updated_at)},
        ${escape(user.username)},
        ${escape(user.permissions)},
        ${user.max_devices_allowed || 1000},
        ${user.require_approval || false},
        ${user.failed_login_attempts || 0},
        ${user.two_factor_enabled || false},
        ${escape(user.two_factor_secret)},
        ${formatTimestamp(user.last_login)},
        ${escape(user.phone)},
        ${escape(user.department)},
        ${escape(user.branch_id)}::uuid
      )
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        updated_at = EXCLUDED.updated_at,
        username = EXCLUDED.username,
        permissions = EXCLUDED.permissions,
        max_devices_allowed = EXCLUDED.max_devices_allowed,
        require_approval = EXCLUDED.require_approval,
        failed_login_attempts = EXCLUDED.failed_login_attempts,
        two_factor_enabled = EXCLUDED.two_factor_enabled,
        two_factor_secret = EXCLUDED.two_factor_secret,
        last_login = EXCLUDED.last_login,
        phone = EXCLUDED.phone,
        department = EXCLUDED.department,
        branch_id = EXCLUDED.branch_id;
    `;
  }).join('\n');

  // Get unique branch IDs from users
  const branchIds = [...new Set(users.map(u => u.branch_id).filter(Boolean))];
  
  // Create branch insert statements if needed
  const branchStatements = branchIds.map(branchId => {
    return `
      INSERT INTO lats_branches (id, name, location, is_active, created_at, updated_at)
      VALUES (
        '${branchId}'::uuid,
        'Main Branch',
        'Main Location',
        true,
        now(),
        now()
      )
      ON CONFLICT (id) DO NOTHING;
    `;
  }).join('\n');

  // Create temporary SQL file
  const sqlContent = `
    BEGIN;
    
    -- Ensure branches exist
    ${branchStatements}
    
    -- Insert/Update users
    ${insertStatements}
    
    COMMIT;
  `;

  // Write SQL to a temporary file
  const tempSqlFile = '/tmp/import-users.sql';
  writeFileSync(tempSqlFile, sqlContent);

  // Execute using psql
  console.log('Importing users into database...');
  const psqlCommand = `psql "${connectionString}" -f ${tempSqlFile}`;
  
  try {
    execSync(psqlCommand, { stdio: 'inherit' });
    console.log('\n✓ Successfully imported all users!');
  } catch (error) {
    console.error('\n✗ Error importing users:', error.message);
    process.exit(1);
  } finally {
    // Clean up temporary file
    try {
      unlinkSync(tempSqlFile);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}

