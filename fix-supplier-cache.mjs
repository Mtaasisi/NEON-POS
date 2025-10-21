import { chromium } from 'playwright';

async function fixSupplierCache() {
  console.log('🔧 Fixing supplier cache issue...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Collect console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[getProducts]') || 
        text.includes('Supplier') || 
        text.includes('supplier') ||
        text.includes('📊') ||
        text.includes('✅') && text.includes('Fetched')) {
      console.log(`   📋 ${text}`);
    }
  });
  
  try {
    console.log('1️⃣ Navigating to login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    console.log('2️⃣ Logging in...');
    await page.fill('input[type="email"]', 'care@care.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    console.log('\n3️⃣ Clearing localStorage cache...');
    await page.evaluate(() => {
      // Clear product cache
      const keys = Object.keys(localStorage);
      const productCacheKeys = keys.filter(k => 
        k.includes('product') || 
        k.includes('lats') || 
        k.includes('cache')
      );
      
      console.log('🗑️ Clearing cache keys:', productCacheKeys);
      productCacheKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`   ✅ Removed: ${key}`);
      });
      
      return productCacheKeys;
    });
    
    console.log('   ✅ Cache cleared!\n');
    
    console.log('4️⃣ Navigating to inventory page (will fetch fresh data)...');
    await page.goto('http://localhost:5173/lats/unified-inventory', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    console.log('   ⏳ Waiting for products to load from database...\n');
    await page.waitForTimeout(8000);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-screenshots/06-after-cache-clear.png', 
      fullPage: true 
    });
    console.log('   ✅ Screenshot saved: 06-after-cache-clear.png\n');
    
    console.log('5️⃣ Checking supplier data again...');
    
    // Count products
    const productCount = await page.locator('table tbody tr').count();
    console.log(`   📦 Products visible: ${productCount}`);
    
    // Check supplier cells for actual values
    const supplierData = await page.evaluate(() => {
      const supplierCells = Array.from(document.querySelectorAll('table tbody tr')).map(row => {
        const cells = row.querySelectorAll('td');
        // Try to find supplier cell (usually after category)
        for (let i = 0; i < cells.length; i++) {
          const cellText = cells[i].textContent?.trim();
          // Skip empty, N/A, and common non-supplier values
          if (cellText && 
              cellText !== 'N/A' && 
              cellText !== '' &&
              !cellText.includes('SKU') &&
              !cellText.includes('TSh') &&
              i > 2) { // Supplier usually after first few columns
            return {
              index: i,
              value: cellText,
              rowIndex: Array.from(document.querySelectorAll('table tbody tr')).indexOf(row)
            };
          }
        }
        return null;
      }).filter(Boolean);
      
      return supplierCells;
    });
    
    if (supplierData.length > 0) {
      console.log('   ✅ Supplier data found in table:');
      supplierData.slice(0, 5).forEach(item => {
        console.log(`      Row ${item.rowIndex}, Cell ${item.index}: "${item.value}"`);
      });
    } else {
      console.log('   ⚠️  No supplier data found in cells');
    }
    
    // Check for the column header
    const headers = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('table thead th')).map((th, i) => ({
        index: i,
        text: th.textContent?.trim()
      }));
    });
    
    console.log('\n   📋 Table headers:');
    headers.forEach(h => {
      const marker = h.text?.toLowerCase().includes('supplier') ? '👉' : '  ';
      console.log(`      ${marker} ${h.index}: ${h.text}`);
    });
    
    console.log('\n6️⃣ Checking if column selector is hiding supplier column...');
    
    // Check localStorage for column visibility settings
    const columnSettings = await page.evaluate(() => {
      const saved = localStorage.getItem('inventory-visible-columns');
      return saved ? JSON.parse(saved) : null;
    });
    
    if (columnSettings) {
      const supplierVisible = columnSettings.includes('supplier');
      console.log(`   ${supplierVisible ? '✅' : '❌'} Supplier column in settings: ${supplierVisible}`);
      console.log(`   📋 Visible columns: ${columnSettings.join(', ')}`);
      
      if (!supplierVisible) {
        console.log('\n   🔧 FIXING: Adding supplier to visible columns...');
        await page.evaluate(() => {
          const current = JSON.parse(localStorage.getItem('inventory-visible-columns') || '[]');
          if (!current.includes('supplier')) {
            current.push('supplier');
            localStorage.setItem('inventory-visible-columns', JSON.stringify(current));
          }
        });
        
        console.log('   🔄 Refreshing page...');
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(5000);
        
        await page.screenshot({ 
          path: 'test-screenshots/07-supplier-column-enabled.png', 
          fullPage: true 
        });
        console.log('   ✅ Screenshot: 07-supplier-column-enabled.png');
      }
    } else {
      console.log('   ℹ️  No column visibility settings found (using defaults)');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ FIX COMPLETED');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'test-screenshots/error-fix.png' });
  } finally {
    console.log('\n⏳ Keeping browser open for 15 seconds...');
    await page.waitForTimeout(15000);
    await browser.close();
  }
}

fixSupplierCache();

