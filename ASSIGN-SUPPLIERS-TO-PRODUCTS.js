// ========================================================================
// RUN THIS IN BROWSER CONSOLE AFTER LOGGING IN
// ========================================================================
// This script will assign suppliers to all products that don't have one
// ========================================================================

(async function assignSuppliersToProducts() {
  console.log('🔧 Starting supplier assignment...\n');
  
  try {
    // Import supabase from the app
    const { supabase } = await import('/src/lib/supabaseClient.js');
    
    // 1. Fetch all suppliers
    console.log('1️⃣ Fetching suppliers...');
    const { data: suppliers, error: supplierError } = await supabase
      .from('lats_suppliers')
      .select('*')
      .order('name');
    
    if (supplierError) {
      console.error('❌ Error fetching suppliers:', supplierError);
      return;
    }
    
    console.log(`✅ Found ${suppliers.length} suppliers:`);
    suppliers.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.name} (Active: ${s.is_active})`);
    });
    
    if (suppliers.length === 0) {
      console.error('\n❌ No suppliers found! Please add suppliers first.');
      console.log('Go to: Inventory Management > Suppliers > Add Supplier');
      return;
    }
    
    // 2. Check products without suppliers
    console.log('\n2️⃣ Checking products...');
    const { data: allProducts, error: productsError } = await supabase
      .from('lats_products')
      .select('id, name, supplier_id');
    
    if (productsError) {
      console.error('❌ Error fetching products:', productsError);
      return;
    }
    
    const productsWithoutSupplier = allProducts.filter(p => !p.supplier_id);
    const productsWithSupplier = allProducts.filter(p => p.supplier_id);
    
    console.log(`📊 Total products: ${allProducts.length}`);
    console.log(`✅ Products with supplier: ${productsWithSupplier.length}`);
    console.log(`❌ Products WITHOUT supplier: ${productsWithoutSupplier.length}`);
    
    if (productsWithoutSupplier.length === 0) {
      console.log('\n✅ All products already have suppliers!');
      return;
    }
    
    // 3. Show products that need suppliers
    console.log('\n3️⃣ Products needing suppliers:');
    productsWithoutSupplier.slice(0, 10).forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name}`);
    });
    
    if (productsWithoutSupplier.length > 10) {
      console.log(`   ... and ${productsWithoutSupplier.length - 10} more`);
    }
    
    // 4. Assign default supplier
    console.log('\n4️⃣ Assigning suppliers...');
    const defaultSupplier = suppliers.find(s => s.is_active) || suppliers[0];
    console.log(`Using: ${defaultSupplier.name}`);
    
    const { data: updated, error: updateError } = await supabase
      .from('lats_products')
      .update({ supplier_id: defaultSupplier.id })
      .is('supplier_id', null)
      .select();
    
    if (updateError) {
      console.error('❌ Update failed:', updateError);
      return;
    }
    
    console.log(`✅ Updated ${updated?.length || 0} products!`);
    
    // 5. Clear cache
    console.log('\n5️⃣ Clearing product cache...');
    const cacheKeys = Object.keys(localStorage).filter(k => 
      k.includes('product') || k.includes('lats') || k.includes('cache')
    );
    cacheKeys.forEach(k => localStorage.removeItem(k));
    console.log(`✅ Cleared ${cacheKeys.length} cache entries`);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ SUCCESS! Suppliers assigned to all products');
    console.log('='.repeat(80));
    console.log('👉 Refresh the page to see suppliers in inventory!');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n💡 Make sure you are logged in and on the inventory page!');
  }
})();

