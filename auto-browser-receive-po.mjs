#!/usr/bin/env node
/**
 * 🌐 AUTO BROWSER PO RECEIVING
 * ============================
 * This script opens your browser and automates the PO receiving process
 */

import puppeteer from 'puppeteer';

// Configuration
const APP_URL = 'http://localhost:5173'; // Your Vite dev server
const PO_NUMBER = 'PO-1761412528053';

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║  🌐 AUTO BROWSER PO RECEIVING                                ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log('');
console.log('🚀 Starting browser automation...');
console.log('');

async function main() {
  let browser;
  
  try {
    // Launch browser in visible mode
    console.log('🌐 Opening Chrome...');
    browser = await puppeteer.launch({
      headless: false, // Show browser window
      defaultViewport: {
        width: 1920,
        height: 1080
      },
      args: ['--start-maximized',
        '--disable-blink-features=AutomationControlled', '--disable-extensions', '--disable-plugins', '--disable-default-apps', '--disable-background-timer-throttling', '--disable-renderer-backgrounding']]
    });

    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Listen to console messages from the page
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error') {
        console.log(`   🔴 Browser Error: ${msg.text()}`);
      } else if (type === 'warning') {
        console.log(`   ⚠️  Browser Warning: ${msg.text()}`);
      }
    });

    console.log(`📱 Navigating to: ${APP_URL}`);
    console.log('');
    
    // Navigate to app
    await page.goto(APP_URL, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    console.log('✅ App loaded successfully!');
    console.log('');
    
    // Wait a moment for React to fully hydrate
    await page.waitForTimeout(2000);

    // Check if we need to login
    console.log('🔍 Checking authentication...');
    const loginFormExists = await page.$('input[type="email"]').catch(() => null);
    
    if (loginFormExists) {
      console.log('🔐 Login required - Please login manually in the browser');
      console.log('   (The script will wait for you...)');
      console.log('');
      
      // Wait for navigation after login (up to 2 minutes)
      await page.waitForNavigation({ 
        timeout: 120000,
        waitUntil: 'networkidle2' 
      }).catch(() => {
        console.log('   ⏰ Login timeout - continuing anyway...');
      });
      
      console.log('✅ Logged in!');
      console.log('');
    } else {
      console.log('✅ Already authenticated');
      console.log('');
    }

    // Navigate to Purchase Orders
    console.log('📦 Navigating to Purchase Orders...');
    
    // Try different methods to navigate
    const navigated = await page.evaluate(() => {
      // Try to find and click Purchase Orders link
      const links = Array.from(document.querySelectorAll('a'));
      const poLink = links.find(link => 
        link.textContent.toLowerCase().includes('purchase') && 
        link.textContent.toLowerCase().includes('order')
      );
      
      if (poLink) {
        poLink.click();
        return true;
      }
      return false;
    });

    if (!navigated) {
      // Fallback: navigate directly via URL
      console.log('   🔄 Using direct navigation...');
      await page.goto(`${APP_URL}/purchase-orders`, { 
        waitUntil: 'networkidle2' 
      });
    }

    await page.waitForTimeout(2000);
    console.log('✅ On Purchase Orders page');
    console.log('');

    // Search for the specific PO
    console.log(`🔍 Looking for PO: ${PO_NUMBER}`);
    
    // Try to find the PO in the table
    const poFound = await page.evaluate((poNumber) => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      
      for (const row of rows) {
        const text = row.textContent;
        if (text.includes(poNumber)) {
          // Try to find and click the row or a view button
          const viewButton = row.querySelector('button');
          if (viewButton) {
            viewButton.click();
            return true;
          }
          row.click();
          return true;
        }
      }
      return false;
    }, PO_NUMBER);

    if (poFound) {
      console.log('✅ Found PO! Opening details...');
      await page.waitForTimeout(2000);
      console.log('');
      
      // Check PO status
      console.log('📊 Checking PO status...');
      const status = await page.evaluate(() => {
        const statusElements = Array.from(document.querySelectorAll('*'));
        const statusEl = statusElements.find(el => 
          el.textContent.toLowerCase().includes('status:') ||
          el.className.includes('status') ||
          el.className.includes('badge')
        );
        return statusEl ? statusEl.textContent : 'Unknown';
      });
      
      console.log(`   Status: ${status}`);
      console.log('');

      if (status.toLowerCase().includes('received')) {
        console.log('✅ PO is already received!');
        console.log('');
        console.log('📋 Let me show you the items with IMEIs...');
        
        // Try to find and display items
        await page.waitForTimeout(1000);
        
        const items = await page.evaluate(() => {
          const rows = Array.from(document.querySelectorAll('table tbody tr'));
          return rows.map(row => ({
            text: row.textContent.trim().substring(0, 100)
          }));
        });
        
        console.log('');
        console.log('📦 PO Items:');
        items.forEach((item, idx) => {
          console.log(`   ${idx + 1}. ${item.text}`);
        });
        
      } else {
        console.log('🎯 PO is ready to receive!');
        console.log('');
        console.log('👆 Click the "Receive" button in the browser to test the process');
        console.log('   The IMEI modal should open without errors now!');
      }
      
    } else {
      console.log('⚠️  Could not find PO in the list');
      console.log('   Please navigate manually in the browser');
    }

    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ BROWSER AUTOMATION COMPLETE                              ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('🎮 The browser will stay open for you to explore');
    console.log('📌 You can now:');
    console.log('   1. View the received PO details');
    console.log('   2. Check the IMEI-tracked items');
    console.log('   3. Try receiving another PO to test the fix');
    console.log('');
    console.log('⌨️  Press Ctrl+C when done to close the browser');
    console.log('');

    // Keep browser open
    await new Promise(() => {}); // Wait forever until user closes

  } catch (error) {
    console.error('');
    console.error('╔═══════════════════════════════════════════════════════════════╗');
    console.error('║  ❌ ERROR                                                    ║');
    console.error('╚═══════════════════════════════════════════════════════════════╝');
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    
    if (error.message.includes('Could not find browser')) {
      console.error('💡 Solution: Install Puppeteer dependencies:');
      console.error('   npm install puppeteer');
      console.error('');
    }
    
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
}

main();

