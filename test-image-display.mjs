#!/usr/bin/env node

import { chromium } from 'playwright';

async function testImageDisplay() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  let errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log(`❌ ${msg.text().substring(0, 150)}`);
    }
    if (msg.text().includes('image') || msg.text().includes('Image')) {
      console.log(`📸 ${msg.text()}`);
    }
  });
  
  console.log('🔐 Logging in...');
  await page.goto('http://localhost:3000');
  await page.fill('input[type="email"]', 'care@care.com');
  await page.fill('input[type="password"]', '123456');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  
  console.log('\n📦 Going to inventory...');
  await page.goto('http://localhost:3000/inventory');
  await page.waitForTimeout(5000);
  
  console.log('\n🔍 Looking for Min Mac A1347 product...');
  try {
    // Click on the product to open modal
    await page.click('text=Min Mac A1347');
    await page.waitForTimeout(2000);
    
    console.log('✅ Product modal opened');
    
    // Take screenshot
    await page.screenshot({ path: 'test-product-modal.png', fullPage: true });
    
    // Check if image element exists
    const imageElement = await page.locator('img[alt="Min Mac A1347"]').first();
    const imageCount = await imageElement.count();
    
    console.log(`\n📊 Image analysis:`);
    console.log(`  - Image elements found: ${imageCount}`);
    
    if (imageCount > 0) {
      const src = await imageElement.getAttribute('src');
      console.log(`  - Image src: ${src?.substring(0, 80)}...`);
      
      const isVisible = await imageElement.isVisible();
      console.log(`  - Image visible: ${isVisible}`);
      
      if (isVisible) {
        const naturalWidth = await imageElement.evaluate(el => el.naturalWidth);
        const naturalHeight = await imageElement.evaluate(el => el.naturalHeight);
        console.log(`  - Image dimensions: ${naturalWidth}x${naturalHeight}`);
        
        if (naturalWidth === 0 || naturalHeight === 0) {
          console.log(`  ❌ Image failed to load (0x0 dimensions)`);
        } else {
          console.log(`  ✅ Image loaded successfully`);
        }
      }
    } else {
      console.log(`  ❌ No image element found`);
    }
    
  } catch (err) {
    console.log('❌ Error:', err.message);
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  Console errors: ${errors.length}`);
  console.log(`  Screenshot saved: test-product-modal.png`);
  
  console.log('\n⏳ Keeping browser open for 15 seconds...');
  await page.waitForTimeout(15000);
  
  await browser.close();
}

testImageDisplay().catch(console.error);

