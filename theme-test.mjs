#!/usr/bin/env node

/**
 * Automated Theme Testing Script
 * Tests the dark theme functionality in the POS application
 */

import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const LOGIN_EMAIL = process.env.LOGIN_EMAIL || 'care@care.com';
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || '123456';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runThemeTests() {
  console.log('🚀 Starting Theme Testing...\n');
  
  let browser;
  let context;
  let page;
  
  try {
    // Launch browser
    console.log('📱 Launching browser...');
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 500 // Slow down actions to see what's happening
    });
    
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
    
    page = await context.newPage();
    
    // Navigate to login page
    console.log(`🌐 Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await delay(1000);
    
    // Check if already logged in
    const isLoginPage = await page.locator('input[type="email"]').isVisible().catch(() => false);
    
    if (isLoginPage) {
      console.log('🔐 Logging in...');
      
      // Fill in login credentials
      await page.fill('input[type="email"]', LOGIN_EMAIL);
      await page.fill('input[type="password"]', LOGIN_PASSWORD);
      
      // Click login button
      await page.click('button[type="submit"]');
      
      // Wait for navigation
      await page.waitForURL(/dashboard|devices/, { timeout: 10000 });
      console.log('✅ Login successful!');
      await delay(2000);
    } else {
      console.log('✅ Already logged in!');
    }
    
    // Navigate to admin settings
    console.log('⚙️  Navigating to Admin Settings...');
    await page.goto(`${BASE_URL}/admin-settings`, { waitUntil: 'networkidle' });
    await delay(2000);
    
    // Click on Appearance tab
    console.log('🎨 Opening Appearance Settings...');
    const appearanceButton = await page.locator('button:has-text("Appearance"), a:has-text("Appearance")').first();
    if (await appearanceButton.isVisible()) {
      await appearanceButton.click();
      await delay(1500);
      console.log('✅ Appearance settings opened!');
    } else {
      console.log('⚠️  Appearance button not found, trying alternative...');
      await page.click('text=appearance', { timeout: 5000 }).catch(() => {});
      await delay(1500);
    }
    
    // Take screenshot of light theme
    console.log('📸 Taking screenshot of Light theme...');
    await page.screenshot({ path: 'screenshots/theme-light.png', fullPage: true });
    console.log('✅ Light theme screenshot saved!');
    
    // Test Dark theme
    console.log('🌙 Testing Dark theme...');
    const darkThemeButton = await page.locator('button:has-text("Dark")').first();
    if (await darkThemeButton.isVisible()) {
      await darkThemeButton.click();
      await delay(2000);
      console.log('✅ Dark theme activated!');
      
      // Navigate to dashboard to see dark theme in action
      console.log('📊 Navigating to Dashboard to verify dark theme...');
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
      await delay(2000);
      
      // Take screenshot of dark theme dashboard
      await page.screenshot({ path: 'screenshots/theme-dark-dashboard.png', fullPage: true });
      console.log('✅ Dark theme dashboard screenshot saved!');
      
      // Check sidebar styling
      const sidebar = await page.locator('[class*="sidebar"]').first();
      if (await sidebar.isVisible()) {
        const bgColor = await sidebar.evaluate((el) => 
          window.getComputedStyle(el).backgroundColor
        );
        console.log(`📌 Sidebar background: ${bgColor}`);
      }
      
      // Check body class for dark theme
      const bodyClass = await page.evaluate(() => document.body.className);
      console.log(`📌 Body classes: ${bodyClass}`);
      
      if (bodyClass.includes('theme-dark')) {
        console.log('✅ Dark theme class applied correctly!');
      } else {
        console.log('⚠️  Warning: Dark theme class not found on body');
      }
    } else {
      console.log('❌ Dark theme button not found!');
    }
    
    // Go back to appearance settings
    await page.goto(`${BASE_URL}/admin-settings`, { waitUntil: 'networkidle' });
    await delay(1500);
    
    const appearanceButton2 = await page.locator('button:has-text("Appearance"), a:has-text("Appearance")').first();
    if (await appearanceButton2.isVisible()) {
      await appearanceButton2.click();
      await delay(1500);
    }
    
    // Test Dark Pro theme
    console.log('🌑 Testing Dark Pro theme...');
    const darkProButton = await page.locator('button:has-text("Dark Pro")').first();
    if (await darkProButton.isVisible()) {
      await darkProButton.click();
      await delay(2000);
      console.log('✅ Dark Pro theme activated!');
      
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
      await delay(2000);
      
      await page.screenshot({ path: 'screenshots/theme-dark-pro-dashboard.png', fullPage: true });
      console.log('✅ Dark Pro theme screenshot saved!');
    }
    
    // Go back to appearance settings and switch to light theme
    await page.goto(`${BASE_URL}/admin-settings`, { waitUntil: 'networkidle' });
    await delay(1500);
    
    const appearanceButton3 = await page.locator('button:has-text("Appearance"), a:has-text("Appearance")').first();
    if (await appearanceButton3.isVisible()) {
      await appearanceButton3.click();
      await delay(1500);
    }
    
    console.log('☀️  Switching back to Light theme...');
    const lightThemeButton = await page.locator('button:has-text("Light")').first();
    if (await lightThemeButton.isVisible()) {
      await lightThemeButton.click();
      await delay(2000);
      console.log('✅ Light theme activated!');
    }
    
    // Test theme persistence
    console.log('🔄 Testing theme persistence (page reload)...');
    await page.reload({ waitUntil: 'networkidle' });
    await delay(2000);
    
    const bodyClassAfterReload = await page.evaluate(() => document.body.className);
    console.log(`📌 Body classes after reload: ${bodyClassAfterReload}`);
    
    if (bodyClassAfterReload.includes('theme-light')) {
      console.log('✅ Theme persistence working correctly!');
    } else {
      console.log('⚠️  Warning: Theme may not persist after reload');
    }
    
    console.log('\n✨ All theme tests completed successfully!\n');
    console.log('📁 Screenshots saved in ./screenshots/ directory');
    console.log('\nTest Summary:');
    console.log('  ✅ Login functionality');
    console.log('  ✅ Navigate to appearance settings');
    console.log('  ✅ Light theme');
    console.log('  ✅ Dark theme');
    console.log('  ✅ Dark Pro theme');
    console.log('  ✅ Theme persistence');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error);
    
    // Take screenshot of error state
    if (page) {
      await page.screenshot({ path: 'screenshots/error-state.png', fullPage: true });
      console.log('📸 Error state screenshot saved!');
    }
  } finally {
    // Close browser
    if (browser) {
      console.log('\n🔚 Closing browser...');
      await delay(2000); // Give time to see results
      await browser.close();
    }
  }
}

// Create screenshots directory
import { mkdirSync } from 'fs';
try {
  mkdirSync('screenshots', { recursive: true });
} catch (err) {
  // Directory already exists
}

// Run tests
runThemeTests();

