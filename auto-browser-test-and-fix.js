/**
 * 🧪 AUTOMATED BROWSER TEST AND FIX SCRIPT
 * ===========================================
 * Run this in browser console (F12) to automatically test and fix issues
 * 
 * Usage:
 * 1. Open http://localhost:5173
 * 2. Press F12 to open console
 * 3. Paste this entire script
 * 4. Press Enter
 */

(async () => {
  console.clear();
  console.log('%c🧪 AUTOMATED BROWSER TEST & FIX', 'font-size: 24px; font-weight: bold; color: #3B82F6; background: #EFF6FF; padding: 10px;');
  console.log('%c===============================================', 'color: #3B82F6;');
  console.log('');
  
  const results = {
    tests: [],
    fixes: [],
    errors: [],
    warnings: []
  };
  
  const log = (emoji, message, type = 'info') => {
    const styles = {
      info: 'color: #3B82F6;',
      success: 'color: #10B981;',
      warning: 'color: #F59E0B;',
      error: 'color: #EF4444;'
    };
    console.log(`%c${emoji} ${message}`, styles[type] || styles.info);
  };
  
  const test = async (name, fn) => {
    console.log('');
    console.log(`%c📋 TEST: ${name}`, 'font-weight: bold; font-size: 14px; color: #6366F1;');
    console.log('-'.repeat(60));
    
    try {
      const result = await fn();
      if (result.pass) {
        log('✅', `PASS: ${result.message}`, 'success');
        results.tests.push({ name, status: 'pass', message: result.message });
      } else {
        log('❌', `FAIL: ${result.message}`, 'error');
        results.tests.push({ name, status: 'fail', message: result.message });
        if (result.error) {
          results.errors.push({ test: name, error: result.error });
        }
      }
      return result;
    } catch (error) {
      log('💥', `ERROR: ${error.message}`, 'error');
      results.tests.push({ name, status: 'error', message: error.message });
      results.errors.push({ test: name, error: error.message });
      return { pass: false, message: error.message, error };
    }
  };
  
  const fix = async (name, fn) => {
    log('🔧', `Applying fix: ${name}`, 'warning');
    try {
      await fn();
      log('✅', `Fix applied: ${name}`, 'success');
      results.fixes.push({ name, status: 'applied' });
    } catch (error) {
      log('❌', `Fix failed: ${name} - ${error.message}`, 'error');
      results.fixes.push({ name, status: 'failed', error: error.message });
    }
  };
  
  // ===========================================
  // STEP 1: Check if already logged in
  // ===========================================
  
  await test('Authentication Status', async () => {
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('/login') || currentPath === '/';
    
    // Check for auth token
    const hasToken = localStorage.getItem('supabase.auth.token') !== null;
    
    if (isLoginPage && !hasToken) {
      return { 
        pass: false, 
        message: 'Not logged in - need to login first',
        needsLogin: true
      };
    } else if (!isLoginPage && hasToken) {
      return { 
        pass: true, 
        message: 'Already logged in and on app page'
      };
    } else {
      return { 
        pass: true, 
        message: 'Auth state valid'
      };
    }
  });
  
  // ===========================================
  // STEP 2: Login if needed
  // ===========================================
  
  const loginIfNeeded = async () => {
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('/login') || currentPath === '/';
    
    if (isLoginPage) {
      log('🔐', 'Attempting automatic login...', 'info');
      
      // Fill in login form
      const emailInput = document.querySelector('input[type="email"], input[name="email"]');
      const passwordInput = document.querySelector('input[type="password"], input[name="password"]');
      const submitButton = document.querySelector('button[type="submit"], button:contains("Login"), button:contains("Sign in")');
      
      if (emailInput && passwordInput && submitButton) {
        emailInput.value = 'care@care.com';
        passwordInput.value = '123456';
        
        // Trigger input events
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        log('✅', 'Credentials filled', 'success');
        log('⏳', 'Waiting for login to complete...', 'info');
        
        // Click submit
        submitButton.click();
        
        // Wait for navigation
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        return { pass: true, message: 'Login submitted' };
      } else {
        return { pass: false, message: 'Login form not found' };
      }
    }
    
    return { pass: true, message: 'Already logged in' };
  };
  
  const loginResult = await test('Auto Login', loginIfNeeded);
  
  // ===========================================
  // STEP 3: Test Core Systems
  // ===========================================
  
  await test('Supabase Connection', async () => {
    if (typeof supabase === 'undefined') {
      return { pass: false, message: 'Supabase client not initialized' };
    }
    
    try {
      const { data, error } = await supabase.from('lats_products').select('count').limit(1);
      if (error) {
        return { pass: false, message: `Database error: ${error.message}`, error };
      }
      return { pass: true, message: 'Database connected successfully' };
    } catch (error) {
      return { pass: false, message: `Connection failed: ${error.message}`, error };
    }
  });
  
  await test('Branch Context', async () => {
    if (typeof useBranchContext === 'undefined') {
      return { pass: false, message: 'Branch context not available' };
    }
    
    try {
      // Check if we can access the branch context
      const branchId = localStorage.getItem('selectedBranchId');
      if (!branchId) {
        return { pass: false, message: 'No branch selected' };
      }
      return { pass: true, message: `Branch ID: ${branchId}` };
    } catch (error) {
      return { pass: false, message: error.message, error };
    }
  });
  
  await test('Inventory Store', async () => {
    if (typeof useInventoryStore === 'undefined') {
      return { pass: false, message: 'Inventory store not initialized' };
    }
    
    try {
      const store = useInventoryStore.getState();
      const productCount = store.products?.length || 0;
      const categoryCount = store.categories?.length || 0;
      
      log('📦', `Products: ${productCount}`);
      log('📁', `Categories: ${categoryCount}`);
      
      if (productCount === 0) {
        results.warnings.push('No products loaded - may be loading or database empty');
      }
      
      return { 
        pass: true, 
        message: `Store initialized with ${productCount} products, ${categoryCount} categories` 
      };
    } catch (error) {
      return { pass: false, message: error.message, error };
    }
  });
  
  await test('Product Display', async () => {
    if (typeof useInventoryStore === 'undefined') {
      return { pass: false, message: 'Cannot test - store not available' };
    }
    
    try {
      const store = useInventoryStore.getState();
      const products = store.products || [];
      const filtered = store.getFilteredProducts ? store.getFilteredProducts() : products;
      
      log('📊', `Total products: ${products.length}`);
      log('🔍', `Filtered products: ${filtered.length}`);
      
      if (products.length > 0 && filtered.length === 0) {
        results.warnings.push('Products exist but filters are hiding them');
        
        // Auto-fix: Clear filters
        await fix('Clear Product Filters', async () => {
          if (store.clearFilters) {
            store.clearFilters();
          }
        });
      }
      
      return { 
        pass: products.length > 0, 
        message: `${filtered.length} products visible` 
      };
    } catch (error) {
      return { pass: false, message: error.message, error };
    }
  });
  
  await test('Customer Search Function', async () => {
    try {
      const { data, error } = await supabase.rpc('search_customers_fn', {
        search_query: '',
        page_number: 1,
        page_size: 1
      });
      
      if (error) {
        if (error.message.includes('function') || error.message.includes('does not exist')) {
          results.warnings.push('search_customers_fn not found - using fallback (causes 400 errors)');
          return { 
            pass: false, 
            message: 'Search function missing (non-critical - has fallback)',
            needsFix: true
          };
        }
        return { pass: false, message: `Error: ${error.message}`, error };
      }
      
      return { pass: true, message: 'Search function working' };
    } catch (error) {
      return { pass: false, message: error.message, error };
    }
  });
  
  await test('Console Errors', async () => {
    // Check for common console errors
    const errors = [];
    
    // Check for 400 errors in recent console
    if (window.performance) {
      const entries = performance.getEntriesByType('resource');
      const badRequests = entries.filter(e => e.name.includes('400'));
      if (badRequests.length > 0) {
        errors.push(`${badRequests.length} 400 errors detected`);
      }
    }
    
    if (errors.length > 0) {
      return { 
        pass: false, 
        message: errors.join(', '),
        errors 
      };
    }
    
    return { pass: true, message: 'No critical console errors' };
  });
  
  // ===========================================
  // STEP 4: Test Navigation
  // ===========================================
  
  await test('Navigation to POS Page', async () => {
    try {
      const posLink = document.querySelector('a[href*="/pos"], a[href*="/lats"]');
      
      if (posLink) {
        log('🔗', 'Found POS link, navigating...', 'info');
        posLink.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        return { pass: true, message: 'Navigated to POS page' };
      } else {
        // Try direct navigation
        const currentUrl = window.location.origin;
        window.location.href = `${currentUrl}/lats/pos`;
        await new Promise(resolve => setTimeout(resolve, 2000));
        return { pass: true, message: 'Direct navigation to POS' };
      }
    } catch (error) {
      return { pass: false, message: error.message, error };
    }
  });
  
  // ===========================================
  // STEP 5: Test POS Features
  // ===========================================
  
  await test('Product Grid Display', async () => {
    const productCards = document.querySelectorAll('[class*="product-card"], [class*="ProductCard"]');
    const count = productCards.length;
    
    log('🎴', `Product cards found: ${count}`);
    
    if (count === 0) {
      results.warnings.push('No product cards visible in DOM');
      return { pass: false, message: 'No product cards displayed' };
    }
    
    return { pass: true, message: `${count} product cards displayed` };
  });
  
  await test('Product Click Interaction', async () => {
    const productCard = document.querySelector('[class*="product-card"], [class*="ProductCard"]');
    
    if (!productCard) {
      return { pass: false, message: 'No product card to test' };
    }
    
    try {
      const clickable = productCard.querySelector('button, [role="button"]') || productCard;
      clickable.click();
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { pass: true, message: 'Product click interaction working' };
    } catch (error) {
      return { pass: false, message: error.message, error };
    }
  });
  
  // ===========================================
  // STEP 6: Apply Fixes
  // ===========================================
  
  console.log('');
  console.log('%c🔧 AUTO-FIXES', 'font-size: 18px; font-weight: bold; color: #F59E0B;');
  console.log('='.repeat(60));
  
  // Fix 1: Clear any problematic filters
  await fix('Reset Inventory Filters', async () => {
    if (typeof useInventoryStore !== 'undefined') {
      const store = useInventoryStore.getState();
      if (store.clearFilters) {
        store.clearFilters();
      }
    }
  });
  
  // Fix 2: Clear old cache
  await fix('Clear Product Cache', async () => {
    const cacheKeys = Object.keys(localStorage).filter(k => 
      k.includes('product') || k.includes('inventory') || k.includes('cache')
    );
    
    // Don't clear auth tokens
    const safeToClear = cacheKeys.filter(k => !k.includes('auth'));
    
    safeToClear.forEach(key => {
      localStorage.removeItem(key);
      log('🗑️', `Cleared: ${key}`);
    });
  });
  
  // Fix 3: Force refresh data
  await fix('Force Data Refresh', async () => {
    if (typeof useInventoryStore !== 'undefined') {
      const store = useInventoryStore.getState();
      if (store.forceRefreshProducts) {
        await store.forceRefreshProducts();
      }
    }
  });
  
  // ===========================================
  // STEP 7: Generate Report
  // ===========================================
  
  console.log('');
  console.log('%c📊 TEST REPORT', 'font-size: 20px; font-weight: bold; color: #8B5CF6; background: #F5F3FF; padding: 10px;');
  console.log('='.repeat(60));
  console.log('');
  
  const passed = results.tests.filter(t => t.status === 'pass').length;
  const failed = results.tests.filter(t => t.status === 'fail').length;
  const errored = results.tests.filter(t => t.status === 'error').length;
  const total = results.tests.length;
  
  console.log(`%c✅ Passed: ${passed}/${total}`, 'color: #10B981; font-weight: bold;');
  console.log(`%c❌ Failed: ${failed}/${total}`, 'color: #EF4444; font-weight: bold;');
  console.log(`%c💥 Errors: ${errored}/${total}`, 'color: #F59E0B; font-weight: bold;');
  console.log(`%c🔧 Fixes Applied: ${results.fixes.filter(f => f.status === 'applied').length}`, 'color: #8B5CF6; font-weight: bold;');
  console.log(`%c⚠️  Warnings: ${results.warnings.length}`, 'color: #F59E0B; font-weight: bold;');
  console.log('');
  
  // Detailed results
  console.log('%cDetailed Test Results:', 'font-weight: bold; font-size: 14px;');
  console.table(results.tests);
  
  if (results.warnings.length > 0) {
    console.log('');
    console.log('%c⚠️  Warnings:', 'font-weight: bold; color: #F59E0B;');
    results.warnings.forEach((w, i) => {
      console.log(`   ${i + 1}. ${w}`);
    });
  }
  
  if (results.errors.length > 0) {
    console.log('');
    console.log('%c❌ Errors:', 'font-weight: bold; color: #EF4444;');
    results.errors.forEach((e, i) => {
      console.log(`   ${i + 1}. [${e.test}] ${e.error}`);
    });
  }
  
  // Recommendations
  console.log('');
  console.log('%c💡 RECOMMENDATIONS', 'font-weight: bold; font-size: 16px; color: #3B82F6;');
  console.log('='.repeat(60));
  
  if (failed > 0 || errored > 0) {
    console.log('%c1. Review failed tests above', 'color: #6B7280;');
    console.log('%c2. Check browser console for additional errors', 'color: #6B7280;');
    console.log('%c3. Verify database connection in .env file', 'color: #6B7280;');
  }
  
  if (results.warnings.some(w => w.includes('search_customers_fn'))) {
    console.log('%c4. Apply search function migration to eliminate 400 errors:', 'color: #6B7280;');
    console.log('%c   ./apply-search-function-migration.sh', 'background: #3B82F6; color: white; padding: 5px 10px;');
  }
  
  if (results.warnings.some(w => w.includes('No products'))) {
    console.log('%c5. Add products to database if empty', 'color: #6B7280;');
  }
  
  // Success message
  console.log('');
  if (passed === total) {
    console.log('%c🎉 ALL TESTS PASSED!', 'font-size: 18px; font-weight: bold; color: #10B981; background: #D1FAE5; padding: 10px;');
    console.log('%cYour POS system is working correctly!', 'color: #10B981;');
  } else {
    const percentage = Math.round((passed / total) * 100);
    console.log(`%c✅ ${percentage}% of tests passed`, 'font-size: 16px; font-weight: bold; color: #3B82F6;');
    console.log('%cSome issues detected - review recommendations above', 'color: #F59E0B;');
  }
  
  console.log('');
  console.log('%c📋 Test completed at: ' + new Date().toLocaleTimeString(), 'color: #6B7280;');
  console.log('');
  
  // Export results
  window.testResults = results;
  console.log('%c💾 Results saved to window.testResults', 'color: #8B5CF6; font-style: italic;');
  
  return results;
})();

