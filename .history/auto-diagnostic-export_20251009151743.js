/**
 * AUTOMATIC DIAGNOSTIC DATA EXPORTER
 * 
 * This script replaces the need for screenshots!
 * It captures all diagnostic data and exports it as JSON
 * 
 * USAGE:
 * 1. Open POS page in browser
 * 2. Press F12 (DevTools)
 * 3. Copy this ENTIRE file
 * 4. Paste in Console tab
 * 5. Press Enter
 * 6. Copy the JSON output
 * 7. Share the JSON for automatic fixing!
 */

(async function automaticDiagnostic() {
  console.clear();
  console.log('%c🤖 AUTOMATIC DIAGNOSTIC EXPORT', 'color: #4CAF50; font-size: 24px; font-weight: bold;');
  console.log('%c' + '='.repeat(100), 'color: #4CAF50;');
  console.log('');
  console.log('%cCapturing diagnostic data... Please wait...', 'color: #2196F3;');
  console.log('');

  const diagnostic = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    errors: [],
    warnings: [],
    consoleLog: [],
    database: {},
    products: {},
    variants: {},
    cart: {},
    authentication: {},
    tests: {}
  };

  // Capture console messages
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  let messageBuffer = [];

  console.log = (...args) => {
    messageBuffer.push({ type: 'log', message: args.map(a => String(a)).join(' ') });
    originalLog.apply(console, args);
  };

  console.warn = (...args) => {
    diagnostic.warnings.push(args.map(a => String(a)).join(' '));
    originalWarn.apply(console, args);
  };

  console.error = (...args) => {
    diagnostic.errors.push(args.map(a => String(a)).join(' '));
    originalError.apply(console, args);
  };

  // Test 1: Authentication
  console.log('%c[1/10] Testing authentication...', 'color: #2196F3;');
  try {
    if (typeof supabase !== 'undefined') {
      const { data: { user }, error } = await supabase.auth.getUser();
      diagnostic.authentication = {
        available: true,
        authenticated: !!user,
        error: error?.message,
        userId: user?.id,
        email: user?.email
      };
      diagnostic.tests.authentication = !error && !!user ? 'PASS' : 'FAIL';
    } else {
      diagnostic.authentication = { available: false };
      diagnostic.tests.authentication = 'FAIL';
    }
  } catch (e) {
    diagnostic.authentication = { error: e.message };
    diagnostic.tests.authentication = 'FAIL';
  }

  // Test 2: Database - Products Table
  console.log('%c[2/10] Checking products table...', 'color: #2196F3;');
  try {
    if (typeof supabase !== 'undefined') {
      const { data, error, count } = await supabase
        .from('lats_products')
        .select('id, name, sku, unit_price, cost_price, stock_quantity', { count: 'exact' })
        .limit(5);

      diagnostic.database.products = {
        accessible: !error,
        error: error?.message,
        totalCount: count,
        sampleData: data?.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          hasUnitPrice: p.unit_price !== null && p.unit_price !== undefined,
          unitPrice: p.unit_price,
          hasCostPrice: p.cost_price !== null && p.cost_price !== undefined,
          costPrice: p.cost_price,
          stockQuantity: p.stock_quantity
        }))
      };
      
      diagnostic.tests.productsTable = !error ? 'PASS' : 'FAIL';
      
      // Check for products without prices
      const productsWithoutPrice = data?.filter(p => !p.unit_price || p.unit_price === 0).length || 0;
      if (productsWithoutPrice > 0) {
        diagnostic.warnings.push(`${productsWithoutPrice} products have no price set`);
      }
    }
  } catch (e) {
    diagnostic.database.products = { error: e.message };
    diagnostic.tests.productsTable = 'FAIL';
  }

  // Test 3: Database - Variants Table
  console.log('%c[3/10] Checking variants table...', 'color: #2196F3;');
  try {
    if (typeof supabase !== 'undefined') {
      const { data, error, count } = await supabase
        .from('lats_product_variants')
        .select('id, product_id, variant_name, sku, unit_price, cost_price, quantity, min_quantity', { count: 'exact' })
        .limit(10);

      diagnostic.database.variants = {
        accessible: !error,
        error: error?.message,
        totalCount: count,
        sampleData: data?.map(v => ({
          id: v.id,
          productId: v.product_id,
          name: v.variant_name,
          sku: v.sku,
          hasUnitPrice: v.unit_price !== null && v.unit_price !== undefined,
          unitPrice: v.unit_price,
          hasCostPrice: v.cost_price !== null && v.cost_price !== undefined,
          costPrice: v.cost_price,
          quantity: v.quantity,
          minQuantity: v.min_quantity
        }))
      };
      
      diagnostic.tests.variantsTable = !error ? 'PASS' : 'FAIL';
      
      // Check for variants without prices
      const variantsWithoutPrice = data?.filter(v => !v.unit_price || v.unit_price === 0).length || 0;
      if (variantsWithoutPrice > 0) {
        diagnostic.warnings.push(`${variantsWithoutPrice} variants have no price set`);
      }
    }
  } catch (e) {
    diagnostic.database.variants = { error: e.message };
    diagnostic.tests.variantsTable = 'FAIL';
  }

  // Test 4: Products with Variants (JOIN)
  console.log('%c[4/10] Checking products with variants...', 'color: #2196F3;');
  try {
    if (typeof supabase !== 'undefined') {
      const { data, error } = await supabase
        .from('lats_products')
        .select(`
          id,
          name,
          unit_price,
          lats_product_variants(
            id,
            variant_name,
            unit_price,
            quantity
          )
        `)
        .limit(3);

      diagnostic.database.productsWithVariants = {
        success: !error,
        error: error?.message,
        sampleData: data?.map(p => ({
          id: p.id,
          name: p.name,
          productPrice: p.unit_price,
          variantCount: p.lats_product_variants?.length || 0,
          variants: p.lats_product_variants?.map(v => ({
            name: v.variant_name,
            price: v.unit_price,
            quantity: v.quantity
          }))
        }))
      };
      
      diagnostic.tests.productVariantJoin = !error ? 'PASS' : 'FAIL';
    }
  } catch (e) {
    diagnostic.database.productsWithVariants = { error: e.message };
    diagnostic.tests.productVariantJoin = 'FAIL';
  }

  // Test 5: Products in Page State
  console.log('%c[5/10] Checking products in page state...', 'color: #2196F3;');
  try {
    const pageProducts = window.products || [];
    diagnostic.products = {
      available: pageProducts.length > 0,
      count: pageProducts.length,
      sampleData: pageProducts.slice(0, 3).map(p => ({
        id: p.id,
        name: p.name,
        hasPrice: p.price !== null && p.price !== undefined,
        price: p.price,
        hasCostPrice: p.costPrice !== null && p.costPrice !== undefined,
        costPrice: p.costPrice,
        hasVariants: !!p.variants?.length,
        variantCount: p.variants?.length || 0,
        allFields: Object.keys(p)
      }))
    };
    
    diagnostic.tests.productsInState = pageProducts.length > 0 ? 'PASS' : 'FAIL';
    
    // Check variants in products
    if (pageProducts.length > 0 && pageProducts[0].variants) {
      const firstVariant = pageProducts[0].variants[0];
      diagnostic.variants = {
        sampleVariant: firstVariant ? {
          hasPrice: firstVariant.price !== null && firstVariant.price !== undefined,
          price: firstVariant.price,
          hasSellingPrice: firstVariant.sellingPrice !== null && firstVariant.sellingPrice !== undefined,
          sellingPrice: firstVariant.sellingPrice,
          hasStockQuantity: firstVariant.stockQuantity !== null && firstVariant.stockQuantity !== undefined,
          stockQuantity: firstVariant.stockQuantity,
          allFields: Object.keys(firstVariant)
        } : null
      };
      
      diagnostic.tests.variantsHavePrice = firstVariant?.price ? 'PASS' : 'FAIL';
      diagnostic.tests.variantsHaveSellingPrice = firstVariant?.sellingPrice ? 'PASS' : 'FAIL';
    }
  } catch (e) {
    diagnostic.products = { error: e.message };
    diagnostic.tests.productsInState = 'FAIL';
  }

  // Test 6: Cart State
  console.log('%c[6/10] Checking cart state...', 'color: #2196F3;');
  try {
    const cartItems = window.cartItems || [];
    diagnostic.cart = {
      hasItems: cartItems.length > 0,
      itemCount: cartItems.length,
      items: cartItems.map(item => ({
        name: item.name,
        hasPrice: item.price !== null && item.price !== undefined,
        price: item.price,
        hasUnitPrice: item.unitPrice !== null && item.unitPrice !== undefined,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        allFields: Object.keys(item)
      }))
    };
    
    diagnostic.tests.cartState = 'PASS';
  } catch (e) {
    diagnostic.cart = { error: e.message };
    diagnostic.tests.cartState = 'FAIL';
  }

  // Test 7: Column Name Check
  console.log('%c[7/10] Checking database column names...', 'color: #2196F3;');
  try {
    if (typeof supabase !== 'undefined') {
      // Try to fetch with different column names to see which exists
      const tests = [];
      
      // Test 1: unit_price
      try {
        const { data, error } = await supabase
          .from('lats_product_variants')
          .select('unit_price')
          .limit(1);
        tests.push({ column: 'unit_price', exists: !error, error: error?.message });
      } catch (e) {
        tests.push({ column: 'unit_price', exists: false, error: e.message });
      }
      
      // Test 2: selling_price
      try {
        const { data, error } = await supabase
          .from('lats_product_variants')
          .select('selling_price')
          .limit(1);
        tests.push({ column: 'selling_price', exists: !error, error: error?.message });
      } catch (e) {
        tests.push({ column: 'selling_price', exists: false, error: e.message });
      }
      
      // Test 3: price
      try {
        const { data, error } = await supabase
          .from('lats_product_variants')
          .select('price')
          .limit(1);
        tests.push({ column: 'price', exists: !error, error: error?.message });
      } catch (e) {
        tests.push({ column: 'price', exists: false, error: e.message });
      }
      
      diagnostic.database.columnTests = tests;
      diagnostic.tests.columnNamesCorrect = tests.find(t => t.column === 'unit_price')?.exists ? 'PASS' : 'FAIL';
    }
  } catch (e) {
    diagnostic.database.columnTests = { error: e.message };
    diagnostic.tests.columnNamesCorrect = 'FAIL';
  }

  // Test 8: Recent Errors from Console
  console.log('%c[8/10] Collecting recent console errors...', 'color: #2196F3;');
  diagnostic.consoleLog = messageBuffer.slice(-20); // Last 20 messages

  // Test 9: Check for specific error patterns
  console.log('%c[9/10] Checking for known error patterns...', 'color: #2196F3;');
  const knownErrors = {
    invalidPrice: diagnostic.errors.some(e => e.includes('Invalid product price')),
    cannotAccess: diagnostic.errors.some(e => e.includes('Cannot access')),
    cannotRead: diagnostic.errors.some(e => e.includes('Cannot read property')),
    undefined: diagnostic.errors.some(e => e.includes('undefined')),
    authError: diagnostic.errors.some(e => e.includes('auth') || e.includes('Authentication')),
    databaseError: diagnostic.errors.some(e => e.includes('database') || e.includes('supabase'))
  };
  
  diagnostic.errorPatterns = knownErrors;
  
  // Test 10: Summary
  console.log('%c[10/10] Generating summary...', 'color: #2196F3;');
  
  const testResults = Object.entries(diagnostic.tests);
  const passed = testResults.filter(([_, result]) => result === 'PASS').length;
  const failed = testResults.filter(([_, result]) => result === 'FAIL').length;
  
  diagnostic.summary = {
    totalTests: testResults.length,
    passed,
    failed,
    warningCount: diagnostic.warnings.length,
    errorCount: diagnostic.errors.length,
    overallStatus: failed === 0 ? 'HEALTHY' : failed < 3 ? 'NEEDS_ATTENTION' : 'CRITICAL'
  };

  // Restore console functions
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;

  // Display results
  console.log('');
  console.log('%c' + '='.repeat(100), 'color: #4CAF50;');
  console.log('%c📊 DIAGNOSTIC COMPLETE!', 'color: #4CAF50; font-size: 20px; font-weight: bold;');
  console.log('%c' + '='.repeat(100), 'color: #4CAF50;');
  console.log('');
  console.log(`%cOverall Status: ${diagnostic.summary.overallStatus}`, `color: ${diagnostic.summary.overallStatus === 'HEALTHY' ? '#4CAF50' : diagnostic.summary.overallStatus === 'CRITICAL' ? '#f44336' : '#FF9800'}; font-size: 18px; font-weight: bold;`);
  console.log(`%c✅ Passed: ${passed}/${testResults.length}`, 'color: #4CAF50; font-weight: bold;');
  console.log(`%c❌ Failed: ${failed}/${testResults.length}`, 'color: #f44336; font-weight: bold;');
  console.log(`%c⚠️  Warnings: ${diagnostic.warnings.length}`, 'color: #FF9800; font-weight: bold;');
  console.log(`%c🚨 Errors: ${diagnostic.errors.length}`, 'color: #f44336; font-weight: bold;');
  console.log('');
  console.log('%c' + '='.repeat(100), 'color: #4CAF50;');
  console.log('%c📋 COPY THE JSON BELOW AND SHARE FOR AUTOMATIC FIXING!', 'color: #2196F3; font-size: 16px; font-weight: bold;');
  console.log('%c' + '='.repeat(100), 'color: #4CAF50;');
  console.log('');
  console.log(JSON.stringify(diagnostic, null, 2));
  console.log('');
  console.log('%c' + '='.repeat(100), 'color: #4CAF50;');
  console.log('');

  // Also save to window for easy access
  window.diagnosticData = diagnostic;
  console.log('%c💡 TIP: Data also saved to window.diagnosticData', 'color: #2196F3;');
  
  return diagnostic;
})();

