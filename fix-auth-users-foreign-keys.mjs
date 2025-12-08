import { Pool } from '@neondatabase/serverless';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const targetPool = new Pool({ connectionString: TARGET_DB });

async function checkAuthUsersTable() {
  try {
    const result = await targetPool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'auth_users'
      ORDER BY ordinal_position
    `);
    return result.rows;
  } catch (error) {
    return [];
  }
}

async function checkUsersInAuthUsers(userId) {
  try {
    const result = await targetPool.query(
      'SELECT id, email FROM auth_users WHERE id = $1',
      [userId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    return null;
  }
}

async function getUserFromUsers(userId) {
  try {
    const result = await targetPool.query(
      'SELECT id, email, full_name, role FROM users WHERE id = $1',
      [userId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    return null;
  }
}

async function createAuthUser(user) {
  try {
    // Check if auth_users table exists and has the right structure
    const columns = await checkAuthUsersTable();
    if (columns.length === 0) {
      console.log('   ⚠️  auth_users table does not exist');
      return false;
    }

    // Insert user into auth_users
    const insertQuery = `
      INSERT INTO auth_users (id, email, name, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        updated_at = NOW()
      RETURNING id, email
    `;

    const result = await targetPool.query(insertQuery, [
      user.id,
      user.email,
      user.full_name || user.name || 'Admin User',
      user.role || 'admin'
    ]);

    console.log(`   ✅ Created/updated auth_users entry: ${result.rows[0].email}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error creating auth_users entry:`, error.message);
    return false;
  }
}

async function fixForeignKeys() {
  console.log('🔧 Fixing Foreign Key References\n');
  console.log('📊 Database: aws-0-eu-north-1.pooler.supabase.com\n');

  const userId = '94128b38-26db-4307-8f3d-0ba040c64b1b';

  // 1. Check auth_users table structure
  console.log('1️⃣ Checking auth_users table...');
  const authColumns = await checkAuthUsersTable();
  if (authColumns.length > 0) {
    console.log(`   ✅ auth_users table exists with ${authColumns.length} columns`);
    console.log(`   Columns: ${authColumns.map(c => c.column_name).join(', ')}`);
  } else {
    console.log('   ❌ auth_users table does not exist');
    await targetPool.end();
    return;
  }

  // 2. Check if user exists in auth_users
  console.log('\n2️⃣ Checking if user exists in auth_users...');
  let authUser = await checkUsersInAuthUsers(userId);
  if (authUser) {
    console.log(`   ✅ User exists in auth_users: ${authUser.email}`);
  } else {
    console.log(`   ❌ User does not exist in auth_users`);
    
    // 3. Get user from users table
    console.log('\n3️⃣ Getting user from users table...');
    const user = await getUserFromUsers(userId);
    if (user) {
      console.log(`   ✅ Found user in users table: ${user.email}`);
      
      // 4. Create user in auth_users
      console.log('\n4️⃣ Creating user in auth_users...');
      await createAuthUser(user);
    } else {
      console.log(`   ❌ User not found in users table either!`);
    }
  }

  await targetPool.end();
  console.log('\n✅ Done!');
}

fixForeignKeys().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

