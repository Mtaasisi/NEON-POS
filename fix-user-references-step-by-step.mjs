import { Pool } from '@neondatabase/serverless';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const targetPool = new Pool({ connectionString: TARGET_DB });

async function fixUserReferences() {
  console.log('🔧 Fixing User ID References (Step by Step)\n');
  console.log('📊 Database: aws-0-eu-north-1.pooler.supabase.com\n');

  const oldUserId = 'a7c9adb7-f525-4850-bd42-79a769f12953';
  const newUserId = '94128b38-26db-4307-8f3d-0ba040c64b1b';

  const tablesToUpdate = [
    'lats_pos_general_settings',
    'lats_pos_dynamic_pricing_settings',
    'lats_pos_receipt_settings',
    'lats_pos_barcode_scanner_settings',
    'lats_pos_delivery_settings',
    'lats_pos_search_filter_settings',
    'lats_pos_user_permissions_settings',
    'lats_pos_loyalty_customer_settings',
    'lats_pos_analytics_reporting_settings',
    'user_daily_goals'
  ];

  // Step 1: Ensure user exists in auth_users with new ID
  console.log('1️⃣ Ensuring user exists in auth_users...');
  try {
    // Delete old entry if exists
    await targetPool.query('DELETE FROM auth_users WHERE id = $1 OR email = $2', [oldUserId, 'care@care.com']);
    
    // Create new entry
    await targetPool.query(`
      INSERT INTO auth_users (id, email, name, role, created_at, updated_at, is_active)
      SELECT id, email, full_name, role, created_at, updated_at, is_active
      FROM users
      WHERE id = $1
    `, [newUserId]);
    console.log(`   ✅ User created in auth_users with ID: ${newUserId}`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // Step 2: For each table, set user_id to NULL first, then update to new ID
  console.log('\n2️⃣ Updating user_id references...');
  let totalUpdated = 0;

  for (const tableName of tablesToUpdate) {
    try {
      // Check if table has user_id column
      const checkColumn = await targetPool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = $1 
          AND column_name = 'user_id'
        )
      `, [tableName]);

      if (!checkColumn.rows[0].exists) {
        continue;
      }

      // Check if user_id column is nullable
      const checkNullable = await targetPool.query(`
        SELECT is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = 'user_id'
      `, [tableName]);

      const isNullable = checkNullable.rows[0]?.is_nullable === 'YES';

      if (isNullable) {
        // Step 2a: Set to NULL temporarily
        await targetPool.query(`
          UPDATE ${tableName} 
          SET user_id = NULL 
          WHERE user_id = $1
        `, [oldUserId]);

        // Step 2b: Update to new ID
        const result = await targetPool.query(`
          UPDATE ${tableName} 
          SET user_id = $1 
          WHERE user_id IS NULL
        `, [newUserId]);

        if (result.rowCount > 0) {
          console.log(`   ✅ ${tableName}: updated ${result.rowCount} row(s)`);
          totalUpdated += result.rowCount;
        }
      } else {
        // If NOT NULL, we need to delete and let app recreate, or make it nullable first
        console.log(`   ⚠️  ${tableName}: user_id is NOT NULL, deleting old rows...`);
        const result = await targetPool.query(`
          DELETE FROM ${tableName} WHERE user_id = $1
        `, [oldUserId]);
        console.log(`   ✅ ${tableName}: deleted ${result.rowCount} row(s) (will be recreated by app)`);
      }
    } catch (error) {
      console.error(`   ❌ ${tableName}:`, error.message);
    }
  }

  // Step 3: Verify
  console.log('\n3️⃣ Verification...');
  const verify = await targetPool.query(
    'SELECT id, email, name, role FROM auth_users WHERE id = $1',
    [newUserId]
  );

  if (verify.rows.length > 0) {
    const user = verify.rows[0];
    console.log(`   ✅ User verified in auth_users: ${user.email} (${user.role})`);
  }

  await targetPool.end();
  console.log(`\n📊 Summary: Updated ${totalUpdated} row(s)`);
  console.log('✅ Done! The app will recreate any deleted settings rows on next use.');
}

fixUserReferences().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

