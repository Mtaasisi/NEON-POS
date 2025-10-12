/**
 * POS DIAGNOSTIC TOOL
 * Copy and paste this entire script into the browser console on the POS page
 * It will automatically test all critical functionality
 */

(async function() {
  console.clear();
  console.log('%c🔍 POS DIAGNOSTIC TOOL', 'color: #4CAF50; font-size: 24px; font-weight: bold;');
  console.log('%c='.repeat(80), 'color: #4CAF50;');
  console.log('');

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  function pass(test) {
    results.passed.push(test);
    console.log(`%c✅ PASS: ${test}`, 'color: #4CAF50;');
  }

  function fail(test, details) {
    results.failed.push({ test, details });
    console.log(`%c❌ FAIL: ${test}`, 'color: #f44336;');
    if (details) console.log(`   Details: ${details}`);
  }

  function warn(test, details) {
    results.warnings.push({ test, details });
    console.log(`%c⚠️  WARN: ${test}`, 'color: #FF9800;');
    if (details) console.log(`   Details: ${details}`);
  }

  function section(title) {
    console.log('');
    console.log(`%c${title}`, 'color: #2196F3; font-size: 18px; font-weight: bold;');
    console.log('%c' + '-'.repeat(80), 'color: #2196F3;');
  }

  // Test 1: Check if Supabase client is available
  section('1. SUPABASE CONNECTION');
  try {
    if (typeof supabase !== 'undefined') {
      pass('Supabase client is loaded');
      
      // Test connection
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        fail('User authentication', error.message);
      } else if (user) {
        pass(`User authenticated: ${user.email}`);
      } else {
        warn('User not authenticated', 'Please log in');
      }
    } else {
      fail('Supabase client not found', 'Check if supabase is properly imported');
    }
  } catch (e) {
    fail('Supabase test error', e.message);
  }

  // Test 2: Check database tables
  section('2. DATABASE TABLES');
  try {
    if (typeof supabase !== 'undefined') {
      // Check lats_products table
      const { data: products, error: productsError } = await supabase
        .from('lats_products')
        .select('id, name, unit_price')
        .limit(1);
      
      if (productsError) {
        fail('lats_products table', productsError.message);
      } else {
        pass('lats_products table exists');
        if (products && products.length > 0) {
          const product = products[0];
          console.log('   Sample product:', { 
            id: product.id, 
            name: product.name, 
            unit_price: product.unit_price 
          });
          
          if (product.unit_price !== undefined && product.unit_price !== null) {
            pass('unit_price column exists in lats_products');
          } else {
            warn('unit_price is null/undefined', 'Check if products have prices set');
          }
        }
      }

      // Check lats_product_variants table
      const { data: variants, error: variantsError } = await supabase
        .from('lats_product_variants')
        .select('id, product_id, variant_name, unit_price, quantity')
        .limit(1);
      
      if (variantsError) {
        fail('lats_product_variants table', variantsError.message);
      } else {
        pass('lats_product_variants table exists');
        if (variants && variants.length > 0) {
          const variant = variants[0];
          console.log('   Sample variant:', {
            id: variant.id,
            variant_name: variant.variant_name,
            unit_price: variant.unit_price,
            quantity: variant.quantity
          });
          
          if (variant.unit_price !== undefined && variant.unit_price !== null) {
            pass('unit_price column exists in lats_product_variants');
          } else {
            warn('variant unit_price is null/undefined', 'Check if variants have prices set');
          }
        }
      }

      // Check lats_sales table
      const { data: sales, error: salesError } = await supabase
        .from('lats_sales')
        .select('id')
        .limit(1);
      
      if (salesError) {
        warn('lats_sales table', salesError.message + ' - Sales may not be saved properly');
      } else {
        pass('lats_sales table exists');
      }
    }
  } catch (e) {
    fail('Database tables test error', e.message);
  }

  // Test 3: Check product data structure
  section('3. PRODUCT DATA STRUCTURE');
  try {
    if (typeof supabase !== 'undefined') {
      const { data: testProducts, error } = await supabase
        .from('lats_products')
        .select(`
          id,
          name,
          unit_price,
          cost_price,
          lats_product_variants(
            id,
            variant_name,
            unit_price,
            cost_price,
            quantity
          )
        `)
        .limit(1);
      
      if (error) {
        fail('Product data fetch', error.message);
      } else if (testProducts && testProducts.length > 0) {
        const product = testProducts[0];
        console.log('   Raw product from DB:', product);
        
        // Check if product has price
        if (product.unit_price !== undefined) {
          pass('Product has unit_price in database');
        } else {
          warn('Product missing unit_price', 'Products may need prices set');
        }
        
        // Check variants
        if (product.lats_product_variants && product.lats_product_variants.length > 0) {
          pass('Product has variants');
          const variant = product.lats_product_variants[0];
          
          if (variant.unit_price !== undefined) {
            pass('Variant has unit_price in database');
          } else {
            fail('Variant missing unit_price', 'Variants need prices set');
          }
        } else {
          warn('Product has no variants', 'Products should have at least one variant');
        }
      }
    }
  } catch (e) {
    fail('Product structure test error', e.message);
  }

  // Test 4: Check POS page data
  section('4. POS PAGE DATA');
  try {
    // Check if products are loaded in the page
    const storeProducts = window.products || [];
    if (storeProducts.length > 0) {
      pass(`${storeProducts.length} products loaded in POS`);
      
      const sampleProduct = storeProducts[0];
      console.log('   Sample product in POS:', sampleProduct);
      
      // Check price field
      if (sampleProduct.price !== undefined) {
        pass('Products have price field');
      } else {
        fail('Products missing price field', 'Check dataProcessor transformation');
      }
      
      // Check variants
      if (sampleProduct.variants && sampleProduct.variants.length > 0) {
        const variant = sampleProduct.variants[0];
        
        if (variant.price !== undefined) {
          pass('Variants have price field');
        } else {
          fail('Variants missing price field', 'Check variant transformation');
        }
        
        if (variant.sellingPrice !== undefined) {
          pass('Variants have sellingPrice field');
        } else {
          fail('Variants missing sellingPrice field', 'Check variant transformation');
        }
      }
    } else {
      warn('No products loaded in POS', 'Try refreshing the page');
    }
  } catch (e) {
    fail('POS page data test error', e.message);
  }

  // Test 5: Check sale processing service
  section('5. SALE PROCESSING');
  try {
    if (typeof saleProcessingService !== 'undefined') {
      pass('Sale processing service is available');
    } else {
      fail('Sale processing service not found', 'Check if saleProcessingService is imported');
    }
  } catch (e) {
    warn('Sale processing test', 'Service may not be in global scope');
  }

  // Print Summary
  section('SUMMARY');
  console.log('');
  console.log(`%c✅ Passed: ${results.passed.length}`, 'color: #4CAF50; font-weight: bold;');
  console.log(`%c❌ Failed: ${results.failed.length}`, 'color: #f44336; font-weight: bold;');
  console.log(`%c⚠️  Warnings: ${results.warnings.length}`, 'color: #FF9800; font-weight: bold;');
  console.log('');

  if (results.failed.length > 0) {
    console.log('%cFailed Tests:', 'color: #f44336; font-size: 16px; font-weight: bold;');
    results.failed.forEach(({ test, details }) => {
      console.log(`  ❌ ${test}`);
      if (details) console.log(`     ${details}`);
    });
    console.log('');
  }

  if (results.warnings.length > 0) {
    console.log('%cWarnings:', 'color: #FF9800; font-size: 16px; font-weight: bold;');
    results.warnings.forEach(({ test, details }) => {
      console.log(`  ⚠️  ${test}`);
      if (details) console.log(`     ${details}`);
    });
    console.log('');
  }

  // Recommendations
  section('RECOMMENDATIONS');
  console.log('');
  
  if (results.failed.some(f => f.test.includes('price'))) {
    console.log('%c🔧 Fix price issues:', 'color: #2196F3; font-weight: bold;');
    console.log('   1. Ensure all products have unit_price in database');
    console.log('   2. Ensure all variants have unit_price in database');
    console.log('   3. Check dataProcessor.ts transforms unit_price to price');
    console.log('   4. Check variant transformation includes price and sellingPrice');
    console.log('');
  }

  if (results.failed.some(f => f.test.includes('table'))) {
    console.log('%c🔧 Fix database issues:', 'color: #2196F3; font-weight: bold;');
    console.log('   1. Run database migration scripts');
    console.log('   2. Check table permissions in Supabase');
    console.log('   3. Verify RLS policies are configured correctly');
    console.log('');
  }

  if (results.warnings.some(w => w.test.includes('variant'))) {
    console.log('%c🔧 Fix variant issues:', 'color: #2196F3; font-weight: bold;');
    console.log('   1. Create default variants for products without them');
    console.log('   2. Set prices on all variants');
    console.log('   3. Check variant creation in product form');
    console.log('');
  }

  console.log('%c='.repeat(80), 'color: #4CAF50;');
  console.log('%c✨ Diagnostic Complete!', 'color: #4CAF50; font-size: 18px; font-weight: bold;');
  console.log('');

  // Return results object for programmatic access
  return results;
})();

