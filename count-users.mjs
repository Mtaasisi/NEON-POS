#!/usr/bin/env node
/**
 * Count users in database
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jxhzveborezjhsmzsgbc.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║  👥 COUNTING USERS IN DATABASE                        ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

async function countUsers() {
  try {
    // Count total users
    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log('❌ Error counting users:', countError.message);
      return;
    }

    console.log(`📊 Total Users: ${count || 0}\n`);

    // Get users by role
    const { data: usersByRole, error: roleError } = await supabase
      .from('users')
      .select('role, id')
      .eq('is_active', true);

    if (!roleError && usersByRole) {
      const roleCounts = {};
      usersByRole.forEach(user => {
        const role = user.role || 'unknown';
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      });

      console.log('👥 Users by Role (Active):');
      Object.entries(roleCounts).forEach(([role, count]) => {
        console.log(`   ${role}: ${count}`);
      });
      console.log('');
    }

    // Get active vs inactive
    const { count: activeCount, error: activeError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: inactiveCount, error: inactiveError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', false);

    if (!activeError && !inactiveError) {
      console.log('📊 User Status:');
      console.log(`   Active: ${activeCount || 0}`);
      console.log(`   Inactive: ${inactiveCount || 0}`);
      console.log('');
    }

    // Get recent users
    const { data: recentUsers, error: recentError } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!recentError && recentUsers) {
      console.log('📋 Recent Users (Last 10):');
      recentUsers.forEach((user, i) => {
        const status = user.is_active ? '✅' : '❌';
        const time = new Date(user.created_at);
        console.log(`   ${i + 1}. ${status} ${user.email || 'No email'}`);
        console.log(`      Name: ${user.full_name || 'N/A'}`);
        console.log(`      Role: ${user.role || 'N/A'}`);
        console.log(`      Created: ${time.toLocaleDateString()}`);
        console.log('');
      });
    }

    // Get admin users
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active')
      .eq('role', 'admin')
      .eq('is_active', true);

    if (!adminError && adminUsers) {
      console.log(`👑 Admin Users: ${adminUsers.length}`);
      adminUsers.forEach((admin, i) => {
        console.log(`   ${i + 1}. ${admin.email || 'No email'}`);
        console.log(`      Name: ${admin.full_name || 'N/A'}`);
        console.log(`      ID: ${admin.id}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

countUsers().catch(console.error);


