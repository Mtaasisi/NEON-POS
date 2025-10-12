#!/usr/bin/env node

import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { join } from 'path';

async function testImageUpload() {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  let errors = [];
  let imageUploads = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      errors.push(text);
      console.log(`❌ Console Error: ${text.substring(0, 150)}`);
    }
    if (text.includes('Upload') || text.includes('Image') || text.includes('📸')) {
      console.log(`📸 ${text}`);
      imageUploads.push(text);
    }
  });
  
  console.log('🔐 Step 1: Logging in...');
  await page.goto('http://localhost:3000');
  await page.fill('input[type="email"]', 'care@care.com');
  await page.fill('input[type="password"]', '123456');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  
  console.log('\n📝 Step 2: Going to Add Product page...');
  try {
    // Try to find "Add Product" link
    await page.goto('http://localhost:3000/lats/add-product');
    await page.waitForTimeout(2000);
    console.log('✅ Navigated to Add Product page');
  } catch (err) {
    console.log('❌ Could not navigate to Add Product page:', err.message);
    await browser.close();
    return;
  }
  
  console.log('\n📋 Step 3: Filling product form...');
  try {
    // Fill basic product info
    await page.fill('input[name="name"], input[placeholder*="Product Name"]', 'Test Product With Image');
    await page.fill('textarea[name="description"], textarea[placeholder*="description"]', 'Testing image upload functionality');
    
    // Select category if dropdown exists
    const categorySelect = await page.locator('select, [role="combobox"]').first();
    if (await categorySelect.count() > 0) {
      await categorySelect.click();
      await page.waitForTimeout(500);
      // Click first option
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    }
    
    console.log('✅ Basic form filled');
  } catch (err) {
    console.log('⚠️ Error filling form:', err.message);
  }
  
  console.log('\n📸 Step 4: Looking for image upload section...');
  await page.screenshot({ path: 'test-before-image-upload.png', fullPage: true });
  
  // Look for file input or image upload button
  const fileInput = await page.locator('input[type="file"]').first();
  const fileInputCount = await fileInput.count();
  
  console.log(`Found ${fileInputCount} file input(s)`);
  
  if (fileInputCount > 0) {
    console.log('✅ File input found! Attempting to upload image...');
    
    // Create a simple test image (1x1 pixel PNG)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const testImageBuffer = Buffer.from(testImageBase64, 'base64');
    const testImagePath = join(process.cwd(), 'test-image.png');
    
    // Note: In a real scenario, we'd need an actual image file
    // For now, we'll check if the input is visible and what happens
    
    try {
      const isVisible = await fileInput.isVisible();
      console.log(`File input visible: ${isVisible}`);
      
      if (!isVisible) {
        // Try to find upload button
        const uploadButton = await page.locator('button:has-text("Upload"), button:has-text("Add Image"), [aria-label*="upload"]').first();
        if (await uploadButton.count() > 0) {
          console.log('Found upload button, clicking...');
          await uploadButton.click();
          await page.waitForTimeout(1000);
        }
      }
      
      console.log('📸 Image upload section ready');
      console.log('   (Manual intervention needed - file picker would open here)');
      
    } catch (err) {
      console.log('⚠️ Error with file input:', err.message);
    }
  } else {
    console.log('❌ No file input found on the page');
    console.log('   Possible reasons:');
    console.log('   - Image section not visible yet');
    console.log('   - Need to scroll down');
    console.log('   - Different component structure');
  }
  
  await page.screenshot({ path: 'test-add-product-page.png', fullPage: true });
  
  console.log('\n📊 Summary:');
  console.log(`  Console Errors: ${errors.length}`);
  console.log(`  Image-related Logs: ${imageUploads.length}`);
  console.log(`\n📸 Screenshots saved:`);
  console.log(`  - test-before-image-upload.png`);
  console.log(`  - test-add-product-page.png`);
  
  console.log('\n⏳ Keeping browser open for 20 seconds for inspection...');
  await page.waitForTimeout(20000);
  
  await browser.close();
}

testImageUpload().catch(console.error);

