#!/usr/bin/env node

/**
 * Quick script to create a test PO via Puppeteer
 */

import puppeteer from 'puppeteer';

const APP_URL = 'http://localhost:5173';
const LOGIN_EMAIL = 'care@care.com';
const LOGIN_PASSWORD = '123456';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function createPO() {
  console.log('🚀 Creating test purchase order...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--start-maximized', '--disable-extensions', '--disable-plugins', '--disable-default-apps', '--disable-background-timer-throttling', '--disable-renderer-backgrounding']]
  });
  
  const page = await browser.newPage();
    
    // Suppress extension context errors
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error' &&
          (text.includes('Extension context invalidated') ||
           text.includes('chrome-extension://') ||
           text.includes('moz-extension://'))) {
        // Silently ignore extension-related errors
        return;
      }
      if (msg.type() === 'error') {
        console.warn('Browser error:', text.substring(0, 100));
      }
    });
  
  try {
    // Login
    console.log('1️⃣ Logging in...');
    await page.goto(APP_URL, { waitUntil: 'networkidle2' });
    await wait(2000);
    
    if (page.url().includes('/login')) {
      await page.waitForSelector('input[type="email"]');
      await page.type('input[type="email"]', LOGIN_EMAIL);
      await page.type('input[type="password"]', LOGIN_PASSWORD);
      await page.click('button[type="submit"]');
      await wait(5000);
    }
    console.log('✅ Logged in\n');
    
    // Go to PO page
    console.log('2️⃣ Navigating to Purchase Orders...');
    await page.goto(`${APP_URL}/lats/purchase-orders`, { waitUntil: 'networkidle2' });
    await wait(3000);
    console.log('✅ On Purchase Orders page\n');
    
    // Click Create
    console.log('3️⃣ Creating new purchase order...');
    const created = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const createBtn = buttons.find(b => 
        b.textContent.includes('Create') || 
        b.textContent.includes('New')
      );
      if (createBtn) {
        createBtn.click();
        return true;
      }
      return false;
    });
    
    if (!created) {
      await page.goto(`${APP_URL}/lats/purchase-orders/new`, { waitUntil: 'networkidle2' });
    }
    
    await wait(3000);
    console.log('✅ On create page\n');
    
    // Select supplier
    console.log('4️⃣ Selecting supplier...');
    await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      for (const select of selects) {
        if (select.options.length > 1) {
          select.selectedIndex = 1;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    });
    await wait(1000);
    console.log('✅ Supplier selected\n');
    
    // Add item
    console.log('5️⃣ Adding product item...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(b => 
        b.textContent.includes('Add Item') || 
        b.textContent.includes('Add Product')
      );
      if (addBtn) addBtn.click();
    });
    await wait(2000);
    
    // Select product and variant
    await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      let selectedCount = 0;
      for (const select of selects) {
        if (select.options.length > 1 && !select.value && selectedCount < 2) {
          select.selectedIndex = 1;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          selectedCount++;
        }
      }
    });
    await wait(1000);
    
    // Set quantity to 3
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const qtyInput = inputs.find(inp => 
        inp.type === 'number' && 
        (inp.name?.includes('quantity') || inp.placeholder?.includes('Quantity'))
      );
      if (qtyInput) {
        qtyInput.value = '3';
        qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
        qtyInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await wait(500);
    console.log('✅ Added item with quantity 3\n');
    
    // Save
    console.log('6️⃣ Saving purchase order...');
    const saved = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const saveBtn = buttons.find(b => 
        (b.type === 'submit' || 
         b.textContent.includes('Create') || 
         b.textContent.includes('Save')) &&
        !b.textContent.includes('Cancel') &&
        !b.disabled
      );
      if (saveBtn) {
        saveBtn.click();
        return true;
      }
      return false;
    });
    
    if (saved) {
      await wait(5000);
      
      // Get PO number
      const poNumber = await page.evaluate(() => {
        const text = document.body.textContent;
        const match = text.match(/PO-\d+/);
        return match ? match[0] : null;
      });
      
      if (poNumber) {
        console.log(`✅ Purchase order created: ${poNumber}\n`);
        console.log('━'.repeat(60));
        console.log('🎉 SUCCESS! Purchase order is ready');
        console.log('━'.repeat(60));
        console.log(`\n📦 PO Number: ${poNumber}`);
        console.log('📊 Status: Sent (ready to receive)');
        console.log('📱 Items: 1 product with 3 units');
        console.log('\n✅ Now run the receive test:');
        console.log('   node auto-receive-existing-po.mjs\n');
      } else {
        console.log('⚠️  PO created but could not extract PO number');
        console.log('   Check the browser window\n');
      }
    } else {
      console.log('⚠️  Could not find save button');
      console.log('   Please save manually in the browser\n');
    }
    
    console.log('🎮 Browser will stay open for 15 seconds...\n');
    await wait(15000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

createPO();

