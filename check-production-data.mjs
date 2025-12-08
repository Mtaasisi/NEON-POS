import { Pool } from '@neondatabase/serverless';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const targetPool = new Pool({ connectionString: TARGET_DB });

async function checkProductionData() {
  console.log('🔍 Checking Production Database Data\n');
  console.log('📊 Database: aws-0-eu-north-1.pooler.supabase.com\n');

  const branchId = '24cd45b8-1ce1-486a-b055-29d169c3a8ea';

  // 1. Check products
  console.log('1️⃣ Checking Products...');
  try {
    const products = await targetPool.query(`
      SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE is_active = true) as active,
             COUNT(*) FILTER (WHERE branch_id = $1 OR branch_id IS NULL OR is_shared = true) as accessible
      FROM lats_products
    `, [branchId]);
    const p = products.rows[0];
    console.log(`   Total products: ${p.total}`);
    console.log(`   Active products: ${p.active}`);
    console.log(`   Accessible to branch: ${p.accessible}`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 2. Check suppliers
  console.log('\n2️⃣ Checking Suppliers...');
  try {
    const suppliers = await targetPool.query(`
      SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE is_active = true) as active,
             COUNT(*) FILTER (WHERE branch_id = $1 OR branch_id IS NULL OR is_shared = true) as accessible
      FROM lats_suppliers
    `, [branchId]);
    const s = suppliers.rows[0];
    console.log(`   Total suppliers: ${s.total}`);
    console.log(`   Active suppliers: ${s.active}`);
    console.log(`   Accessible to branch: ${s.accessible}`);
    
    if (s.active === 0) {
      console.log(`   ⚠️  WARNING: No active suppliers found!`);
      console.log(`   💡 This matches the warning in your logs.`);
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 3. Check customers
  console.log('\n3️⃣ Checking Customers...');
  try {
    const customers = await targetPool.query(`
      SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE is_active = true) as active
      FROM customers
    `);
    const c = customers.rows[0];
    console.log(`   Total customers: ${c.total}`);
    console.log(`   Active customers: ${c.active}`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 4. Check branches
  console.log('\n4️⃣ Checking Branches...');
  try {
    const branches = await targetPool.query(`
      SELECT id, name, code, is_active
      FROM lats_branches
      WHERE id = $1
    `, [branchId]);
    
    if (branches.rows.length > 0) {
      const branch = branches.rows[0];
      console.log(`   ✅ Branch found: ${branch.name} (${branch.code})`);
      console.log(`   Active: ${branch.is_active}`);
    } else {
      console.log(`   ❌ Branch ${branchId} not found!`);
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 5. Check sales
  console.log('\n5️⃣ Checking Sales...');
  try {
    const sales = await targetPool.query(`
      SELECT COUNT(*) as total
      FROM lats_sales
      WHERE branch_id = $1 OR branch_id IS NULL
    `, [branchId]);
    console.log(`   Total sales: ${sales.rows[0].total}`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 6. Check product variants
  console.log('\n6️⃣ Checking Product Variants...');
  try {
    const variants = await targetPool.query(`
      SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE branch_id = $1 OR branch_id IS NULL OR is_shared = true) as accessible
      FROM lats_product_variants
    `, [branchId]);
    const v = variants.rows[0];
    console.log(`   Total variants: ${v.total}`);
    console.log(`   Accessible to branch: ${v.accessible}`);
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  await targetPool.end();
  console.log('\n✅ Done!');
}

checkProductionData().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

