// ================================================================================
// 🔍 BROWSER CONSOLE DIAGNOSTIC SCRIPT
// ================================================================================
// Copy and paste this entire script into your browser console (F12 → Console tab)
// when you're on the inventory page
// ================================================================================

console.clear();
console.log('%c🔍 Inventory Diagnostic Starting...', 'font-size: 20px; font-weight: bold; color: #3B82F6;');
console.log('');

// Helper function to log with emoji
const log = (emoji, message, data = null) => {
  console.log(`${emoji} ${message}`);
  if (data) console.log(data);
};

// Check 1: Products in Store
log('📦', 'STEP 1: Checking products in store...');
try {
  const store = useInventoryStore.getState();
  log('✅', `Products loaded: ${store.products.length}`, store.products);
  
  if (store.products.length === 0) {
    log('⚠️', 'No products found in store!');
    log('💡', 'This could mean:');
    console.log('   1. Products are still loading');
    console.log('   2. Database has no products');
    console.log('   3. API call failed');
  } else {
    log('✅', 'Sample product:', store.products[0]);
  }
} catch (error) {
  log('❌', 'Error accessing store:', error);
}
console.log('');

// Check 2: Loading State
log('⏳', 'STEP 2: Checking loading states...');
try {
  const store = useInventoryStore.getState();
  log('📊', 'Loading states:', {
    isLoading: store.isLoading,
    isDataLoading: store.isDataLoading,
    error: store.error
  });
  
  if (store.isLoading || store.isDataLoading) {
    log('⏳', 'Products are still loading. Wait a moment and run this script again.');
  }
  
  if (store.error) {
    log('❌', 'Error detected:', store.error);
  }
} catch (error) {
  log('❌', 'Error checking loading state:', error);
}
console.log('');

// Check 3: Filters
log('🔍', 'STEP 3: Checking active filters...');
try {
  const store = useInventoryStore.getState();
  const filters = {
    searchTerm: store.searchTerm,
    selectedCategory: store.selectedCategory,
    selectedSupplier: store.selectedSupplier,
    stockFilter: store.stockFilter
  };
  log('📋', 'Active filters:', filters);
  
  if (filters.searchTerm) {
    log('⚠️', `Search filter active: "${filters.searchTerm}" - This may be hiding products`);
  }
  if (filters.selectedCategory) {
    log('⚠️', `Category filter active: ${filters.selectedCategory} - Only showing products in this category`);
  }
  if (filters.selectedSupplier) {
    log('⚠️', `Supplier filter active: ${filters.selectedSupplier} - Only showing products from this supplier`);
  }
  if (filters.stockFilter !== 'all') {
    log('⚠️', `Stock filter active: ${filters.stockFilter} - Only showing ${filters.stockFilter} products`);
  }
  
  // Check filtered products
  const filteredProducts = store.getFilteredProducts();
  log('📊', `Filtered products count: ${filteredProducts.length}`);
  
  if (store.products.length > 0 && filteredProducts.length === 0) {
    log('❌', 'PROBLEM FOUND: Products exist but filters are hiding them all!');
    log('💡', 'SOLUTION: Reset filters by running:');
    console.log('%cstore.clearFilters();', 'background: #10B981; color: white; padding: 5px 10px; border-radius: 5px;');
  }
} catch (error) {
  log('❌', 'Error checking filters:', error);
}
console.log('');

// Check 4: Categories
log('📁', 'STEP 4: Checking categories...');
try {
  const store = useInventoryStore.getState();
  log('✅', `Categories loaded: ${store.categories.length}`, store.categories);
  
  if (store.categories.length === 0) {
    log('⚠️', 'No categories found! Products might not display properly.');
  }
} catch (error) {
  log('❌', 'Error checking categories:', error);
}
console.log('');

// Check 5: Suppliers
log('🏢', 'STEP 5: Checking suppliers...');
try {
  const store = useInventoryStore.getState();
  log('✅', `Suppliers loaded: ${store.suppliers.length}`, store.suppliers);
  
  if (store.suppliers.length === 0) {
    log('⚠️', 'No suppliers found! Products might not display properly.');
  }
} catch (error) {
  log('❌', 'Error checking suppliers:', error);
}
console.log('');

// Check 6: Database Connection
log('🔌', 'STEP 6: Testing database connection...');
supabase
  .from('lats_products')
  .select('count')
  .then(result => {
    if (result.error) {
      log('❌', 'Database connection error:', result.error);
      log('💡', 'Check your .env file for correct Supabase credentials');
    } else {
      log('✅', 'Database connected successfully');
      log('📊', 'Products in database:', result);
    }
  })
  .catch(error => {
    log('❌', 'Database connection failed:', error);
  });
console.log('');

// Check 7: Recent Network Requests
log('🌐', 'STEP 7: Recent product fetch requests...');
log('💡', 'Check the Network tab (F12 → Network) for failed requests to:');
console.log('   - /rest/v1/lats_products');
console.log('   - /rest/v1/lats_product_variants');
console.log('   Look for red/failed requests or 400/500 status codes');
console.log('');

// Summary
log('📊', '='.repeat(80));
log('📊', 'DIAGNOSTIC SUMMARY');
log('📊', '='.repeat(80));
console.log('');

try {
  const store = useInventoryStore.getState();
  const summary = {
    'Products in Store': store.products.length,
    'Filtered Products': store.getFilteredProducts().length,
    'Categories': store.categories.length,
    'Suppliers': store.suppliers.length,
    'Loading': store.isLoading || store.isDataLoading ? 'Yes' : 'No',
    'Errors': store.error || 'None'
  };
  
  console.table(summary);
  console.log('');
  
  // Diagnosis
  if (store.products.length === 0) {
    log('❌', 'DIAGNOSIS: No products loaded');
    log('💡', 'SOLUTIONS:');
    console.log('   1. Wait if products are still loading');
    console.log('   2. Check database has products (run SQL: SELECT COUNT(*) FROM lats_products)');
    console.log('   3. Check database connection (.env file)');
    console.log('   4. Check browser console for API errors');
    console.log('   5. Run: forceRefreshProducts()');
  } else if (store.getFilteredProducts().length === 0) {
    log('❌', 'DIAGNOSIS: Products loaded but filters are hiding them');
    log('💡', 'SOLUTION: Reset filters by running:');
    console.log('%cstore.clearFilters();', 'background: #10B981; color: white; padding: 5px 10px; border-radius: 5px;');
  } else {
    log('✅', 'DIAGNOSIS: Everything looks good!');
    log('📦', `${store.getFilteredProducts().length} products should be visible`);
    
    if (store.getFilteredProducts().length > 0) {
      log('💡', 'If products still aren\'t showing in the UI:');
      console.log('   1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)');
      console.log('   2. Clear browser cache');
      console.log('   3. Check for React rendering errors');
    }
  }
} catch (error) {
  log('❌', 'Error generating summary:', error);
}

console.log('');
log('💡', 'QUICK FIXES:');
console.log('');
console.log('%c// Reset all filters', 'color: #6B7280;');
console.log('%cuseInventoryStore.getState().clearFilters();', 'background: #3B82F6; color: white; padding: 5px 10px; border-radius: 5px;');
console.log('');
console.log('%c// Force refresh products', 'color: #6B7280;');
console.log('%cuseInventoryStore.getState().forceRefreshProducts();', 'background: #8B5CF6; color: white; padding: 5px 10px; border-radius: 5px;');
console.log('');
console.log('%c// Clear cache and reload', 'color: #6B7280;');
console.log('%clocalStorage.clear(); location.reload();', 'background: #EF4444; color: white; padding: 5px 10px; border-radius: 5px;');
console.log('');

log('✅', 'Diagnostic complete!');
console.log('');
log('📚', 'For more help, see:');
console.log('   - 🚀-START-HERE-INVENTORY-FIX.md');
console.log('   - CHECK-FRONTEND-FILTERS.md');
console.log('   - FIX-INVENTORY-NOT-SHOWING.sql');


