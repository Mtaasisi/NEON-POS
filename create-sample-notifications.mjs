#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

console.log('🔔 Creating Sample Notifications');
console.log('='.repeat(50));

async function createSampleNotifications() {
  try {
    // Get all users
    const users = await sql`SELECT id, email, role FROM users`;
    
    if (users.length === 0) {
      console.log('❌ No users found!');
      return;
    }
    
    console.log(`\n📝 Found ${users.length} users. Creating notifications...`);
    
    const notifications = [];
    
    // Create notifications for each user
    for (const user of users) {
      console.log(`\n👤 Creating notifications for ${user.email}...`);
      
      // 1. Welcome notification
      const welcome = await sql`
        INSERT INTO notifications (
          user_id, title, message, type, category, 
          priority, status, icon, color, created_at
        ) VALUES (
          ${user.id},
          'Welcome to the System! 👋',
          'Your notification system is now working correctly. You can receive real-time updates here.',
          'system_alert',
          'system',
          'normal',
          'unread',
          '🎉',
          'bg-gradient-to-r from-blue-500 to-indigo-500',
          NOW()
        )
        RETURNING id, title
      `;
      console.log(`   ✅ ${welcome[0].title}`);
      
      // 2. Device notification (if admin or customer-care)
      if (user.role === 'admin' || user.role === 'customer-care') {
        const device = await sql`
          INSERT INTO notifications (
            user_id, title, message, type, category, 
            priority, status, icon, color, action_url, created_at
          ) VALUES (
            ${user.id},
            'Device Repair Ready 📱',
            'iPhone 13 Pro repair has been completed and is ready for pickup.',
            'repair_complete',
            'device',
            'high',
            'unread',
            '✅',
            'bg-gradient-to-r from-green-500 to-emerald-500',
            '/devices',
            NOW() - INTERVAL '2 hours'
          )
          RETURNING id, title
        `;
        console.log(`   ✅ ${device[0].title}`);
        
        // 3. New customer notification
        const customer = await sql`
          INSERT INTO notifications (
            user_id, title, message, type, category, 
            priority, status, icon, color, action_url, created_at
          ) VALUES (
            ${user.id},
            'New Customer Registered 👥',
            'John Doe has registered as a new customer.',
            'new_customer',
            'customer',
            'normal',
            'unread',
            '👤',
            'bg-gradient-to-r from-purple-500 to-pink-500',
            '/customers',
            NOW() - INTERVAL '1 hour'
          )
          RETURNING id, title
        `;
        console.log(`   ✅ ${customer[0].title}`);
      }
      
      // 4. Inventory notification (if admin)
      if (user.role === 'admin') {
        const inventory = await sql`
          INSERT INTO notifications (
            user_id, title, message, type, category, 
            priority, status, icon, color, action_url, created_at
          ) VALUES (
            ${user.id},
            'Low Stock Alert ⚠️',
            'Screen Protector stock is running low. Only 5 units remaining.',
            'inventory_low',
            'inventory',
            'urgent',
            'unread',
            '📦',
            'bg-gradient-to-r from-red-500 to-orange-500',
            '/lats/unified-inventory',
            NOW() - INTERVAL '30 minutes'
          )
          RETURNING id, title
        `;
        console.log(`   ✅ ${inventory[0].title}`);
        
        // 5. Payment received notification
        const payment = await sql`
          INSERT INTO notifications (
            user_id, title, message, type, category, 
            priority, status, icon, color, action_url, created_at
          ) VALUES (
            ${user.id},
            'Payment Received 💰',
            'Payment of $150 received from customer Jane Smith.',
            'payment_received',
            'payment',
            'normal',
            'read',
            '💵',
            'bg-gradient-to-r from-emerald-500 to-teal-500',
            '/payments',
            NOW() - INTERVAL '3 hours'
          )
          RETURNING id, title
        `;
        console.log(`   ✅ ${payment[0].title}`);
      }
      
      // 6. System backup (read notification - for history)
      const backup = await sql`
        INSERT INTO notifications (
          user_id, title, message, type, category, 
          priority, status, icon, color, created_at, read_at
        ) VALUES (
          ${user.id},
          'Backup Complete ✓',
          'Daily backup completed successfully at 3:00 AM.',
          'backup_complete',
          'backup',
          'low',
          'read',
          '💾',
          'bg-gradient-to-r from-gray-500 to-slate-500',
          NOW() - INTERVAL '5 hours',
          NOW() - INTERVAL '4 hours'
        )
        RETURNING id, title
      `;
      console.log(`   ✅ ${backup[0].title}`);
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    const totalCount = await sql`SELECT COUNT(*) as count FROM notifications`;
    const unreadCount = await sql`SELECT COUNT(*) as count FROM notifications WHERE status = 'unread'`;
    
    console.log('📊 SUMMARY:');
    console.log(`   - Total notifications: ${totalCount[0].count}`);
    console.log(`   - Unread notifications: ${unreadCount[0].count}`);
    console.log(`   - Read notifications: ${totalCount[0].count - unreadCount[0].count}`);
    
    console.log('\n✅ Sample notifications created successfully!');
    console.log('\n🚀 Next Steps:');
    console.log('   1. Refresh your browser (Cmd+Shift+R)');
    console.log('   2. Look at the notification bell icon 🔔');
    console.log('   3. You should see a red badge with the unread count!');
    console.log('   4. Click the bell to see your notifications\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

createSampleNotifications().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

