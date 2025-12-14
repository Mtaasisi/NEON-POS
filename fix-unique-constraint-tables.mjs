import { Pool } from '@neondatabase/serverless';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const targetPool = new Pool({ connectionString: TARGET_DB });

async function fixUniqueConstraintTables() {
  console.log('🔧 Fixing Tables with Unique Constraints\n');
  console.log('📊 Database: aws-0-eu-north-1.pooler.supabase.com\n');

  const oldUserId = 'a7c9adb7-f525-4850-bd42-79a769f12953';
  const newUserId = '94128b38-26db-4307-8f3d-0ba040c64b1b';

  // Tables with unique constraints on user_id
  const tablesToFix = [
    'lats_pos_dynamic_pricing_settings',
    'lats_pos_receipt_settings',
    'lats_pos_user_permissions_settings',
    'lats_pos_loyalty_customer_settings'
  ];

  for (const tableName of tablesToFix) {
    try {
      console.log(`📋 Fixing ${tableName}...`);
      
      // Check if old user_id exists
      const checkOld = await targetPool.query(
        `SELECT COUNT(*) as count FROM ${tableName} WHERE user_id = $1`,
        [oldUserId]
      );
      const oldCount = parseInt(checkOld.rows[0].count);

      // Check if new user_id exists
      const checkNew = await targetPool.query(
        `SELECT COUNT(*) as count FROM ${tableName} WHERE user_id = $1`,
        [newUserId]
      );
      const newCount = parseInt(checkNew.rows[0].count);

      if (oldCount > 0) {
        if (newCount > 0) {
          // Both exist - delete old one
          console.log(`   ⚠️  Both old and new entries exist, deleting old...`);
          await targetPool.query(
            `DELETE FROM ${tableName} WHERE user_id = $1`,
            [oldUserId]
          );
          console.log(`   ✅ Deleted old entry`);
        } else {
          // Only old exists - update it
          console.log(`   🔄 Updating old entry to new user_id...`);
          await targetPool.query(
            `UPDATE ${tableName} SET user_id = $1 WHERE user_id = $2`,
            [newUserId, oldUserId]
          );
          console.log(`   ✅ Updated to new user_id`);
        }
      } else {
        console.log(`   ℹ️  No old entries to fix`);
      }
    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
    }
  }

  await targetPool.end();
  console.log('\n✅ Done!');
}

fixUniqueConstraintTables().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

