/**
 * 🔍 PRODUCT DISPLAY DIAGNOSTIC & FIX TOOL
 * 
 * INSTRUCTIONS:
 * 1. Open your browser to http://localhost:5173
 * 2. Login as care@care.com (password: 123456)
 * 3. Press F12 to open Developer Console
 * 4. Paste this entire file into the console
 * 5. Press Enter to run
 * 
 * This script will:
 * - Check authentication
 * - Check current branch settings
 * - Check products in database
 * - Test the getProducts() API
 * - Identify why products aren't showing
 * - Apply fixes if needed
 */

(async () => {
  console.clear();
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00; font-weight: bold; font-size: 16px;');
  console.log('%c🔍 PRODUCT DISPLAY DIAGNOSTIC TOOL', 'background: #00ff00; color: black; font-size: 20px; font-weight: bold; padding: 10px;');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00; font-weight: bold; font-size: 16px;');
  console.log('\n');

  try {
    // Import required modules
    console.log('%c📦 STEP 1: Loading modules...', 'background: #0066cc; color: white; font-weight: bold; padding: 5px;');
    const { supabase } = await import('./src/lib/supabaseClient.ts');
    const { getProducts } = await import('./src/lib/latsProductApi.ts');
    console.log('✅ Modules loaded successfully\n');

    // Step 2: Check authentication
    console.log('%c🔐 STEP 2: Checking authentication...', 'background: #0066cc; color: white; font-weight: bold; padding: 5px;');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('%c❌ NOT AUTHENTICATED!', 'background: #ff0000; color: white; font-weight: bold; padding: 5px;');
      console.error('Error:', authError);
      console.log('\n💡 SOLUTION: Please log in as care@care.com (password: 123456)\n');
      return;
    }
    
    console.log('✅ User authenticated');
    console.log('   Email:', user.email);
    console.log('   User ID:', user.id);
    console.log('\n');

    // Step 3: Check branch settings
    console.log('%c🏪 STEP 3: Checking branch settings...', 'background: #0066cc; color: white; font-weight: bold; padding: 5px;');
    const currentBranchId = localStorage.getItem('current_branch_id');
    
    if (!currentBranchId) {
      console.warn('%c⚠️ NO BRANCH SELECTED!', 'background: #ff9900; color: black; font-weight: bold; padding: 5px;');
      console.log('   This means ALL products from ALL stores will be shown');
      console.log('   (unless they are filtered by other criteria)\n');
    } else {
      console.log('✅ Current branch ID:', currentBranchId);
      
      // Get branch details
      const { data: branch, error: branchError } = await supabase
        .from('store_locations')
        .select('id, name, data_isolation_mode, share_products')
        .eq('id', currentBranchId)
        .single();
      
      if (branchError) {
        console.error('%c⚠️ BRANCH NOT FOUND!', 'background: #ff9900; color: black; font-weight: bold; padding: 5px;');
        console.error('   Error:', branchError.message);
        console.log('   Branch ID in localStorage:', currentBranchId);
        console.log('\n💡 ISSUE: The branch ID in localStorage does not exist in the database!');
        console.log('💡 SOLUTION: Clear localStorage or set a valid branch ID\n');
      } else {
        console.log('✅ Branch settings loaded');
        console.log('   Branch Name:', branch.name);
        console.log('   Isolation Mode:', branch.data_isolation_mode);
        console.log('   Share Products:', branch.share_products);
        console.log('\n');
      }
    }

    // Step 4: Check products in database (raw query)
    console.log('%c📦 STEP 4: Checking products in database (RAW)...', 'background: #0066cc; color: white; font-weight: bold; padding: 5px;');
    
    // Get ALL products without any filters
    const { data: allProducts, error: allProductsError } = await supabase
      .from('lats_products')
      .select('id, name, branch_id, is_shared, sharing_mode, is_active')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (allProductsError) {
      console.error('%c❌ DATABASE QUERY FAILED!', 'background: #ff0000; color: white; font-weight: bold; padding: 5px;');
      console.error('   Error:', allProductsError.message);
      console.error('   Details:', allProductsError);
      console.log('\n💡 ISSUE: Cannot access products table!');
      console.log('💡 SOLUTION: Check database connection and table permissions\n');
      return;
    }
    
    if (!allProducts || allProducts.length === 0) {
      console.warn('%c⚠️ NO PRODUCTS IN DATABASE!', 'background: #ff9900; color: black; font-weight: bold; padding: 5px;');
      console.log('\n💡 ISSUE: The database is empty!');
      console.log('💡 SOLUTION: Create some products first\n');
      return;
    }
    
    console.log(`✅ Found ${allProducts.length} products in database`);
    console.log('\n📊 Product breakdown:');
    
    // Count products by branch
    const productsByBranch = {};
    const activeProducts = allProducts.filter(p => p.is_active !== false);
    const inactiveProducts = allProducts.filter(p => p.is_active === false);
    const sharedProducts = allProducts.filter(p => p.is_shared === true);
    
    allProducts.forEach(p => {
      const branchKey = p.branch_id || 'null (unassigned)';
      if (!productsByBranch[branchKey]) {
        productsByBranch[branchKey] = [];
      }
      productsByBranch[branchKey].push(p);
    });
    
    console.log('   Total products:', allProducts.length);
    console.log('   Active products:', activeProducts.length);
    console.log('   Inactive products:', inactiveProducts.length);
    console.log('   Shared products:', sharedProducts.length);
    console.log('\n   Products by branch:');
    Object.entries(productsByBranch).forEach(([branchKey, products]) => {
      console.log(`     ${branchKey}: ${products.length} products`);
    });
    
    // Show first 5 products
    console.log('\n📋 Sample products (first 5):');
    allProducts.slice(0, 5).forEach((p, i) => {
      console.log(`   ${i+1}. ${p.name}`);
      console.log(`      ID: ${p.id}`);
      console.log(`      Branch: ${p.branch_id || 'null'}`);
      console.log(`      Shared: ${p.is_shared || false}`);
      console.log(`      Active: ${p.is_active !== false ? 'Yes' : 'No'}`);
    });
    console.log('\n');

    // Step 5: Test getProducts() API
    console.log('%c🔧 STEP 5: Testing getProducts() API...', 'background: #0066cc; color: white; font-weight: bold; padding: 5px;');
    console.log('This will show how the branch filter affects results\n');
    
    let apiProducts = [];
    try {
      apiProducts = await getProducts();
      console.log(`✅ getProducts() returned ${apiProducts.length} products\n`);
      
      if (apiProducts.length === 0 && allProducts.length > 0) {
        console.error('%c❌ PROBLEM FOUND!', 'background: #ff0000; color: white; font-weight: bold; padding: 10px; font-size: 16px;');
        console.log('\n📊 ANALYSIS:');
        console.log('   Database has:', allProducts.length, 'products');
        console.log('   API returned:', apiProducts.length, 'products');
        console.log('\n💡 ISSUE: Products are being filtered out by branch logic!');
        
        if (currentBranchId) {
          const productsInCurrentBranch = allProducts.filter(p => p.branch_id === currentBranchId);
          const sharedProductsAvailable = allProducts.filter(p => p.is_shared === true);
          
          console.log('\n📊 DETAILED BREAKDOWN:');
          console.log('   Products in current branch:', productsInCurrentBranch.length);
          console.log('   Shared products available:', sharedProductsAvailable.length);
          console.log('   Products in other branches:', allProducts.length - productsInCurrentBranch.length - sharedProductsAvailable.length);
          
          console.log('\n💡 POSSIBLE SOLUTIONS:');
          console.log('   1. Set branch_id on existing products:');
          console.log(`      Update products to assign them to current branch (${currentBranchId})`);
          console.log('   2. Change store isolation mode to "shared":');
          console.log('      This will show all products regardless of branch');
          console.log('   3. Mark products as shared (is_shared = true):');
          console.log('      This will make them visible across all branches');
        } else {
          console.log('\n💡 POSSIBLE SOLUTIONS:');
          console.log('   1. Select a branch in the UI');
          console.log('   2. Check if products are marked as inactive');
        }
      } else if (apiProducts.length < allProducts.length) {
        console.warn('%c⚠️ SOME PRODUCTS FILTERED OUT', 'background: #ff9900; color: black; font-weight: bold; padding: 5px;');
        console.log(`\n📊 ANALYSIS:`);
        console.log(`   Database has: ${allProducts.length} products`);
        console.log(`   API returned: ${apiProducts.length} products`);
        console.log(`   Filtered out: ${allProducts.length - apiProducts.length} products`);
        console.log('\n💡 This is normal if you are using branch isolation');
      } else {
        console.log('%c✅ ALL PRODUCTS SHOWING CORRECTLY!', 'background: #00ff00; color: black; font-weight: bold; padding: 5px;');
      }
      
    } catch (apiError) {
      console.error('%c❌ getProducts() API FAILED!', 'background: #ff0000; color: white; font-weight: bold; padding: 5px;');
      console.error('   Error:', apiError);
      console.error('   Stack:', apiError.stack);
      console.log('\n💡 ISSUE: The API function threw an error!');
      console.log('💡 Check the error details above\n');
    }

    // Step 6: Check for missing variants
    console.log('%c📦 STEP 6: Checking product variants...', 'background: #0066cc; color: white; font-weight: bold; padding: 5px;');
    
    const productIds = allProducts.map(p => p.id);
    const { data: variants, error: variantsError } = await supabase
      .from('lats_product_variants')
      .select('id, product_id, variant_name, branch_id, is_shared')
      .in('product_id', productIds);
    
    if (variantsError) {
      console.error('%c⚠️ VARIANTS CHECK FAILED!', 'background: #ff9900; color: black; font-weight: bold; padding: 5px;');
      console.error('   Error:', variantsError.message);
    } else {
      console.log(`✅ Found ${variants?.length || 0} variants`);
      
      // Check for products without variants
      const productIdsWithVariants = new Set(variants?.map(v => v.product_id) || []);
      const productsWithoutVariants = allProducts.filter(p => !productIdsWithVariants.has(p.id));
      
      if (productsWithoutVariants.length > 0) {
        console.warn('%c⚠️ PRODUCTS WITHOUT VARIANTS!', 'background: #ff9900; color: black; font-weight: bold; padding: 5px;');
        console.log(`   ${productsWithoutVariants.length} products have no variants`);
        console.log('\n   Products without variants:');
        productsWithoutVariants.slice(0, 5).forEach((p, i) => {
          console.log(`     ${i+1}. ${p.name} (ID: ${p.id})`);
        });
        console.log('\n💡 NOTE: Products without variants may not display correctly in the UI');
      } else {
        console.log('✅ All products have variants');
      }
      
      // Check variant branch assignments
      if (currentBranchId && variants && variants.length > 0) {
        const variantsInCurrentBranch = variants.filter(v => v.branch_id === currentBranchId);
        const sharedVariants = variants.filter(v => v.is_shared === true);
        const unassignedVariants = variants.filter(v => !v.branch_id);
        
        console.log('\n📊 Variant branch breakdown:');
        console.log(`   Variants in current branch: ${variantsInCurrentBranch.length}`);
        console.log(`   Shared variants: ${sharedVariants.length}`);
        console.log(`   Unassigned variants: ${unassignedVariants.length}`);
        console.log(`   Variants in other branches: ${variants.length - variantsInCurrentBranch.length - sharedVariants.length - unassignedVariants.length}`);
        
        if (variantsInCurrentBranch.length === 0 && unassignedVariants.length === 0 && sharedVariants.length === 0) {
          console.error('%c⚠️ NO VARIANTS IN CURRENT BRANCH!', 'background: #ff9900; color: black; font-weight: bold; padding: 5px;');
          console.log('\n💡 ISSUE: All variants belong to other branches!');
          console.log('💡 Even if products are visible, they won\'t have any variants to display');
        }
      }
    }
    console.log('\n');

    // Step 7: Provide fix options
    console.log('%c🔧 STEP 7: Available fixes...', 'background: #0066cc; color: white; font-weight: bold; padding: 5px;');
    console.log('\n');
    
    // Define fix functions
    window.fixProductDisplay = async () => {
      console.log('%c🔧 APPLYING FIX: Assign products to current branch...', 'background: #ff9900; color: black; font-weight: bold; padding: 5px;');
      
      if (!currentBranchId) {
        console.error('❌ Cannot apply fix: No branch selected!');
        console.log('💡 Select a branch first, then run this fix again');
        return;
      }
      
      // Get products that need to be assigned
      const { data: unassignedProducts } = await supabase
        .from('lats_products')
        .select('id, name')
        .or(`branch_id.is.null,branch_id.neq.${currentBranchId}`);
      
      if (!unassignedProducts || unassignedProducts.length === 0) {
        console.log('✅ All products are already assigned to the current branch');
        return;
      }
      
      console.log(`📦 Found ${unassignedProducts.length} products to assign`);
      console.log('⚠️  This will assign them to branch:', currentBranchId);
      
      // Update products
      const { error: updateError } = await supabase
        .from('lats_products')
        .update({ branch_id: currentBranchId })
        .or(`branch_id.is.null,branch_id.neq.${currentBranchId}`);
      
      if (updateError) {
        console.error('❌ Update failed:', updateError);
        return;
      }
      
      // Update variants
      const { error: variantUpdateError } = await supabase
        .from('lats_product_variants')
        .update({ branch_id: currentBranchId })
        .or(`branch_id.is.null,branch_id.neq.${currentBranchId}`);
      
      if (variantUpdateError) {
        console.error('❌ Variant update failed:', variantUpdateError);
        return;
      }
      
      console.log('%c✅ FIX APPLIED SUCCESSFULLY!', 'background: #00ff00; color: black; font-weight: bold; padding: 5px;');
      console.log('🔄 Refreshing page in 2 seconds...\n');
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    };
    
    window.makeProductsShared = async () => {
      console.log('%c🔧 APPLYING FIX: Mark all products as shared...', 'background: #ff9900; color: black; font-weight: bold; padding: 5px;');
      
      // Update products
      const { error: updateError } = await supabase
        .from('lats_products')
        .update({ is_shared: true })
        .eq('is_shared', false);
      
      if (updateError) {
        console.error('❌ Update failed:', updateError);
        return;
      }
      
      // Update variants
      const { error: variantUpdateError } = await supabase
        .from('lats_product_variants')
        .update({ is_shared: true })
        .eq('is_shared', false);
      
      if (variantUpdateError) {
        console.error('❌ Variant update failed:', variantUpdateError);
        return;
      }
      
      console.log('%c✅ FIX APPLIED SUCCESSFULLY!', 'background: #00ff00; color: black; font-weight: bold; padding: 5px;');
      console.log('🔄 Refreshing page in 2 seconds...\n');
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    };
    
    window.switchToSharedMode = async () => {
      console.log('%c🔧 APPLYING FIX: Switch store to shared mode...', 'background: #ff9900; color: black; font-weight: bold; padding: 5px;');
      
      if (!currentBranchId) {
        console.error('❌ Cannot apply fix: No branch selected!');
        return;
      }
      
      const { error: updateError } = await supabase
        .from('store_locations')
        .update({ 
          data_isolation_mode: 'shared',
          share_products: true 
        })
        .eq('id', currentBranchId);
      
      if (updateError) {
        console.error('❌ Update failed:', updateError);
        return;
      }
      
      console.log('%c✅ FIX APPLIED SUCCESSFULLY!', 'background: #00ff00; color: black; font-weight: bold; padding: 5px;');
      console.log('🔄 Refreshing page in 2 seconds...\n');
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    };
    
    // Show available fixes
    console.log('📋 AVAILABLE FIXES (copy and paste into console):');
    console.log('\n');
    console.log('%c  fixProductDisplay()', 'background: #333; color: #00ff00; padding: 5px; font-family: monospace;');
    console.log('     Assign all products to the current branch');
    console.log('     (Recommended if you have one store)');
    console.log('\n');
    console.log('%c  makeProductsShared()', 'background: #333; color: #00ff00; padding: 5px; font-family: monospace;');
    console.log('     Mark all products as shared across all stores');
    console.log('     (Recommended if you have multiple stores)');
    console.log('\n');
    console.log('%c  switchToSharedMode()', 'background: #333; color: #00ff00; padding: 5px; font-family: monospace;');
    console.log('     Change store isolation mode to "shared"');
    console.log('     (Makes all products visible regardless of branch)');
    console.log('\n');

    // Final summary
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00; font-weight: bold; font-size: 16px;');
    console.log('%c📊 DIAGNOSTIC SUMMARY', 'background: #00ff00; color: black; font-size: 16px; font-weight: bold; padding: 10px;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00; font-weight: bold; font-size: 16px;');
    console.log('\n');
    console.log('✅ Authentication:', user ? 'OK' : 'FAILED');
    console.log('✅ Branch selection:', currentBranchId ? 'OK' : 'NONE');
    console.log('✅ Products in database:', allProducts.length);
    console.log('✅ Products returned by API:', apiProducts.length);
    console.log('\n');
    
    if (apiProducts.length === 0 && allProducts.length > 0) {
      console.log('%c⚠️ PROBLEM: Products exist but are not showing!', 'background: #ff0000; color: white; font-weight: bold; padding: 5px;');
      console.log('\n💡 RECOMMENDED ACTION:');
      console.log('   Run one of the fix functions listed above');
    } else if (apiProducts.length === allProducts.length) {
      console.log('%c✅ ALL GOOD: Products are showing correctly!', 'background: #00ff00; color: black; font-weight: bold; padding: 5px;');
    } else {
      console.log('%c⚠️ SOME PRODUCTS FILTERED: This may be intentional', 'background: #ff9900; color: black; font-weight: bold; padding: 5px;');
    }
    
    console.log('\n');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00; font-weight: bold; font-size: 16px;');
    
  } catch (error) {
    console.error('%c❌ DIAGNOSTIC FAILED!', 'background: #ff0000; color: white; font-weight: bold; padding: 10px; font-size: 16px;');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    console.log('\n💡 Make sure you are on the POS page and logged in');
  }
})();

