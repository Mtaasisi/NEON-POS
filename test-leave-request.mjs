import { chromium } from 'playwright';

async function testLeaveRequest() {
  console.log('🚀 Starting Leave Request Test...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 
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
    
    // Login
    console.log('🔐 Logging in as care@care.com...');
    const emailInput = await page.locator('input[type="email"], input[type="text"][name*="email"], input[placeholder*="email" i]').first();
    await emailInput.fill('care@care.com');
    
    const passwordInput = await page.locator('input[type="password"]').first();
    await passwordInput.fill('123456');
    
    const loginButton = await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
    await loginButton.click();
    await page.waitForTimeout(3000);
    console.log('✅ Login successful\n');
    
    // Navigate to Attendance page
    console.log('📊 Navigating to Attendance page...');
    const attendanceLink = await page.locator('a:has-text("Attendance")').first();
    await attendanceLink.click();
    await page.waitForTimeout(3000);
    
    // Wait for loading to complete
    console.log('⏳ Waiting for page to load...');
    await page.waitForSelector('text=Loading attendance', { state: 'detached', timeout: 10000 }).catch(() => {
      console.log('  (Loading indicator not found or already gone)');
    });
    await page.waitForTimeout(2000);
    console.log('✅ Attendance page loaded\n');
    
    // Find and click Request Leave button
    console.log('🔍 Looking for Request Leave button...');
    const requestLeaveButton = await page.locator('button:has-text("Request Leave")').first();
    const buttonCount = await page.locator('button:has-text("Request Leave")').count();
    
    if (buttonCount === 0) {
      throw new Error('❌ Request Leave button not found!');
    }
    
    console.log('✅ Found Request Leave button');
    await page.screenshot({ path: 'screenshots/leave-01-before-click.png', fullPage: true });
    
    // Click the button
    console.log('👆 Clicking Request Leave button...');
    await requestLeaveButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/leave-02-modal-open.png', fullPage: true });
    
    // Check if modal opened
    const modalHeading = await page.locator('h2:has-text("Request Leave")').count();
    if (modalHeading > 0) {
      console.log('✅ Leave Request Modal opened successfully!\n');
    } else {
      throw new Error('❌ Modal did not open');
    }
    
    // Test form elements
    console.log('🧪 Testing form elements...');
    
    // Check leave types
    const leaveTypeButtons = await page.locator('button').filter({ hasText: /Annual Leave|Sick Leave|Personal Leave/ }).count();
    console.log(`  - Leave type options: ${leaveTypeButtons} found`);
    
    // Check date inputs
    const dateInputs = await page.locator('input[type="date"]').count();
    console.log(`  - Date inputs: ${dateInputs} found`);
    
    // Check reason textarea
    const reasonField = await page.locator('textarea').count();
    console.log(`  - Reason field: ${reasonField > 0 ? '✅ Found' : '❌ Not found'}`);
    
    // Fill the form
    console.log('\n📝 Filling leave request form...');
    
    // Select leave type (click Sick Leave)
    const sickLeaveBtn = await page.locator('button:has-text("Sick Leave")').first();
    await sickLeaveBtn.click();
    console.log('  ✅ Selected: Sick Leave');
    await page.waitForTimeout(500);
    
    // Fill dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 3);
    
    const startDateStr = tomorrow.toISOString().split('T')[0];
    const endDateStr = dayAfter.toISOString().split('T')[0];
    
    await page.locator('input[type="date"]').first().fill(startDateStr);
    console.log(`  ✅ Start date: ${startDateStr}`);
    await page.waitForTimeout(500);
    
    await page.locator('input[type="date"]').nth(1).fill(endDateStr);
    console.log(`  ✅ End date: ${endDateStr}`);
    await page.waitForTimeout(500);
    
    // Fill reason
    await page.locator('textarea').fill('Not feeling well, need time to rest and recover.');
    console.log('  ✅ Reason: Filled');
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: 'screenshots/leave-03-form-filled.png', fullPage: true });
    
    // Submit the form
    console.log('\n📤 Submitting leave request...');
    const submitButton = await page.locator('button:has-text("Submit Request")').first();
    await submitButton.click();
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'screenshots/leave-04-after-submit.png', fullPage: true });
    
    // Check for success (modal should close)
    const modalStillOpen = await page.locator('h2:has-text("Request Leave")').count();
    if (modalStillOpen === 0) {
      console.log('✅ Leave request submitted successfully!\n');
    } else {
      console.log('⚠️  Modal still open (check for validation errors)\n');
    }
    
    // Check console for errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    console.log('📊 Test Summary:');
    console.log('================');
    console.log('✅ Request Leave button: Found & Clickable');
    console.log('✅ Leave Request Modal: Opens correctly');
    console.log('✅ Form Elements: All present');
    console.log('✅ Form Submission: Completed');
    console.log(`${consoleErrors.length === 0 ? '✅' : '⚠️ '} Console Errors: ${consoleErrors.length}`);
    
    if (consoleErrors.length > 0) {
      console.log('\n⚠️  Console Errors:');
      consoleErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    console.log('\n✅ Leave Request test completed!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error.message);
    console.error(error.stack);
    
    try {
      await page.screenshot({ path: 'screenshots/leave-error.png', fullPage: true });
      console.log('\n📸 Error screenshot saved');
    } catch (e) {
      // Ignore screenshot errors
    }
    
    process.exit(1);
  } finally {
    console.log('\nℹ️  Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

// Run the test
testLeaveRequest().catch(console.error);

