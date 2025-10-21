#!/usr/bin/env node

/**
 * 🔍 QUALITY CHECK BUTTON DIAGNOSTIC
 * ===================================
 * Diagnoses why Quality Check button may not be visible
 */

import { chromium } from 'playwright';
import fs from 'fs';

const CONFIG = {
  baseUrl: 'http://localhost:5173',
  credentials: {
    email: 'care@care.com',
    password: '123456'
  },
  timeout: 30000,
  headless: false
};

async function diagnose() {
  console.log('\n🔍 Starting Quality Check Button Diagnostic...\n');
  
  let browser;
  let diagnosticReport = {
    timestamp: new Date().toISOString(),
    checks: [],
    recommendations: []
  };

  try {
    browser = await chromium.launch({ headless: CONFIG.headless });
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    page.setDefaultTimeout(CONFIG.timeout);

    // Track console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // TEST 1: Login
    console.log('1️⃣ Logging in...');
    await page.goto(CONFIG.baseUrl);
    await page.waitForTimeout(2000);
    
    if (page.url().includes('/login')) {
      await page.fill('input[type="email"]', CONFIG.credentials.email);
      await page.fill('input[type="password"]', CONFIG.credentials.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
    
    diagnosticReport.checks.push({
      name: 'Login',
      status: 'pass',
      message: 'Logged in successfully'
    });

    // TEST 2: Navigate to PO Page
    console.log('2️⃣ Navigating to Purchase Orders...');
    await page.goto(`${CONFIG.baseUrl}/lats/purchase-orders`);
    await page.waitForTimeout(3000);
    
    // TEST 3: Find ALL Purchase Orders and their statuses
    console.log('3️⃣ Analyzing all Purchase Orders...');
    
    const allPOData = await page.evaluate(() => {
      const results = [];
      const rows = document.querySelectorAll('tr, [class*="cursor-pointer"]');
      
      rows.forEach((row, index) => {
        const text = row.textContent || '';
        const hasReceived = text.toLowerCase().includes('received');
        const hasSent = text.toLowerCase().includes('sent');
        const hasShipped = text.toLowerCase().includes('shipped');
        const hasPending = text.toLowerCase().includes('pending');
        const hasCompleted = text.toLowerCase().includes('completed');
        
        if (hasReceived || hasSent || hasShipped || hasPending || hasCompleted) {
          results.push({
            index,
            text: text.substring(0, 100),
            status: hasReceived ? 'received' : 
                   hasSent ? 'sent' : 
                   hasShipped ? 'shipped' :
                   hasPending ? 'pending' :
                   hasCompleted ? 'completed' : 'unknown'
          });
        }
      });
      
      return results;
    });
    
    console.log(`\nFound ${allPOData.length} Purchase Orders:`);
    const receivedPOs = allPOData.filter(po => po.status === 'received');
    const statusCounts = allPOData.reduce((acc, po) => {
      acc[po.status] = (acc[po.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('Status breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`);
    });
    
    diagnosticReport.checks.push({
      name: 'PO Analysis',
      status: 'pass',
      message: `Found ${receivedPOs.length} received POs out of ${allPOData.length} total`,
      data: { statusCounts, receivedCount: receivedPOs.length }
    });

    if (receivedPOs.length === 0) {
      console.log('\n⚠️ WARNING: No Purchase Orders with "received" status found!');
      console.log('Quality Check button only appears for received POs.');
      
      diagnosticReport.recommendations.push('Create or mark a PO as "received" to test Quality Check');
      diagnosticReport.checks.push({
        name: 'Find Received PO',
        status: 'fail',
        message: 'No received POs available for testing'
      });
      
      await browser.close();
      return diagnosticReport;
    }

    // TEST 4: Open a received PO
    console.log(`\n4️⃣ Opening a received Purchase Order (found ${receivedPOs.length})...`);
    
    const rows = await page.$$('tr[class*="cursor"], div[class*="cursor-pointer"], button');
    let clickedIndex = -1;
    
    for (let i = 0; i < rows.length && clickedIndex === -1; i++) {
      const text = await rows[i].textContent();
      if (text && text.toLowerCase().includes('received')) {
        await rows[i].click();
        clickedIndex = i;
        break;
      }
    }
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-screenshots/diagnostic-po-detail.png', fullPage: true });
    
    // TEST 5: Analyze the PO Detail Page
    console.log('5️⃣ Analyzing PO Detail Page...');
    
    const pageAnalysis = await page.evaluate(() => {
      const body = document.body.textContent || '';
      const html = document.body.innerHTML;
      
      return {
        // Status detection
        hasReceivedText: body.toLowerCase().includes('status') && body.toLowerCase().includes('received'),
        hasStatusReceived: html.includes('status: received') || html.includes('status:"received"') || 
                          html.includes('status=received') || html.includes('>received<'),
        
        // Quality Check detection
        hasQualityCheckText: body.toLowerCase().includes('quality check'),
        hasQualityCheckButton: html.includes('Quality Check') && html.includes('button'),
        
        // Info message detection
        hasInfoMessage: body.includes('Quality Check will be available once'),
        
        // Button detection
        allButtons: Array.from(document.querySelectorAll('button'))
          .map(btn => ({
            text: btn.textContent?.trim(),
            classes: btn.className,
            visible: btn.offsetParent !== null
          }))
          .filter(btn => btn.text && btn.text.length > 0)
          .slice(0, 20), // First 20 buttons
        
        // Purple buttons (Quality Check should be purple)
        purpleButtons: Array.from(document.querySelectorAll('button[class*="purple"]'))
          .map(btn => ({
            text: btn.textContent?.trim(),
            classes: btn.className,
            visible: btn.offsetParent !== null
          })),
        
        // Actions panel
        hasActionsPanel: body.includes('Actions'),
        
        // Console errors visible in page
        reactErrorsVisible: html.includes('error') || html.includes('Error'),
        
        // Check for PO object in window (debug)
        hasPurchaseOrderData: typeof window !== 'undefined'
      };
    });
    
    console.log('\n📊 Page Analysis Results:');
    console.log(`   Status shows "received": ${pageAnalysis.hasStatusReceived ? '✅' : '❌'}`);
    console.log(`   Quality Check text found: ${pageAnalysis.hasQualityCheckText ? '✅' : '❌'}`);
    console.log(`   Quality Check button found: ${pageAnalysis.hasQualityCheckButton ? '✅' : '❌'}`);
    console.log(`   Info message present: ${pageAnalysis.hasInfoMessage ? '⚠️ YES (means button not showing)' : '✅ NO'}`);
    console.log(`   Actions panel found: ${pageAnalysis.hasActionsPanel ? '✅' : '❌'}`);
    
    console.log(`\n🔘 Buttons found on page: ${pageAnalysis.allButtons.length}`);
    pageAnalysis.allButtons.forEach((btn, i) => {
      console.log(`   ${i + 1}. "${btn.text}" ${btn.visible ? '(visible)' : '(hidden)'}`);
    });
    
    if (pageAnalysis.purpleButtons.length > 0) {
      console.log(`\n🟣 Purple buttons found: ${pageAnalysis.purpleButtons.length}`);
      pageAnalysis.purpleButtons.forEach((btn, i) => {
        console.log(`   ${i + 1}. "${btn.text}"`);
      });
    }
    
    diagnosticReport.checks.push({
      name: 'Page Analysis',
      status: pageAnalysis.hasQualityCheckButton ? 'pass' : 'fail',
      message: pageAnalysis.hasQualityCheckButton ? 
        'Quality Check button found in HTML' : 
        'Quality Check button NOT found in HTML',
      data: pageAnalysis
    });

    // TEST 6: Check Console Errors
    console.log(`\n6️⃣ Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('   First 5 errors:');
      consoleErrors.slice(0, 5).forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.substring(0, 100)}`);
      });
      
      const hasConnectionError = consoleErrors.some(e => 
        e.includes('fetch') || e.includes('network') || e.includes('connect')
      );
      
      if (hasConnectionError) {
        diagnosticReport.recommendations.push('Fix database/API connection errors');
      }
    }
    
    diagnosticReport.checks.push({
      name: 'Console Errors',
      status: consoleErrors.length === 0 ? 'pass' : 'warning',
      message: `${consoleErrors.length} console errors detected`,
      data: { errorCount: consoleErrors.length, errors: consoleErrors.slice(0, 10) }
    });

    // TEST 7: Try to extract React state (if possible)
    console.log('\n7️⃣ Attempting to extract React state...');
    
    const reactState = await page.evaluate(() => {
      try {
        // Try to find React fiber
        const rootElement = document.querySelector('#root, [data-reactroot]');
        if (rootElement) {
          const key = Object.keys(rootElement).find(key => key.startsWith('__react'));
          if (key) {
            return {
              hasReactState: true,
              reactVersion: 'detected'
            };
          }
        }
        return { hasReactState: false };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    console.log(`   React state accessible: ${reactState.hasReactState ? '✅' : '❌'}`);
    
    // FINAL DIAGNOSIS
    console.log('\n' + '='.repeat(70));
    console.log('🎯 DIAGNOSIS SUMMARY');
    console.log('='.repeat(70) + '\n');
    
    const issues = [];
    const fixes = [];
    
    if (!pageAnalysis.hasStatusReceived) {
      issues.push('PO status may not be "received" (check database)');
      fixes.push('Verify PO status in database: SELECT status FROM lats_purchase_orders WHERE id = ?');
    }
    
    if (pageAnalysis.hasInfoMessage) {
      issues.push('Info message visible - means button is hidden by design');
      fixes.push('This PO is not in "received" status, mark it as received first');
    }
    
    if (!pageAnalysis.hasQualityCheckButton && !pageAnalysis.hasInfoMessage) {
      issues.push('Button not rendering despite correct conditions');
      fixes.push('Check React component state and conditional rendering logic');
      fixes.push('Verify Quality Check service is loaded and working');
    }
    
    if (consoleErrors.length > 0) {
      issues.push(`${consoleErrors.length} console errors may prevent proper rendering`);
      fixes.push('Fix database connection and API errors first');
    }
    
    if (issues.length === 0) {
      console.log('✅ No obvious issues detected!');
      console.log('Quality Check button should be visible on this page.');
      console.log('Try manually scrolling and looking in the Actions panel on the right.');
    } else {
      console.log('❌ Issues Detected:\n');
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
      
      console.log('\n🔧 Recommended Fixes:\n');
      fixes.forEach((fix, i) => {
        console.log(`   ${i + 1}. ${fix}`);
      });
    }
    
    diagnosticReport.issues = issues;
    diagnosticReport.fixes = fixes;

    // Save diagnostic report
    fs.writeFileSync('quality-check-diagnostic-report.json', JSON.stringify(diagnosticReport, null, 2));
    console.log('\n💾 Diagnostic report saved to: quality-check-diagnostic-report.json');
    
    console.log('\n📸 Screenshot saved to: test-screenshots/diagnostic-po-detail.png');
    console.log('\n✅ Diagnostic complete!\n');

  } catch (error) {
    console.error('\n❌ Diagnostic failed:', error.message);
    diagnosticReport.checks.push({
      name: 'Diagnostic Execution',
      status: 'error',
      message: error.message
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return diagnosticReport;
}

// Run diagnostic
diagnose().catch(console.error);

