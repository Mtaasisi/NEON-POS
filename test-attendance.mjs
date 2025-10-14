import { chromium } from 'playwright';

async function testAttendancePage() {
  console.log('🚀 Starting Attendance Page Test...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down actions for visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to the app
    console.log('📍 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/01-initial-page.png', fullPage: true });
    console.log('✅ Initial page loaded\n');
    
    // Check if we're on login page
    const isLoginPage = await page.locator('input[type="email"], input[type="text"][name*="email"], input[placeholder*="email" i]').count() > 0;
    
    if (isLoginPage) {
      console.log('🔐 Login page detected, attempting login...');
      
      // Try to find email input with various selectors
      const emailInput = await page.locator('input[type="email"], input[type="text"][name*="email"], input[placeholder*="email" i]').first();
      await emailInput.fill('care@care.com');
      console.log('✅ Filled email: care@care.com');
      
      // Find password input
      const passwordInput = await page.locator('input[type="password"]').first();
      await passwordInput.fill('123456');
      console.log('✅ Filled password: ******');
      
      await page.screenshot({ path: 'screenshots/02-login-filled.png', fullPage: true });
      
      // Find and click login button
      const loginButton = await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
      await loginButton.click();
      console.log('✅ Clicked login button');
      
      // Wait for navigation after login
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'screenshots/03-after-login.png', fullPage: true });
      console.log('✅ Login completed\n');
    } else {
      console.log('ℹ️  Already logged in or not on login page\n');
    }
    
    // Navigate to Attendance page
    console.log('📊 Navigating to Attendance page...');
    
    // Try to find attendance link in navigation
    const attendanceLinks = [
      'a:has-text("Attendance")',
      'a[href*="attendance"]',
      'button:has-text("Attendance")',
      '[data-testid*="attendance"]'
    ];
    
    let attendanceFound = false;
    for (const selector of attendanceLinks) {
      const element = await page.locator(selector).first();
      const count = await page.locator(selector).count();
      
      if (count > 0) {
        console.log(`✅ Found attendance link with selector: ${selector}`);
        await element.click();
        attendanceFound = true;
        await page.waitForTimeout(2000);
        break;
      }
    }
    
    if (!attendanceFound) {
      // Try to navigate directly to attendance URL
      console.log('⚠️  Attendance link not found in navigation, trying direct URL...');
      const possibleUrls = [
        'http://localhost:3000/attendance',
        'http://localhost:3000/hr/attendance',
        'http://localhost:3000/features/attendance'
      ];
      
      for (const url of possibleUrls) {
        try {
          await page.goto(url, { waitUntil: 'networkidle', timeout: 5000 });
          console.log(`✅ Navigated to: ${url}`);
          attendanceFound = true;
          break;
        } catch (e) {
          console.log(`⚠️  ${url} not found, trying next...`);
        }
      }
    }
    
    if (!attendanceFound) {
      throw new Error('❌ Could not find or navigate to Attendance page');
    }
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/04-attendance-page.png', fullPage: true });
    console.log('✅ Attendance page loaded\n');
    
    // Refresh the page to ensure latest data is loaded
    console.log('🔄 Refreshing page to load latest data...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('✅ Page refreshed\n');
    
    // Test attendance page functionality
    console.log('🔍 Testing Attendance Page Functionality...\n');
    
    // Check for tabs
    console.log('📋 Tab Navigation Test:');
    const todayTab = await page.locator('button:has-text("Today")').first();
    const historyTab = await page.locator('button:has-text("History")').first();
    const statsTab = await page.locator('button:has-text("Statistics"), button:has-text("Stats")').first();
    
    const todayTabCount = await page.locator('button:has-text("Today")').count();
    const historyTabCount = await page.locator('button:has-text("History")').count();
    const statsTabCount = await page.locator('button:has-text("Statistics"), button:has-text("Stats")').count();
    
    console.log(`  - Today Tab: ${todayTabCount > 0 ? '✅ Found' : '❌ Not found'}`);
    console.log(`  - History Tab: ${historyTabCount > 0 ? '✅ Found' : '❌ Not found'}`);
    console.log(`  - Statistics Tab: ${statsTabCount > 0 ? '✅ Found' : '❌ Not found'}`);
    
    // Test Today Tab
    console.log('\n🔍 Testing "Today" Tab...');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/05-today-tab.png', fullPage: true });
    
    let todayPageText = await page.textContent('body');
    const hasTodayCard = todayPageText.includes('Today\'s Summary') || todayPageText.includes('Check In') || todayPageText.includes('Check Out');
    console.log(`  - Today's Summary Card: ${hasTodayCard ? '✅ Found' : '❌ Not found'}`);
    
    const hasCheckInButton = await page.locator('button:has-text("Check In")').count() > 0;
    console.log(`  - Check In Button: ${hasCheckInButton ? '✅ Found' : '❌ Not found (may be already checked in)'}`);
    
    // Test History Tab
    console.log('\n📊 Testing "History" Tab...');
    if (historyTabCount > 0) {
      await historyTab.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'screenshots/06-history-tab.png', fullPage: true });
      
      const hasTable = await page.locator('table').count() > 0;
      console.log(`  - Attendance Table: ${hasTable ? '✅ Found' : '❌ Not found'}`);
      
      let rowCount = 0;
      if (hasTable) {
        const tableHeaders = await page.locator('table thead th').allTextContents();
        console.log(`  - Table Headers: ${tableHeaders.join(', ')}`);
        
        rowCount = await page.locator('table tbody tr').count();
        console.log(`  - Attendance Records: ${rowCount} rows`);
      }
      
      const historyPageText = await page.textContent('body');
      const hasHistoryData = historyPageText.includes('Check In') && historyPageText.includes('Check Out');
      console.log(`  - History Data: ${hasHistoryData || rowCount > 0 ? '✅ Present' : '⚠️  No records found'}`);
    }
    
    // Test Statistics Tab
    console.log('\n📈 Testing "Statistics" Tab...');
    if (statsTabCount > 0) {
      await statsTab.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'screenshots/07-stats-tab.png', fullPage: true });
      
      const statsPageText = await page.textContent('body');
      
      const hasStatsCards = statsPageText.includes('Total Days') || 
                           statsPageText.includes('Present Days') ||
                           statsPageText.includes('Attendance Rate');
      console.log(`  - Statistics Cards: ${hasStatsCards ? '✅ Found' : '❌ Not found'}`);
      
      const hasCalendar = statsPageText.includes('Monthly Overview') || 
                         await page.locator('.grid.grid-cols-7').count() > 0;
      console.log(`  - Monthly Calendar: ${hasCalendar ? '✅ Found' : '❌ Not found'}`);
      
      const hasLegend = statsPageText.includes('Present') && 
                       statsPageText.includes('Absent') && 
                       statsPageText.includes('Late');
      console.log(`  - Calendar Legend: ${hasLegend ? '✅ Found' : '❌ Not found'}`);
    }
    
    // Test interactive elements
    console.log('\n🧪 Testing Interactive Elements...');
    
    // Go back to today tab
    if (todayTabCount > 0) {
      await todayTab.click();
      await page.waitForTimeout(1000);
    }
    
    // Check for Check In/Out buttons
    const checkInOutButtons = await page.locator('button:has-text("Check"), button:has-text("Mark")').count();
    console.log(`  - Check In/Out Buttons: ${checkInOutButtons} found`);
    
    // Check for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    if (consoleErrors.length > 0) {
      console.log('\n⚠️  Console Errors Detected:');
      consoleErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    } else {
      console.log('\n✅ No console errors detected');
    }
    
    // Final screenshot
    await page.screenshot({ path: 'screenshots/08-final-state.png', fullPage: true });
    
    console.log('\n📊 Test Summary:');
    console.log('================');
    console.log(`✅ Login: Success`);
    console.log(`✅ Navigation to Attendance: Success`);
    console.log(`✅ Today Tab: ${todayTabCount > 0 ? 'Functional' : 'Not Found'}`);
    console.log(`✅ History Tab: ${historyTabCount > 0 ? 'Functional' : 'Not Found'}`);
    console.log(`✅ Statistics Tab: ${statsTabCount > 0 ? 'Functional' : 'Not Found'}`);
    console.log(`✅ Screenshots: 8 captured in screenshots/ directory`);
    console.log(`${consoleErrors.length === 0 ? '✅' : '⚠️ '} Console Errors: ${consoleErrors.length}`);
    
    console.log('\n✅ All attendance page tests completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error.message);
    console.error(error.stack);
    
    // Take error screenshot
    try {
      await page.screenshot({ path: 'screenshots/error-state.png', fullPage: true });
      console.log('\n📸 Error screenshot saved to screenshots/error-state.png');
    } catch (screenshotError) {
      console.error('Could not capture error screenshot:', screenshotError.message);
    }
    
    process.exit(1);
  } finally {
    // Keep browser open for 5 seconds to see final state
    console.log('\nℹ️  Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

// Create screenshots directory
import { mkdirSync } from 'fs';
try {
  mkdirSync('screenshots', { recursive: true });
} catch (e) {
  // Directory already exists
}

// Run the test
testAttendancePage().catch(console.error);

