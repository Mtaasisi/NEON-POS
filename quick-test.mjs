#!/usr/bin/env node

import { chromium } from 'playwright';

async function quickTest() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  let errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  
  console.log('🔐 Logging in...');
  await page.goto('http://localhost:3000');
  await page.fill('input[type="email"]', 'care@care.com');
  await page.fill('input[type="password"]', '123456');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  
  console.log('\n📦 Checking POS page...');
  await page.goto('http://localhost:3000/pos');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'test-pos.png', fullPage: true });
  const posProducts = await page.locator('button:has-text("Add to Cart"), button:has-text("Add")').count();
  console.log(`✅ POS shows ${posProducts} products`);
  
  console.log('\n📦 Checking Inventory page...');
  await page.goto('http://localhost:3000/inventory');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'test-inventory.png', fullPage: true });
  
  console.log(`\n📊 Console errors: ${errors.length}`);
  if (errors.length > 0 && errors.length <= 5) {
    errors.slice(0, 5).forEach(e => console.log(`  ❌ ${e.substring(0, 100)}`));
  } else if (errors.length > 5) {
    console.log('  (Too many errors, check screenshots for details)');
  }
  
  console.log('\n✅ Screenshots saved: test-pos.png, test-inventory.png');
  console.log('Browser will stay open for 20 seconds for inspection...\n');
  await page.waitForTimeout(20000);
  
  await browser.close();
}

quickTest().catch(console.error);

