import { chromium } from 'playwright';

async function testSupplierDisplay() {
  console.log('🚀 Starting automated supplier display test...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down actions to see what's happening
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Collect console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    
    // Print important logs
    if (text.includes('getProducts') || text.includes('Supplier') || text.includes('supplier')) {
      console.log(`📋 Console: ${text}`);
    }
  });
  
  // Collect network errors
  page.on('requestfailed', request => {
    console.log(`❌ Network error: ${request.url()}`);
  });
  
  try {
    console.log('1️⃣ Navigating to login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    // Take screenshot of login page
    await page.screenshot({ path: 'test-screenshots/01-login-page.png' });
    console.log('   ✅ Screenshot: 01-login-page.png');
    
    console.log('\n2️⃣ Logging in as care@care.com...');
    await page.fill('input[type="email"], input[name="email"]', 'care@care.com');
    await page.fill('input[type="password"], input[name="password"]', '123456');
    await page.screenshot({ path: 'test-screenshots/02-credentials-filled.png' });
    console.log('   ✅ Screenshot: 02-credentials-filled.png');
    
    await page.click('button[type="submit"]');
    console.log('   ⏳ Waiting for navigation...');
    await page.waitForTimeout(3000);
    
    // Take screenshot after login
    await page.screenshot({ path: 'test-screenshots/03-after-login.png' });
    console.log('   ✅ Screenshot: 03-after-login.png');
    
    console.log('\n3️⃣ Navigating to inventory page...');
    await page.goto('http://localhost:5173/lats/unified-inventory', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000); // Wait for data to load
    
    await page.screenshot({ path: 'test-screenshots/04-inventory-page-loaded.png', fullPage: true });
    console.log('   ✅ Screenshot: 04-inventory-page-loaded.png');
    
    console.log('\n4️⃣ Checking for supplier data...');
    
    // Check if products are loaded
    const productsExist = await page.locator('table tbody tr, [data-testid="product-card"]').count();
    console.log(`   📦 Found ${productsExist} product rows/cards`);
    
    // Look for supplier column in table
    const supplierColumnExists = await page.locator('th:has-text("Supplier"), th:has-text("supplier")').count() > 0;
    console.log(`   ${supplierColumnExists ? '✅' : '❌'} Supplier column exists: ${supplierColumnExists}`);
    
    // Check if supplier column is visible (if it exists)
    if (supplierColumnExists) {
      const supplierCells = await page.locator('td').evaluateAll(cells => {
        return cells
          .map(cell => cell.textContent?.trim())
          .filter(text => text && text !== 'N/A' && text !== '')
          .slice(0, 10); // Get first 10 non-empty values
      });
      
      console.log(`   📊 Sample supplier values found: ${supplierCells.length > 0 ? supplierCells.join(', ') : 'None'}`);
    }
    
    // Check console logs for our diagnostic messages
    console.log('\n5️⃣ Analyzing console logs...');
    const supplierLogs = consoleLogs.filter(log => 
      log.includes('[getProducts]') && (log.includes('supplier') || log.includes('Supplier'))
    );
    
    if (supplierLogs.length > 0) {
      console.log('   📋 Supplier-related logs found:');
      supplierLogs.forEach(log => {
        console.log(`      ${log}`);
      });
    } else {
      console.log('   ⚠️  No supplier diagnostic logs found. Page may not have loaded products yet.');
    }
    
    // Look for specific diagnostic patterns
    const supplierStatsLog = consoleLogs.find(log => log.includes('Supplier population stats'));
    if (supplierStatsLog) {
      console.log('\n   📊 SUPPLIER POPULATION STATS FOUND!');
      console.log(`      ${supplierStatsLog}`);
      
      // Find the next few logs that contain the stats
      const statsIndex = consoleLogs.indexOf(supplierStatsLog);
      for (let i = statsIndex; i < Math.min(statsIndex + 5, consoleLogs.length); i++) {
        if (consoleLogs[i].includes('Total products') || 
            consoleLogs[i].includes('Products with supplier') ||
            consoleLogs[i].includes('Products with no supplier')) {
          console.log(`      ${consoleLogs[i]}`);
        }
      }
    }
    
    // Check for products data in console
    const productsLoadedLog = consoleLogs.find(log => log.includes('Products loaded'));
    if (productsLoadedLog) {
      console.log(`\n   ✅ ${productsLoadedLog}`);
    }
    
    // Check for supplier fetch logs
    const supplierFetchLog = consoleLogs.find(log => log.includes('Fetched') && log.includes('suppliers'));
    if (supplierFetchLog) {
      console.log(`   ✅ ${supplierFetchLog}`);
    }
    
    // Wait a bit more to ensure all logs are captured
    await page.waitForTimeout(2000);
    
    // Take final screenshot
    await page.screenshot({ path: 'test-screenshots/05-final-view.png', fullPage: true });
    console.log('\n   ✅ Screenshot: 05-final-view.png');
    
    // Generate report
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Products found: ${productsExist}`);
    console.log(`Supplier column visible: ${supplierColumnExists}`);
    console.log(`Diagnostic logs captured: ${supplierLogs.length}`);
    console.log(`All console logs captured: ${consoleLogs.length}`);
    console.log('\n📸 Screenshots saved in test-screenshots/');
    console.log('='.repeat(80));
    
    // Save console logs to file
    const fs = await import('fs');
    const reportData = {
      timestamp: new Date().toISOString(),
      productsFound: productsExist,
      supplierColumnExists: supplierColumnExists,
      consoleLogs: consoleLogs,
      supplierRelatedLogs: supplierLogs
    };
    
    fs.writeFileSync(
      'test-screenshots/supplier-test-report.json',
      JSON.stringify(reportData, null, 2)
    );
    console.log('📄 Full report saved: test-screenshots/supplier-test-report.json\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'test-screenshots/error-screenshot.png' });
  } finally {
    console.log('⏳ Keeping browser open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);
    await browser.close();
    console.log('✅ Test completed!');
  }
}

testSupplierDisplay();

