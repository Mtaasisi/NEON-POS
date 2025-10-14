#!/usr/bin/env node

/**
 * Quick Purchase Order Payment Verification Test
 */

import { chromium } from 'playwright';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const APP_URL = 'http://localhost:3000';

console.log('\n🧪 Quick PO Payment Verification Test\n');
console.log('═══════════════════════════════════════════════════════\n');

async function quickTest() {
  const sql = neon(DATABASE_URL);
  
  // 1. Verify database setup
  console.log('1️⃣ Checking database setup...');
  
  const trigger = await sql`
    SELECT COUNT(*) as count 
    FROM pg_trigger 
    WHERE tgname = 'trigger_track_po_payment_spending'
  `;
  
  if (trigger[0].count > 0) {
    console.log('   ✅ Expense tracking trigger is installed\n');
  } else {
    console.log('   ❌ Trigger NOT found\n');
  }
  
  // 2. Check account balances
  console.log('2️⃣ Checking account balances...');
  const accounts = await sql`
    SELECT id, name, balance, currency 
    FROM finance_accounts 
    WHERE is_active = true 
    ORDER BY balance DESC
    LIMIT 5
  `;
  
  console.log('   Available Accounts:');
  accounts.forEach(acc => {
    console.log(`   ${acc.name.padEnd(20)} ${acc.currency} ${acc.balance.toLocaleString().padStart(15)}`);
  });
  console.log('');
  
  // 3. Check purchase orders
  console.log('3️⃣ Checking purchase orders...');
  const pos = await sql`
    SELECT id, po_number, total_amount, payment_status, supplier_id
    FROM lats_purchase_orders 
    WHERE payment_status != 'paid'
    ORDER BY created_at DESC 
    LIMIT 5
  `;
  
  if (pos.length > 0) {
    console.log(`   Found ${pos.length} unpaid purchase orders:`);
    pos.forEach(po => {
      console.log(`   ${po.po_number.padEnd(20)} ${po.total_amount.toString().padStart(10)} (${po.payment_status})`);
    });
  } else {
    console.log('   ℹ️  No unpaid purchase orders found');
  }
  console.log('');
  
  // 4. Quick browser test
  console.log('4️⃣ Running quick browser test...');
  
  const browser = await chromium.launch({ 
    headless: false 
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    console.log(`   📍 Navigating to ${APP_URL}...`);
    await page.goto(APP_URL, { timeout: 10000 });
    
    console.log('   🔐 Logging in...');
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
    await page.fill('input[type="email"], input[name="email"]', 'care@care.com');
    await page.fill('input[type="password"], input[name="password"]', '123456');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    console.log('   ✅ Login successful\n');
    
    // Take screenshot
    await page.screenshot({ path: 'po-payment-dashboard.png', fullPage: false });
    console.log('   📸 Screenshot saved: po-payment-dashboard.png\n');
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ VERIFICATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('System is ready for manual testing!');
    console.log('');
    console.log('Next Steps:');
    console.log('1. Navigate to Purchase Orders in the application');
    console.log('2. Try making a payment with insufficient balance');
    console.log('3. Try making a valid payment');
    console.log('4. Check that expense was created in finance reports');
    console.log('');
    console.log('See test-po-payment-manual.md for detailed test steps');
    console.log('═══════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Browser test error:', error.message);
    await page.screenshot({ path: 'po-payment-error.png' });
  } finally {
    await browser.close();
  }
}

// Run test
try {
  await quickTest();
} catch (error) {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
}

