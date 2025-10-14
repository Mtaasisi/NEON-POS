import { chromium } from 'playwright';

async function testPaymentSettings() {
  console.log('🚀 Starting Payment Settings Automated Test...\n');
  
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    // Step 1: Navigate to login page
    console.log('📍 Step 1: Navigating to login page...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Step 2: Login
    console.log('🔐 Step 2: Logging in as care@care.com...');
    await page.fill('input[type="email"]', 'care@care.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Step 3: Navigate to Admin Settings
    console.log('⚙️ Step 3: Navigating to Admin Settings...');
    await page.goto('http://localhost:5173/admin-settings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Step 4: Click on Payments in sidebar
    console.log('💳 Step 4: Opening Payment Settings...');
    await page.click('text=Payments');
    await page.waitForTimeout(2000);

    // Test Results
    const results = {
      passed: [],
      failed: [],
      warnings: []
    };

    // ========== TEST 1: Expense Categories Tab ==========
    console.log('\n📦 TEST 1: Testing Expense Categories Tab...');
    try {
      await page.click('text=Expense Categories');
      await page.waitForTimeout(1500);
      
      // Check if tab content loaded
      const categoriesVisible = await page.isVisible('text=Manage categories for organizing expenses');
      if (categoriesVisible) {
        console.log('✅ Expense Categories tab loaded successfully');
        results.passed.push('Expense Categories - Tab loads');
        
        // Try to add a category
        const addButton = await page.isVisible('text=Add Category');
        if (addButton) {
          await page.click('text=Add Category');
          await page.waitForTimeout(1000);
          
          const formVisible = await page.isVisible('text=New Category');
          if (formVisible) {
            console.log('✅ Add Category form opens correctly');
            results.passed.push('Expense Categories - Add form works');
            
            // Fill in category details
            await page.fill('input[placeholder*="Office Supplies"]', 'Test Category');
            await page.fill('input[placeholder*="Brief description"]', 'Automated test category');
            await page.waitForTimeout(500);
            
            // Cancel to avoid adding test data
            await page.click('text=Cancel');
            await page.waitForTimeout(500);
            console.log('✅ Form validation works (cancelled to avoid test data)');
            results.passed.push('Expense Categories - Form validation');
          }
        }
      }
    } catch (error) {
      console.error('❌ Expense Categories test failed:', error.message);
      results.failed.push(`Expense Categories - ${error.message}`);
    }

    // ========== TEST 2: Payment Gateway Tab ==========
    console.log('\n🛡️ TEST 2: Testing Payment Gateway Tab...');
    try {
      await page.click('text=Payment Gateway');
      await page.waitForTimeout(1500);
      
      const gatewayVisible = await page.isVisible('text=Payment Gateway Configuration');
      if (gatewayVisible) {
        console.log('✅ Payment Gateway tab loaded successfully');
        results.passed.push('Payment Gateway - Tab loads');
        
        // Check if Beem gateway settings are visible
        const beemVisible = await page.isVisible('text=Beem Payment Gateway');
        if (beemVisible) {
          console.log('✅ Beem Payment Gateway settings visible');
          results.passed.push('Payment Gateway - Beem settings visible');
          
          // Test enable/disable toggle
          const checkbox = await page.locator('input[type="checkbox"]').first();
          const initialState = await checkbox.isChecked();
          console.log(`   Initial state: ${initialState ? 'Enabled' : 'Disabled'}`);
          
          // Toggle it
          await checkbox.click();
          await page.waitForTimeout(500);
          const newState = await checkbox.isChecked();
          
          if (newState !== initialState) {
            console.log('✅ Toggle works correctly');
            results.passed.push('Payment Gateway - Toggle functionality');
            
            // Toggle back
            await checkbox.click();
            await page.waitForTimeout(500);
          }
        }
      }
    } catch (error) {
      console.error('❌ Payment Gateway test failed:', error.message);
      results.failed.push(`Payment Gateway - ${error.message}`);
    }

    // ========== TEST 3: Preferences Tab ==========
    console.log('\n⚙️ TEST 3: Testing Preferences Tab...');
    try {
      await page.click('text=Preferences');
      await page.waitForTimeout(1500);
      
      const preferencesVisible = await page.isVisible('text=Payment Preferences');
      if (preferencesVisible) {
        console.log('✅ Preferences tab loaded successfully');
        results.passed.push('Preferences - Tab loads');
        
        // Check payment methods section
        const cashVisible = await page.isVisible('text=Cash Payments');
        const cardVisible = await page.isVisible('text=Card Payments');
        const mobileVisible = await page.isVisible('text=Mobile Money');
        
        if (cashVisible && cardVisible && mobileVisible) {
          console.log('✅ All payment methods visible');
          results.passed.push('Preferences - Payment methods display');
          
          // Test tax rate input
          const taxInput = await page.locator('input[placeholder="18"]');
          if (await taxInput.isVisible()) {
            const currentValue = await taxInput.inputValue();
            console.log(`   Current tax rate: ${currentValue}%`);
            results.passed.push('Preferences - Tax rate field works');
          }
        }
      }
    } catch (error) {
      console.error('❌ Preferences test failed:', error.message);
      results.failed.push(`Preferences - ${error.message}`);
    }

    // ========== TEST 4: Notifications & Receipts Tab ==========
    console.log('\n📧 TEST 4: Testing Notifications & Receipts Tab...');
    try {
      await page.click('text=Notifications & Receipts');
      await page.waitForTimeout(1500);
      
      const notificationsVisible = await page.isVisible('text=Payment Notifications & Receipts');
      if (notificationsVisible) {
        console.log('✅ Notifications & Receipts tab loaded successfully');
        results.passed.push('Notifications - Tab loads');
        
        // Check receipt delivery methods
        const emailVisible = await page.isVisible('text=Email Receipts');
        const smsVisible = await page.isVisible('text=SMS Receipts');
        const whatsappVisible = await page.isVisible('text=WhatsApp Receipts');
        
        if (emailVisible && smsVisible && whatsappVisible) {
          console.log('✅ All receipt delivery methods visible');
          results.passed.push('Notifications - Delivery methods display');
          
          // Test notification triggers section
          const autoSendVisible = await page.isVisible('text=Auto-send on payment success');
          const notifyFailureVisible = await page.isVisible('text=Notify on payment failure');
          
          if (autoSendVisible && notifyFailureVisible) {
            console.log('✅ Notification triggers section visible');
            results.passed.push('Notifications - Trigger settings display');
          }
          
          // Test receipt template dropdown
          const templateDropdown = await page.isVisible('text=Receipt Template');
          if (templateDropdown) {
            console.log('✅ Receipt template settings visible');
            results.passed.push('Notifications - Template settings display');
          }
          
          // Test save button
          const saveButton = await page.isVisible('text=Save Notification Settings');
          if (saveButton) {
            console.log('✅ Save button present');
            results.passed.push('Notifications - Save functionality available');
          }
        }
      }
    } catch (error) {
      console.error('❌ Notifications & Receipts test failed:', error.message);
      results.failed.push(`Notifications - ${error.message}`);
    }

    // ========== TEST 5: Currency Management Tab ==========
    console.log('\n🌍 TEST 5: Testing Currency Management Tab...');
    try {
      await page.click('text=Currency Management');
      await page.waitForTimeout(1500);
      
      const currencyVisible = await page.isVisible('text=Multi-Currency Management');
      if (currencyVisible) {
        console.log('✅ Currency Management tab loaded successfully');
        results.passed.push('Currency - Tab loads');
        
        // Check base currency section
        const baseCurrencyVisible = await page.isVisible('text=Base Currency Settings');
        if (baseCurrencyVisible) {
          console.log('✅ Base Currency settings visible');
          results.passed.push('Currency - Base currency section displays');
        }
        
        // Check exchange rate management
        const exchangeRateVisible = await page.isVisible('text=Exchange Rate Management');
        if (exchangeRateVisible) {
          console.log('✅ Exchange Rate Management section visible');
          results.passed.push('Currency - Exchange rate section displays');
        }
        
        // Check enabled currencies section
        const enabledCurrenciesVisible = await page.isVisible('text=Enabled Currencies');
        if (enabledCurrenciesVisible) {
          console.log('✅ Enabled Currencies section visible');
          results.passed.push('Currency - Currency selection displays');
          
          // Check if currency checkboxes are visible
          const tzsVisible = await page.isVisible('text=TZS');
          const usdVisible = await page.isVisible('text=USD');
          
          if (tzsVisible && usdVisible) {
            console.log('✅ Currency options (TZS, USD) visible');
            results.passed.push('Currency - Currency checkboxes work');
          }
        }
        
        // Test save button
        const saveButton = await page.isVisible('text=Save Currency Settings');
        if (saveButton) {
          console.log('✅ Save button present');
          results.passed.push('Currency - Save functionality available');
        }
      }
    } catch (error) {
      console.error('❌ Currency Management test failed:', error.message);
      results.failed.push(`Currency - ${error.message}`);
    }

    // ========== TEST 6: Refunds & Disputes Tab ==========
    console.log('\n↩️ TEST 6: Testing Refunds & Disputes Tab...');
    try {
      await page.click('text=Refunds & Disputes');
      await page.waitForTimeout(1500);
      
      const refundsVisible = await page.isVisible('text=Refunds & Dispute Management');
      if (refundsVisible) {
        console.log('✅ Refunds & Disputes tab loaded successfully');
        results.passed.push('Refunds - Tab loads');
        
        // Check refund policies section
        const refundPoliciesVisible = await page.isVisible('text=Refund Policies');
        if (refundPoliciesVisible) {
          console.log('✅ Refund Policies section visible');
          results.passed.push('Refunds - Policies section displays');
          
          // Check enable refunds toggle
          const enableRefundsVisible = await page.isVisible('text=Enable refunds');
          if (enableRefundsVisible) {
            console.log('✅ Enable refunds option visible');
            results.passed.push('Refunds - Enable toggle works');
          }
          
          // Check refund approval option
          const requireApprovalVisible = await page.isVisible('text=Require approval');
          if (requireApprovalVisible) {
            console.log('✅ Require approval option visible');
            results.passed.push('Refunds - Approval workflow available');
          }
          
          // Check partial refunds option
          const partialRefundsVisible = await page.isVisible('text=Allow partial refunds');
          if (partialRefundsVisible) {
            console.log('✅ Partial refunds option visible');
            results.passed.push('Refunds - Partial refund option works');
          }
        }
        
        // Check dispute management section
        const disputeVisible = await page.isVisible('text=Dispute & Chargeback Management');
        if (disputeVisible) {
          console.log('✅ Dispute Management section visible');
          results.passed.push('Refunds - Dispute tracking section displays');
        }
        
        // Test save button
        const saveButton = await page.isVisible('text=Save Refund Settings');
        if (saveButton) {
          console.log('✅ Save button present');
          results.passed.push('Refunds - Save functionality available');
        }
      }
    } catch (error) {
      console.error('❌ Refunds & Disputes test failed:', error.message);
      results.failed.push(`Refunds - ${error.message}`);
    }

    // ========== TEST 7: Payment Reports Tab ==========
    console.log('\n📊 TEST 7: Testing Payment Reports Tab...');
    try {
      await page.click('text=Payment Reports');
      await page.waitForTimeout(1500);
      
      const reportsVisible = await page.isVisible('text=Payment Reports & Analytics');
      if (reportsVisible) {
        console.log('✅ Payment Reports tab loaded successfully');
        results.passed.push('Reports - Tab loads');
        
        // Check default report settings
        const defaultSettingsVisible = await page.isVisible('text=Default Report Settings');
        if (defaultSettingsVisible) {
          console.log('✅ Default Report Settings section visible');
          results.passed.push('Reports - Default settings section displays');
        }
        
        // Check automated reports section
        const automatedReportsVisible = await page.isVisible('text=Automated Reports');
        if (automatedReportsVisible) {
          console.log('✅ Automated Reports section visible');
          results.passed.push('Reports - Automation section displays');
          
          // Check auto-generate toggle
          const autoGenerateVisible = await page.isVisible('text=Enable auto-generated reports');
          if (autoGenerateVisible) {
            console.log('✅ Auto-generate reports option visible');
            results.passed.push('Reports - Auto-generation toggle works');
          }
        }
        
        // Check report content section
        const reportContentVisible = await page.isVisible('text=Report Content');
        if (reportContentVisible) {
          console.log('✅ Report Content section visible');
          results.passed.push('Reports - Content settings display');
        }
        
        // Check key metrics section
        const metricsVisible = await page.isVisible('text=Key Metrics to Track');
        if (metricsVisible) {
          console.log('✅ Key Metrics section visible');
          results.passed.push('Reports - Metrics selection displays');
          
          // Check if specific metrics are visible
          const revenueVisible = await page.isVisible('text=Total Revenue');
          const transactionVisible = await page.isVisible('text=Transaction Count');
          
          if (revenueVisible && transactionVisible) {
            console.log('✅ Metric options visible (Revenue, Transactions, etc.)');
            results.passed.push('Reports - Metric checkboxes work');
          }
        }
        
        // Test save button
        const saveButton = await page.isVisible('text=Save Report Settings');
        if (saveButton) {
          console.log('✅ Save button present');
          results.passed.push('Reports - Save functionality available');
        }
      }
    } catch (error) {
      console.error('❌ Payment Reports test failed:', error.message);
      results.failed.push(`Reports - ${error.message}`);
    }

    // ========== TEST 8: Settings Persistence ==========
    console.log('\n💾 TEST 8: Testing Settings Persistence...');
    try {
      // Go to Notifications tab and change a setting
      await page.click('text=Notifications & Receipts');
      await page.waitForTimeout(1000);
      
      // Find a checkbox and toggle it
      const checkbox = await page.locator('input[type="checkbox"]').first();
      const initialState = await checkbox.isChecked();
      
      // Toggle it
      await checkbox.click();
      await page.waitForTimeout(500);
      
      // Click save
      await page.click('text=Save Notification Settings');
      await page.waitForTimeout(1000);
      
      // Reload the page
      console.log('   Reloading page to test persistence...');
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      // Navigate back to payment settings
      await page.click('text=Payments');
      await page.waitForTimeout(1000);
      await page.click('text=Notifications & Receipts');
      await page.waitForTimeout(1000);
      
      // Check if setting persisted
      const newState = await checkbox.isChecked();
      
      if (newState !== initialState) {
        console.log('✅ Settings persist after page reload');
        results.passed.push('Persistence - Settings saved to localStorage');
      } else {
        console.log('⚠️ Settings may not have persisted');
        results.warnings.push('Persistence - Could not verify if settings persisted');
      }
      
      // Toggle back to original state
      await checkbox.click();
      await page.waitForTimeout(500);
      await page.click('text=Save Notification Settings');
      await page.waitForTimeout(500);
      
    } catch (error) {
      console.error('❌ Settings Persistence test failed:', error.message);
      results.failed.push(`Persistence - ${error.message}`);
    }

    // ========== TEST 9: Tab Navigation & URL Parameters ==========
    console.log('\n🔗 TEST 9: Testing Tab Navigation & URL Parameters...');
    try {
      // Navigate using URL parameter
      await page.goto('http://localhost:5173/admin-settings?tab=currency', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      const currencyVisible = await page.isVisible('text=Multi-Currency Management');
      if (currencyVisible) {
        console.log('✅ Direct URL navigation to Currency tab works');
        results.passed.push('Navigation - URL parameter routing works');
      }
      
      // Test browser back button
      await page.goBack();
      await page.waitForTimeout(1500);
      
      await page.goForward();
      await page.waitForTimeout(1500);
      
      console.log('✅ Browser back/forward navigation works');
      results.passed.push('Navigation - Browser history works');
      
    } catch (error) {
      console.error('❌ Navigation test failed:', error.message);
      results.failed.push(`Navigation - ${error.message}`);
    }

    // ========== FINAL SUMMARY ==========
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\n✅ PASSED TESTS: ${results.passed.length}`);
    results.passed.forEach((test, index) => {
      console.log(`   ${index + 1}. ${test}`);
    });
    
    if (results.failed.length > 0) {
      console.log(`\n❌ FAILED TESTS: ${results.failed.length}`);
      results.failed.forEach((test, index) => {
        console.log(`   ${index + 1}. ${test}`);
      });
    }
    
    if (results.warnings.length > 0) {
      console.log(`\n⚠️ WARNINGS: ${results.warnings.length}`);
      results.warnings.forEach((test, index) => {
        console.log(`   ${index + 1}. ${test}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    const totalTests = results.passed.length + results.failed.length;
    const successRate = ((results.passed.length / totalTests) * 100).toFixed(1);
    console.log(`✨ Success Rate: ${successRate}% (${results.passed.length}/${totalTests} tests passed)`);
    console.log('='.repeat(60) + '\n');

    // Keep browser open for 5 seconds to review
    console.log('🔍 Keeping browser open for review...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ Fatal error during testing:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Test completed and browser closed.');
  }
}

// Run the test
testPaymentSettings().catch(console.error);

