import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Try to get Supabase credentials from environment
const getSupabaseConfig = () => {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  return { url, key };
};

async function completeSupplierFix() {
  console.log('🔧 COMPLETE SUPPLIER FIX - Assigning & Fetching\n');
  console.log('='.repeat(80));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 400
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Capture all console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    
    // Show important logs
    if (text.includes('supplier') || 
        text.includes('Supplier') ||
        text.includes('[getProducts]') ||
        text.includes('📊') ||
        text.includes('✅ Fetched')) {
      console.log(`   📋 ${text}`);
    }
  });
  
  try {
    // STEP 1: Login
    console.log('STEP 1: Logging in...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    await page.fill('input[type="email"]', 'care@care.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    console.log('✅ Logged in\n');
    
    // STEP 2: Assign suppliers via page evaluation
    console.log('STEP 2: Assigning suppliers to products...');
    
    const assignResult = await page.evaluate(async () => {
      try {
        // Wait for Supabase to be available
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get Supabase from the global scope
        const { supabase } = window;
        
        if (!supabase) {
          return { success: false, error: 'Supabase not available' };
        }
        
        // Fetch suppliers
        const { data: suppliers, error: sError } = await supabase
          .from('lats_suppliers')
          .select('*')
          .eq('is_active', true)
          .order('name');
        
        if (sError) return { success: false, error: sError.message };
        if (suppliers.length === 0) return { success: false, error: 'No suppliers found' };
        
        console.log(`Found ${suppliers.length} suppliers`);
        
        // Fetch products without suppliers
        const { data: products, error: pError } = await supabase
          .from('lats_products')
          .select('id, name, supplier_id');
        
        if (pError) return { success: false, error: pError.message };
        
        const needSupplier = products.filter(p => !p.supplier_id);
        console.log(`${needSupplier.length} products need supplier assignment`);
        
        if (needSupplier.length === 0) {
          return { success: true, message: 'All products already have suppliers', updated: 0 };
        }
        
        // Assign first active supplier to all products
        const defaultSupplier = suppliers[0];
        const { error: updateError } = await supabase
          .from('lats_products')
          .update({ supplier_id: defaultSupplier.id })
          .is('supplier_id', null);
        
        if (updateError) return { success: false, error: updateError.message };
        
        return { 
          success: true, 
          updated: needSupplier.length,
          supplierName: defaultSupplier.name,
          supplierId: defaultSupplier.id
        };
        
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    if (assignResult.success) {
      console.log(`   ✅ ${assignResult.updated} products assigned to: ${assignResult.supplierName}`);
    } else {
      console.log(`   ❌ Assignment failed: ${assignResult.error}`);
    }
    
    await page.screenshot({ path: 'test-screenshots/10-after-assignment.png' });
    
    // STEP 3: Clear all caches
    console.log('\nSTEP 3: Clearing all caches...');
    await page.evaluate(() => {
      // Clear localStorage
      localStorage.clear();
      // Clear sessionStorage
      sessionStorage.clear();
      console.log('✅ All caches cleared');
    });
    console.log('   ✅ Cache cleared\n');
    
    // STEP 4: Navigate to inventory with forced refresh
    console.log('STEP 4: Loading inventory with fresh data...');
    await page.goto('http://localhost:5173/lats/unified-inventory', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    // Wait for data to load
    console.log('   ⏳ Waiting for products and suppliers to load...');
    await page.waitForTimeout(8000);
    
    await page.screenshot({ 
      path: 'test-screenshots/11-inventory-fresh-load.png',
      fullPage: true 
    });
    console.log('   ✅ Screenshot saved\n');
    
    // STEP 5: Verify supplier data
    console.log('STEP 5: Verifying supplier display...');
    
    // Get table data
    const tableData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      
      return rows.map((row, rowIndex) => {
        const cells = Array.from(row.querySelectorAll('td'));
        
        // Find headers to match columns
        const headers = Array.from(document.querySelectorAll('table thead th'))
          .map(th => th.textContent?.trim().toLowerCase());
        
        const supplierIndex = headers.findIndex(h => h?.includes('supplier'));
        
        return {
          row: rowIndex + 1,
          supplierValue: supplierIndex >= 0 ? cells[supplierIndex]?.textContent?.trim() : 'Column not found',
          allCells: cells.map(c => c.textContent?.trim()).slice(0, 8) // First 8 columns
        };
      });
    });
    
    console.log('   📊 Table Data:');
    tableData.forEach(row => {
      const emoji = row.supplierValue && row.supplierValue !== 'N/A' && row.supplierValue !== 'Column not found' ? '✅' : '❌';
      console.log(`      ${emoji} Row ${row.row}: Supplier = "${row.supplierValue}"`);
    });
    
    // STEP 6: Check console logs for our diagnostics
    console.log('\nSTEP 6: Analyzing diagnostic logs...');
    
    const supplierLogs = consoleLogs.filter(log => 
      log.includes('[getProducts]') && log.includes('supplier')
    );
    
    if (supplierLogs.length > 0) {
      console.log('   📋 Supplier fetch logs:');
      supplierLogs.forEach(log => console.log(`      ${log}`));
    } else {
      console.log('   ⚠️  No supplier fetch logs found');
    }
    
    // Check for supplier population stats
    const statsLog = consoleLogs.find(log => log.includes('Supplier population stats'));
    if (statsLog) {
      console.log('\n   📊 SUPPLIER STATS FOUND:');
      const statsIndex = consoleLogs.indexOf(statsLog);
      consoleLogs.slice(statsIndex, statsIndex + 5).forEach(log => {
        if (log.includes('Total products') || log.includes('supplier')) {
          console.log(`      ${log}`);
        }
      });
    }
    
    // STEP 7: Final verification
    console.log('\nSTEP 7: Final check - Fetching data directly...');
    
    const directCheck = await page.evaluate(async () => {
      const { supabase } = window;
      if (!supabase) return { success: false };
      
      // Fetch products with their suppliers
      const { data: products, error } = await supabase
        .from('lats_products')
        .select(`
          id,
          name,
          supplier_id,
          supplier:lats_suppliers!supplier_id (
            id,
            name
          )
        `)
        .limit(10);
      
      if (error) return { success: false, error: error.message };
      
      return {
        success: true,
        products: products.map(p => ({
          name: p.name,
          supplierId: p.supplier_id,
          supplierName: p.supplier?.name || 'N/A'
        }))
      };
    });
    
    if (directCheck.success) {
      console.log('   📦 Products with suppliers (direct DB query):');
      directCheck.products?.forEach((p, i) => {
        const emoji = p.supplierName !== 'N/A' ? '✅' : '❌';
        console.log(`      ${emoji} ${i + 1}. ${p.name} → ${p.supplierName}`);
      });
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'test-screenshots/12-final-verification.png',
      fullPage: true 
    });
    
    // Calculate success rate
    const successCount = tableData.filter(r => 
      r.supplierValue && r.supplierValue !== 'N/A' && r.supplierValue !== 'Column not found'
    ).length;
    const totalCount = tableData.length;
    const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL RESULTS');
    console.log('='.repeat(80));
    console.log(`Products in table: ${totalCount}`);
    console.log(`Products with suppliers: ${successCount}`);
    console.log(`Success rate: ${successRate}%`);
    console.log('='.repeat(80));
    
    if (successRate === 100) {
      console.log('🎉 SUCCESS! All products now show suppliers!');
    } else if (successRate > 0) {
      console.log('⚠️  PARTIAL SUCCESS - Some products show suppliers');
      console.log('💡 Tip: Check if products have supplier_id in database');
    } else {
      console.log('❌ FAILED - No suppliers showing');
      console.log('\n🔍 Possible issues:');
      console.log('   1. Products missing supplier_id in database');
      console.log('   2. Supplier join not working in API');
      console.log('   3. UI not displaying supplier column correctly');
      console.log('\n📋 Check console logs above for more details');
    }
    console.log('='.repeat(80));
    
    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      assignResult,
      tableData,
      directCheck,
      successRate,
      consoleLogs: consoleLogs.filter(log => 
        log.includes('supplier') || log.includes('Supplier') || log.includes('[getProducts]')
      )
    };
    
    await page.evaluate((data) => {
      console.log('📄 Test Report:', JSON.stringify(data, null, 2));
    }, report);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await page.screenshot({ path: 'test-screenshots/error-final.png' });
  } finally {
    console.log('\n⏳ Browser will stay open for 20 seconds for inspection...');
    await page.waitForTimeout(20000);
    await browser.close();
    console.log('✅ Test complete!');
  }
}

completeSupplierFix();

