#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

console.log('🔍 Diagnosing Notification System');
console.log('='.repeat(50));

const sql = neon(DATABASE_URL);

async function diagnose() {
  try {
    // 1. Check if notifications table exists and has correct structure
    console.log('\n1️⃣ Checking notifications table structure...');
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'notifications' 
      ORDER BY ordinal_position
    `;
    
    if (columns.length === 0) {
      console.log('❌ Notifications table does not exist!');
      return;
    }
    
    console.log(`✅ Table exists with ${columns.length} columns`);
    
    // Check for snake_case vs camelCase issue
    const hasSnakeCase = columns.some(c => c.column_name.includes('_'));
    const hasCamelCase = columns.some(c => /[a-z][A-Z]/.test(c.column_name));
    console.log(`   - Using snake_case: ${hasSnakeCase ? '✅' : '❌'}`);
    console.log(`   - Using camelCase: ${hasCamelCase ? '⚠️  (should be snake_case)' : '✅'}`);
    
    // 2. Check if there are any notifications
    console.log('\n2️⃣ Checking existing notifications...');
    const notificationCount = await sql`SELECT COUNT(*) as count FROM notifications`;
    console.log(`   - Total notifications: ${notificationCount[0].count}`);
    
    if (notificationCount[0].count > 0) {
      const sampleNotif = await sql`SELECT * FROM notifications LIMIT 1`;
      console.log('   - Sample notification:');
      console.log('     ', JSON.stringify(sampleNotif[0], null, 2).substring(0, 200) + '...');
    }
    
    // 3. Check if there are any users
    console.log('\n3️⃣ Checking users...');
    const userCount = await sql`SELECT COUNT(*) as count FROM users`;
    console.log(`   - Total users: ${userCount[0].count}`);
    
    if (userCount[0].count > 0) {
      const users = await sql`SELECT id, email, role FROM users LIMIT 5`;
      console.log('   - Sample users:');
      users.forEach(u => {
        console.log(`     - ${u.email} (${u.role})`);
      });
    }
    
    // 4. Check indexes
    console.log('\n4️⃣ Checking indexes...');
    const indexes = await sql`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'notifications'
    `;
    console.log(`   - Total indexes: ${indexes.length}`);
    if (indexes.length > 0) {
      indexes.forEach(idx => {
        console.log(`     ✅ ${idx.indexname}`);
      });
    }
    
    // 5. Check for notifications by user
    if (userCount[0].count > 0 && notificationCount[0].count > 0) {
      console.log('\n5️⃣ Checking notifications per user...');
      const notifByUser = await sql`
        SELECT u.email, u.role, COUNT(n.id) as notification_count, 
               COUNT(CASE WHEN n.status = 'unread' THEN 1 END) as unread_count
        FROM users u
        LEFT JOIN notifications n ON n.user_id = u.id
        GROUP BY u.id, u.email, u.role
        HAVING COUNT(n.id) > 0
        LIMIT 5
      `;
      
      notifByUser.forEach(row => {
        console.log(`   - ${row.email}: ${row.notification_count} total, ${row.unread_count} unread`);
      });
    }
    
    // 6. Test creating a notification
    console.log('\n6️⃣ Testing notification creation...');
    try {
      const testUser = await sql`SELECT id FROM users LIMIT 1`;
      if (testUser.length > 0) {
        const result = await sql`
          INSERT INTO notifications (
            user_id, title, message, type, category, 
            priority, status, icon, color, created_at
          ) VALUES (
            ${testUser[0].id},
            'Test Notification',
            'This is an automatic test notification',
            'system_alert',
            'system',
            'normal',
            'unread',
            '🔔',
            'bg-blue-500',
            NOW()
          )
          RETURNING id, title, created_at
        `;
        
        console.log('   ✅ Successfully created test notification');
        console.log('   - ID:', result[0].id);
        console.log('   - Title:', result[0].title);
        
        // Clean up test notification
        await sql`DELETE FROM notifications WHERE id = ${result[0].id}`;
        console.log('   🧹 Test notification cleaned up');
      } else {
        console.log('   ⚠️  No users found, cannot test notification creation');
      }
    } catch (error) {
      console.log('   ❌ Failed to create test notification:', error.message);
    }
    
    // 7. Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 DIAGNOSIS SUMMARY:');
    console.log('='.repeat(50));
    
    const issues = [];
    
    if (!hasSnakeCase) {
      issues.push('⚠️  Table uses camelCase instead of snake_case');
    }
    
    if (notificationCount[0].count === 0) {
      issues.push('ℹ️  No notifications in database (this is normal if fresh install)');
    }
    
    if (userCount[0].count === 0) {
      issues.push('❌ No users in database');
    }
    
    if (indexes.length === 0) {
      issues.push('⚠️  No indexes on notifications table (may affect performance)');
    }
    
    if (issues.length === 0) {
      console.log('\n✅ No issues found! Notification system looks good.');
      console.log('\n💡 If notifications still not showing:');
      console.log('   1. Check browser console for errors (F12)');
      console.log('   2. Verify user is logged in');
      console.log('   3. Hard refresh browser (Cmd+Shift+R)');
      console.log('   4. Check that useNotifications hook is being called');
    } else {
      console.log('\n⚠️  Found potential issues:');
      issues.forEach(issue => console.log(`   ${issue}`));
    }
    
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ Diagnosis failed:', error.message);
    console.error(error);
  }
}

diagnose().then(() => {
  console.log('✅ Diagnosis complete!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

