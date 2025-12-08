#!/usr/bin/env node
/**
 * Diagnose login issues
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jxhzveborezjhsmzsgbc.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║  🔍 DIAGNOSING LOGIN ISSUE                             ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

async function diagnose() {
  const issues = [];
  const working = [];

  // Test 1: Database connection
  console.log('1️⃣ Testing Database Connection...');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      issues.push('❌ Database query failed: ' + error.message);
      console.log('   ❌ Error:', error.message);
      console.log('   Code:', error.code);
    } else {
      working.push('✅ Database connection working');
      console.log('   ✅ Database accessible');
    }
  } catch (error) {
    issues.push('❌ Database connection failed: ' + error.message);
    console.log('   ❌ Error:', error.message);
  }

  // Test 2: Check users table
  console.log('\n2️⃣ Checking Users Table...');
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active, password')
      .limit(5);

    if (error) {
      issues.push('❌ Cannot query users table: ' + error.message);
      console.log('   ❌ Error:', error.message);
    } else {
      working.push('✅ Users table accessible');
      console.log(`   ✅ Found ${users?.length || 0} users`);
      
      if (users && users.length > 0) {
        console.log('\n   📋 Users in database:');
        users.forEach((user, i) => {
          const hasPassword = user.password ? 'Yes' : 'No';
          console.log(`      ${i + 1}. ${user.email || 'No email'}`);
          console.log(`         Name: ${user.full_name || 'N/A'}`);
          console.log(`         Role: ${user.role || 'N/A'}`);
          console.log(`         Active: ${user.is_active ? 'Yes' : 'No'}`);
          console.log(`         Has Password: ${hasPassword}`);
          console.log('');
        });
      }
    }
  } catch (error) {
    issues.push('❌ Error checking users: ' + error.message);
    console.log('   ❌ Error:', error.message);
  }

  // Test 3: Test login query
  console.log('3️⃣ Testing Login Query...');
  const testEmail = 'care@care.com';
  const testPassword = '123456';
  
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active, password')
      .eq('email', testEmail)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        issues.push('❌ User not found: ' + testEmail);
        console.log('   ❌ User not found in database');
      } else {
        issues.push('❌ Login query error: ' + error.message);
        console.log('   ❌ Error:', error.message);
        console.log('   Code:', error.code);
      }
    } else if (user) {
      working.push('✅ User found in database');
      console.log('   ✅ User found:');
      console.log('      Email:', user.email);
      console.log('      Name:', user.full_name);
      console.log('      Role:', user.role);
      console.log('      Active:', user.is_active);
      console.log('      Has Password:', user.password ? 'Yes' : 'No');
      
      if (user.password) {
        // Check if password matches (simple comparison - in real app, use hashing)
        if (user.password === testPassword) {
          working.push('✅ Password matches');
          console.log('   ✅ Password matches test password');
        } else {
          issues.push('❌ Password does not match');
          console.log('   ❌ Password does NOT match');
          console.log('   💡 Password in DB might be hashed or different');
        }
      } else {
        issues.push('⚠️ User has no password set');
        console.log('   ⚠️  User has no password in database');
      }
    }
  } catch (error) {
    issues.push('❌ Login test failed: ' + error.message);
    console.log('   ❌ Error:', error.message);
  }

  // Test 4: Check password column
  console.log('\n4️⃣ Checking Password Storage...');
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('password')
      .eq('email', testEmail)
      .single();

    if (!error && user) {
      if (user.password) {
        console.log('   ✅ Password column exists and has value');
        console.log('   📝 Password type:', typeof user.password);
        console.log('   📝 Password length:', user.password.length);
        console.log('   📝 First 10 chars:', user.password.substring(0, 10) + '...');
        
        // Check if it's hashed (common hash patterns)
        if (user.password.startsWith('$2') || user.password.length > 20) {
          console.log('   💡 Password appears to be hashed (bcrypt/argon2)');
          issues.push('⚠️ Password is hashed - need to use password hashing for login');
        } else {
          console.log('   💡 Password appears to be plain text');
        }
      } else {
        issues.push('⚠️ Password column is empty');
        console.log('   ⚠️  Password is NULL or empty');
      }
    }
  } catch (error) {
    console.log('   ⚠️  Could not check password:', error.message);
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  📋 DIAGNOSIS SUMMARY                                 ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  if (working.length > 0) {
    console.log('✅ What\'s Working:');
    working.forEach(item => console.log(`   ${item}`));
    console.log('');
  }

  if (issues.length > 0) {
    console.log('⚠️  Issues Found:');
    issues.forEach(item => console.log(`   ${item}`));
    console.log('');
  }

  // Recommendations
  console.log('📋 RECOMMENDATIONS:\n');
  
  if (issues.some(i => i.includes('Password is hashed'))) {
    console.log('🔴 Password Hashing Issue:');
    console.log('   The password in database is hashed, but login code');
    console.log('   might be comparing plain text.');
    console.log('   Fix: Update login code to hash password before comparison');
    console.log('');
  }

  if (issues.some(i => i.includes('User not found'))) {
    console.log('🔴 User Not Found:');
    console.log('   The user does not exist in database.');
    console.log('   Fix: Create the user first');
    console.log('');
  }

  if (issues.some(i => i.includes('no password'))) {
    console.log('🔴 No Password Set:');
    console.log('   User exists but has no password.');
    console.log('   Fix: Set a password for the user');
    console.log('');
  }

  console.log('🧪 Next Steps:');
  console.log('   1. Check the specific issues above');
  console.log('   2. Verify user exists: node count-users.mjs');
  console.log('   3. Check password format in database');
  console.log('   4. Update login code if password is hashed');
  console.log('');
}

diagnose().catch(error => {
  console.error('\n❌ Diagnosis failed:', error);
  process.exit(1);
});


