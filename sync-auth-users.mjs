import { Pool } from '@neondatabase/serverless';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const targetPool = new Pool({ connectionString: TARGET_DB });

async function syncAuthUser() {
  console.log('🔧 Syncing User to auth_users Table\n');
  console.log('📊 Database: aws-0-eu-north-1.pooler.supabase.com\n');

  const userId = '94128b38-26db-4307-8f3d-0ba040c64b1b';
  const userEmail = 'care@care.com';

  // 1. Check existing auth_users entries
  console.log('1️⃣ Checking existing auth_users entries...');
  const existing = await targetPool.query(
    'SELECT id, email FROM auth_users WHERE email = $1',
    [userEmail]
  );

  if (existing.rows.length > 0) {
    const existingUser = existing.rows[0];
    console.log(`   Found existing entry: ID=${existingUser.id}, Email=${existingUser.email}`);
    
    if (existingUser.id !== userId) {
      console.log(`   ⚠️  ID mismatch! Updating to match users table...`);
      
      // Update the ID to match
      try {
        await targetPool.query(`
          UPDATE auth_users 
          SET id = $1, updated_at = NOW()
          WHERE email = $2
        `, [userId, userEmail]);
        console.log(`   ✅ Updated auth_users ID to match users table`);
      } catch (error) {
        console.error(`   ❌ Error updating ID:`, error.message);
        // If update fails due to constraint, try deleting and recreating
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          console.log(`   🔄 Trying to delete and recreate...`);
          await targetPool.query('DELETE FROM auth_users WHERE email = $1', [userEmail]);
          await targetPool.query(`
            INSERT INTO auth_users (id, email, name, role, created_at, updated_at, is_active)
            SELECT id, email, full_name, role, created_at, updated_at, is_active
            FROM users
            WHERE id = $1
          `, [userId]);
          console.log(`   ✅ Recreated auth_users entry with correct ID`);
        }
      }
    } else {
      console.log(`   ✅ ID already matches!`);
    }
  } else {
    // Create new entry
    console.log('2️⃣ Creating new auth_users entry...');
    try {
      await targetPool.query(`
        INSERT INTO auth_users (id, email, name, role, created_at, updated_at, is_active)
        SELECT id, email, full_name, role, created_at, updated_at, is_active
        FROM users
        WHERE id = $1
      `, [userId]);
      console.log(`   ✅ Created auth_users entry`);
    } catch (error) {
      console.error(`   ❌ Error creating entry:`, error.message);
    }
  }

  // 2. Verify the user exists in auth_users with correct ID
  console.log('\n3️⃣ Verifying user in auth_users...');
  const verify = await targetPool.query(
    'SELECT id, email, name, role FROM auth_users WHERE id = $1',
    [userId]
  );

  if (verify.rows.length > 0) {
    const user = verify.rows[0];
    console.log(`   ✅ User verified: ${user.email} (${user.role})`);
    console.log(`   ✅ ID matches: ${user.id}`);
  } else {
    console.log(`   ❌ User still not found in auth_users!`);
  }

  await targetPool.end();
  console.log('\n✅ Done!');
}

syncAuthUser().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

