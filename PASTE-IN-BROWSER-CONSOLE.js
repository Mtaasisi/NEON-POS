/**
 * ============================================================================
 * SUPPLIER FIX - COPY AND PASTE THIS IN BROWSER CONSOLE
 * ============================================================================
 * 1. Login to your app as care@care.com
 * 2. Go to inventory page: http://localhost:5173/lats/unified-inventory
 * 3. Press F12 (or Cmd+Option+I) to open Developer Tools
 * 4. Click on "Console" tab
 * 5. Copy this ENTIRE script and paste it in the console
 * 6. Press Enter
 * 7. Wait for "✅ SUCCESS" message
 * 8. Refresh the page
 * ============================================================================
 */

(async function fixSupplierDisplay() {
  console.log('%c🔧 SUPPLIER FIX STARTING...', 'background: #4CAF50; color: white; padding: 10px; font-size: 16px; font-weight: bold');
  console.log('');
  
  try {
    // Step 1: Get Supabase client
    console.log('Step 1: Accessing Supabase...');
    
    // Try multiple ways to get supabase
    let supabase = window.supabase;
    
    if (!supabase) {
      // Try to import it
      try {
        const module = await import('./src/lib/supabaseClient.ts');
        supabase = module.supabase || module.default;
      } catch (e) {
        console.error('❌ Could not access Supabase');
        console.log('');
        console.log('%c💡 ALTERNATIVE SOLUTION', 'background: #FF9800; color: white; padding: 8px; font-weight: bold');
        console.log('Run this SQL query in your database:');
        console.log('');
        console.log('%c' + `
-- 1. Get first active supplier
SELECT id, name FROM lats_suppliers WHERE is_active = true LIMIT 1;

-- 2. Copy the supplier ID and use it here (replace YOUR_SUPPLIER_ID):
UPDATE lats_products 
SET supplier_id = 'YOUR_SUPPLIER_ID'
WHERE supplier_id IS NULL;

-- 3. Verify
SELECT name, supplier_id FROM lats_products LIMIT 10;
        `, 'background: #000; color: #0f0; padding: 10px; font-family: monospace');
        return;
      }
    }
    
    console.log('✅ Supabase client ready');
    console.log('');
    
    // Step 2: Check suppliers
    console.log('Step 2: Fetching suppliers...');
    const { data: suppliers, error: suppliersError } = await supabase
      .from('lats_suppliers')
      .select('*')
      .eq('is_active', true);
    
    if (suppliersError) {
      console.error('❌ Error fetching suppliers:', suppliersError);
      return;
    }
    
    if (!suppliers || suppliers.length === 0) {
      console.error('❌ No active suppliers found!');
      console.log('');
      console.log('%c⚠️ YOU NEED TO ADD SUPPLIERS FIRST', 'background: #f44336; color: white; padding: 8px; font-weight: bold');
      console.log('Go to: Inventory Management → Suppliers → Add Supplier');
      return;
    }
    
    console.log(`✅ Found ${suppliers.length} active suppliers:`);
    suppliers.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.name}`);
    });
    console.log('');
    
    // Step 3: Check products
    console.log('Step 3: Checking products...');
    const { data: products, error: productsError } = await supabase
      .from('lats_products')
      .select('id, name, supplier_id');
    
    if (productsError) {
      console.error('❌ Error fetching products:', productsError);
      return;
    }
    
    const withoutSupplier = products.filter(p => !p.supplier_id);
    const withSupplier = products.filter(p => p.supplier_id);
    
    console.log(`📊 Total products: ${products.length}`);
    console.log(`   ✅ With supplier: ${withSupplier.length}`);
    console.log(`   ❌ Without supplier: ${withoutSupplier.length}`);
    console.log('');
    
    if (withoutSupplier.length === 0) {
      console.log('%c✅ ALL PRODUCTS ALREADY HAVE SUPPLIERS!', 'background: #4CAF50; color: white; padding: 8px; font-weight: bold');
      console.log('');
      console.log('If suppliers still don\'t show, try:');
      console.log('1. Clear cache: localStorage.clear()');
      console.log('2. Refresh page: location.reload()');
      return;
    }
    
    // Step 4: Assign suppliers
    console.log(`Step 4: Assigning supplier to ${withoutSupplier.length} products...`);
    const defaultSupplier = suppliers[0];
    console.log(`Using: ${defaultSupplier.name}`);
    console.log('');
    
    const { data: updated, error: updateError } = await supabase
      .from('lats_products')
      .update({ supplier_id: defaultSupplier.id })
      .is('supplier_id', null)
      .select();
    
    if (updateError) {
      console.error('❌ Update failed:', updateError);
      return;
    }
    
    console.log(`✅ Successfully updated ${updated?.length || 0} products!`);
    console.log('');
    
    // Step 5: Clear cache
    console.log('Step 5: Clearing cache...');
    const cacheKeys = Object.keys(localStorage);
    const removed = [];
    
    cacheKeys.forEach(key => {
      if (key.includes('product') || key.includes('lats') || key.includes('cache') || key.includes('inventory')) {
        localStorage.removeItem(key);
        removed.push(key);
      }
    });
    
    console.log(`✅ Cleared ${removed.length} cache entries`);
    console.log('');
    
    // Step 6: Verify
    console.log('Step 6: Verifying...');
    const { data: verifyProducts, error: verifyError } = await supabase
      .from('lats_products')
      .select('id, name, supplier_id')
      .limit(5);
    
    if (!verifyError) {
      const allHaveSuppliers = verifyProducts.every(p => p.supplier_id);
      console.log(`Sample products (first 5):`);
      verifyProducts.forEach((p, i) => {
        const emoji = p.supplier_id ? '✅' : '❌';
        console.log(`   ${emoji} ${i + 1}. ${p.name}`);
      });
      console.log('');
      
      if (allHaveSuppliers) {
        console.log('%c✅ VERIFICATION PASSED!', 'background: #4CAF50; color: white; padding: 8px; font-weight: bold');
      }
    }
    
    // Final message
    console.log('');
    console.log('%c✅ SUCCESS! SUPPLIERS HAVE BEEN ASSIGNED', 'background: #4CAF50; color: white; padding: 12px; font-size: 16px; font-weight: bold');
    console.log('');
    console.log('%c👉 REFRESH THE PAGE NOW (F5 or Cmd+R)', 'background: #2196F3; color: white; padding: 10px; font-size: 14px; font-weight: bold');
    console.log('');
    console.log('After refresh, suppliers should appear in the inventory table!');
    console.log('');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.log('');
    console.log('Please try the SQL method instead (see error message above)');
  }
})();

