/**
 * Test: Verify Tab Clicks Don't Close Modal
 * 
 * Purpose: Verify that clicking tabs in POS Settings doesn't close the popup
 * Login: care@care.com / 123456
 * 
 * Bug Fix Verification:
 * - Before: Clicking tabs closed the modal
 * - After: Tabs switch without closing modal
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('POS Settings - Tab Click Fix Verification', () => {
  const BASE_URL = 'http://localhost:5173';
  const TEST_EMAIL = 'care@care.com';
  const TEST_PASSWORD = '123456';
  
  let page: Page;
  const testResultsDir = 'test-results/tab-click-fix';

  test.beforeAll(async ({ browser }) => {
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }
    page = await browser.newPage();
    page.setDefaultTimeout(30000);
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test('Clicking tabs should NOT close the modal', async () => {
    test.setTimeout(120000);

    console.log('\n🔧 ════════════════════════════════════════════');
    console.log('🔧 TAB CLICK FIX VERIFICATION TEST');
    console.log('🔧 ════════════════════════════════════════════\n');

    // Login
    console.log('📋 Step 1: Logging in...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const isAlreadyLoggedIn = await page.locator('a[href*="pos"]').count() > 0;
    
    if (!isAlreadyLoggedIn) {
      await page.locator('input[type="email"]').first().fill(TEST_EMAIL);
      await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
      await page.locator('button[type="submit"]').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    }
    console.log('✅ Logged in\n');

    // Navigate to POS
    console.log('📋 Step 2: Navigating to POS...');
    const posLink = page.locator('a[href*="/pos"]').first();
    if (await posLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await posLink.click();
    } else {
      await page.goto(`${BASE_URL}/lats/pos`);
    }
    await page.waitForTimeout(3000);
    console.log('✅ POS page loaded\n');

    // Open Settings
    console.log('📋 Step 3: Opening POS Settings...');
    const settingsButton = page.locator('button[title*="Settings"]').first();
    await settingsButton.waitFor({ state: 'visible', timeout: 10000 });
    await settingsButton.click();
    await page.waitForTimeout(2000);
    console.log('✅ Settings opened\n');

    await page.screenshot({ 
      path: path.join(testResultsDir, '01-settings-opened.png'),
      fullPage: true 
    });

    // Get modal element
    const modal = page.locator('h2:has-text("POS Settings")').locator('..');
    
    // Verify modal is visible
    const isModalVisible = await modal.isVisible();
    console.log(`✅ Modal visible: ${isModalVisible}\n`);
    expect(isModalVisible).toBe(true);

    // Get all tabs
    const tabs = page.locator('div.flex.flex-wrap.gap-2 button');
    const tabCount = await tabs.count();
    console.log(`📋 Step 4: Testing ${tabCount} tabs...\n`);

    let allTabsWorked = true;
    const tabResults: Array<{ name: string; success: boolean }> = [];

    // Click each tab and verify modal stays open
    for (let i = 0; i < tabCount; i++) {
      const tabText = await tabs.nth(i).textContent();
      const tabName = tabText?.trim() || `Tab ${i + 1}`;
      
      console.log(`   Testing: ${tabName}`);
      
      try {
        // Click the tab
        await tabs.nth(i).click();
        await page.waitForTimeout(1000);
        
        // Check if modal is still visible
        const stillVisible = await modal.isVisible();
        
        if (stillVisible) {
          console.log(`   ✅ Modal stayed open after clicking ${tabName}`);
          tabResults.push({ name: tabName, success: true });
        } else {
          console.log(`   ❌ Modal CLOSED after clicking ${tabName} - BUG!`);
          tabResults.push({ name: tabName, success: false });
          allTabsWorked = false;
        }
        
        // Take screenshot
        await page.screenshot({ 
          path: path.join(testResultsDir, `02-after-clicking-tab-${i}.png`),
          fullPage: true 
        });
        
      } catch (error) {
        console.log(`   ⚠️ Error testing ${tabName}: ${error.message}`);
        tabResults.push({ name: tabName, success: false });
        allTabsWorked = false;
      }
      
      console.log('');
    }

    // Summary
    console.log('🎯 ════════════════════════════════════════════');
    console.log('🎯 TEST RESULTS SUMMARY');
    console.log('🎯 ════════════════════════════════════════════\n');
    
    console.log(`Total Tabs Tested: ${tabCount}`);
    console.log(`Successful: ${tabResults.filter(r => r.success).length}`);
    console.log(`Failed: ${tabResults.filter(r => !r.success).length}\n`);
    
    tabResults.forEach((result, index) => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${icon} ${result.name}`);
    });
    
    console.log('\n🎯 ════════════════════════════════════════════\n');

    if (allTabsWorked) {
      console.log('🎉 SUCCESS! All tabs work correctly - modal stays open!\n');
    } else {
      console.log('❌ FAILURE! Some tabs still close the modal - bug not fully fixed!\n');
    }

    // Verify modal is still open at the end
    const finallyVisible = await modal.isVisible();
    console.log(`Final modal state: ${finallyVisible ? 'OPEN ✅' : 'CLOSED ❌'}\n`);

    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    await page.screenshot({ 
      path: path.join(testResultsDir, '99-test-complete.png'),
      fullPage: true 
    });

    // Assert all tabs worked
    expect(allTabsWorked).toBe(true);
    expect(finallyVisible).toBe(true);
  });
});

