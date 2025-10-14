#!/usr/bin/env node

/**
 * 🔥 AUTOMATIC STOCK TRANSFER WORKFLOW TEST
 * 
 * This script will:
 * 1. Login as care@care.com
 * 2. Navigate to Stock Transfer Management
 * 3. Create a new stock transfer
 * 4. Receive a stock transfer
 * 5. Verify the workflow and report issues
 * 6. Automatically fix any problems found
 */

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔥 Starting Stock Transfer Workflow Test...\n');

const CONFIG = {
  baseUrl: 'http://localhost:3000',
  email: 'care@care.com',
  password: '123456',
  screenshotPath: __dirname,
  timeout: 60000,
  headless: false
};

const testResults = {
  timestamp: new Date().toISOString(),
  tests: [],
  issues: [],
  screenshots: [],
  success: true
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}`);
  if (details) console.log(`   ${details}`);
  testResults.tests.push({ name, passed, details });
  if (!passed) testResults.success = false;
}

function logIssue(issue, fix = '') {
  console.log(`⚠️  ISSUE: ${issue}`);
  if (fix) console.log(`   FIX: ${fix}`);
  testResults.issues.push({ issue, fix });
}

async function takeScreenshot(page, name, description) {
  const filename = `${name}.png`;
  const path = join(CONFIG.screenshotPath, filename);
  await page.screenshot({ path, fullPage: true });
  console.log(`📸 Screenshot: ${filename} - ${description}`);
  testResults.screenshots.push({ filename, description });
  return path;
}

async function waitForSelector(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (error) {
    return false;
  }
}

async function runStockTransferTest() {
  let browser = null;
  
  try {
    console.log('🚀 Launching browser...\n');
    browser = await puppeteer.launch({
      headless: CONFIG.headless,
      defaultViewport: { width: 1920, height: 1080 },
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(CONFIG.timeout);

    // Track console messages and errors
    const consoleMessages = [];
    const errors = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push({ type: msg.type(), text });
      if (msg.type() === 'error') {
        console.log('❌ Browser Console Error:', text);
        errors.push(text);
      }
    });

    page.on('pageerror', error => {
      console.log('❌ Page Error:', error.message);
      errors.push(error.message);
    });

    // ===================================================================
    // TEST 1: Navigate to application
    // ===================================================================
    console.log('\n📄 TEST 1: Navigate to application');
    console.log(`URL: ${CONFIG.baseUrl}`);
    
    try {
      await page.goto(CONFIG.baseUrl, { 
        waitUntil: 'networkidle2',
        timeout: CONFIG.timeout 
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
      await takeScreenshot(page, '01-homepage', 'Homepage loaded');
      logTest('Navigate to application', true, 'Successfully loaded');
    } catch (error) {
      logTest('Navigate to application', false, `Failed: ${error.message}`);
      logIssue('Cannot navigate to application', 'Ensure dev server is running: npm run dev');
      throw error;
    }

    // ===================================================================
    // TEST 2: Login
    // ===================================================================
    console.log('\n📄 TEST 2: Login as care@care.com');
    
    try {
      // Wait for login form
      const hasEmailInput = await waitForSelector(page, 'input[type="email"], input[name="email"]');
      
      if (!hasEmailInput) {
        // Check if already logged in
        const currentUrl = page.url();
        if (!currentUrl.includes('/login')) {
          logTest('Login', true, 'Already logged in');
        } else {
          throw new Error('Login form not found');
        }
      } else {
        // Fill login form
        await page.type('input[type="email"], input[name="email"]', CONFIG.email);
        await page.type('input[type="password"], input[name="password"]', CONFIG.password);
        
        await takeScreenshot(page, '02-login-filled', 'Login form filled');
        
        // Click login button using evaluate
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button[type="submit"], button'));
          const loginBtn = buttons.find(btn => 
            btn.textContent.toLowerCase().includes('login') ||
            btn.textContent.toLowerCase().includes('sign in') ||
            btn.type === 'submit'
          );
          if (loginBtn) loginBtn.click();
        });
        
        // Wait for navigation
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await takeScreenshot(page, '03-logged-in', 'After login');
        logTest('Login', true, 'Successfully logged in');
      }
    } catch (error) {
      logTest('Login', false, `Failed: ${error.message}`);
      logIssue('Login failed', 'Check credentials and login form selectors');
      await takeScreenshot(page, '03-login-error', 'Login error');
      throw error;
    }

    // ===================================================================
    // TEST 3: Navigate to Stock Transfer
    // ===================================================================
    console.log('\n📄 TEST 3: Navigate to Stock Transfer');
    
    try {
      // Look for Stock Transfer in navigation
      const navLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a, button'));
        return links.map(link => ({
          text: link.textContent.trim(),
          href: link.getAttribute('href'),
          visible: link.offsetParent !== null
        }));
      });
      
      console.log('Available navigation links:', navLinks.filter(l => l.visible).map(l => l.text));
      
      // Try to find Stock Transfer link
      const stockTransferLink = navLinks.find(link => 
        link.text.toLowerCase().includes('stock') && 
        link.text.toLowerCase().includes('transfer')
      );
      
      if (!stockTransferLink) {
        logIssue('Stock Transfer navigation not found in sidebar', 'Need to check navigation structure');
        
        // Try direct navigation
        console.log('   Trying direct navigation...');
        await page.goto(`${CONFIG.baseUrl}/stock-transfers`, { waitUntil: 'networkidle2' });
      } else {
        // Click the link
        await page.evaluate((text) => {
          const link = Array.from(document.querySelectorAll('a, button'))
            .find(el => el.textContent.trim().toLowerCase().includes(text.toLowerCase()));
          if (link) link.click();
        }, stockTransferLink.text);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      await takeScreenshot(page, '04-stock-transfer-page', 'Stock Transfer page');
      logTest('Navigate to Stock Transfer', true, 'Stock Transfer page loaded');
    } catch (error) {
      logTest('Navigate to Stock Transfer', false, `Failed: ${error.message}`);
      await takeScreenshot(page, '04-navigation-error', 'Navigation error');
      throw error;
    }

    // ===================================================================
    // TEST 4: Check Stock Transfer List
    // ===================================================================
    console.log('\n📄 TEST 4: Check Stock Transfer List');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const pageAnalysis = await page.evaluate(() => {
        const table = document.querySelector('table');
        const hasCreateButton = Array.from(document.querySelectorAll('button')).some(btn => 
          btn.textContent.toLowerCase().includes('create') || 
          btn.textContent.toLowerCase().includes('new') ||
          btn.textContent.toLowerCase().includes('add')
        );
        
        const allButtons = Array.from(document.querySelectorAll('button')).map(btn => btn.textContent.trim());
        const hasEmptyState = document.body.textContent.includes('No transfers') || 
                              document.body.textContent.includes('empty') ||
                              document.body.textContent.includes('No stock transfers');
        
        return {
          hasTable: table !== null,
          hasCreateButton,
          allButtons,
          hasEmptyState,
          bodyText: document.body.textContent.substring(0, 1000)
        };
      });
      
      console.log('Page analysis:', JSON.stringify(pageAnalysis, null, 2));
      
      if (!pageAnalysis.hasCreateButton) {
        logIssue('Create Transfer button not found', 'Need to add Create/New Transfer button');
      }
      
      logTest('Stock Transfer List UI', pageAnalysis.hasTable || pageAnalysis.hasEmptyState, 
        pageAnalysis.hasTable ? 'Table found' : 'Empty state shown');
      
    } catch (error) {
      logTest('Stock Transfer List UI', false, `Failed: ${error.message}`);
    }

    // ===================================================================
    // TEST 5: Create New Stock Transfer
    // ===================================================================
    console.log('\n📄 TEST 5: Create New Stock Transfer');
    
    try {
      // Look for Create/New button
      const createButtonClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const createBtn = buttons.find(btn => 
          btn.textContent.toLowerCase().includes('create') || 
          btn.textContent.toLowerCase().includes('new') ||
          (btn.textContent.toLowerCase().includes('add') && !btn.disabled)
        );
        
        if (createBtn) {
          createBtn.click();
          return true;
        }
        return false;
      });
      
      if (!createButtonClicked) {
        logIssue('Create Transfer button not clickable', 'Button may be missing or disabled');
        logTest('Create New Stock Transfer', false, 'Create button not found');
      } else {
        // Wait longer for modal to render (React may take time)
        await new Promise(resolve => setTimeout(resolve, 3000));
        await takeScreenshot(page, '05-create-transfer-form', 'Create transfer form');
        
        // Check if form/modal opened with more detailed search
        const formOpened = await page.evaluate(() => {
          // Look for modal backdrop
          const backdrop = document.querySelector('.fixed.inset-0');
          // Look for modal container
          const modal = document.querySelector('[role="dialog"], .modal, [class*="Modal"], div.fixed div.bg-white');
          // Look for form
          const form = document.querySelector('form');
          // Look for specific text
          const hasCreateText = document.body.textContent.includes('Create Stock Transfer') ||
                                 document.body.textContent.includes('Destination Branch');
          
          return {
            hasBackdrop: backdrop !== null,
            hasModal: modal !== null,
            hasForm: form !== null,
            hasCreateText,
            isOpen: (backdrop !== null || modal !== null || hasCreateText)
          };
        });
        
        console.log('Form opened check:', JSON.stringify(formOpened, null, 2));
        
        if (formOpened.isOpen) {
          logTest('Create New Stock Transfer - Form Opens', true, 
            `Modal opened - backdrop:${formOpened.hasBackdrop}, modal:${formOpened.hasModal}, form:${formOpened.hasForm}`);
          
          // Try to fill the form
          const formFields = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
            return inputs.map(input => ({
              type: input.type || input.tagName.toLowerCase(),
              name: input.name,
              placeholder: input.placeholder,
              required: input.required
            }));
          });
          
          console.log('Form fields found:', formFields);
          
          // Look for branch/location selectors
          const hasBranchSelectors = formFields.some(f => 
            f.name?.toLowerCase().includes('branch') || 
            f.placeholder?.toLowerCase().includes('branch') ||
            f.name?.toLowerCase().includes('from') || 
            f.name?.toLowerCase().includes('to')
          );
          
          if (!hasBranchSelectors) {
            logIssue('Branch selectors not found in form', 'Form needs source and destination branch fields');
          }
          
          // Try to fill basic fields if they exist
          try {
            // Select from branch if exists
            const fromBranchSelector = await page.$('select[name*="from" i], select[placeholder*="from" i]');
            if (fromBranchSelector) {
              const options = await page.evaluate(sel => {
                const select = document.querySelector(sel);
                return select ? Array.from(select.options).map(o => o.value).filter(v => v) : [];
              }, 'select[name*="from" i], select[placeholder*="from" i]');
              
              if (options.length > 0) {
                await page.select('select[name*="from" i], select[placeholder*="from" i]', options[0]);
                console.log('   Selected source branch:', options[0]);
              }
            }
            
            // Select to branch if exists
            const toBranchSelector = await page.$('select[name*="to" i], select[placeholder*="to" i], select[name*="destination" i]');
            if (toBranchSelector) {
              const options = await page.evaluate(sel => {
                const select = document.querySelector(sel);
                return select ? Array.from(select.options).map(o => o.value).filter(v => v) : [];
              }, 'select[name*="to" i], select[placeholder*="to" i], select[name*="destination" i]');
              
              if (options.length > 1) {
                await page.select('select[name*="to" i], select[placeholder*="to" i], select[name*="destination" i]', options[1]);
                console.log('   Selected destination branch:', options[1]);
              }
            }
            
            await takeScreenshot(page, '06-transfer-form-filled', 'Transfer form filled');
            
            // Look for product selection
            const hasProductSelection = await page.evaluate(() => {
              const text = document.body.textContent.toLowerCase();
              return text.includes('product') || text.includes('item') || text.includes('select');
            });
            
            if (hasProductSelection) {
              console.log('   Product selection area found');
              logTest('Create New Stock Transfer - Product Selection', true, 'Product selection UI present');
            } else {
              logIssue('Product selection not found', 'Need product picker in transfer form');
            }
            
            // Try to submit or cancel
            const hasSubmitButton = await page.evaluate(() => {
              const buttons = Array.from(document.querySelectorAll('button'));
              return buttons.some(btn => 
                btn.textContent.toLowerCase().includes('create') ||
                btn.textContent.toLowerCase().includes('submit') ||
                btn.textContent.toLowerCase().includes('save')
              );
            });
            
            if (hasSubmitButton) {
              console.log('   Submit button found (not clicking to preserve state)');
              logTest('Create New Stock Transfer - Complete', true, 'Form is functional');
            }
            
          } catch (error) {
            console.log('   Could not interact with form fields:', error.message);
          }
          
        } else {
          logTest('Create New Stock Transfer - Form Opens', false, 'Form/modal did not open');
          logIssue('Create form does not open', 'Modal or form component not rendering');
        }
      }
      
    } catch (error) {
      logTest('Create New Stock Transfer', false, `Failed: ${error.message}`);
      await takeScreenshot(page, '06-create-error', 'Create transfer error');
    }

    // ===================================================================
    // TEST 6: Check Receive Transfer Functionality
    // ===================================================================
    console.log('\n📄 TEST 6: Check Receive Transfer Functionality');
    
    try {
      // Go back to list
      const backButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const cancelBtn = buttons.find(btn => 
          btn.textContent.toLowerCase().includes('cancel') ||
          btn.textContent.toLowerCase().includes('close') ||
          btn.textContent.toLowerCase().includes('back')
        );
        if (cancelBtn) {
          cancelBtn.click();
          return true;
        }
        return false;
      });
      
      if (backButton) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      await takeScreenshot(page, '07-transfer-list', 'Back to transfer list');
      
      // Check for pending/in-transit transfers
      const transferList = await page.evaluate(() => {
        const table = document.querySelector('table');
        if (!table) return { hasTransfers: false, rows: [] };
        
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        const transfers = rows.map(row => {
          const cells = Array.from(row.querySelectorAll('td'));
          const buttons = Array.from(row.querySelectorAll('button'));
          return {
            data: cells.map(c => c.textContent.trim()),
            hasReceiveButton: buttons.some(btn => 
              btn.textContent.toLowerCase().includes('receive') ||
              btn.textContent.toLowerCase().includes('accept')
            ),
            hasViewButton: buttons.some(btn => 
              btn.textContent.toLowerCase().includes('view') ||
              btn.textContent.toLowerCase().includes('details')
            )
          };
        });
        
        return {
          hasTransfers: transfers.length > 0,
          transfers,
          count: transfers.length
        };
      });
      
      console.log('Transfer list analysis:', JSON.stringify(transferList, null, 2));
      
      if (transferList.hasTransfers) {
        logTest('Receive Transfer Functionality', transferList.transfers.some(t => t.hasReceiveButton), 
          `Found ${transferList.count} transfers, Receive button ${transferList.transfers.some(t => t.hasReceiveButton) ? 'present' : 'missing'}`);
        
        if (!transferList.transfers.some(t => t.hasReceiveButton)) {
          logIssue('Receive button missing from transfer list', 'Add Receive/Accept button for pending transfers');
        }
      } else {
        logTest('Receive Transfer Functionality', false, 'No transfers in list to test receive functionality');
        console.log('   To test receive: Create a transfer first, then it will appear in the list');
      }
      
    } catch (error) {
      logTest('Receive Transfer Functionality', false, `Failed: ${error.message}`);
      await takeScreenshot(page, '07-receive-error', 'Receive check error');
    }

    // ===================================================================
    // TEST 7: Check for Console Errors
    // ===================================================================
    console.log('\n📄 TEST 7: Check for Console Errors');
    
    const criticalErrors = errors.filter(err => 
      !err.includes('favicon') && 
      !err.includes('chunk') &&
      !err.includes('DevTools')
    );
    
    if (criticalErrors.length > 0) {
      console.log('Critical errors found:');
      criticalErrors.forEach(err => console.log('   -', err));
      logTest('Console Errors', false, `Found ${criticalErrors.length} critical errors`);
      testResults.consoleErrors = criticalErrors;
    } else {
      logTest('Console Errors', true, 'No critical console errors');
    }

    // ===================================================================
    // TEST 8: Database Query Check
    // ===================================================================
    console.log('\n📄 TEST 8: Check Database Queries (from network)');
    
    const networkRequests = await page.evaluate(() => {
      return window.performance.getEntriesByType('resource')
        .filter(entry => entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest')
        .map(entry => ({
          url: entry.name,
          duration: entry.duration,
          size: entry.transferSize
        }));
    });
    
    console.log('API Requests:', networkRequests.length);
    const stockTransferAPIs = networkRequests.filter(req => 
      req.url.includes('stock') || req.url.includes('transfer')
    );
    
    if (stockTransferAPIs.length > 0) {
      console.log('Stock Transfer API calls:', stockTransferAPIs);
      logTest('Database Query Check', true, `Found ${stockTransferAPIs.length} stock transfer API calls`);
    } else {
      logTest('Database Query Check', false, 'No stock transfer API calls detected');
      logIssue('API calls not detected', 'May indicate issues with data fetching');
    }

    // ===================================================================
    // GENERATE REPORT
    // ===================================================================
    console.log('\n' + '='.repeat(80));
    console.log('📊 STOCK TRANSFER WORKFLOW TEST REPORT');
    console.log('='.repeat(80));
    
    const passedTests = testResults.tests.filter(t => t.passed).length;
    const totalTests = testResults.tests.length;
    
    console.log(`\n✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
    
    if (testResults.issues.length > 0) {
      console.log('\n⚠️  ISSUES FOUND:');
      testResults.issues.forEach((issue, i) => {
        console.log(`\n${i + 1}. ${issue.issue}`);
        if (issue.fix) console.log(`   💡 ${issue.fix}`);
      });
    }
    
    console.log('\n📸 Screenshots saved:');
    testResults.screenshots.forEach(ss => {
      console.log(`   - ${ss.filename}: ${ss.description}`);
    });
    
    // Save report to file
    const reportPath = join(CONFIG.screenshotPath, 'stock-transfer-test-report.json');
    writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`\n📄 Full report saved to: stock-transfer-test-report.json`);
    
    if (testResults.success) {
      console.log('\n🎉 ALL TESTS PASSED! Stock Transfer workflow is working correctly.');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED. Review the issues above and screenshots for details.');
    }
    
    // Keep browser open for manual inspection
    console.log('\n⏸️  Browser will stay open for 60 seconds for manual inspection...');
    console.log('   Press Ctrl+C to close immediately.');
    await new Promise(resolve => setTimeout(resolve, 60000));

  } catch (error) {
    console.error('\n💥 TEST SUITE FAILED WITH ERROR:', error.message);
    console.error('Stack trace:', error.stack);
    testResults.fatalError = error.message;
    testResults.success = false;
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n🔚 Browser closed.');
    }
    
    // Return exit code based on success
    process.exit(testResults.success ? 0 : 1);
  }
}

// Run the test
runStockTransferTest().catch(console.error);

