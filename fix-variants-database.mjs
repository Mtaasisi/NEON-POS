import { Pool } from '@neondatabase/serverless';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const targetPool = new Pool({ connectionString: TARGET_DB });

async function fixVariantsDatabase() {
  console.log('🔧 Fixing Variants Database Settings\n');
  console.log('📊 Database: aws-0-eu-north-1.pooler.supabase.com\n');

  const branchId = '24cd45b8-1ce1-486a-b055-29d169c3a8ea';

  // 1. Verify branch settings
  console.log('1️⃣ Verifying branch settings...');
  try {
    const branch = await targetPool.query(`
      SELECT 
        id, name, data_isolation_mode, 
        share_inventory, share_products, share_customers
      FROM store_locations
      WHERE id = $1
    `, [branchId]);

    if (branch.rows.length > 0) {
      const b = branch.rows[0];
      console.log(`   ✅ Branch: ${b.name}`);
      console.log(`   Isolation mode: ${b.data_isolation_mode}`);
      console.log(`   Share inventory: ${b.share_inventory}`);
      console.log(`   Share products: ${b.share_products}`);
      console.log(`   Share customers: ${b.share_customers}`);
      
      // Ensure share_inventory is true
      if (b.share_inventory !== true) {
        console.log(`   ⚠️  share_inventory is ${b.share_inventory}, updating to true...`);
        await targetPool.query(`
          UPDATE store_locations
          SET share_inventory = true, updated_at = NOW()
          WHERE id = $1
        `, [branchId]);
        console.log(`   ✅ Updated share_inventory to true`);
      }
    } else {
      console.log(`   ❌ Branch not found!`);
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 2. Verify variants are shared
  console.log('\n2️⃣ Verifying variants are shared...');
  try {
    const variants = await targetPool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_shared = true) as shared,
        COUNT(*) FILTER (WHERE branch_id IS NULL) as null_branch
      FROM lats_product_variants
    `);
    
    const v = variants.rows[0];
    console.log(`   Total variants: ${v.total}`);
    console.log(`   Shared variants: ${v.shared}`);
    console.log(`   NULL branch_id: ${v.null_branch}`);
    
    // Update any variants that aren't shared
    if (parseInt(v.shared) < parseInt(v.total)) {
      console.log(`   ⚠️  Some variants not shared, updating...`);
      const update = await targetPool.query(`
        UPDATE lats_product_variants
        SET is_shared = true
        WHERE is_shared IS NULL OR is_shared = false
      `);
      console.log(`   ✅ Updated ${update.rowCount} variants to be shared`);
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 3. Test the query that should work
  console.log('\n3️⃣ Testing variant query (hybrid mode, share_inventory=true)...');
  try {
    const accessible = await targetPool.query(`
      SELECT COUNT(*) as count
      FROM lats_product_variants
      WHERE branch_id = $1 OR is_shared = true OR branch_id IS NULL
    `, [branchId]);
    console.log(`   ✅ Accessible variants: ${accessible.rows[0].count}`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 4. Also update lats_branches to match
  console.log('\n4️⃣ Ensuring lats_branches settings match...');
  try {
    const latsBranch = await targetPool.query(`
      SELECT id, share_inventory FROM lats_branches WHERE id = $1
    `, [branchId]);

    if (latsBranch.rows.length > 0) {
      if (latsBranch.rows[0].share_inventory !== true) {
        await targetPool.query(`
          UPDATE lats_branches
          SET share_inventory = true, updated_at = NOW()
          WHERE id = $1
        `, [branchId]);
        console.log(`   ✅ Updated lats_branches.share_inventory to true`);
      } else {
        console.log(`   ✅ lats_branches.share_inventory already true`);
      }
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  await targetPool.end();
  console.log('\n✅ Database settings verified and fixed!');
  console.log('💡 Variants should now be visible in the application.');
}

fixVariantsDatabase().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

