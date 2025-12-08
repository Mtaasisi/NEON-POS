import { Pool } from '@neondatabase/serverless';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const targetPool = new Pool({ connectionString: TARGET_DB });

async function updateUserReferences() {
  console.log('🔧 Updating All User ID References\n');
  console.log('📊 Database: aws-0-eu-north-1.pooler.supabase.com\n');

  const oldUserId = 'a7c9adb7-f525-4850-bd42-79a769f12953';
  const newUserId = '94128b38-26db-4307-8f3d-0ba040c64b1b';

  // Tables that reference auth_users.id via user_id
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

  console.log(`🔄 Updating user_id from ${oldUserId} to ${newUserId}...\n`);

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
        console.log(`   ⏭️  ${tableName}: no user_id column, skipping`);
        continue;
      }

      // Update user_id references
      const result = await targetPool.query(`
        UPDATE ${tableName} 
        SET user_id = $1 
        WHERE user_id = $2
      `, [newUserId, oldUserId]);

      if (result.rowCount > 0) {
        console.log(`   ✅ ${tableName}: updated ${result.rowCount} row(s)`);
        totalUpdated += result.rowCount;
      } else {
        console.log(`   ℹ️  ${tableName}: no rows to update`);
      }
    } catch (error) {
      console.error(`   ❌ ${tableName}:`, error.message);
    }
  }

  // Now update auth_users table
  console.log('\n🔄 Updating auth_users table...');
  try {
    // First delete the old entry if it exists
    await targetPool.query('DELETE FROM auth_users WHERE id = $1', [oldUserId]);
    console.log(`   ✅ Deleted old auth_users entry`);

    // Create new entry with correct ID
    await targetPool.query(`
      INSERT INTO auth_users (id, email, name, role, created_at, updated_at, is_active)
      SELECT id, email, full_name, role, created_at, updated_at, is_active
      FROM users
      WHERE id = $1
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        updated_at = NOW()
    `, [newUserId]);
    console.log(`   ✅ Created/updated auth_users entry with correct ID`);
  } catch (error) {
    console.error(`   ❌ Error updating auth_users:`, error.message);
  }

  // Verify
  console.log('\n✅ Verification...');
  const verify = await targetPool.query(
    'SELECT id, email, name, role FROM auth_users WHERE id = $1',
    [newUserId]
  );

  if (verify.rows.length > 0) {
    const user = verify.rows[0];
    console.log(`   ✅ User verified in auth_users: ${user.email} (${user.role})`);
  }

  await targetPool.end();
  console.log(`\n📊 Summary: Updated ${totalUpdated} row(s) across ${tablesToUpdate.length} tables`);
  console.log('✅ Done!');
}

updateUserReferences().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

