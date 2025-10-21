#!/usr/bin/env node

/**
 * Add Diverse Notifications
 * This script adds various types of notifications for better dashboard testing
 */

import { Client } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addDiverseNotifications() {
  try {
    await client.connect();
    console.log('🚀 Adding diverse notifications...');
    
    // Get the first user
    const userResult = await client.query(`
      SELECT id FROM auth_users LIMIT 1
    `);
    
    if (!userResult.rows || userResult.rows.length === 0) {
      console.error('❌ No users found. Please create a user first.');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log(`👤 Adding notifications for user: ${userId}`);
    
    // Get the first branch
    const branchResult = await client.query(`
      SELECT id FROM store_locations LIMIT 1
    `);
    
    const branchId = branchResult.rows && branchResult.rows.length > 0 ? branchResult.rows[0].id : null;
    
    // Diverse notification types
    const diverseNotifications = [
      {
        user_id: userId,
        title: 'New Customer Registration',
        message: 'John Doe has registered as a new customer. Welcome them to the system!',
        priority: 'normal',
        type: 'customer',
        category: 'customer',
        status: 'unread',
        branch_id: branchId,
        icon: '👤',
        color: '#10B981'
      },
      {
        user_id: userId,
        title: 'Payment Received',
        message: 'Payment of TZS 25,000 received from customer #12345 via M-Pesa.',
        priority: 'high',
        type: 'payment',
        category: 'payment',
        status: 'unread',
        branch_id: branchId,
        icon: '💰',
        color: '#059669'
      },
      {
        user_id: userId,
        title: 'Device Repair Complete',
        message: 'iPhone 12 Pro repair has been completed and is ready for pickup.',
        priority: 'normal',
        type: 'device',
        category: 'device',
        status: 'unread',
        branch_id: branchId,
        icon: '📱',
        color: '#3B82F6'
      },
      {
        user_id: userId,
        title: 'Low Stock Alert',
        message: 'Screen Protector (Clear) is running low. Only 3 units remaining.',
        priority: 'urgent',
        type: 'inventory',
        category: 'inventory',
        status: 'unread',
        branch_id: branchId,
        icon: '⚠️',
        color: '#EF4444'
      },
      {
        user_id: userId,
        title: 'System Backup Complete',
        message: 'Daily system backup completed successfully. All data is secure.',
        priority: 'normal',
        type: 'system',
        category: 'backup',
        status: 'read',
        branch_id: branchId,
        icon: '💾',
        color: '#6B7280'
      },
      {
        user_id: userId,
        title: 'Employee Check-in',
        message: 'Sarah Johnson has checked in for her shift at 9:00 AM.',
        priority: 'normal',
        type: 'employee',
        category: 'employee',
        status: 'unread',
        branch_id: branchId,
        icon: '👷',
        color: '#8B5CF6'
      },
      {
        user_id: userId,
        title: 'Appointment Reminder',
        message: 'Customer appointment with Mike Wilson scheduled for 2:00 PM today.',
        priority: 'high',
        type: 'appointment',
        category: 'appointment',
        status: 'unread',
        branch_id: branchId,
        icon: '📅',
        color: '#F59E0B'
      },
      {
        user_id: userId,
        title: 'Security Alert',
        message: 'Multiple failed login attempts detected. Please review security settings.',
        priority: 'urgent',
        type: 'security',
        category: 'security',
        status: 'unread',
        branch_id: branchId,
        icon: '🔒',
        color: '#DC2626'
      }
    ];
    
    // Insert diverse notifications
    const { data, error } = await client.query(`
      INSERT INTO notifications (
        user_id, title, message, priority, type, category, status, 
        branch_id, icon, color, created_at
      ) VALUES ${diverseNotifications.map((_, index) => 
        `($${index * 10 + 1}, $${index * 10 + 2}, $${index * 10 + 3}, $${index * 10 + 4}, $${index * 10 + 5}, $${index * 10 + 6}, $${index * 10 + 7}, $${index * 10 + 8}, $${index * 10 + 9}, $${index * 10 + 10}, NOW())`
      ).join(', ')}
    `, diverseNotifications.flatMap(notif => [
      notif.user_id, notif.title, notif.message, notif.priority, notif.type,
      notif.category, notif.status, notif.branch_id, notif.icon, notif.color
    ]));
    
    if (error) {
      console.error('❌ Error adding diverse notifications:', error);
      throw error;
    }
    
    console.log('✅ Diverse notifications added successfully!');
    console.log(`📊 Added ${diverseNotifications.length} diverse notifications`);
    
    // Verify the notifications were added
    const verifyResult = await client.query(`
      SELECT id, title, priority, status, type, icon
      FROM notifications 
      WHERE user_id = $1
      ORDER BY created_at DESC 
      LIMIT 10
    `, [userId]);
    
    if (verifyResult.rows) {
      console.log('📋 Recent notifications:');
      verifyResult.rows.forEach((notif, index) => {
        console.log(`  ${index + 1}. ${notif.icon} ${notif.title} (${notif.priority}, ${notif.status})`);
      });
    }
    
    console.log('');
    console.log('🎉 Diverse notifications setup complete!');
    console.log('📱 Your dashboard notifications widget now has rich, diverse data');
    
  } catch (error) {
    console.error('❌ Error adding diverse notifications:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the script
addDiverseNotifications();
