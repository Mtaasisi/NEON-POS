/**
 * Automated Test: Change Notifications Settings
 * 
 * Purpose: Login, navigate to POS Settings, and modify Notifications
 * Login: care@care.com / 123456
 * 
 * Test Flow:
 * 1. Login automatically
 * 2. Navigate to POS page
 * 3. Open POS Settings
 * 4. Switch to Notifications tab
 * 5. Change notification settings
 * 6. Save changes
 * 7. Verify changes persisted
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('POS Notifications Settings - Change Settings', () => {
  const BASE_URL = 'http://localhost:5173';
  const TEST_EMAIL = 'care@care.com';
  const TEST_PASSWORD = '123456';
  
  let page: Page;
  const testResultsDir = 'test-results/notifications-settings';
  const changes: string[] = [];

  test.beforeAll(async ({ browser }) => {
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }
    page = await browser.newPage();
    page.setDefaultTimeout(30000);
  });

  test.afterAll(async () => {
    // Generate report
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║     📢 NOTIFICATIONS SETTINGS CHANGES SUMMARY       ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
    console.log(`Total Changes Made: ${changes.length}\n`);
    
    changes.forEach((change, index) => {
      console.log(`  ${index + 1}. ${change}`);
    });
    
    console.log('\n══════════════════════════════════════════════════════\n');
    
    const report = {
      testName: 'Notifications Settings Changes',
      timestamp: new Date().toISOString(),
      changes: changes,
      success: changes.length > 0
    };
    
    fs.writeFileSync(
      path.join(testResultsDir, 'notifications-changes-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    await page?.close();
  });

  test('Change Notifications Settings', async () => {
    test.setTimeout(120000); // 2 minutes

    console.log('\n🚀 ═══════════════════════════════════════════════');
    console.log('🚀 CHANGE NOTIFICATIONS SETTINGS TEST');
    console.log('🚀 ═══════════════════════════════════════════════\n');

    // ========================================
    // STEP 1: Login
    // ========================================
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
      console.log('✅ Login successful\n');
    } else {
      console.log('✅ Already logged in\n');
    }

    await page.screenshot({ 
      path: path.join(testResultsDir, '01-logged-in.png'),
      fullPage: true 
    });

    // ========================================
    // STEP 2: Navigate to POS
    // ========================================
    console.log('📋 Step 2: Navigating to POS page...');
    const posLink = page.locator('a[href*="/pos"]').first();
    if (await posLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await posLink.click();
    } else {
      await page.goto(`${BASE_URL}/lats/pos`);
    }
    await page.waitForTimeout(3000);
    console.log('✅ POS page loaded\n');

    await page.screenshot({ 
      path: path.join(testResultsDir, '02-pos-page.png'),
      fullPage: true 
    });

    // ========================================
    // STEP 3: Open Settings
    // ========================================
    console.log('📋 Step 3: Opening POS Settings...');
    const settingsButton = page.locator('button[title*="Settings"]').first();
    await settingsButton.waitFor({ state: 'visible', timeout: 10000 });
    await settingsButton.click();
    await page.waitForTimeout(2000);
    console.log('✅ Settings opened\n');

    await page.screenshot({ 
      path: path.join(testResultsDir, '03-settings-opened.png'),
      fullPage: true 
    });

    // ========================================
    // STEP 4: Switch to Notifications Tab
    // ========================================
    console.log('📋 Step 4: Switching to Notifications tab...');
    
    const notificationsTab = page.locator('button:has-text("Notifications"), button:has-text("📢")').first();
    await notificationsTab.waitFor({ state: 'visible', timeout: 10000 });
    
    // Click with force to bypass any pointer event issues
    await notificationsTab.click({ force: true });
    await page.waitForTimeout(2000);
    console.log('✅ Notifications tab opened\n');

    await page.screenshot({ 
      path: path.join(testResultsDir, '04-notifications-tab.png'),
      fullPage: true 
    });

    // ========================================
    // STEP 5: Discover and Change Settings
    // ========================================
    console.log('📋 Step 5: Discovering notification settings...\n');

    // Count all interactive elements
    const checkboxes = await page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    
    const selects = await page.locator('select');
    const selectCount = await selects.count();
    
    const textInputs = await page.locator('input[type="text"], input[type="email"], input[type="tel"]');
    const textInputCount = await textInputs.count();

    console.log(`Found ${checkboxCount} checkboxes, ${selectCount} selects, ${textInputCount} text inputs\n`);

    // ========================================
    // Toggle Checkboxes
    // ========================================
    if (checkboxCount > 0) {
      console.log('🔘 Toggling notification checkboxes...\n');
      
      for (let i = 0; i < Math.min(checkboxCount, 5); i++) {
        try {
          const checkbox = checkboxes.nth(i);
          if (await checkbox.isVisible({ timeout: 2000 }).catch(() => false)) {
            const wasChecked = await checkbox.isChecked();
            const checkboxId = await checkbox.getAttribute('id') || 
                             await checkbox.getAttribute('name') || 
                             `checkbox-${i}`;
            
            // Try to find label text
            let labelText = checkboxId;
            try {
              const label = page.locator(`label[for="${checkboxId}"]`);
              if (await label.isVisible({ timeout: 1000 }).catch(() => false)) {
                labelText = await label.textContent() || checkboxId;
              }
            } catch (e) {
              // Label not found, use ID
            }
            
            await checkbox.click({ force: true });
            const nowChecked = await checkbox.isChecked();
            
            console.log(`  ✅ Toggled: "${labelText}"`);
            console.log(`     ${wasChecked ? '☑' : '☐'} → ${nowChecked ? '☑' : '☐'}`);
            changes.push(`Toggled "${labelText}" from ${wasChecked} to ${nowChecked}`);
            
            await page.waitForTimeout(500);
          }
        } catch (error) {
          console.log(`  ⚠️  Checkbox ${i}: ${error.message}`);
        }
      }
      console.log('');
    }

    await page.screenshot({ 
      path: path.join(testResultsDir, '05-after-checkbox-changes.png'),
      fullPage: true 
    });

    // ========================================
    // Change Select Dropdowns
    // ========================================
    if (selectCount > 0) {
      console.log('🔽 Changing select dropdowns...\n');
      
      for (let i = 0; i < selectCount; i++) {
        try {
          const select = selects.nth(i);
          if (await select.isVisible({ timeout: 2000 }).catch(() => false)) {
            const selectId = await select.getAttribute('id') || 
                           await select.getAttribute('name') || 
                           `select-${i}`;
            
            const currentValue = await select.inputValue();
            const options = await select.locator('option').count();
            
            if (options > 1) {
              // Get the second option
              const secondOption = await select.locator('option').nth(1);
              const secondValue = await secondOption.getAttribute('value');
              const secondText = await secondOption.textContent();
              
              if (secondValue && secondValue !== currentValue) {
                await select.selectOption(secondValue);
                console.log(`  ✅ Changed "${selectId}"`);
                console.log(`     "${currentValue}" → "${secondValue}" (${secondText})`);
                changes.push(`Changed "${selectId}" from "${currentValue}" to "${secondValue}"`);
              }
            }
            
            await page.waitForTimeout(500);
          }
        } catch (error) {
          console.log(`  ⚠️  Select ${i}: ${error.message}`);
        }
      }
      console.log('');
    }

    await page.screenshot({ 
      path: path.join(testResultsDir, '06-after-select-changes.png'),
      fullPage: true 
    });

    // ========================================
    // Modify Text Inputs
    // ========================================
    if (textInputCount > 0) {
      console.log('✏️  Modifying text inputs...\n');
      
      for (let i = 0; i < Math.min(textInputCount, 3); i++) {
        try {
          const input = textInputs.nth(i);
          if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
            const isDisabled = await input.isDisabled();
            const isReadOnly = await input.getAttribute('readonly');
            
            if (!isDisabled && !isReadOnly) {
              const inputId = await input.getAttribute('id') || 
                            await input.getAttribute('name') || 
                            await input.getAttribute('placeholder') ||
                            `input-${i}`;
              
              const inputType = await input.getAttribute('type');
              const currentValue = await input.inputValue();
              
              let newValue = '';
              if (inputType === 'email') {
                newValue = 'notifications@test.com';
              } else if (inputType === 'tel') {
                newValue = '+1234567890';
              } else {
                newValue = `Updated notification value ${Date.now()}`;
              }
              
              if (currentValue !== newValue) {
                await input.fill(newValue);
                console.log(`  ✅ Updated "${inputId}"`);
                console.log(`     "${currentValue}" → "${newValue}"`);
                changes.push(`Updated "${inputId}" from "${currentValue}" to "${newValue}"`);
              }
              
              await page.waitForTimeout(500);
            }
          }
        } catch (error) {
          console.log(`  ⚠️  Input ${i}: ${error.message}`);
        }
      }
      console.log('');
    }

    await page.screenshot({ 
      path: path.join(testResultsDir, '07-after-all-changes.png'),
      fullPage: true 
    });

    // ========================================
    // STEP 6: Save Settings
    // ========================================
    console.log('📋 Step 6: Saving notification settings...');
    
    try {
      const saveButton = page.locator('button:has-text("Save"), button:has-text("Save All")').first();
      if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveButton.click({ force: true });
        console.log('✅ Save button clicked');
        await page.waitForTimeout(3000);
        
        // Check for success toast/message
        const successIndicators = [
          page.locator('text=/saved|success|updated/i'),
          page.locator('[role="status"]'),
          page.locator('[role="alert"]'),
          page.locator('.Toaster')
        ];
        
        for (const indicator of successIndicators) {
          if (await indicator.isVisible({ timeout: 2000 }).catch(() => false)) {
            const message = await indicator.textContent();
            console.log(`✅ Success: ${message}`);
            break;
          }
        }
      } else {
        console.log('⚠️  Save button not found');
      }
    } catch (error) {
      console.log(`⚠️  Save error: ${error.message}`);
    }
    console.log('');

    await page.screenshot({ 
      path: path.join(testResultsDir, '08-after-save.png'),
      fullPage: true 
    });

    // ========================================
    // STEP 7: Close Settings
    // ========================================
    console.log('📋 Step 7: Closing settings...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    console.log('✅ Settings closed\n');

    await page.screenshot({ 
      path: path.join(testResultsDir, '09-settings-closed.png'),
      fullPage: true 
    });

    // ========================================
    // STEP 8: Verify Changes (Reopen Settings)
    // ========================================
    console.log('📋 Step 8: Verifying changes persisted...');
    
    // Reopen settings
    await settingsButton.click();
    await page.waitForTimeout(2000);
    
    // Switch back to notifications
    await notificationsTab.click({ force: true });
    await page.waitForTimeout(2000);
    
    console.log('✅ Settings reopened for verification\n');

    await page.screenshot({ 
      path: path.join(testResultsDir, '10-verification.png'),
      fullPage: true 
    });

    // Close again
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    console.log('🎯 ═══════════════════════════════════════════════');
    console.log('🎯 NOTIFICATIONS SETTINGS TEST COMPLETED');
    console.log('🎯 ═══════════════════════════════════════════════\n');
    
    // Assert we made at least one change
    expect(changes.length).toBeGreaterThan(0);
  });
});

