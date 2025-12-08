import { Pool } from '@neondatabase/serverless';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const targetPool = new Pool({ connectionString: TARGET_DB });

async function fixBranchSettings() {
  console.log('🔧 Fixing Branch Isolation Settings\n');
  console.log('📊 Database: aws-0-eu-north-1.pooler.supabase.com\n');

  const branchId = '24cd45b8-1ce1-486a-b055-29d169c3a8ea';

  // 1. Check existing branches
  console.log('1️⃣ Checking existing branches...');
  try {
    const branches = await targetPool.query(`
      SELECT id, name, code, is_active
      FROM lats_branches
      ORDER BY created_at
      LIMIT 10
    `);
    console.log(`   Found ${branches.rows.length} branches:`);
    branches.rows.forEach(b => {
      console.log(`   - ${b.name || 'Unknown'} (${b.code || 'no code'}): ${b.id}`);
    });
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 2. Add missing isolation mode columns
  console.log('\n2️⃣ Adding missing isolation mode columns...');
  
  const columnsToAdd = [
    { name: 'data_isolation_mode', type: 'TEXT DEFAULT \'hybrid\'' },
    { name: 'share_suppliers', type: 'BOOLEAN DEFAULT true' },
    { name: 'share_products', type: 'BOOLEAN DEFAULT true' },
    { name: 'share_customers', type: 'BOOLEAN DEFAULT true' },
    { name: 'share_inventory', type: 'BOOLEAN DEFAULT true' },
    { name: 'share_categories', type: 'BOOLEAN DEFAULT true' },
    { name: 'share_employees', type: 'BOOLEAN DEFAULT true' }
  ];

  for (const col of columnsToAdd) {
    try {
      const exists = await targetPool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'lats_branches' 
          AND column_name = $1
        )
      `, [col.name]);

      if (!exists.rows[0].exists) {
        await targetPool.query(`ALTER TABLE lats_branches ADD COLUMN ${col.name} ${col.type}`);
        console.log(`   ✅ Added: ${col.name}`);
      } else {
        console.log(`   ⏭️  Already exists: ${col.name}`);
      }
    } catch (error) {
      console.error(`   ❌ Error adding ${col.name}:`, error.message);
    }
  }

  // 3. Check if branch exists, if not create it
  console.log('\n3️⃣ Checking/creating branch...');
  try {
    const branchCheck = await targetPool.query(`
      SELECT id, name FROM lats_branches WHERE id = $1
    `, [branchId]);

    if (branchCheck.rows.length === 0) {
      console.log(`   Branch doesn't exist, creating...`);
      await targetPool.query(`
        INSERT INTO lats_branches (
          id, name, code, is_active, 
          data_isolation_mode, share_suppliers, share_products, 
          share_customers, share_inventory, share_categories, share_employees,
          created_at, updated_at
        )
        VALUES (
          $1, 'Main Branch', 'MAIN', true,
          'hybrid', true, true, true, true, true, true,
          NOW(), NOW()
        )
      `, [branchId]);
      console.log(`   ✅ Created branch: Main Branch`);
    } else {
      console.log(`   ✅ Branch exists: ${branchCheck.rows[0].name}`);
      
      // Update branch with isolation settings
      await targetPool.query(`
        UPDATE lats_branches
        SET 
          data_isolation_mode = COALESCE(data_isolation_mode, 'hybrid'),
          share_suppliers = COALESCE(share_suppliers, true),
          share_products = COALESCE(share_products, true),
          share_customers = COALESCE(share_customers, true),
          share_inventory = COALESCE(share_inventory, true),
          share_categories = COALESCE(share_categories, true),
          share_employees = COALESCE(share_employees, true),
          updated_at = NOW()
        WHERE id = $1
      `, [branchId]);
      console.log(`   ✅ Updated branch isolation settings`);
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 4. Verify branch settings
  console.log('\n4️⃣ Verifying branch settings...');
  try {
    const branch = await targetPool.query(`
      SELECT 
        id, name, code, is_active,
        data_isolation_mode, share_suppliers, share_products,
        share_customers, share_inventory, share_categories, share_employees
      FROM lats_branches
      WHERE id = $1
    `, [branchId]);

    if (branch.rows.length > 0) {
      const b = branch.rows[0];
      console.log(`   ✅ Branch: ${b.name} (${b.code})`);
      console.log(`   Active: ${b.is_active}`);
      console.log(`   Isolation mode: ${b.data_isolation_mode || 'not set'}`);
      console.log(`   Share suppliers: ${b.share_suppliers}`);
      console.log(`   Share products: ${b.share_products}`);
      console.log(`   Share customers: ${b.share_customers}`);
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  await targetPool.end();
  console.log('\n✅ Done!');
}

fixBranchSettings().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

