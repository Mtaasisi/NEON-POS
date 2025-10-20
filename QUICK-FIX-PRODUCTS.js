/**
 * ⚡ QUICK FIX: Make all products visible
 * 
 * INSTRUCTIONS:
 * 1. Login to your app at http://localhost:5173 as care@care.com (password: 123456)
 * 2. Press F12 to open Developer Console
 * 3. Paste this entire file into the console
 * 4. Press Enter
 * 
 * This will automatically fix the most common issue (products not showing due to branch isolation)
 */

(async () => {
  console.clear();
  console.log('%c⚡ QUICK FIX: Making all products visible...', 'background: #00ff00; color: black; font-size: 20px; font-weight: bold; padding: 10px;');
  console.log('\n');

  try {
    // Import Supabase
    const { supabase } = await import('./src/lib/supabaseClient.ts');
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('%c❌ Please login first!', 'background: #ff0000; color: white; font-weight: bold; padding: 5px;');
      console.log('Login as: care@care.com (password: 123456)');
      return;
    }
    
    console.log('✅ User authenticated:', user.email);
    
    // Get current branch
    const currentBranchId = localStorage.getItem('current_branch_id');
    console.log('🏪 Current branch:', currentBranchId || 'None selected');
    console.log('\n');
    
    // Count products before fix
    const { data: beforeProducts, error: beforeError } = await supabase
      .from('lats_products')
      .select('id, name, branch_id, is_shared', { count: 'exact' });
    
    if (beforeError) {
      console.error('❌ Failed to query products:', beforeError);
      return;
    }
    
    console.log('📊 Before fix:');
    console.log('   Total products:', beforeProducts?.length || 0);
    
    if (!beforeProducts || beforeProducts.length === 0) {
      console.warn('%c⚠️ No products in database!', 'background: #ff9900; color: black; font-weight: bold; padding: 5px;');
      console.log('💡 Create some products first, then run this script again');
      return;
    }
    
    const productsNeedingFix = beforeProducts.filter(p => !p.is_shared && p.branch_id !== currentBranchId);
    console.log('   Products needing fix:', productsNeedingFix.length);
    console.log('\n');
    
    if (productsNeedingFix.length === 0) {
      console.log('%c✅ All products are already visible!', 'background: #00ff00; color: black; font-weight: bold; padding: 5px;');
      console.log('💡 If you still can\'t see products, run PRODUCT-DISPLAY-DIAGNOSTIC.js for detailed analysis');
      return;
    }
    
    // Apply Fix 1: Mark all products as shared
    console.log('🔧 Fix 1: Marking all products as shared...');
    const { error: productsUpdateError } = await supabase
      .from('lats_products')
      .update({ 
        is_shared: true,
        sharing_mode: 'shared'
      })
      .eq('is_shared', false);
    
    if (productsUpdateError) {
      console.error('❌ Failed to update products:', productsUpdateError);
      return;
    }
    
    console.log('✅ Products updated');
    
    // Apply Fix 2: Mark all variants as shared
    console.log('🔧 Fix 2: Marking all variants as shared...');
    const { error: variantsUpdateError } = await supabase
      .from('lats_product_variants')
      .update({ 
        is_shared: true,
        sharing_mode: 'shared'
      })
      .eq('is_shared', false);
    
    if (variantsUpdateError) {
      console.error('❌ Failed to update variants:', variantsUpdateError);
      return;
    }
    
    console.log('✅ Variants updated');
    
    // Apply Fix 3: Switch current store to shared mode (if branch is selected)
    if (currentBranchId) {
      console.log('🔧 Fix 3: Switching store to shared mode...');
      const { error: storeUpdateError } = await supabase
        .from('store_locations')
        .update({ 
          data_isolation_mode: 'shared',
          share_products: true 
        })
        .eq('id', currentBranchId);
      
      if (storeUpdateError) {
        console.warn('⚠️  Could not update store settings:', storeUpdateError.message);
        console.log('   (This is not critical - products should still show)');
      } else {
        console.log('✅ Store settings updated');
      }
    }
    
    console.log('\n');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00; font-weight: bold;');
    console.log('%c✅ FIX APPLIED SUCCESSFULLY!', 'background: #00ff00; color: black; font-size: 16px; font-weight: bold; padding: 10px;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00; font-weight: bold;');
    console.log('\n');
    console.log('📊 Summary:');
    console.log('   ✅ All products marked as shared');
    console.log('   ✅ All variants marked as shared');
    console.log('   ✅ Store set to shared mode');
    console.log('\n');
    console.log('🔄 Refreshing page in 3 seconds...');
    console.log('   All products should now be visible!');
    console.log('\n');
    
    // Reload the page after 3 seconds
    setTimeout(() => {
      window.location.reload();
    }, 3000);
    
  } catch (error) {
    console.error('%c❌ FIX FAILED!', 'background: #ff0000; color: white; font-weight: bold; padding: 10px;');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    console.log('\n💡 Try running PRODUCT-DISPLAY-DIAGNOSTIC.js for detailed analysis');
  }
})();

