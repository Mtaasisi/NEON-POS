import { Pool } from '@neondatabase/serverless';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const targetPool = new Pool({ connectionString: TARGET_DB });

async function fixCustomersVisibility() {
  console.log('🔧 Fixing Customers Visibility\n');
  console.log('📊 Database: aws-0-eu-north-1.pooler.supabase.com\n');

  const branchId = '24cd45b8-1ce1-486a-b055-29d169c3a8ea';

  // 1. Check store_locations table structure
  console.log('1️⃣ Checking store_locations table structure...');
  try {
    const columns = await targetPool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'store_locations'
      ORDER BY column_name
    `);
    console.log(`   Columns: ${columns.rows.map(c => c.column_name).join(', ')}`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 2. Create/update branch in store_locations
  console.log('\n2️⃣ Creating/updating branch in store_locations...');
  try {
    const exists = await targetPool.query(`
      SELECT id FROM store_locations WHERE id = $1
    `, [branchId]);

    if (exists.rows.length === 0) {
      // Get branch data from lats_branches
      const branchData = await targetPool.query(`
        SELECT name, data_isolation_mode, share_customers, share_suppliers, 
               share_products, share_inventory, share_categories, share_employees
        FROM lats_branches
        WHERE id = $1
      `, [branchId]);

      if (branchData.rows.length > 0) {
        const b = branchData.rows[0];
        
        // Create in store_locations
        await targetPool.query(`
          INSERT INTO store_locations (
            id, name, data_isolation_mode, share_customers,
            share_suppliers, share_products, share_inventory,
            share_categories, share_employees, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        `, [
          branchId,
          b.name,
          b.data_isolation_mode || 'hybrid',
          b.share_customers !== undefined ? b.share_customers : true,
          b.share_suppliers !== undefined ? b.share_suppliers : true,
          b.share_products !== undefined ? b.share_products : true,
          b.share_inventory !== undefined ? b.share_inventory : true,
          b.share_categories !== undefined ? b.share_categories : true,
          b.share_employees !== undefined ? b.share_employees : true
        ]);
        console.log(`   ✅ Created branch in store_locations`);
      }
    } else {
      console.log(`   ✅ Branch already exists in store_locations`);
      
      // Update with latest settings from lats_branches
      const branchData = await targetPool.query(`
        SELECT data_isolation_mode, share_customers, share_suppliers, 
               share_products, share_inventory, share_categories, share_employees
        FROM lats_branches
        WHERE id = $1
      `, [branchId]);

      if (branchData.rows.length > 0) {
        const b = branchData.rows[0];
        await targetPool.query(`
          UPDATE store_locations
          SET 
            data_isolation_mode = $1,
            share_customers = $2,
            share_suppliers = $3,
            share_products = $4,
            share_inventory = $5,
            share_categories = $6,
            share_employees = $7,
            updated_at = NOW()
          WHERE id = $8
        `, [
          b.data_isolation_mode || 'hybrid',
          b.share_customers !== undefined ? b.share_customers : true,
          b.share_suppliers !== undefined ? b.share_suppliers : true,
          b.share_products !== undefined ? b.share_products : true,
          b.share_inventory !== undefined ? b.share_inventory : true,
          b.share_categories !== undefined ? b.share_categories : true,
          b.share_employees !== undefined ? b.share_employees : true,
          branchId
        ]);
        console.log(`   ✅ Updated branch settings in store_locations`);
      }
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 3. Update customers to be shared
  console.log('\n3️⃣ Updating customers to be shared...');
  try {
    const result = await targetPool.query(`
      UPDATE customers
      SET is_shared = true
      WHERE is_shared IS NULL OR is_shared = false
      AND branch_id IS NULL
    `);
    console.log(`   ✅ Updated ${result.rowCount} customers to be shared`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 4. Verify
  console.log('\n4️⃣ Verifying...');
  try {
    const customerStats = await targetPool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_shared = true) as shared,
        COUNT(*) FILTER (WHERE branch_id IS NULL) as null_branch
      FROM customers
    `);
    const s = customerStats.rows[0];
    console.log(`   Total customers: ${s.total}`);
    console.log(`   Shared customers: ${s.shared}`);
    console.log(`   NULL branch_id: ${s.null_branch}`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  await targetPool.end();
  console.log('\n✅ Done!');
}

fixCustomersVisibility().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

