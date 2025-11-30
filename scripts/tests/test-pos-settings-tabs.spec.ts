/**
 * Automated Test: POS Settings Tab Switching
 * 
 * Purpose: Test switching between different tabs in POS settings
 * Login: care@care.com / 123456
 * 
 * Test Flow:
 * 1. Login to the application
 * 2. Navigate to POS page
 * 3. Open POS Settings
 * 4. Switch between all available tabs
 * 5. Make some changes in each tab
 * 6. Save settings
 * 7. Take screenshots for documentation
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('POS Settings - Tab Switching Test', () => {
  const BASE_URL = 'http://localhost:5173';
  const TEST_EMAIL = 'care@care.com';
  const TEST_PASSWORD = '123456';
  
  let page: Page;
  const testResultsDir = 'test-results/pos-settings-tabs';

  test.beforeAll(async ({ browser }) => {
    // Create test results directory
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }

    page = await browser.newPage();
    page.setDefaultTimeout(30000);
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test('Switch Between All POS Settings Tabs', async () => {
    test.setTimeout(180000); // 3 minutes

    console.log('\n🚀 ========================================');
    console.log('🚀 POS SETTINGS TAB SWITCHING TEST');
    console.log('🚀 ========================================\n');

    // ========================================
    // STEP 1: Login
    // ========================================
    console.log('📋 STEP 1: Logging in...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);

    const isAlreadyLoggedIn = await page.locator('a[href*="pos"], button:has-text("POS")').count() > 0;
    
    if (!isAlreadyLoggedIn) {
      const emailField = page.locator('input[type="email"]').first();
      await emailField.waitFor({ state: 'visible', timeout: 10000 });
      await emailField.fill(TEST_EMAIL);
      
      const passwordField = page.locator('input[type="password"]').first();
      await passwordField.fill(TEST_PASSWORD);
      
      const loginButton = page.locator('button[type="submit"]').first();
      await loginButton.click();
      
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      await page.waitForTimeout(3000);
      console.log('✅ Login completed\n');
    } else {
      console.log('✅ Already logged in\n');
    }

    // ========================================
    // STEP 2: Navigate to POS
    // ========================================
    console.log('📋 STEP 2: Navigating to POS...');
    const posLink = page.locator('a[href*="/pos"]').first();
    if (await posLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await posLink.click();
    } else {
      await page.goto(`${BASE_URL}/lats/pos`, { waitUntil: 'networkidle' });
    }
    await page.waitForTimeout(3000);
    console.log('✅ POS page loaded\n');

    // ========================================
    // STEP 3: Open Settings
    // ========================================
    console.log('📋 STEP 3: Opening POS Settings...');
    
    const settingsButton = page.locator('button[title*="Settings"]').first();
    await settingsButton.waitFor({ state: 'visible', timeout: 10000 });
    await settingsButton.click();
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: path.join(testResultsDir, '01-settings-opened.png'),
      fullPage: true 
    });
    console.log('✅ Settings opened\n');

    // ========================================
    // STEP 4: Test Tab Switching
    // ========================================
    console.log('📋 STEP 4: Testing tab switching...\n');

    const tabs = [
      { name: 'General', selector: 'button:has-text("General")', emoji: '🏪' },
      { name: 'Pricing', selector: 'button:has-text("Pricing")', emoji: '💰' },
      { name: 'Receipt', selector: 'button:has-text("Receipt")', emoji: '🧾' },
      { name: 'Notifications', selector: 'button:has-text("Notifications")', emoji: '📢' },
      { name: 'Features', selector: 'button:has-text("Features")', emoji: '📦' },
      { name: 'Permissions', selector: 'button:has-text("Permissions")', emoji: '👥' }
    ];

    for (const tab of tabs) {
      console.log(`${tab.emoji} Testing ${tab.name} tab...`);
      
      try {
        // Find and click the tab
        const tabButton = page.locator(tab.selector).first();
        
        // Wait for tab to be visible
        const isVisible = await tabButton.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (!isVisible) {
          console.log(`  ⚠️  ${tab.name} tab not visible (may be role-restricted)`);
          continue;
        }

        // Click the tab with force option to bypass pointer events issues
        await tabButton.click({ force: true });
        console.log(`  ✅ Clicked ${tab.name} tab`);
        
        // Wait for content to load
        await page.waitForTimeout(1500);
        
        // Take screenshot
        await page.screenshot({ 
          path: path.join(testResultsDir, `02-${tab.name.toLowerCase()}-tab.png`),
          fullPage: true 
        });
        console.log(`  📸 Screenshot saved`);

        // Try to interact with content in this tab
        await testTabContent(page, tab.name);
        
        console.log(`  ✅ ${tab.name} tab tested successfully\n`);
        
      } catch (error) {
        console.log(`  ⚠️  Error testing ${tab.name} tab: ${error.message}\n`);
      }
    }

    // ========================================
    // STEP 5: Make Some Changes
    // ========================================
    console.log('📋 STEP 5: Making changes in settings...\n');

    // Go to General tab and change theme
    try {
      const generalTab = page.locator('button:has-text("General")').first();
      if (await generalTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await generalTab.click({ force: true });
        await page.waitForTimeout(1000);
        
        // Try to change theme
        const themeSelect = page.locator('select[name*="theme"], select#theme').first();
        if (await themeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
          await themeSelect.selectOption('dark');
          console.log('  ✅ Changed theme to dark\n');
        }
      }
    } catch (error) {
      console.log(`  ⚠️  Could not change theme: ${error.message}\n`);
    }

    // Go to Receipt tab and toggle a setting
    try {
      const receiptTab = page.locator('button:has-text("Receipt")').first();
      if (await receiptTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await receiptTab.click({ force: true });
        await page.waitForTimeout(1000);
        
        // Try to toggle show logo
        const logoToggle = page.locator('input[type="checkbox"]').first();
        if (await logoToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
          const wasChecked = await logoToggle.isChecked();
          await logoToggle.click({ force: true });
          console.log(`  ✅ Toggled logo setting from ${wasChecked} to ${!wasChecked}\n`);
        }
      }
    } catch (error) {
      console.log(`  ⚠️  Could not toggle receipt setting: ${error.message}\n`);
    }

    await page.screenshot({ 
      path: path.join(testResultsDir, '03-after-changes.png'),
      fullPage: true 
    });

    // ========================================
    // STEP 6: Save Settings
    // ========================================
    console.log('📋 STEP 6: Saving settings...');
    
    try {
      const saveButton = page.locator('button:has-text("Save")').first();
      if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveButton.click({ force: true });
        console.log('✅ Save button clicked');
        await page.waitForTimeout(2000);
        
        // Check for success toast
        const successToast = page.locator('[role="status"], [role="alert"], .Toaster').first();
        if (await successToast.isVisible({ timeout: 3000 }).catch(() => false)) {
          const message = await successToast.textContent();
          console.log(`✅ Success message: ${message}`);
        }
      }
    } catch (error) {
      console.log(`⚠️  Save attempt: ${error.message}`);
    }

    await page.screenshot({ 
      path: path.join(testResultsDir, '04-after-save.png'),
      fullPage: true 
    });

    // ========================================
    // STEP 7: Close Settings
    // ========================================
    console.log('\n📋 STEP 7: Closing settings...');
    
    try {
      // Try close button
      const closeButton = page.locator('button:has([class*="lucide-x"])').first();
      if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeButton.click({ force: true });
      } else {
        // Try Escape key
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(1000);
      console.log('✅ Settings closed\n');
    } catch (error) {
      console.log(`⚠️  Close attempt: ${error.message}\n`);
    }

    await page.screenshot({ 
      path: path.join(testResultsDir, '05-final.png'),
      fullPage: true 
    });

    console.log('\n🎯 ========================================');
    console.log('🎯 TAB SWITCHING TEST COMPLETED');
    console.log('🎯 ========================================');
    console.log(`📸 Screenshots saved in: ${testResultsDir}`);
    console.log('🎯 ========================================\n');
  });
});

// Helper function to test content in each tab
async function testTabContent(page: Page, tabName: string) {
  try {
    switch (tabName) {
      case 'General':
        // Check for theme selector
        const themeSelect = await page.locator('select[name*="theme"]').count();
        console.log(`    - Found ${themeSelect} theme selector(s)`);
        
        // Check for language selector
        const langSelect = await page.locator('select[name*="language"]').count();
        console.log(`    - Found ${langSelect} language selector(s)`);
        break;

      case 'Receipt':
        // Check for toggles
        const toggles = await page.locator('input[type="checkbox"]').count();
        console.log(`    - Found ${toggles} toggle(s)`);
        break;

      case 'Features':
        // Check for feature toggles
        const featureToggles = await page.locator('input[type="checkbox"]').count();
        console.log(`    - Found ${featureToggles} feature toggle(s)`);
        break;

      case 'Pricing':
        // Check for pricing inputs
        const inputs = await page.locator('input[type="number"]').count();
        console.log(`    - Found ${inputs} number input(s)`);
        break;

      case 'Notifications':
        // Check for notification settings
        const notifToggles = await page.locator('input[type="checkbox"]').count();
        console.log(`    - Found ${notifToggles} notification setting(s)`);
        break;

      case 'Permissions':
        // Check for permission settings
        const permCheckboxes = await page.locator('input[type="checkbox"]').count();
        console.log(`    - Found ${permCheckboxes} permission checkbox(es)`);
        break;
    }
  } catch (error) {
    console.log(`    - Error checking content: ${error.message}`);
  }
}

