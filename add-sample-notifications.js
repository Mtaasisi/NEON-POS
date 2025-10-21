#!/usr/bin/env node

/**
 * Add Sample Notifications
 * This script adds sample notifications to test the dashboard
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addSampleNotifications() {
  try {
    console.log('🚀 Adding sample notifications...');
    
    // Get the first user to add notifications for
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (userError || !users || users.length === 0) {
      console.error('❌ No users found. Please create a user first.');
      return;
    }
    
    const userId = users[0].id;
    console.log(`👤 Adding notifications for user: ${userId}`);
    
    // Get the first branch
    const { data: branches, error: branchError } = await supabase
      .from('store_locations')
      .select('id')
      .limit(1);
    
    const branchId = branches && branches.length > 0 ? branches[0].id : null;
    
    // Sample notifications
    const sampleNotifications = [
      {
        user_id: userId,
        title: 'Welcome to the System',
        message: 'Your account has been successfully set up. You can now start using all features.',
        priority: 'normal',
        type: 'system',
        category: 'general',
        status: 'unread',
        branch_id: branchId
      },
      {
        user_id: userId,
        title: 'New Device Added',
        message: 'A new device has been added to your inventory. Check the devices page for details.',
        priority: 'high',
        type: 'device',
        category: 'device',
        status: 'unread',
        branch_id: branchId
      },
      {
        user_id: userId,
        title: 'Low Stock Alert',
        message: 'Some items in your inventory are running low. Consider restocking soon.',
        priority: 'urgent',
        type: 'inventory',
        category: 'inventory',
        status: 'unread',
        branch_id: branchId
      },
      {
        user_id: userId,
        title: 'Payment Received',
        message: 'A customer payment has been processed successfully.',
        priority: 'normal',
        type: 'payment',
        category: 'payment',
        status: 'read',
        branch_id: branchId
      },
      {
        user_id: userId,
        title: 'System Maintenance',
        message: 'Scheduled maintenance will occur tonight at 2 AM. Some features may be temporarily unavailable.',
        priority: 'high',
        type: 'system',
        category: 'maintenance',
        status: 'unread',
        branch_id: branchId
      }
    ];
    
    // Insert sample notifications
    const { data, error } = await supabase
      .from('notifications')
      .insert(sampleNotifications);
    
    if (error) {
      console.error('❌ Error adding sample notifications:', error);
      throw error;
    }
    
    console.log('✅ Sample notifications added successfully!');
    console.log(`📊 Added ${sampleNotifications.length} notifications`);
    
    // Verify the notifications were added
    const { data: notifications, error: verifyError } = await supabase
      .from('notifications')
      .select('id, title, priority, status')
      .eq('user_id', userId);
    
    if (verifyError) {
      console.error('❌ Error verifying notifications:', verifyError);
    } else {
      console.log('📋 Current notifications:');
      notifications.forEach(notif => {
        console.log(`  - ${notif.title} (${notif.priority}, ${notif.status})`);
      });
    }
    
    console.log('');
    console.log('🎉 Sample notifications setup complete!');
    console.log('📱 Check your dashboard to see the notifications widget in action');
    
  } catch (error) {
    console.error('❌ Error adding sample notifications:', error);
    process.exit(1);
  }
}

// Run the script
addSampleNotifications();
