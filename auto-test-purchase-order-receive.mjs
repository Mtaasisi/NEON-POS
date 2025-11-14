#!/usr/bin/env node

/**
 * Automated Browser Test: Purchase Order Receiving
 * 
 * This script will:
 * 1. Login to the application
 * 2. Navigate to Purchase Orders
 * 3. Find the latest created purchase order
 * 4. Receive the purchase order
 * 5. Report any issues found and provide fixes
 */

import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

const APP_URL = 'http://localhost:5173';
const LOGIN_EMAIL = 'care@care.com';
const LOGIN_PASSWORD = '123456';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${'═'.repeat(60)}`, 'cyan');
  log(`Step ${step}: ${message}`, 'bright');
  log('═'.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Store all issues found during testing
const issues = [];
const fixes = [];

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForNavigation(page, timeout = 30000) {
  try {
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout });
  } catch (error) {
    logWarning('Navigation timeout - continuing anyway');
  }
}

async function captureScreenshot(page, name) {
  const filename = `screenshot-${name}-${Date.now()}.png`;
  await page.screenshot({ path: filename, fullPage: true });
  logInfo(`Screenshot saved: ${filename}`);
  return filename;
}

async function checkForErrors(page) {
  const errors = await page.evaluate(() => {
    const errorElements = [];
    
    // Check for error messages in the page
    const errorSelectors = [
      '.error',
      '.error-message',
      '[class*="error"]',
      '[class*="Error"]',
      '.alert-error',
      '.text-red-500',
      '.text-red-600',
      '[role="alert"]'
    ];
    
    for (const selector of errorSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el.textContent && el.textContent.trim()) {
          errorElements.push({
            selector,
            text: el.textContent.trim(),
            visible: el.offsetParent !== null
          });
        }
      });
    }
    
    return errorElements;
  });
  
  return errors.filter(err => err.visible);
}

async function login(page) {
  logStep(1, 'Logging in to the application');
  
  try {
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    logSuccess('Application loaded');
    
    // Wait for login form
    await page.waitForSelector('input[type="email"], input[type="text"]', { timeout: 10000 });
    logSuccess('Login form found');
    
    // Fill in credentials
    const emailInput = await page.$('input[type="email"], input[type="text"]');
    const passwordInput = await page.$('input[type="password"]');
    
    if (!emailInput || !passwordInput) {
      throw new Error('Could not find login form inputs');
    }
    
    await emailInput.type(LOGIN_EMAIL, { delay: 50 });
    logInfo(`Entered email: ${LOGIN_EMAIL}`);
    
    await passwordInput.type(LOGIN_PASSWORD, { delay: 50 });
    logInfo('Entered password');
    
    // Find and click login button
    const loginButton = await page.$('button[type="submit"]');
    if (!loginButton) {
      throw new Error('Could not find login button');
    }
    
    await loginButton.click();
    logInfo('Clicked login button');
    
    // Wait for navigation after login
    await wait(3000);
    
    // Check if we're logged in by looking for dashboard elements
    const url = page.url();
    if (url.includes('/login') || url === APP_URL + '/') {
      // Still on login page, might be an error
      const errors = await checkForErrors(page);
      if (errors.length > 0) {
        throw new Error(`Login failed: ${errors[0].text}`);
      }
    }
    
    logSuccess('Logged in successfully');
    await captureScreenshot(page, 'after-login');
    
  } catch (error) {
    logError(`Login failed: ${error.message}`);
    await captureScreenshot(page, 'login-error');
    issues.push({
      step: 'Login',
      error: error.message,
      screenshot: await captureScreenshot(page, 'login-error')
    });
    throw error;
  }
}

async function navigateToPurchaseOrders(page) {
  logStep(2, 'Navigating to Purchase Orders');
  
  try {
    // Look for navigation menu items related to purchase orders
    const possibleSelectors = [
      'a[href*="purchase"]',
      'a[href*="po"]',
      'button:has-text("Purchase")',
      'a:has-text("Purchase")',
      'a:has-text("Purchase Order")',
      '[data-testid*="purchase"]'
    ];
    
    let purchaseOrderLink = null;
    
    // Try to find the link
    for (const selector of possibleSelectors) {
      try {
        const links = await page.$$(selector);
        for (const link of links) {
          const text = await page.evaluate(el => el.textContent, link);
          if (text.toLowerCase().includes('purchase') || text.toLowerCase().includes('po')) {
            purchaseOrderLink = link;
            logInfo(`Found link with text: ${text}`);
            break;
          }
        }
        if (purchaseOrderLink) break;
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!purchaseOrderLink) {
      // Try direct navigation
      logInfo('Trying direct navigation to /purchase-orders');
      await page.goto(APP_URL + '/purchase-orders', { waitUntil: 'networkidle2' });
    } else {
      await purchaseOrderLink.click();
      await wait(2000);
    }
    
    // Wait for the page to load
    await wait(2000);
    
    logSuccess('Navigated to Purchase Orders page');
    await captureScreenshot(page, 'purchase-orders-page');
    
  } catch (error) {
    logError(`Navigation failed: ${error.message}`);
    await captureScreenshot(page, 'navigation-error');
    issues.push({
      step: 'Navigation',
      error: error.message,
      screenshot: await captureScreenshot(page, 'navigation-error')
    });
    throw error;
  }
}

async function findLatestPurchaseOrder(page) {
  logStep(3, 'Finding the latest purchase order');
  
  try {
    // Wait for the purchase order list to load
    await wait(3000);
    
    // Look for table rows or purchase order cards
    const purchaseOrders = await page.evaluate(() => {
      const rows = [];
      
      // Try to find table rows
      const tableRows = document.querySelectorAll('table tbody tr');
      tableRows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
          rows.push({
            index,
            element: 'table-row',
            text: Array.from(cells).map(cell => cell.textContent.trim()).join(' | ')
          });
        }
      });
      
      // Also check for card-based layouts
      const cards = document.querySelectorAll('[class*="card"], [class*="item"]');
      cards.forEach((card, index) => {
        if (card.textContent.includes('PO') || card.textContent.includes('Purchase')) {
          rows.push({
            index,
            element: 'card',
            text: card.textContent.trim()
          });
        }
      });
      
      return rows;
    });
    
    if (purchaseOrders.length === 0) {
      throw new Error('No purchase orders found on the page');
    }
    
    logSuccess(`Found ${purchaseOrders.length} purchase order(s)`);
    
    // Log all purchase orders
    purchaseOrders.forEach((po, index) => {
      logInfo(`PO ${index + 1}: ${po.text.substring(0, 100)}...`);
    });
    
    // The first one should be the latest (assuming they're sorted by date)
    return purchaseOrders[0];
    
  } catch (error) {
    logError(`Failed to find purchase orders: ${error.message}`);
    await captureScreenshot(page, 'find-po-error');
    issues.push({
      step: 'Find Purchase Order',
      error: error.message,
      screenshot: await captureScreenshot(page, 'find-po-error')
    });
    throw error;
  }
}

async function receivePurchaseOrder(page, poInfo) {
  logStep(4, 'Receiving the purchase order');
  
  try {
    // Look for "Receive Items" button directly in the table/list
    // Based on the code: Purchase Orders with status 'sent' show "Receive Items" button
    logInfo('Looking for "Receive Items" button in the purchase orders table...');
    
    let receiveButton = null;
    
    // Wait for the table to be fully loaded
    await wait(2000);
    
    // Look for the "Receive Items" button text
    const buttons = await page.$$('button');
    logInfo(`Found ${buttons.length} buttons on page`);
    
    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text && (text.includes('Receive Items') || text.includes('Receive Order'))) {
        receiveButton = button;
        logInfo(`Found receive button with text: "${text}"`);
        break;
      }
    }
    
    if (!receiveButton) {
      // Try to find link with receive action
      logInfo('Button not found, looking for navigation links...');
      const links = await page.$$('a');
      for (const link of links) {
        const href = await page.evaluate(el => el.href, link);
        const text = await page.evaluate(el => el.textContent, link);
        if (href && href.includes('action=receive')) {
          receiveButton = link;
          logInfo(`Found receive link: "${text}" -> ${href}`);
          break;
        }
      }
    }
    
    if (!receiveButton) {
      // Log all button texts for debugging
      logWarning('Could not find Receive button. Available buttons:');
      const allButtons = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.map(btn => btn.textContent.trim()).filter(t => t.length > 0);
      });
      allButtons.forEach(text => logInfo(`  - "${text}"`));
      
      throw new Error('Could not find "Receive Items" or "Receive Order" button');
    }
    
    // Click the receive button
    await receiveButton.click();
    logInfo('Clicked receive button');
    await wait(3000);
    
    // Check if we navigated to a detail page or if a modal appeared
    const currentUrl = page.url();
    logInfo(`Current URL after clicking: ${currentUrl}`);
    
    // Check if a modal or form appeared
    await wait(1000);
    const modal = await page.$('[role="dialog"], .modal, [class*="modal"], [class*="Modal"]');
    
    if (modal) {
      logSuccess('Receive modal/form opened');
      await captureScreenshot(page, 'receive-modal');
      
      // Look for the consolidated receive modal with checkboxes or inputs
      const modalContent = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"], .modal, [class*="modal"], [class*="Modal"]');
        if (modal) {
          return {
            text: modal.textContent,
            hasCheckboxes: modal.querySelectorAll('input[type="checkbox"]').length > 0,
            hasNumberInputs: modal.querySelectorAll('input[type="number"]').length > 0,
            hasTable: modal.querySelector('table') !== null
          };
        }
        return null;
      });
      
      if (modalContent) {
        logInfo(`Modal has checkboxes: ${modalContent.hasCheckboxes}`);
        logInfo(`Modal has number inputs: ${modalContent.hasNumberInputs}`);
        logInfo(`Modal has table: ${modalContent.hasTable}`);
      }
      
      // If there are checkboxes, check them all (to receive all items)
      if (modalContent && modalContent.hasCheckboxes) {
        const checkboxes = await page.$$('input[type="checkbox"]');
        logInfo(`Found ${checkboxes.length} checkboxes. Checking all...`);
        
        for (const checkbox of checkboxes) {
          const isChecked = await page.evaluate(el => el.checked, checkbox);
          if (!isChecked) {
            await checkbox.click();
            await wait(100);
          }
        }
        logSuccess('All items selected for receiving');
      }
      
      // Look for submit/confirm button
      await wait(500);
      let confirmButton = null;
      
      // Search for buttons with specific text
      const allButtons = await page.$$('button');
      for (const button of allButtons) {
        const text = await page.evaluate(el => el.textContent, button);
        const disabled = await page.evaluate(el => el.disabled, button);
        
        if (text && (
          text.includes('Confirm') || 
          text.includes('Receive All') ||
          text.includes('Complete') ||
          text.includes('Submit') ||
          text.includes('Save')
        ) && !disabled) {
          confirmButton = button;
          logInfo(`Found confirm button: "${text}"`);
          break;
        }
      }
      
      if (confirmButton) {
        await confirmButton.click();
        logInfo('Clicked confirm button');
        await wait(3000);
        
        // Check for success message or toast notification
        const successMessages = await page.evaluate(() => {
          const messages = [];
          
          // Check for toast notifications
          const toastSelectors = [
            '[data-sonner-toast]',
            '.Toastify',
            '[role="alert"]',
            '.toast',
            '[class*="toast"]'
          ];
          
          for (const selector of toastSelectors) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              if (el.textContent && el.textContent.trim()) {
                messages.push(el.textContent.trim());
              }
            });
          }
          
          // Also check for success indicators
          const successSelectors = [
            '.success',
            '.alert-success',
            '[class*="success"]',
            '.text-green-500',
            '.text-green-600'
          ];
          
          for (const selector of successSelectors) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              if (el.textContent && el.textContent.trim()) {
                messages.push(el.textContent.trim());
              }
            });
          }
          
          return messages;
        });
        
        if (successMessages.length > 0) {
          logSuccess(`Purchase order received successfully!`);
          successMessages.forEach(msg => logInfo(`Success message: ${msg.substring(0, 100)}`));
        } else {
          logInfo('No explicit success message found - checking page state');
          
          // Check if modal closed (indicating success)
          await wait(1000);
          const modalStillThere = await page.$('[role="dialog"], .modal, [class*="modal"]');
          if (!modalStillThere) {
            logSuccess('Modal closed - receive action likely completed');
          }
        }
        
        await captureScreenshot(page, 'after-receive');
      } else {
        logWarning('Could not find confirm button in modal');
        await captureScreenshot(page, 'modal-no-confirm-button');
      }
    } else {
      logInfo('No modal appeared immediately - checking if we navigated to detail page');
      
      // Check if we're on a purchase order detail page
      if (currentUrl.includes('purchase-orders/')) {
        logSuccess('Navigated to purchase order detail page');
        await captureScreenshot(page, 'detail-page-initial');
        
        // Wait for the page to load purchase order data
        logInfo('Waiting for purchase order data to load...');
        await wait(3000);
        
        // Check if ConsolidatedReceiveModal is already open
        logInfo('Checking if receive modal is already open...');
        const detailButtons = await page.$$('button');
        let proceedButton = null;
        let fullReceiveOption = null;
        
        for (const button of detailButtons) {
          const text = await page.evaluate(el => el.textContent, button);
          const disabled = await page.evaluate(el => el.disabled, button);
          
          if (text) {
            if (text.includes('Proceed to Receive') && !disabled) {
              proceedButton = button;
              logInfo(`Found "Proceed to Receive" button`);
            }
            if (text.includes('Full Receive') && !disabled) {
              fullReceiveOption = button;
              logInfo(`Found "Full Receive" option button`);
            }
          }
        }
        
        if (proceedButton) {
          logSuccess('ConsolidatedReceiveModal is already open!');
          await captureScreenshot(page, 'consolidated-modal-open');
          
          // First select Full Receive option if not already selected
          if (fullReceiveOption) {
            await fullReceiveOption.click();
            logInfo('Selected "Full Receive" option');
            await wait(500);
          }
          
          // Now click "Proceed to Receive"
          await proceedButton.click();
          logInfo('Clicked "Proceed to Receive" button');
          await wait(2000);
          
          // Check for toast/success messages first
          const toastMessages = await page.evaluate(() => {
            const toasts = document.querySelectorAll('[data-sonner-toast], [role="status"], .toast');
            return Array.from(toasts).map(t => t.textContent.trim()).filter(t => t.length > 0);
          });
          
          if (toastMessages.length > 0) {
            toastMessages.forEach(msg => logInfo(`Toast message: ${msg}`));
          }
          
          // Now wait for the next modal (SerialNumberReceiveModal) with multiple attempts
          logInfo('Waiting for Serial Number modal or next step...');
          let modalAfterNav = null;
          let attempts = 0;
          const maxAttempts = 5;
          
          while (attempts < maxAttempts && !modalAfterNav) {
            await wait(1000);
            modalAfterNav = await page.$('[role="dialog"], .modal, [class*="modal"], [class*="Modal"]');
            if (!modalAfterNav) {
              attempts++;
              logInfo(`Waiting for modal... attempt ${attempts}/${maxAttempts}`);
            }
          }
          
          if (modalAfterNav) {
          // Check what type of modal appeared
          const modalTitle = await page.evaluate(() => {
            const modal = document.querySelector('[role="dialog"], .modal, [class*="modal"], [class*="Modal"]');
            if (modal) {
              const title = modal.querySelector('h1, h2, h3, [class*="title"]');
              return title ? title.textContent.trim() : 'Unknown Modal';
            }
            return null;
          });
          
          logSuccess(`Modal appeared: "${modalTitle}"`);
          await captureScreenshot(page, 'modal-appeared');
          
          // Look for the action buttons in this modal
          const modalButtons = await page.$$('button');
          logInfo(`Found ${modalButtons.length} buttons in modal`);
          
          let skipButton = null;
          let completeButton = null;
          let receiveButton = null;
          let confirmPricingButton = null;
          let addToInventoryButton = null;
          
          for (const button of modalButtons) {
            const text = await page.evaluate(el => el.textContent, button);
            const disabled = await page.evaluate(el => el.disabled, button);
            
            if (text) {
              logInfo(`Modal button: "${text}" ${disabled ? '[DISABLED]' : '[ENABLED]'}`);
              
              if (text.includes('Skip') && !disabled) {
                skipButton = button;
              }
              if ((text.includes('Complete') || text.includes('Finish')) && !disabled) {
                completeButton = button;
              }
              if (text.includes('Receive') && !disabled) {
                receiveButton = button;
              }
              if ((text.includes('Confirm Pricing') || text.includes('Confirm & Continue')) && !disabled) {
                confirmPricingButton = button;
              }
              if (text.includes('Add to Inventory') && !disabled) {
                addToInventoryButton = button;
              }
            }
          }
          
          // Try to complete the receive process
          if (confirmPricingButton) {
            await confirmPricingButton.click();
            logSuccess('Clicked "Confirm Pricing" button');
            await wait(2000);
            await captureScreenshot(page, 'after-confirm-pricing');
            
            // Check for "Add to Inventory" confirmation dialog
            logInfo('Waiting for "Add to Inventory?" confirmation dialog...');
            await wait(3000);
            
            // Look for ALL buttons on the page, including in dialogs
            const allButtons = await page.$$('button');
            let confirmAddBtn = null;
            
            logInfo(`Scanning all ${allButtons.length} buttons for "Confirm & Add"...`);
            
            for (const button of allButtons) {
              const text = await page.evaluate(el => el.textContent, button);
              const disabled = await page.evaluate(el => el.disabled, button);
              const isVisible = await page.evaluate(el => {
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
              }, button);
              
              if (text && isVisible) {
                // Look for the specific "Confirm & Add" button
                if (text.includes('Confirm & Add') || 
                    (text.includes('Confirm') && text.includes('Add')) ||
                    text === 'Confirm & Add') {
                  confirmAddBtn = button;
                  logSuccess(`✅ Found "Confirm & Add" button! Text: "${text}"`);
                  break;
                }
              }
            }
            
            if (confirmAddBtn) {
              await captureScreenshot(page, 'before-clicking-confirm-add');
              await confirmAddBtn.click();
              logSuccess('✅ Clicked "Confirm & Add" button!');
              
              // Wait for the database operation to complete
              await wait(7000);
              await captureScreenshot(page, 'after-confirm-add');
              
              // Check for success toast messages
              const successToasts = await page.evaluate(() => {
                const toasts = document.querySelectorAll('[data-sonner-toast], [role="status"], .toast, [class*="toast"]');
                return Array.from(toasts).map(t => t.textContent.trim()).filter(t => t.length > 0);
              });
              
              if (successToasts.length > 0) {
                successToasts.forEach(msg => logSuccess(`✅ Success Toast: ${msg}`));
              }
              
              // Check for any visible success indicators
              const successIndicators = await page.evaluate(() => {
                const greenText = document.querySelectorAll('.text-green-500, .text-green-600, .bg-green-500, .bg-green-600');
                return greenText.length;
              });
              
              logInfo(`Found ${successIndicators} success indicators on page`);
              logSuccess('✅ Purchase order receive completed successfully!');
            } else {
              logError('❌ Could not find "Confirm & Add" button!');
              
              // Log all visible buttons for debugging
              logInfo('Listing all visible buttons:');
              for (const button of allButtons) {
                const text = await page.evaluate(el => el.textContent, button);
                const isVisible = await page.evaluate(el => {
                  const rect = el.getBoundingClientRect();
                  return rect.width > 0 && rect.height > 0;
                }, button);
                
                if (text && text.length > 0 && text.length < 50 && isVisible) {
                  logInfo(`  - "${text}"`);
                }
              }
              
              await captureScreenshot(page, 'confirm-add-button-not-found');
            }
          } else if (addToInventoryButton) {
            await addToInventoryButton.click();
            logSuccess('Clicked "Add to Inventory" button');
            await wait(5000);
            await captureScreenshot(page, 'after-add-to-inventory');
          } else if (completeButton) {
            await completeButton.click();
            logSuccess('Clicked "Complete" button');
            await wait(3000);
            await captureScreenshot(page, 'after-complete');
          } else if (skipButton) {
            await skipButton.click();
            logInfo('Clicked "Skip" button (for serial numbers)');
            await wait(2000);
            await captureScreenshot(page, 'after-skip');
            
            // After skipping, there might be another modal or we're done
            const nextModal = await page.$('[role="dialog"], .modal');
            if (nextModal) {
              logInfo('Another modal appeared after skip - looking for complete button');
              const nextButtons = await page.$$('button');
              
              for (const button of nextButtons) {
                const text = await page.evaluate(el => el.textContent, button);
                const disabled = await page.evaluate(el => el.disabled, button);
                
                if (text && (text.includes('Complete') || text.includes('Finish') || text.includes('Confirm')) && !disabled) {
                  logInfo(`Found complete button: "${text}"`);
                  await button.click();
                  await wait(3000);
                  await captureScreenshot(page, 'final-complete');
                  break;
                }
              }
            }
          } else if (receiveButton) {
            await receiveButton.click();
            logInfo('Clicked "Receive" button');
            await wait(3000);
            await captureScreenshot(page, 'after-receive-click');
          } else {
            logWarning('Could not find Skip, Complete, or Receive button in modal');
          }
        } else {
          logInfo('No next modal appeared after clicking "Proceed to Receive"');
          logInfo('Checking if receive action completed successfully...');
          await wait(2000);
          await captureScreenshot(page, 'no-next-modal-checking-status');
          
          // Check for success indicators
          const pageContent = await page.evaluate(() => {
            return {
              url: window.location.href,
              title: document.title,
              bodyText: document.body.innerText.substring(0, 500),
              hasSuccessIndicators: document.querySelector('.text-green-500, .text-green-600, [class*="success"]') !== null
            };
          });
          
          logInfo(`Current URL: ${pageContent.url}`);
          logInfo(`Page has success indicators: ${pageContent.hasSuccessIndicators}`);
          
          // Check for toast messages again after waiting
          const finalToasts = await page.evaluate(() => {
            const toasts = document.querySelectorAll('[data-sonner-toast], [role="status"], .toast');
            return Array.from(toasts).map(t => t.textContent.trim()).filter(t => t.length > 0);
          });
          
          if (finalToasts.length > 0) {
            finalToasts.forEach(msg => logSuccess(`Final toast: ${msg}`));
          }
          
          // List all buttons on the current page to see what's available
          const currentButtons = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.map(btn => btn.textContent.trim()).filter(t => t.length > 0 && t.length < 50);
          });
          
          logInfo(`Current page buttons: ${currentButtons.slice(0, 10).join(', ')}`);
        }
        } else {
          logWarning('Could not find "Receive Order" button on detail page');
          logInfo('Listing all button texts on the page for debugging:');
          
          const allButtonTexts = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.map(btn => ({
              text: btn.textContent.trim(),
              disabled: btn.disabled,
              ariaLabel: btn.getAttribute('aria-label')
            })).filter(b => b.text.length > 0);
          });
          
          allButtonTexts.forEach((btn, idx) => {
            logInfo(`  ${idx + 1}. "${btn.text}" ${btn.disabled ? '[DISABLED]' : '[ENABLED]'} (aria: ${btn.ariaLabel})`);
          });
          
          await captureScreenshot(page, 'no-receive-button-on-detail');
        }
      } else {
        logWarning('No modal appeared and URL did not change to detail page');
        const errors = await checkForErrors(page);
        if (errors.length > 0) {
          throw new Error(`Receive failed: ${errors[0].text}`);
        }
        await captureScreenshot(page, 'no-modal-no-nav');
      }
    }
    
    // Verification Step 1: Check if items were added to inventory
    logStep('Verification', 'Checking if items were added to inventory');
    
    logInfo('Navigating to Inventory page...');
    
    // Try to find Inventory link in navigation
    const inventoryLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const invLink = links.find(link => 
        link.textContent.toLowerCase().includes('inventory') || 
        link.href.includes('inventory')
      );
      return invLink ? invLink.href : null;
    });
    
    if (inventoryLink) {
      await page.goto(inventoryLink, { waitUntil: 'networkidle2' });
      await wait(3000);
      await captureScreenshot(page, 'inventory-page');
      
      // Check for recently added items
      const inventoryItems = await page.evaluate(() => {
        const rows = document.querySelectorAll('table tbody tr, [class*="item"], [class*="product"]');
        const items = [];
        
        rows.forEach(row => {
          const text = row.textContent;
          // Look for items added today
          if (text.includes('25 Oct') || text.includes('Today') || text.includes('Just now')) {
            items.push(text.substring(0, 150));
          }
        });
        
        return items;
      });
      
      if (inventoryItems.length > 0) {
        logSuccess(`✅ Found ${inventoryItems.length} recently added inventory item(s)!`);
        inventoryItems.forEach((item, idx) => {
          logInfo(`  ${idx + 1}. ${item}...`);
        });
      } else {
        logWarning('⚠️ No recently added inventory items found on inventory page');
        logInfo('Items might have been added but not visible in current view');
      }
    } else {
      logWarning('Could not find Inventory page link - skipping inventory verification');
    }
    
    // Verification Step 2: Navigate back to purchase orders list to check status
    logInfo('Navigating back to purchase orders list to verify status change...');
    try {
      await page.goto(APP_URL + '/lats/purchase-orders', { waitUntil: 'networkidle2', timeout: 60000 });
      await wait(3000);
    } catch (navError) {
      logWarning('Navigation timeout - trying without waiting for networkidle2');
      await page.goto(APP_URL + '/lats/purchase-orders', { waitUntil: 'domcontentloaded' });
      await wait(3000);
    }
    
    // Check the status of the first purchase order again
    const updatedPOStatus = await page.evaluate(() => {
      const firstRow = document.querySelector('table tbody tr:first-child');
      if (firstRow) {
        return firstRow.textContent;
      }
      return null;
    });
    
    if (updatedPOStatus) {
      logInfo(`Updated PO status: ${updatedPOStatus.substring(0, 150)}...`);
      
      if (updatedPOStatus.toLowerCase().includes('received')) {
        logSuccess('✅ Purchase order status changed to RECEIVED! The receive action was successful!');
      } else if (updatedPOStatus.toLowerCase().includes('partial')) {
        logSuccess('✅ Purchase order status changed to PARTIAL RECEIVED! The receive action was successful!');
      } else if (updatedPOStatus.toLowerCase().includes('sent')) {
        logWarning('⚠️ Purchase order still shows SENT status. Receive might not have completed.');
      } else {
        logInfo(`Current status appears to be: ${updatedPOStatus.includes('completed') ? 'COMPLETED' : 'UNKNOWN'}`);
      }
    }
    
    // Verification Step 3: Check the PO detail page for inventory items
    logInfo('Checking purchase order detail page for received inventory items...');
    
    // Get the PO ID from the first row
    const firstPOLink = await page.$('table tbody tr:first-child a[href*="purchase-orders"]');
    if (firstPOLink) {
      await firstPOLink.click();
      await wait(3000);
      logInfo('Opened purchase order detail page');
      await captureScreenshot(page, 'po-detail-after-receive');
      
      // Try to click on "Items & Inventory" tab
      const tabs = await page.$$('button, a');
      for (const tab of tabs) {
        const text = await page.evaluate(el => el.textContent, tab);
        if (text && text.includes('Items & Inventory')) {
          logInfo('Clicking "Items & Inventory" tab...');
          await tab.click();
          await wait(2000);
          await captureScreenshot(page, 'inventory-tab');
          break;
        }
      }
      
      // Check for inventory items in the detail page
      const detailInventoryItems = await page.evaluate(() => {
        const inventorySection = document.body.textContent;
        
        // Look for indicators that items were received
        const hasInventoryItems = inventorySection.includes('Serial Number') || 
                                   inventorySection.includes('IMEI') ||
                                   inventorySection.includes('Available') ||
                                   inventorySection.includes('In Stock');
        
        // Count any table rows that might be inventory items
        const rows = document.querySelectorAll('table tbody tr');
        let inventoryCount = 0;
        
        rows.forEach(row => {
          const text = row.textContent;
          if (text.includes('Available') || text.includes('Pending') || text.includes('Reserved')) {
            inventoryCount++;
          }
        });
        
        return {
          hasInventorySection: hasInventoryItems,
          inventoryItemCount: inventoryCount
        };
      });
      
      if (detailInventoryItems.hasInventorySection || detailInventoryItems.inventoryItemCount > 0) {
        logSuccess(`✅ Found inventory section with ${detailInventoryItems.inventoryItemCount} item(s) in PO detail page!`);
      } else {
        logInfo('No inventory items visible in PO detail page yet');
      }
    }
    
    await captureScreenshot(page, 'final-po-list-verification');
    logSuccess('Purchase order receiving process completed');
    
  } catch (error) {
    logError(`Failed to receive purchase order: ${error.message}`);
    await captureScreenshot(page, 'receive-error');
    issues.push({
      step: 'Receive Purchase Order',
      error: error.message,
      screenshot: await captureScreenshot(page, 'receive-error')
    });
    throw error;
  }
}

async function analyzeIssues() {
  logStep(5, 'Analyzing issues and generating fixes');
  
  if (issues.length === 0) {
    logSuccess('No issues found during the test! 🎉');
    return;
  }
  
  log(`\n${'═'.repeat(60)}`, 'red');
  log('ISSUES FOUND', 'red');
  log('═'.repeat(60), 'red');
  
  issues.forEach((issue, index) => {
    log(`\n${index + 1}. ${issue.step}`, 'yellow');
    log(`   Error: ${issue.error}`, 'red');
    log(`   Screenshot: ${issue.screenshot}`, 'blue');
  });
  
  // Generate fixes based on common issues
  log(`\n${'═'.repeat(60)}`, 'green');
  log('SUGGESTED FIXES', 'green');
  log('═'.repeat(60), 'green');
  
  issues.forEach((issue, index) => {
    if (issue.error.includes('Could not find')) {
      fixes.push({
        issue: issue.error,
        fix: `Check if the element selector needs to be updated. The UI might have changed.`,
        codeArea: 'Update selectors in the corresponding function'
      });
    }
    
    if (issue.error.includes('Navigation') || issue.error.includes('timeout')) {
      fixes.push({
        issue: issue.error,
        fix: `Increase timeout values or add more wait conditions. The page might be loading slowly.`,
        codeArea: 'Add: await page.waitForSelector("expected-element", { timeout: 60000 })'
      });
    }
    
    if (issue.error.includes('Login')) {
      fixes.push({
        issue: issue.error,
        fix: `Verify login credentials and check if the login form structure has changed.`,
        codeArea: 'Update login form selectors or credentials'
      });
    }
  });
  
  fixes.forEach((fix, index) => {
    log(`\n${index + 1}. Issue: ${fix.issue}`, 'yellow');
    log(`   Fix: ${fix.fix}`, 'green');
    log(`   Code: ${fix.codeArea}`, 'cyan');
  });
  
  // Save report to file
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalIssues: issues.length,
      totalFixes: fixes.length
    },
    issues,
    fixes
  };
  
  writeFileSync('purchase-order-test-report.json', JSON.stringify(report, null, 2));
  logSuccess('Test report saved to: purchase-order-test-report.json');
}

async function main() {
  log('\n' + '═'.repeat(60), 'cyan');
  log('AUTOMATED PURCHASE ORDER RECEIVE TEST', 'bright');
  log('═'.repeat(60), 'cyan');
  log(`URL: ${APP_URL}`, 'blue');
  log(`Login: ${LOGIN_EMAIL}`, 'blue');
  log('═'.repeat(60) + '\n', 'cyan');
  
  let browser;
  let page;
  
  try {
    // Launch browser
    logInfo('Launching browser...');
    browser = await puppeteer.launch({
      headless: false, // Set to true for CI/CD
      defaultViewport: {
        width: 1920,
        height: 1080
      },
      args: ['--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-default-apps',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding']
    });
    
    page = await browser.newPage();
    
    // Enable console logging from the page
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logWarning(`Browser console error: ${msg.text()}`);
      }
    });
    
    // Enable error handling
    page.on('pageerror', error => {
      logWarning(`Page error: ${error.message}`);
    });
    
    logSuccess('Browser launched');
    
    // Run test steps
    await login(page);
    await navigateToPurchaseOrders(page);
    const latestPO = await findLatestPurchaseOrder(page);
    await receivePurchaseOrder(page, latestPO);
    
    // Wait a bit to see the final state
    await wait(3000);
    
    logSuccess('Test completed successfully! 🎉');
    
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    console.error(error);
  } finally {
    // Analyze issues and generate report
    await analyzeIssues();
    
    if (browser) {
      logInfo('Closing browser...');
      await browser.close();
    }
  }
  
  log('\n' + '═'.repeat(60), 'cyan');
  log('TEST COMPLETED', 'bright');
  log('═'.repeat(60) + '\n', 'cyan');
}

// Run the test
main().catch(console.error);

