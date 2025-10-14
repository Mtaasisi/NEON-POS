#!/usr/bin/env node

/**
 * 🧪 CONSOLE ERROR CHECK
 * Checks for JavaScript errors and console logs
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';

async function consoleErrorCheck() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  
  const consoleMessages = [];
  const networkErrors = [];
  
  // Capture console messages
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    });
  });
  
  // Capture network errors
  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
    }
  });
  
  try {
    console.log('🔍 Logging in...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'care@care.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    console.log('📦 Navigating to inventory...');
    await page.goto(`${BASE_URL}/lats/unified-inventory`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    console.log('\n📊 Console Messages:');
    consoleMessages.forEach((msg, index) => {
      const icon = msg.type === 'error' ? '❌' : msg.type === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`${icon} ${msg.type.toUpperCase()}: ${msg.text}`);
    });
    
    console.log('\n🌐 Network Errors:');
    networkErrors.forEach((error, index) => {
      console.log(`❌ ${error.status} ${error.statusText}: ${error.url}`);
    });
    
    // Check if products are loading
    console.log('\n🔍 Checking for product loading indicators...');
    
    // Look for loading states
    const isLoading = await page.locator('[class*="loading"], [class*="spinner"], [class*="skeleton"]').count();
    console.log(`Loading indicators found: ${isLoading}`);
    
    // Check for error messages
    const hasErrorMessages = await page.locator('[class*="error"], [class*="alert"]').count();
    console.log(`Error messages found: ${hasErrorMessages}`);
    
    if (hasErrorMessages > 0) {
      const errorTexts = await page.locator('[class*="error"], [class*="alert"]').allTextContents();
      console.log('Error messages:', errorTexts);
    }
    
    // Check if the inventory store is loading products
    const hasProducts = await page.evaluate(() => {
      // Check if there's a global store or state
      if (window.__REDUX_DEVTOOLS_EXTENSION__) {
        return 'Redux DevTools detected';
      }
      
      // Check localStorage
      const session = localStorage.getItem('supabase.auth.session');
      return session ? 'Session found in localStorage' : 'No session in localStorage';
    });
    
    console.log(`Browser state: ${hasProducts}`);
    
    // Take a screenshot
    await page.screenshot({ path: './console-error-check.png', fullPage: true });
    console.log('\n📸 Screenshot saved as console-error-check.png');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

consoleErrorCheck();
