import { chromium } from 'playwright';

async function finalSupplierFix() {
  console.log('🔧 AUTO-FIX: Assigning suppliers to products...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Track console output
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    if (!text.includes('[vite]') && !text.includes('DevTools')) {
      console.log(`   📋 ${text}`);
    }
  });
  
  try {
    console.log('1️⃣ Logging in...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'care@care.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    console.log('   ✅ Logged in\n');
    
    console.log('2️⃣ Navigating to inventory...');
    await page.goto('http://localhost:5173/lats/unified-inventory', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    console.log('   ✅ Page loaded\n');
    
    console.log('3️⃣ Running supplier assignment script...\n');
    
    const result = await page.evaluate(async () => {
      try {
        // Dynamic import of supabase
        const supabaseModule = await import('/src/lib/supabaseClient.js');
        const supabase = supabaseModule.supabase || supabaseModule.default;
        
        console.log('📊 Fetching suppliers...');
        const { data: suppliers, error: supplierError } = await supabase
          .from('lats_suppliers')
          .select('*')
          .order('name');
        
        if (supplierError) throw supplierError;
        
        console.log(`✅ Found ${suppliers.length} suppliers`);
        suppliers.forEach(s => console.log(`   - ${s.name}`));
        
        if (suppliers.length === 0) {
          return { success: false, message: 'No suppliers found' };
        }
        
        console.log('📊 Checking products...');
        const { data: allProducts, error: productsError } = await supabase
          .from('lats_products')
          .select('id, name, supplier_id');
        
        if (productsError) throw productsError;
        
        const withoutSupplier = allProducts.filter(p => !p.supplier_id).length;
        const withSupplier = allProducts.filter(p => p.supplier_id).length;
        
        console.log(`📊 Products: ${allProducts.length} total`);
        console.log(`   ✅ With supplier: ${withSupplier}`);
        console.log(`   ❌ Without supplier: ${withoutSupplier}`);
        
        if (withoutSupplier === 0) {
          return { success: true, message: 'All products already have suppliers', updated: 0 };
        }
        
        const defaultSupplier = suppliers.find(s => s.is_active) || suppliers[0];
        console.log(`🔧 Assigning supplier: ${defaultSupplier.name}`);
        
        const { data: updated, error: updateError } = await supabase
          .from('lats_products')
          .update({ supplier_id: defaultSupplier.id })
          .is('supplier_id', null)
          .select();
        
        if (updateError) throw updateError;
        
        console.log(`✅ Updated ${updated.length} products`);
        
        // Clear cache
        console.log('🗑️ Clearing cache...');
        const cacheKeys = Object.keys(localStorage).filter(k => 
          k.includes('product') || k.includes('lats') || k.includes('cache')
        );
        cacheKeys.forEach(k => localStorage.removeItem(k));
        console.log(`✅ Cleared ${cacheKeys.length} cache entries`);
        
        return { 
          success: true, 
          message: 'Suppliers assigned successfully',
          updated: updated.length,
          supplier: defaultSupplier.name
        };
        
      } catch (error) {
        console.error('❌ Error:', error);
        return { success: false, message: error.message };
      }
    });
    
    console.log('\n4️⃣ Results:');
    if (result.success) {
      console.log(`   ✅ ${result.message}`);
      if (result.updated > 0) {
        console.log(`   ✅ ${result.updated} products updated`);
        console.log(`   ✅ Supplier: ${result.supplier}`);
      }
    } else {
      console.log(`   ❌ ${result.message}`);
    }
    
    await page.screenshot({ 
      path: 'test-screenshots/08-before-refresh.png',
      fullPage: true 
    });
    console.log('   ✅ Screenshot: 08-before-refresh.png\n');
    
    console.log('5️⃣ Refreshing page to load fresh data...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    await page.screenshot({ 
      path: 'test-screenshots/09-after-supplier-fix.png',
      fullPage: true 
    });
    console.log('   ✅ Screenshot: 09-after-supplier-fix.png\n');
    
    console.log('6️⃣ Verifying suppliers are now visible...');
    
    // Extract supplier values from table
    const supplierValues = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        // Find supplier cell (after category, before shelf)
        const supplierIndex = 4; // Based on: Product(1), SKU(2), Category(3), Supplier(4)
        return cells[supplierIndex]?.textContent?.trim() || 'N/A';
      });
    });
    
    console.log('   📋 Supplier values in table:');
    supplierValues.forEach((value, i) => {
      const emoji = value && value !== 'N/A' ? '✅' : '❌';
      console.log(`      ${emoji} Row ${i + 1}: ${value}`);
    });
    
    const successCount = supplierValues.filter(v => v && v !== 'N/A').length;
    const totalCount = supplierValues.length;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL RESULTS');
    console.log('='.repeat(80));
    console.log(`Products checked: ${totalCount}`);
    console.log(`Products with suppliers: ${successCount}`);
    console.log(`Success rate: ${Math.round((successCount / totalCount) * 100)}%`);
    console.log('='.repeat(80));
    
    if (successCount === totalCount) {
      console.log('✅ SUCCESS! All products now have suppliers!');
    } else if (successCount > 0) {
      console.log('⚠️  PARTIAL SUCCESS: Some products have suppliers');
    } else {
      console.log('❌ FAILED: No suppliers showing. Check console logs above.');
    }
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Test error:', error);
    await page.screenshot({ path: 'test-screenshots/final-error.png' });
  } finally {
    console.log('\n⏳ Keeping browser open for inspection (15 seconds)...');
    await page.waitForTimeout(15000);
    await browser.close();
    console.log('✅ Complete!');
  }
}

finalSupplierFix();

