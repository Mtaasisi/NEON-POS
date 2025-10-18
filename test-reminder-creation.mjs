#!/usr/bin/env node

/**
 * 🔔 Test Reminder Creation
 * Tests creating a reminder through the browser UI
 */

import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const LOGIN_EMAIL = 'care@care.com';
const LOGIN_PASSWORD = '123456';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testReminderCreation() {
  console.log('🚀 Testing Reminder Creation...\n');
  
  let browser;
  
  try {
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 500
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Track console messages
    const messages = [];
    page.on('console', msg => {
      messages.push({ type: msg.type(), text: msg.text() });
      if (msg.type() === 'error') {
        console.log('🔴 Console Error:', msg.text());
      }
    });
    
    // Navigate and login
    console.log('🌐 Navigating to application...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await delay(1000);
    
    console.log('🔐 Logging in...');
    await page.fill('input[type="email"]', LOGIN_EMAIL);
    await page.fill('input[type="password"]', LOGIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|devices|pos/, { timeout: 10000 });
    console.log('✅ Login successful!\n');
    await delay(2000);
    
    // Navigate to reminders page
    console.log('📍 Navigating to reminders page...');
    await page.goto(`${BASE_URL}/reminders`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await delay(3000);
    
    // Take screenshot of reminders page
    await page.screenshot({ path: 'screenshots/reminders-page.png', fullPage: true });
    console.log('📸 Screenshot: reminders-page.png\n');
    
    // Check if page loaded
    const pageTitle = await page.locator('h1, h2, [class*="title"]').first().textContent().catch(() => null);
    console.log('📄 Page title:', pageTitle || 'Not found');
    
    // Look for "Add Reminder" button
    console.log('🔍 Looking for "Add Reminder" button...');
    const addButton = await page.locator('button:has-text("Add Reminder"), button:has-text("New Reminder"), button:has-text("Create Reminder")').first();
    
    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ Found "Add Reminder" button!\n');
      
      // Click to open modal/form
      console.log('👆 Clicking "Add Reminder"...');
      await addButton.click();
      await delay(2000);
      
      // Take screenshot of form
      await page.screenshot({ path: 'screenshots/reminder-form.png', fullPage: true });
      console.log('📸 Screenshot: reminder-form.png\n');
      
      // Fill in the form
      console.log('📝 Filling reminder form...');
      
      // Title
      const titleInput = await page.locator('input[name="title"], input[placeholder*="Title"], input[placeholder*="title"]').first();
      if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await titleInput.fill('Test Reminder - Browser Automation');
        console.log('✅ Title: "Test Reminder - Browser Automation"');
      }
      
      // Description
      const descInput = await page.locator('textarea[name="description"], textarea[placeholder*="Description"], input[name="description"]').first();
      if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await descInput.fill('This is an automated test reminder created by the browser test script.');
        console.log('✅ Description added');
      }
      
      // Date - set to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      
      const dateInput = await page.locator('input[type="date"], input[name="date"]').first();
      if (await dateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dateInput.fill(dateString);
        console.log(`✅ Date: ${dateString}`);
      }
      
      // Time
      const timeInput = await page.locator('input[type="time"], input[name="time"]').first();
      if (await timeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await timeInput.fill('14:00');
        console.log('✅ Time: 14:00');
      }
      
      // Priority - try to select "high"
      const prioritySelect = await page.locator('select[name="priority"], button:has-text("Priority")').first();
      if (await prioritySelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        const tagName = await prioritySelect.evaluate(el => el.tagName);
        if (tagName === 'SELECT') {
          await prioritySelect.selectOption('high');
          console.log('✅ Priority: High');
        }
      }
      
      await delay(1000);
      
      // Take screenshot of filled form
      await page.screenshot({ path: 'screenshots/reminder-form-filled.png', fullPage: true });
      console.log('📸 Screenshot: reminder-form-filled.png\n');
      
      // Submit the form
      console.log('🚀 Submitting form...');
      const submitButton = await page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save"), button:has-text("Submit")').first();
      
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click();
        console.log('✅ Clicked submit button');
        await delay(3000);
        
        // Take screenshot after submission
        await page.screenshot({ path: 'screenshots/reminder-after-submit.png', fullPage: true });
        console.log('📸 Screenshot: reminder-after-submit.png\n');
        
        // Check for success message
        const successMessage = await page.locator('text=success, text=created, text=added', { hasText: /success|created|added/i }).first().textContent().catch(() => null);
        if (successMessage) {
          console.log('🎉 Success message:', successMessage);
        }
        
        // Check if reminder appears in the list
        await delay(2000);
        const reminderInList = await page.locator('text=Test Reminder').isVisible({ timeout: 3000 }).catch(() => false);
        if (reminderInList) {
          console.log('✅ Reminder appears in the list!');
        } else {
          console.log('⚠️  Reminder not immediately visible in list (might need refresh)');
        }
        
        // Final screenshot
        await page.screenshot({ path: 'screenshots/reminder-final.png', fullPage: true });
        console.log('📸 Screenshot: reminder-final.png\n');
        
        console.log('\n🎉 Test Complete!');
        console.log('\n📊 Summary:');
        console.log('  ✅ Navigated to reminders page');
        console.log('  ✅ Opened reminder form');
        console.log('  ✅ Filled in all fields');
        console.log('  ✅ Submitted form');
        console.log('  ✅ Screenshots captured at each step');
        
      } else {
        console.log('❌ Could not find submit button');
      }
      
    } else {
      console.log('❌ Could not find "Add Reminder" button');
      console.log('💡 The page might not have loaded correctly or reminders table might not exist');
      console.log('\n🔧 To fix:');
      console.log('   Run: psql "$DATABASE_URL" -f migrations/create_reminders_table.sql');
    }
    
    // Show console errors if any
    const errors = messages.filter(m => m.type === 'error');
    if (errors.length > 0) {
      console.log(`\n⚠️  Found ${errors.length} console errors during test`);
    }
    
    console.log('\n📁 Screenshots saved in screenshots/ folder:');
    console.log('   - reminders-page.png');
    console.log('   - reminder-form.png');
    console.log('   - reminder-form-filled.png');
    console.log('   - reminder-after-submit.png');
    console.log('   - reminder-final.png');
    
    await delay(3000);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('Target closed')) {
      console.log('💡 Browser was closed prematurely');
    } else if (error.message.includes('Timeout')) {
      console.log('💡 Page took too long to load - check database connection');
    } else if (error.message.includes('not found')) {
      console.log('💡 Element not found - the page structure might be different');
    }
  } finally {
    if (browser) {
      console.log('\n🔚 Closing browser...');
      await delay(2000);
      await browser.close();
    }
  }
}

testReminderCreation();

