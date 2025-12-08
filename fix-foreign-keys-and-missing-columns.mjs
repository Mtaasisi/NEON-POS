import { Pool } from '@neondatabase/serverless';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const targetPool = new Pool({ connectionString: TARGET_DB });

async function checkUserExists(userId) {
  try {
    const result = await targetPool.query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [userId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error checking user:', error.message);
    return null;
  }
}

async function columnExists(tableName, columnName) {
  try {
    const result = await targetPool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1 
        AND column_name = $2
      )
    `, [tableName, columnName]);
    return result.rows[0].exists;
  } catch (error) {
    return false;
  }
}

async function addColumnIfMissing(tableName, columnName, columnDef) {
  const exists = await columnExists(tableName, columnName);
  if (exists) {
    console.log(`   ✅ ${tableName}.${columnName} already exists`);
    return false;
  }
  
  try {
    await targetPool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
    console.log(`   ✅ Added ${tableName}.${columnName}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error adding ${tableName}.${columnName}:`, error.message);
    return false;
  }
}

async function checkForeignKeyConstraint(tableName, columnName) {
  try {
    const result = await targetPool.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = $1
        AND kcu.column_name = $2
    `, [tableName, columnName]);
    return result.rows;
  } catch (error) {
    return [];
  }
}

async function fixIssues() {
  console.log('🔧 Fixing Foreign Key Issues and Missing Columns\n');
  console.log('📊 Database: aws-0-eu-north-1.pooler.supabase.com\n');

  // 1. Check if the admin user exists
  const userId = '94128b38-26db-4307-8f3d-0ba040c64b1b';
  console.log('1️⃣ Checking admin user...');
  const user = await checkUserExists(userId);
  if (user) {
    console.log(`   ✅ User exists: ${user.email} (${user.role})`);
  } else {
    console.log(`   ❌ User ${userId} does not exist!`);
    console.log('   💡 This is the issue - the user needs to exist for foreign keys to work.');
  }

  // 2. Check foreign key constraints for user_id columns
  console.log('\n2️⃣ Checking foreign key constraints...');
  const tablesWithUserId = [
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

  for (const tableName of tablesWithUserId) {
    const constraints = await checkForeignKeyConstraint(tableName, 'user_id');
    if (constraints.length > 0) {
      const constraint = constraints[0];
      console.log(`   📋 ${tableName}.user_id → ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
    }
  }

  // 3. Add missing is_shared column to customers table
  console.log('\n3️⃣ Adding missing columns...');
  await addColumnIfMissing('customers', 'is_shared', 'BOOLEAN DEFAULT false');
  await addColumnIfMissing('customers', 'created_by_branch_name', 'TEXT');

  // 4. Check if we need to make foreign keys nullable or fix them
  console.log('\n4️⃣ Checking if foreign keys need adjustment...');
  
  // For now, let's verify the user exists and suggest making user_id nullable if needed
  if (!user) {
    console.log('\n⚠️  WARNING: The admin user does not exist!');
    console.log('   This will cause foreign key violations.');
    console.log('   Solution: Either create the user or make user_id columns nullable.');
  }

  await targetPool.end();
  console.log('\n✅ Done!');
}

fixIssues().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

