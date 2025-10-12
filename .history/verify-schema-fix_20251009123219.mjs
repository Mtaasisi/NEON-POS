#!/usr/bin/env node
/**
 * ✅ VERIFY SCHEMA FIX
 * Tests that all missing columns have been added
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || '';

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not set!');
  console.log('\nUsage:');
  console.log('  export DATABASE_URL="your-connection-string"');
  console.log('  node verify-schema-fix.mjs\n');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function checkColumn(tableName, columnName) {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = ${tableName} 
        AND column_name = ${columnName}
      ) as exists
    `;
    return result[0].exists;
  } catch (error) {
    return false;
  }
}

async function checkConstraint(tableName, constraintName) {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = ${tableName} 
        AND constraint_name = ${constraintName}
      ) as exists
    `;
    return result[0].exists;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('\n✅ SCHEMA VERIFICATION REPORT\n');
  console.log('================================================\n');

  let allPassed = true;
  const results = [];

  // Test all required columns
  const checks = [
    { table: 'whatsapp_instances_comprehensive', column: 'user_id', description: 'WhatsApp Instance User ID' },
    { table: 'notifications', column: 'user_id', description: 'Notification User ID' },
    { table: 'devices', column: 'issue_description', description: 'Device Issue Description' },
    { table: 'devices', column: 'assigned_to', description: 'Device Assigned To' },
    { table: 'user_daily_goals', column: 'is_active', description: 'User Goal Active Flag' },
  ];

  console.log('📋 COLUMN CHECKS:\n');

  for (const check of checks) {
    const exists = await checkColumn(check.table, check.column);
    const status = exists ? '✅ PASS' : '❌ FAIL';
    const symbol = exists ? '✓' : '✗';
    
    console.log(`${status} ${symbol} ${check.description}`);
    console.log(`         ${check.table}.${check.column}`);
    
    if (!exists) {
      allPassed = false;
      console.log(`         ⚠️  Column is missing! Please run the fix script.`);
    }
    console.log('');
    
    results.push({ check: check.description, passed: exists });
  }

  // Check constraint
  console.log('🔑 CONSTRAINT CHECKS:\n');
  
  const constraintExists = await checkConstraint(
    'user_daily_goals', 
    'user_daily_goals_user_id_date_goal_type_key'
  );
  
  const oldConstraintExists = await checkConstraint(
    'user_daily_goals',
    'user_daily_goals_user_id_date_key'
  );
  
  if (constraintExists && !oldConstraintExists) {
    console.log('✅ PASS ✓ User Daily Goals Constraint');
    console.log('         New constraint (user_id, date, goal_type) is in place');
    console.log('         Old constraint has been removed\n');
    results.push({ check: 'User Daily Goals Constraint', passed: true });
  } else if (oldConstraintExists) {
    console.log('❌ FAIL ✗ User Daily Goals Constraint');
    console.log('         Old constraint still exists, needs to be updated');
    console.log('         This will cause duplicate key errors\n');
    allPassed = false;
    results.push({ check: 'User Daily Goals Constraint', passed: false });
  } else {
    console.log('⚠️  WARN ⚠ User Daily Goals Constraint');
    console.log('         Neither old nor new constraint found\n');
    results.push({ check: 'User Daily Goals Constraint', passed: false });
  }

  // Test actual queries
  console.log('================================================\n');
  console.log('🧪 QUERY TESTS:\n');

  // Test 1: WhatsApp query with user_id
  try {
    const result = await sql`
      SELECT COUNT(*) as count 
      FROM whatsapp_instances_comprehensive 
      WHERE user_id IS NOT NULL OR user_id IS NULL
      LIMIT 1
    `;
    console.log('✅ PASS ✓ WhatsApp instances query with user_id');
    results.push({ check: 'WhatsApp Query Test', passed: true });
  } catch (error) {
    console.log('❌ FAIL ✗ WhatsApp instances query with user_id');
    console.log(`         Error: ${error.message}`);
    allPassed = false;
    results.push({ check: 'WhatsApp Query Test', passed: false });
  }

  // Test 2: Notifications query with user_id
  try {
    const result = await sql`
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE user_id IS NOT NULL OR user_id IS NULL
      LIMIT 1
    `;
    console.log('✅ PASS ✓ Notifications query with user_id');
    results.push({ check: 'Notifications Query Test', passed: true });
  } catch (error) {
    console.log('❌ FAIL ✗ Notifications query with user_id');
    console.log(`         Error: ${error.message}`);
    allPassed = false;
    results.push({ check: 'Notifications Query Test', passed: false });
  }

  // Test 3: Devices query with issue_description
  try {
    const result = await sql`
      SELECT COUNT(*) as count 
      FROM devices 
      WHERE issue_description IS NOT NULL OR issue_description IS NULL
      LIMIT 1
    `;
    console.log('✅ PASS ✓ Devices query with issue_description');
    results.push({ check: 'Devices Query Test', passed: true });
  } catch (error) {
    console.log('❌ FAIL ✗ Devices query with issue_description');
    console.log(`         Error: ${error.message}`);
    allPassed = false;
    results.push({ check: 'Devices Query Test', passed: false });
  }

  // Test 4: User daily goals query with is_active
  try {
    const result = await sql`
      SELECT COUNT(*) as count 
      FROM user_daily_goals 
      WHERE is_active = TRUE OR is_active = FALSE
      LIMIT 1
    `;
    console.log('✅ PASS ✓ User daily goals query with is_active');
    results.push({ check: 'User Goals Query Test', passed: true });
  } catch (error) {
    console.log('❌ FAIL ✗ User daily goals query with is_active');
    console.log(`         Error: ${error.message}`);
    allPassed = false;
    results.push({ check: 'User Goals Query Test', passed: false });
  }

  // Summary
  console.log('\n================================================\n');
  console.log('📊 SUMMARY:\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`Total Checks: ${total}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${Math.round((passed / total) * 100)}%\n`);

  if (allPassed) {
    console.log('================================================');
    console.log('🎉 ALL CHECKS PASSED!\n');
    console.log('Your database schema is correct and all queries');
    console.log('should work without 400 errors.\n');
    console.log('You can now run your application safely.');
    console.log('================================================\n');
  } else {
    console.log('================================================');
    console.log('⚠️  SOME CHECKS FAILED\n');
    console.log('Please run the fix script to resolve issues:');
    console.log('  node apply-missing-columns-fix.mjs\n');
    console.log('Or manually apply the SQL file:');
    console.log('  FIX-ALL-MISSING-COLUMNS.sql');
    console.log('================================================\n');
    process.exit(1);
  }
}

main();

