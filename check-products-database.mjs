import dotenv from 'dotenv';
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function checkProducts() {
  console.log('🔍 Checking products in database...\n');
  
  try {
    // 1. Check all products
    console.log('📊 1. ALL PRODUCTS:');
    console.log('='.repeat(60));
    const allProducts = await sql`
      SELECT 
        id, name, sku, price, stock_quantity, is_active,
        branch_id, is_shared,
        created_at, updated_at
      FROM products
      ORDER BY created_at DESC
      LIMIT 20
    `;
    
    console.log(`Total products: ${allProducts.length}\n`);
    allProducts.forEach((prod, idx) => {
      console.log(`${idx + 1}. ${prod.name || 'NO NAME'} (SKU: ${prod.sku || 'NO SKU'})`);
      console.log(`   ID: ${prod.id}`);
      console.log(`   Active: ${prod.is_active}`);
      console.log(`   Branch ID: ${prod.branch_id || 'NULL'}`);
      console.log(`   Is Shared: ${prod.is_shared}`);
      console.log(`   Price: ${prod.price}, Stock: ${prod.stock_quantity}`);
      console.log(`   Created: ${prod.created_at}`);
      console.log('');
    });
    
    // 2. Check active products (should show in UI)
    console.log('\n📊 2. ACTIVE PRODUCTS (should show in UI):');
    console.log('='.repeat(60));
    const activeProducts = await sql`
      SELECT 
        id, name, sku, branch_id, is_shared, is_active
      FROM products
      WHERE is_active = true
      ORDER BY name
      LIMIT 20
    `;
    
    console.log(`Total active: ${activeProducts.length}\n`);
    activeProducts.forEach(prod => {
      console.log(`   - ${prod.name || 'NO NAME'}: branch_id=${prod.branch_id || 'NULL'}, is_shared=${prod.is_shared}`);
    });
    
    // 3. Check branch settings
    console.log('\n📊 3. BRANCH SETTINGS:');
    console.log('='.repeat(60));
    const branches = await sql`
      SELECT 
        id, name, data_isolation_mode, share_products
      FROM store_locations
      ORDER BY name
    `;
    
    if (branches.length === 0) {
      console.log('⚠️  NO BRANCHES FOUND!');
    } else {
      branches.forEach(branch => {
        console.log(`\n   Branch: ${branch.name}`);
        console.log(`   ID: ${branch.id}`);
        console.log(`   Isolation Mode: ${branch.data_isolation_mode || 'NOT SET'}`);
        console.log(`   Share Products: ${branch.share_products !== null ? branch.share_products : 'NOT SET'}`);
      });
    }
    
    // 4. Test query scenarios
    console.log('\n📊 4. TESTING BRANCH FILTERING:');
    console.log('='.repeat(60));
    const defaultBranchId = '00000000-0000-0000-0000-000000000001';
    
    // Scenario A: No branch filter
    const noFilter = await sql`
      SELECT id, name, branch_id, is_shared
      FROM products
      WHERE is_active = true
      ORDER BY name
      LIMIT 10
    `;
    console.log(`A. No filter: ${noFilter.length} products`);
    
    // Scenario B: Branch OR shared
    const branchOrShared = await sql`
      SELECT id, name, branch_id, is_shared
      FROM products
      WHERE is_active = true
        AND (branch_id = ${defaultBranchId} OR is_shared = true OR branch_id IS NULL)
      ORDER BY name
      LIMIT 10
    `;
    console.log(`B. Branch OR shared: ${branchOrShared.length} products`);
    
    // Scenario C: Branch only
    const branchOnly = await sql`
      SELECT id, name, branch_id, is_shared
      FROM products
      WHERE is_active = true
        AND branch_id = ${defaultBranchId}
      ORDER BY name
      LIMIT 10
    `;
    console.log(`C. Branch only: ${branchOnly.length} products`);
    
    // 5. Check table structure
    console.log('\n📊 5. PRODUCTS TABLE STRUCTURE:');
    console.log('='.repeat(60));
    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'products'
      ORDER BY ordinal_position
      LIMIT 30
    `;
    
    console.log(`Columns (${columns.length}):`);
    columns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await sql.end();
  }
}

checkProducts();
