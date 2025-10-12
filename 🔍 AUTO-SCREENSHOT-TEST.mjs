#!/usr/bin/env node

/**
 * 🔍 AUTOMATIC SCREENSHOT TEST
 * 
 * This script will automatically navigate to the Purchase Order page,
 * take screenshots, and verify if the edit buttons are present.
 */

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Starting automatic screenshot test...\n');

const CONFIG = {
  baseUrl: 'http://localhost:3000',
  purchaseOrderId: 'PO-1760129569389',
  screenshotPath: __dirname,
  timeout: 60000
};

async function runScreenshotTest() {
  let browser = null;
  
  try {
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1920, height: 1080 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(CONFIG.timeout);

    // Track console messages and errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Browser Console Error:', msg.text());
      }
    });

    // Step 1: Navigate to base URL
    console.log('\n📄 Step 1: Navigating to base URL...');
    console.log(`URL: ${CONFIG.baseUrl}`);
    
    await page.goto(CONFIG.baseUrl, { 
      waitUntil: 'networkidle0',
      timeout: CONFIG.timeout 
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ 
      path: join(CONFIG.screenshotPath, '01-homepage.png'),
      fullPage: true 
    });
    console.log('✅ Screenshot saved: 01-homepage.png');

    // Step 2: Navigate to Purchase Orders
    console.log('\n📄 Step 2: Navigating to Purchase Orders...');
    
    const poUrl = `${CONFIG.baseUrl}/purchase-orders/${CONFIG.purchaseOrderId}`;
    console.log(`URL: ${poUrl}`);
    
    await page.goto(poUrl, { 
      waitUntil: 'networkidle0',
      timeout: CONFIG.timeout 
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ 
      path: join(CONFIG.screenshotPath, '02-purchase-order-page.png'),
      fullPage: true 
    });
    console.log('✅ Screenshot saved: 02-purchase-order-page.png');

    // Step 3: Look for inventory items table
    console.log('\n📄 Step 3: Looking for inventory items table...');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to find the table
    const hasTable = await page.evaluate(() => {
      const table = document.querySelector('table');
      return table !== null;
    });
    
    console.log(hasTable ? '✅ Table found' : '❌ Table NOT found');

    // Step 4: Check for edit buttons
    console.log('\n📄 Step 4: Checking for edit buttons...');
    
    const buttonCheck = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      const buttonTexts = allButtons.map(btn => btn.textContent.trim());
      
      return {
        totalButtons: allButtons.length,
        buttonTexts: buttonTexts,
        hasAddSerial: buttonTexts.some(text => text.includes('Add Serial')),
        hasAdd: buttonTexts.some(text => text === 'Add'),
        hasAssign: buttonTexts.some(text => text.includes('Assign')),
        hasSetPrice: buttonTexts.some(text => text.includes('Set Price')),
        hasEdit: buttonTexts.some(text => text.includes('Edit') || text.includes('✎'))
      };
    });
    
    console.log('\n📊 Button Analysis:');
    console.log('Total buttons found:', buttonCheck.totalButtons);
    console.log('Has "Add Serial" button:', buttonCheck.hasAddSerial ? '✅' : '❌');
    console.log('Has "Add" button:', buttonCheck.hasAdd ? '✅' : '❌');
    console.log('Has "Assign" button:', buttonCheck.hasAssign ? '✅' : '❌');
    console.log('Has "Set Price" button:', buttonCheck.hasSetPrice ? '✅' : '❌');
    console.log('Has "Edit" button:', buttonCheck.hasEdit ? '✅' : '❌');
    
    console.log('\n📝 All button texts found:');
    buttonCheck.buttonTexts.slice(0, 20).forEach((text, i) => {
      if (text) console.log(`  ${i + 1}. "${text}"`);
    });

    // Step 5: Check HTML structure of table
    console.log('\n📄 Step 5: Analyzing table structure...');
    
    const tableAnalysis = await page.evaluate(() => {
      const tbody = document.querySelector('tbody');
      if (!tbody) return { error: 'No tbody found' };
      
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const firstRow = rows[0];
      if (!firstRow) return { error: 'No rows found' };
      
      const cells = Array.from(firstRow.querySelectorAll('td'));
      return {
        totalRows: rows.length,
        totalCells: cells.length,
        cellContents: cells.map((cell, i) => ({
          index: i,
          html: cell.innerHTML.substring(0, 200),
          hasButton: cell.querySelector('button') !== null,
          hasSelect: cell.querySelector('select') !== null
        }))
      };
    });
    
    console.log('Table analysis:', JSON.stringify(tableAnalysis, null, 2));

    // Step 6: Take final screenshot
    console.log('\n📄 Step 6: Taking final screenshot...');
    
    await page.screenshot({ 
      path: join(CONFIG.screenshotPath, '03-final-view.png'),
      fullPage: true 
    });
    console.log('✅ Screenshot saved: 03-final-view.png');

    // Step 7: Highlight table area
    console.log('\n📄 Step 7: Highlighting table area...');
    
    await page.evaluate(() => {
      const table = document.querySelector('table');
      if (table) {
        table.style.border = '5px solid red';
        table.style.boxShadow = '0 0 20px red';
      }
    });
    
    await page.screenshot({ 
      path: join(CONFIG.screenshotPath, '04-table-highlighted.png'),
      fullPage: true 
    });
    console.log('✅ Screenshot saved: 04-table-highlighted.png');

    // Step 8: Check if functions exist in window scope
    console.log('\n📄 Step 8: Checking for JavaScript functions...');
    
    const functionCheck = await page.evaluate(() => {
      return {
        hasHandleUpdateSerialNumber: typeof window.handleUpdateSerialNumber !== 'undefined',
        hasSerialNumberService: typeof window.serialNumberService !== 'undefined',
        reactVersion: window.React?.version || 'not found'
      };
    });
    
    console.log('Function check:', functionCheck);

    // Generate report
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST REPORT');
    console.log('='.repeat(60));
    
    const allTestsPassed = 
      hasTable &&
      buttonCheck.hasAddSerial &&
      buttonCheck.hasAdd &&
      buttonCheck.hasAssign &&
      buttonCheck.hasSetPrice;
    
    if (allTestsPassed) {
      console.log('\n✅ ALL TESTS PASSED! Edit functionality is present.');
    } else {
      console.log('\n❌ TESTS FAILED! Edit functionality is missing or incomplete.');
      console.log('\nIssues found:');
      if (!hasTable) console.log('  - Table not found');
      if (!buttonCheck.hasAddSerial) console.log('  - "Add Serial" button missing');
      if (!buttonCheck.hasAdd) console.log('  - "Add" button missing');
      if (!buttonCheck.hasAssign) console.log('  - "Assign" button missing');
      if (!buttonCheck.hasSetPrice) console.log('  - "Set Price" button missing');
    }
    
    console.log('\n📸 Screenshots saved in:');
    console.log(`  ${CONFIG.screenshotPath}`);
    console.log('\n🔍 Review the screenshots to see exactly what the page looks like.');
    
    // Keep browser open for manual inspection
    console.log('\n⏸️  Browser will stay open for 30 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error('\n💥 TEST FAILED WITH ERROR:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n🔚 Browser closed.');
    }
  }
}

// Run the test
runScreenshotTest().catch(console.error);

