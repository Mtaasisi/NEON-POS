#!/usr/bin/env node

/**
 * Verify User Permissions Database Connection
 * Tests that user creation with permissions works correctly
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  console.error('Please create a .env file with VITE_DATABASE_URL');
  process.exit(1);
}

console.log('🔍 Testing User Permissions System\n');
console.log('📦 Database URL:', DATABASE_URL.substring(0, 50) + '...\n');

const sql = neon(DATABASE_URL);

// Test functions
async function test1_DatabaseConnection() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Database Connection');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const result = await sql`SELECT 1 as test, NOW() as timestamp`;
    console.log('✅ PASSED: Database connection successful');
    console.log('   Timestamp:', result[0].timestamp);
    return true;
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    return false;
  }
}

async function test2_UsersTableExists() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Users Table Exists');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const result = await sql`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'users'
    `;
    
    if (result[0].count > 0) {
      console.log('✅ PASSED: Users table exists');
      return true;
    } else {
      console.log('❌ FAILED: Users table does not exist');
      return false;
    }
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    return false;
  }
}

async function test3_PermissionsColumnExists() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Permissions Column Exists');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const result = await sql`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'permissions'
    `;
    
    if (result.length > 0) {
      console.log('✅ PASSED: Permissions column exists');
      console.log('   Column:', result[0].column_name);
      console.log('   Type:', result[0].data_type);
      console.log('   UDT Name:', result[0].udt_name);
      return true;
    } else {
      console.log('❌ FAILED: Permissions column does not exist');
      console.log('\n💡 SQL to add permissions column:');
      console.log('   ALTER TABLE users ADD COLUMN permissions TEXT[];');
      return false;
    }
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    return false;
  }
}

async function test4_FetchExistingUsers() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: Fetch Existing Users');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const result = await sql`
      SELECT id, email, full_name, role, permissions, is_active
      FROM users
      LIMIT 5
    `;
    
    console.log(`✅ PASSED: Found ${result.length} user(s)`);
    
    if (result.length > 0) {
      console.log('\n   Sample users:');
      result.forEach((user, i) => {
        console.log(`   ${i + 1}. ${user.email} - ${user.role}`);
        console.log(`      Permissions: ${Array.isArray(user.permissions) ? user.permissions.length : 0} permission(s)`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    return false;
  }
}

async function test5_CreateTestUser() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: Create Test User with Permissions');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const timestamp = Date.now();
  const testEmail = `testuser${timestamp}@test.com`;
  const testPermissions = [
    'dashboard',
    'pos',
    'reports',
    'inventory_view',
    'inventory_add',
    'customers_view',
    'customers_add'
  ];
  
  try {
    const result = await sql`
      INSERT INTO users (
        email,
        password,
        full_name,
        username,
        role,
        phone,
        department,
        permissions,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        ${testEmail},
        'test123456',
        'Test User',
        ${'testuser' + timestamp},
        'manager',
        '+255 123 456 789',
        'IT',
        ${testPermissions},
        true,
        NOW(),
        NOW()
      )
      RETURNING id, email, full_name, role, permissions
    `;
    
    if (result.length > 0) {
      const user = result[0];
      console.log('✅ PASSED: Test user created successfully');
      console.log('   ID:', user.id);
      console.log('   Email:', user.email);
      console.log('   Name:', user.full_name);
      console.log('   Role:', user.role);
      console.log('   Permissions:', user.permissions);
      console.log('   Permissions Count:', user.permissions?.length || 0);
      
      return user.id;
    } else {
      console.log('❌ FAILED: No user returned after insert');
      return null;
    }
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    if (error.message.includes('duplicate')) {
      console.log('   💡 User with this email might already exist');
    }
    return null;
  }
}

async function test6_VerifyUserPermissions(userId) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 6: Verify Permissions Storage');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (!userId) {
    console.log('⚠️  SKIPPED: No user ID available from previous test');
    return false;
  }
  
  try {
    const result = await sql`
      SELECT id, email, full_name, role, permissions
      FROM users
      WHERE id = ${userId}
    `;
    
    if (result.length > 0) {
      const user = result[0];
      const hasPermissions = user.permissions && Array.isArray(user.permissions);
      const hasExpectedPermissions = hasPermissions && 
                                     user.permissions.includes('dashboard') &&
                                     user.permissions.includes('inventory_view');
      
      if (hasExpectedPermissions) {
        console.log('✅ PASSED: Permissions correctly stored and retrieved');
        console.log('   User:', user.email);
        console.log('   Permissions:', user.permissions);
        console.log('   Count:', user.permissions.length);
      } else {
        console.log('❌ FAILED: Permissions missing or incorrect');
        console.log('   Expected: array with dashboard, inventory_view, etc.');
        console.log('   Actual:', user.permissions);
      }
      
      return user.id;
    } else {
      console.log('❌ FAILED: Could not fetch created user');
      return null;
    }
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    return null;
  }
}

async function cleanupTestUser(userId) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CLEANUP: Delete Test User');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (!userId) {
    console.log('⚠️  SKIPPED: No user ID to cleanup');
    return;
  }
  
  try {
    const result = await sql`
      DELETE FROM users
      WHERE id = ${userId}
      RETURNING email
    `;
    
    if (result.length > 0) {
      console.log('✅ Test user deleted:', result[0].email);
    } else {
      console.log('⚠️  No user found to delete');
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║  USER PERMISSIONS DATABASE VERIFICATION  ║');
  console.log('╚═══════════════════════════════════════════╝\n');
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  let testUserId = null;
  
  try {
    // Test 1
    results.total++;
    if (await test1_DatabaseConnection()) results.passed++;
    else results.failed++;
    
    // Test 2
    results.total++;
    if (await test2_UsersTableExists()) results.passed++;
    else results.failed++;
    
    // Test 3
    results.total++;
    if (await test3_PermissionsColumnExists()) results.passed++;
    else results.failed++;
    
    // Test 4
    results.total++;
    if (await test4_FetchExistingUsers()) results.passed++;
    else results.failed++;
    
    // Test 5
    results.total++;
    testUserId = await test5_CreateTestUser();
    if (testUserId) results.passed++;
    else results.failed++;
    
    // Test 6
    results.total++;
    const verified = await test6_VerifyUserPermissions(testUserId);
    if (verified) results.passed++;
    else results.failed++;
    
    // Cleanup
    if (testUserId) {
      await cleanupTestUser(testUserId);
    }
    
    // Summary
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║            TEST SUMMARY                   ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log(`\n   Total Tests: ${results.total}`);
    console.log(`   ✅ Passed: ${results.passed}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   Success Rate: ${Math.round((results.passed / results.total) * 100)}%\n`);
    
    if (results.failed === 0) {
      console.log('🎉 ALL TESTS PASSED! The user permissions system is working correctly.\n');
      process.exit(0);
    } else {
      console.log('⚠️  SOME TESTS FAILED. Please review the output above.\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error during testing:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

