#!/usr/bin/env node

import { chromium } from 'playwright';

async function diagnose() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  let errorTypes = {};
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Categorize errors
      if (text.includes('thumbnail_url')) errorTypes['thumbnail_url'] = (errorTypes['thumbnail_url'] || 0) + 1;
      else if (text.includes('general_settings')) errorTypes['general_settings'] = (errorTypes['general_settings'] || 0) + 1;
      else if (text.includes('Failed to fetch')) errorTypes['failed_to_fetch'] = (errorTypes['failed_to_fetch'] || 0) + 1;
      else if (text.includes('connecting to database')) errorTypes['db_connection'] = (errorTypes['db_connection'] || 0) + 1;
      else errorTypes['other'] = (errorTypes['other'] || 0) + 1;
      
      // Print first 5 errors
      if (Object.values(errorTypes).reduce((a,b) => a+b, 0) <= 5) {
        console.log(`❌ ${text.substring(0, 150)}`);
      }
    }
  });
  
  console.log('🔐 Logging in...');
  await page.goto('http://localhost:3000');
  await page.fill('input[type="email"]', 'care@care.com');
  await page.fill('input[type="password"]', '123456');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  
  console.log('\n📦 Going to POS page...');
  await page.goto('http://localhost:3000/pos');
  await page.waitForTimeout(5000);
  
  console.log('\n📊 Error Summary:');
  for (const [type, count] of Object.entries(errorTypes)) {
    console.log(`  ${type}: ${count}`);
  }
  
  console.log('\n✅ Test complete!');
  await browser.close();
}

diagnose().catch(console.error);

