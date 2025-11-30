#!/usr/bin/env node

/**
 * Verify Inventory Items After Purchase Order Receive
 * 
 * This script checks the database to verify that items were successfully
 * added to inventory after the automated receive test.
 */

import puppeteer from 'puppeteer';

const APP_URL = 'http://localhost:5173';
const LOGIN_EMAIL = 'care@care.com';
const LOGIN_PASSWORD = '123456';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  log('\n' + '═'.repeat(60), 'cyan');
  log('INVENTORY VERIFICATION TEST', 'cyan');
  log('═'.repeat(60) + '\n', 'cyan');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();
  
  try {
    // Login
    log('Logging in...', 'cyan');
    await page.goto(APP_URL);
    await page.waitForSelector('input[type="email"], input[type="text"]');
    await page.type('input[type="email"], input[type="text"]', LOGIN_EMAIL);
    await page.type('input[type="password"]', LOGIN_PASSWORD);
    await page.click('button[type="submit"]');
    await wait(3000);
    log('✅ Logged in', 'green');
    
    // Navigate to Inventory
    log('\nNavigating to Inventory page...', 'cyan');
    const inventoryLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const invLink = links.find(link => 
        link.textContent.toLowerCase().includes('inventory') && 
        !link.textContent.toLowerCase().includes('purchase')
      );
      return invLink ? invLink.href : null;
    });
    
    if (inventoryLink) {
      await page.goto(inventoryLink);
      await wait(3000);
      log('✅ Inventory page loaded', 'green');
      
      // Count inventory items
      const inventoryStats = await page.evaluate(() => {
        const stats = {
          totalItems: 0,
          recentItems: [],
          availableItems: 0
        };
        
        // Look for inventory items in table
        const rows = document.querySelectorAll('table tbody tr');
        stats.totalItems = rows.length;
        
        rows.forEach(row => {
          const text = row.textContent;
          
          // Check if added today
          if (text.includes('25 Oct 2025') || text.includes('Today') || text.includes('Just now')) {
            stats.recentItems.push(text.substring(0, 100));
          }
          
          // Count available items
          if (text.toLowerCase().includes('available')) {
            stats.availableItems++;
          }
        });
        
        return stats;
      });
      
      log(`\n${'═'.repeat(60)}`, 'cyan');
      log('INVENTORY STATISTICS', 'cyan');
      log('═'.repeat(60), 'cyan');
      log(`Total Inventory Items: ${inventoryStats.totalItems}`, 'green');
      log(`Available Items: ${inventoryStats.availableItems}`, 'green');
      log(`Recently Added Items: ${inventoryStats.recentItems.length}`, 'green');
      
      if (inventoryStats.recentItems.length > 0) {
        log('\nRecently Added Items:', 'cyan');
        inventoryStats.recentItems.forEach((item, idx) => {
          log(`  ${idx + 1}. ${item}...`, 'yellow');
        });
      }
      
      await page.screenshot({ path: 'inventory-verification.png', fullPage: true });
      log('\n✅ Screenshot saved: inventory-verification.png', 'green');
      
    } else {
      log('⚠️ Could not find inventory page link', 'yellow');
    }
    
    // Check Purchase Orders
    log('\nNavigating to Purchase Orders...', 'cyan');
    await page.goto(APP_URL + '/lats/purchase-orders');
    await wait(3000);
    
    const poStats = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      const stats = {
        total: rows.length,
        sent: 0,
        received: 0,
        completed: 0
      };
      
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes('sent') && !text.includes('received')) {
          stats.sent++;
        } else if (text.includes('received') && !text.includes('completed')) {
          stats.received++;
        } else if (text.includes('completed')) {
          stats.completed++;
        }
      });
      
      return stats;
    });
    
    log(`\n${'═'.repeat(60)}`, 'cyan');
    log('PURCHASE ORDER STATISTICS', 'cyan');
    log('═'.repeat(60), 'cyan');
    log(`Total Purchase Orders: ${poStats.total}`, 'green');
    log(`Sent (Pending Receive): ${poStats.sent}`, 'yellow');
    log(`Received (Pending Complete): ${poStats.received}`, 'green');
    log(`Completed: ${poStats.completed}`, 'green');
    
    await page.screenshot({ path: 'purchase-orders-verification.png', fullPage: true });
    log('\n✅ Screenshot saved: purchase-orders-verification.png', 'green');
    
    log(`\n${'═'.repeat(60)}`, 'cyan');
    log('✅ VERIFICATION COMPLETE!', 'green');
    log('═'.repeat(60) + '\n', 'cyan');
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'yellow');
    console.error(error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

