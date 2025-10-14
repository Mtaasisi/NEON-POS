// ============================================
// TEST BRANCH FILTERING QUERY
// ============================================
// Run this in browser console to test if branch filtering works
// Open DevTools (F12) → Console → Paste this
// ============================================

(async () => {
  console.log('%c🧪 TESTING BRANCH FILTERING', 'background: #0066cc; color: white; font-size: 20px; padding: 10px;');
  
  // Get current branch
  const currentBranchId = localStorage.getItem('current_branch_id');
  console.log('📍 Current Branch ID:', currentBranchId);
  
  // Branch names for reference
  const branchNames = {
    '24cd45b8-1ce1-486a-b055-29d169c3a8ea': 'Main Store',
    '115e0e51-d0d6-437b-9fda-dfe11241b167': 'ARUSHA',
    'd4603b1e-6bb7-414d-91b6-ca1a4938b441': 'Airport Branch'
  };
  console.log('📍 Current Branch Name:', branchNames[currentBranchId] || 'Unknown');
  
  console.log('');
  console.log('%c🔍 Testing Products Query...', 'color: #0066cc; font-weight: bold;');
  
  try {
    // Import supabase client
    const { supabase } = await import('./src/lib/supabaseClient.js');
    
    // Test 1: Query WITHOUT branch filter (should get all)
    console.log('Test 1: Querying ALL products (no filter)...');
    const { data: allProducts, error: error1 } = await supabase
      .from('lats_products')
      .select('id, name, branch_id, is_shared, sharing_mode');
    
    console.log(`   Result: ${allProducts?.length || 0} products found`);
    console.log('   Sample:', allProducts?.slice(0, 3));
    
    // Test 2: Query WITH branch filter (Main Store)
    const mainStoreId = '24cd45b8-1ce1-486a-b055-29d169c3a8ea';
    console.log('');
    console.log(`Test 2: Querying Main Store products (branch filter)...`);
    const { data: mainStoreProducts, error: error2 } = await supabase
      .from('lats_products')
      .select('id, name, branch_id, is_shared, sharing_mode')
      .or(`sharing_mode.eq.shared,branch_id.eq.${mainStoreId},visible_to_branches.cs.{${mainStoreId}}`);
    
    console.log(`   Result: ${mainStoreProducts?.length || 0} products found`);
    console.log('   Sample:', mainStoreProducts?.slice(0, 3));
    
    // Test 3: Query WITH branch filter (ARUSHA)
    const arushaId = '115e0e51-d0d6-437b-9fda-dfe11241b167';
    console.log('');
    console.log(`Test 3: Querying ARUSHA products (branch filter)...`);
    const { data: arushaProducts, error: error3 } = await supabase
      .from('lats_products')
      .select('id, name, branch_id, is_shared, sharing_mode')
      .or(`sharing_mode.eq.shared,branch_id.eq.${arushaId},visible_to_branches.cs.{${arushaId}}`);
    
    console.log(`   Result: ${arushaProducts?.length || 0} products found`);
    console.log('   Sample:', arushaProducts?.slice(0, 3));
    
    // Test 4: Check Sales
    console.log('');
    console.log('%c🔍 Testing Sales Query...', 'color: #0066cc; font-weight: bold;');
    
    console.log('Test 4: Querying ALL sales (no filter)...');
    const { data: allSales } = await supabase
      .from('lats_sales')
      .select('id, sale_number, branch_id');
    
    console.log(`   Result: ${allSales?.length || 0} sales found`);
    
    console.log('Test 5: Querying Main Store sales...');
    const { data: mainStoreSales } = await supabase
      .from('lats_sales')
      .select('id, sale_number, branch_id')
      .eq('branch_id', mainStoreId);
    
    console.log(`   Result: ${mainStoreSales?.length || 0} sales found`);
    
    console.log('Test 6: Querying ARUSHA sales...');
    const { data: arushaSales } = await supabase
      .from('lats_sales')
      .select('id, sale_number, branch_id')
      .eq('branch_id', arushaId);
    
    console.log(`   Result: ${arushaSales?.length || 0} sales found`);
    
    // Summary
    console.log('');
    console.log('%c📊 SUMMARY', 'background: #00cc00; color: white; font-size: 16px; padding: 5px;');
    console.table({
      'Total Products': allProducts?.length || 0,
      'Main Store Products': mainStoreProducts?.length || 0,
      'ARUSHA Products': arushaProducts?.length || 0,
      'Total Sales': allSales?.length || 0,
      'Main Store Sales': mainStoreSales?.length || 0,
      'ARUSHA Sales': arushaSales?.length || 0
    });
    
    console.log('');
    console.log('%c✅ EXPECTED RESULTS:', 'color: #00cc00; font-weight: bold;');
    console.log('  Main Store Products: 69');
    console.log('  ARUSHA Products: 0 (because all products assigned to Main Store)');
    console.log('  Main Store Sales: 20');
    console.log('  ARUSHA Sales: 0 (because all sales assigned to Main Store)');
    
  } catch (error) {
    console.error('❌ Error running test:', error);
    console.log('');
    console.log('%cℹ️ Make sure you run this AFTER the page loads completely', 'color: orange;');
  }
})();

