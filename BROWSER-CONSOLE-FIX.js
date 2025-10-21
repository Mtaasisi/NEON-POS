// ========================================================================
// COPY AND PASTE THIS ENTIRE SCRIPT INTO BROWSER CONSOLE
// ========================================================================
// After logging in, press F12, go to Console tab, paste this, press Enter
// ========================================================================

(async function() {
  console.log('🔧 Starting supplier assignment fix...\n');
  
  try {
    // Get supabase from window (it's already loaded in the app)
    const supabase = window.supabase || 
                     (await import('./src/lib/supabaseClient.ts')).supabase ||
                     (await import('./src/lib/supabaseClient.js')).supabase;
    
    if (!supabase) {
      console.error('❌ Cannot access Supabase client');
      console.log('💡 Alternative: Use SQL query in database directly');
      console.log(`
        -- Run this in your database:
        UPDATE lats_products 
        SET supplier_id = (SELECT id FROM lats_suppliers WHERE is_active = true LIMIT 1)
        WHERE supplier_id IS NULL;
      `);
      return;
    }
    
    console.log('1️⃣ Fetching suppliers...');
    const { data: suppliers, error: sError } = await supabase
      .from('lats_suppliers')
      .select('*');
    
    if (sError) throw sError;
    
    console.log(`✅ Found ${suppliers.length} suppliers`);
    if (suppliers.length === 0) {
      console.error('❌ No suppliers! Add suppliers first.');
      return;
    }
    
    console.log('2️⃣ Checking products...');
    const { data: products, error: pError } = await supabase
      .from('lats_products')
      .select('id, name, supplier_id');
    
    if (pError) throw pError;
    
    const missing = products.filter(p => !p.supplier_id);
    console.log(`Products without supplier: ${missing.length}`);
    
    if (missing.length === 0) {
      console.log('✅ All products already have suppliers!');
      return;
    }
    
    console.log('3️⃣ Assigning suppliers...');
    const defaultSupplier = suppliers.find(s => s.is_active) || suppliers[0];
    
    const { error: uError } = await supabase
      .from('lats_products')
      .update({ supplier_id: defaultSupplier.id })
      .is('supplier_id', null);
    
    if (uError) throw uError;
    
    console.log(`✅ Assigned ${defaultSupplier.name} to ${missing.length} products`);
    
    console.log('4️⃣ Clearing cache...');
    Object.keys(localStorage)
      .filter(k => k.includes('product') || k.includes('cache'))
      .forEach(k => localStorage.removeItem(k));
    console.log('✅ Cache cleared');
    
    console.log('\n✅ SUCCESS! Refresh the page to see suppliers.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();

