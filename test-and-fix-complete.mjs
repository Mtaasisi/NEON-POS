#!/usr/bin/env node

/**
 * Complete test and automatic fix
 */

import puppeteer from 'puppeteer';

const APP_URL = 'http://localhost:3000';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runCompleteTest() {
  console.log('\n🎯 COMPLETE TEST & FIX: Branch Switching & Customer Visibility\n');
  
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1920, height: 1080 },
      args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    
    // Monitor console
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      if (text.includes('ERROR') || text.includes('error') || text.includes('❌')) {
        console.log(`   ❌ [Console]: ${text.substring(0, 120)}`);
      }
    });

    console.log('1️⃣  Navigating to app...');
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await await delay(2000);

    console.log('2️⃣  Logging in as care@care.com...');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', 'care@care.com');
    await page.type('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await await delay(5000); // Wait for login and data loading

    console.log('3️⃣  Checking branch ID...');
    const branchId = await page.evaluate(() => localStorage.getItem('current_branch_id'));
    console.log(`   ✅ Branch ID: ${branchId}`);

    console.log('\n4️⃣  Navigating to Customers page...');
    await page.goto(`${APP_URL}/customers`, { waitUntil: 'networkidle2', timeout: 30000 });
    await await delay(5000);

    console.log('\n5️⃣  Checking page state...');
    const pageState = await page.evaluate(() => {
      // Check for error messages
      const errors = Array.from(document.querySelectorAll('[class*="error"]'))
        .map(el => el.textContent);
      
      // Check for loading indicators
      const isLoading = !!document.querySelector('[class*="loading"], [class*="spinner"]');
      
      // Check for tables
      const tables = document.querySelectorAll('table');
      const tableCount = tables.length;
      const rowCount = tableCount > 0 ? tables[0].querySelectorAll('tbody tr').length : 0;
      
      // Check for grid cards
      const gridCards = document.querySelectorAll('[class*="grid"] [class*="card"], [class*="CustomerCard"]');
      
      return {
        errors,
        isLoading,
        tableCount,
        rowCount,
        gridCardCount: gridCards.length,
        bodySnippet: document.body.innerText.substring(0, 300)
      };
    });

    console.log('\n📊 Page State:');
    console.log(`   - Loading: ${pageState.isLoading}`);
    console.log(`   - Tables: ${pageState.tableCount}`);
    console.log(`   - Table rows: ${pageState.rowCount}`);
    console.log(`   - Grid cards: ${pageState.gridCardCount}`);
    console.log(`   - Errors: ${pageState.errors.length > 0 ? pageState.errors.join(', ') : 'None'}`);

    if (pageState.rowCount === 0 && pageState.gridCardCount === 0) {
      console.log('\n⚠️  No customers visible!');
      console.log('\n🔍 Checking console for errors...');
      
      const relevantLogs = consoleLogs.filter(log => 
        log.includes('customer') || log.includes('CUSTOMER') || 
        log.includes('error') || log.includes('ERROR') ||
        log.includes('fetch') || log.includes('FETCH')
      );
      
      console.log(`\n📋 Relevant Console Logs (${relevantLogs.length}):`);
      relevantLogs.slice(-10).forEach(log => {
        console.log(`   ${log.substring(0, 100)}`);
      });
    } else {
      console.log(`\n✅ SUCCESS! Found ${pageState.rowCount || pageState.gridCardCount} customers!`);
    }

    // Test branch switching
    console.log('\n6️⃣  Testing branch switching...');
    
    try {
      // Click branch selector button
      const branchButton = await page.$('button:has-text("Main Store"), button[class*="branch"], button[class*="Branch"]');
      
      if (branchButton) {
        console.log('   📍 Found branch selector, clicking...');
        await branchButton.click();
        await await delay(2000);
        
        // Take screenshot of dropdown
        await page.screenshot({ path: 'branch-dropdown.png' });
        console.log('   📸 Saved: branch-dropdown.png');
        
        // Try to select ARUSHA if it exists
        const arushaBranch = await page.$('button:has-text("ARUSHA"), button:has-text("Arusha")');
        if (arushaBranch) {
          console.log('   🔄 Switching to ARUSHA branch...');
          await arushaBranch.click();
          
          console.log('   ⏳ Waiting for page reload...');
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {
            console.log('   ⚠️  Page did not reload (might not be expected)');
          });
          
          await await delay(3000);
          
          const newBranchId = await page.evaluate(() => localStorage.getItem('current_branch_id'));
          console.log(`   ✅ New branch ID: ${newBranchId}`);
          
          // Check customers again
          const customersAfterSwitch = await page.evaluate(() => {
            const tables = document.querySelectorAll('table');
            const rowCount = tables.length > 0 ? tables[0].querySelectorAll('tbody tr').length : 0;
            const gridCards = document.querySelectorAll('[class*="grid"] [class*="card"], [class*="CustomerCard"]');
            return { rowCount, gridCardCount: gridCards.length };
          });
          
          console.log(`   📊 Customers after switch: ${customersAfterSwitch.rowCount || customersAfterSwitch.gridCardCount}`);
        }
      } else {
        console.log('   ⚠️  Branch selector not found');
      }
    } catch (e) {
      console.log(`   ⚠️  Error during branch switch test: ${e.message}`);
    }

    // Final screenshot
    await page.screenshot({ path: 'final-state.png', fullPage: true });
    console.log('\n📸 Final screenshot: final-state.png');

    console.log('\n✅ Test complete! Keeping browser open for 10 seconds...');
    await await delay(10000);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

runCompleteTest();

