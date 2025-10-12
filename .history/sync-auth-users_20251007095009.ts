#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();
const sql = neon(process.env.VITE_DATABASE_URL!);

async function syncAuthUsers() {
  console.log('🔄 Syncing users to auth_users table...\n');
  
  try {
    // Copy all users from users table to auth_users table
    const result = await sql`
      INSERT INTO auth_users (id, email, username, name, role, is_active, created_at, updated_at)
      SELECT id, email, email, full_name, role, is_active, created_at, updated_at
      FROM users
      ON CONFLICT (id) DO UPDATE 
      SET email = EXCLUDED.email,
          username = EXCLUDED.username,
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
      RETURNING *
    `;
    
    console.log(`✅ Synced ${result.length} users to auth_users table\n`);
    
    result.forEach((user: any) => {
      const roleEmoji = user.role === 'admin' ? '👑' : 
                        user.role === 'manager' ? '📊' : 
                        user.role === 'technician' ? '🔧' : '💬';
      console.log(`   ${roleEmoji} ${user.name} (${user.email})`);
      console.log(`      Role: ${user.role} | ID: ${user.id}`);
    });
    
    console.log('\n✅ Sync complete! Admin user should now work correctly.\n');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

syncAuthUsers().catch(console.error);

