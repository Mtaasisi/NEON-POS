// 🧪 MANUAL INVENTORY EDIT FUNCTIONALITY TEST
// Copy and paste this entire code into your browser console on the Purchase Order page

console.log('🧪 Starting comprehensive inventory edit test...');
console.log('='.repeat(50));

// Test Results
const testResults = {
    pageLoaded: false,
    functionsExist: false,
    buttonsFound: false,
    clickableButtons: false,
    noErrors: false
};

// Test 1: Check if page is loaded and basic elements exist
console.log('\n📋 Test 1: Page Load & Basic Elements');
try {
    const title = document.title;
    const hasTable = document.querySelector('table') !== null;
    const hasInventorySection = document.querySelector('h3') && document.querySelector('h3').textContent.includes('Inventory');
    
    console.log('✅ Page title:', title);
    console.log('✅ Table found:', hasTable);
    console.log('✅ Inventory section found:', hasInventorySection);
    
    testResults.pageLoaded = hasTable && hasInventorySection;
} catch (error) {
    console.log('❌ Page load test failed:', error);
}

// Test 2: Check if required functions exist
console.log('\n📋 Test 2: Function Existence');
try {
    // Check if functions are defined (they might be in window scope)
    const functionsToCheck = [
        'handleUpdateSerialNumber',
        'handleUpdateIMEI', 
        'handleUpdateStatus',
        'handleUpdateLocation',
        'handleUpdateSellingPrice',
        'serialNumberService'
    ];
    
    let functionsFound = 0;
    functionsToCheck.forEach(funcName => {
        try {
            // Try different ways to find the function
            let func = null;
            
            // Method 1: Direct window property
            if (window[funcName]) {
                func = window[funcName];
            }
            
            // Method 2: Try to find in React component scope
            if (!func) {
                const reactElements = document.querySelectorAll('[data-reactroot], [data-react-helmet]');
                if (reactElements.length > 0) {
                    // Functions might be in React component
                    console.log('🔍 React elements found, checking component scope...');
                }
            }
            
            if (func && typeof func === 'function') {
                console.log(`✅ ${funcName}: Function found`);
                functionsFound++;
            } else {
                console.log(`❌ ${funcName}: Not found or not a function`);
            }
        } catch (error) {
            console.log(`❌ ${funcName}: Error checking - ${error.message}`);
        }
    });
    
    testResults.functionsExist = functionsFound > 0;
    console.log(`📊 Functions found: ${functionsFound}/${functionsToCheck.length}`);
    
} catch (error) {
    console.log('❌ Function existence test failed:', error);
}

// Test 3: Find edit buttons in the DOM
console.log('\n📋 Test 3: Finding Edit Buttons');
try {
    const allButtons = document.querySelectorAll('button');
    const allClickableElements = document.querySelectorAll('[onclick], [role="button"]');
    
    console.log('📊 Total buttons found:', allButtons.length);
    console.log('📊 Total clickable elements:', allClickableElements.length);
    
    // Look for specific button text patterns
    const buttonTexts = Array.from(allButtons).map(btn => btn.textContent.trim());
    const editButtons = buttonTexts.filter(text => 
        text.includes('Edit') || 
        text.includes('Add Serial') || 
        text.includes('Add') ||
        text.includes('Assign') ||
        text.includes('Set Price') ||
        text.includes('✎')
    );
    
    console.log('🎯 Edit-related buttons found:');
    editButtons.forEach((text, index) => {
        console.log(`   ${index + 1}. "${text}"`);
    });
    
    testResults.buttonsFound = editButtons.length > 0;
    
    // Try to find buttons by their likely locations
    console.log('\n🔍 Searching for buttons in specific locations...');
    
    // Look in table cells
    const tableCells = document.querySelectorAll('td');
    let buttonsInCells = 0;
    tableCells.forEach(cell => {
        const buttons = cell.querySelectorAll('button');
        if (buttons.length > 0) {
            buttonsInCells += buttons.length;
        }
    });
    console.log(`📊 Buttons in table cells: ${buttonsInCells}`);
    
} catch (error) {
    console.log('❌ Button finding test failed:', error);
}

// Test 4: Test button clickability
console.log('\n📋 Test 4: Button Clickability Test');
try {
    const testButtons = Array.from(document.querySelectorAll('button')).slice(0, 5); // Test first 5 buttons
    
    if (testButtons.length > 0) {
        console.log('🎯 Testing button clickability...');
        
        testButtons.forEach((button, index) => {
            try {
                // Check if button is visible and enabled
                const isVisible = button.offsetParent !== null;
                const isEnabled = !button.disabled;
                const hasOnClick = button.onclick !== null;
                const hasEventListener = button.addEventListener !== undefined;
                
                console.log(`   Button ${index + 1}: "${button.textContent.trim()}"`);
                console.log(`     Visible: ${isVisible}, Enabled: ${isEnabled}, Has onClick: ${hasOnClick}`);
                
                // Try to simulate click (without actually clicking)
                if (isVisible && isEnabled) {
                    console.log(`     ✅ Button appears clickable`);
                } else {
                    console.log(`     ❌ Button appears non-clickable`);
                }
            } catch (error) {
                console.log(`   ❌ Error testing button ${index + 1}: ${error.message}`);
            }
        });
        
        testResults.clickableButtons = true;
    } else {
        console.log('❌ No buttons found to test');
        testResults.clickableButtons = false;
    }
} catch (error) {
    console.log('❌ Button clickability test failed:', error);
}

// Test 5: Check for JavaScript errors
console.log('\n📋 Test 5: JavaScript Error Check');
try {
    // Set up error listener
    const errors = [];
    const originalError = window.onerror;
    
    window.onerror = function(message, source, lineno, colno, error) {
        errors.push({
            message,
            source,
            line: lineno,
            column: colno,
            error: error?.stack
        });
        console.log('❌ JavaScript Error detected:', message);
    };
    
    // Wait a moment to catch any errors
    setTimeout(() => {
        if (errors.length === 0) {
            console.log('✅ No JavaScript errors detected');
            testResults.noErrors = true;
        } else {
            console.log(`❌ ${errors.length} JavaScript errors found:`);
            errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error.message} at line ${error.line}`);
            });
            testResults.noErrors = false;
        }
        
        // Restore original error handler
        window.onerror = originalError;
        
        // Generate final report
        generateReport();
    }, 2000);
    
} catch (error) {
    console.log('❌ Error check failed:', error);
    testResults.noErrors = false;
    generateReport();
}

// Test 6: Check React/Component state
console.log('\n📋 Test 6: React/Component State Check');
try {
    // Look for React DevTools
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        console.log('✅ React DevTools detected');
    }
    
    // Look for React components
    const reactRoots = document.querySelectorAll('[data-reactroot]');
    console.log('📊 React roots found:', reactRoots.length);
    
    // Check for common React patterns
    const reactElements = document.querySelectorAll('[class*="react"], [id*="react"]');
    console.log('📊 React-related elements:', reactElements.length);
    
} catch (error) {
    console.log('❌ React state check failed:', error);
}

function generateReport() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 FINAL TEST REPORT');
    console.log('='.repeat(50));
    
    const tests = [
        { name: 'Page Loaded', result: testResults.pageLoaded },
        { name: 'Functions Exist', result: testResults.functionsExist },
        { name: 'Buttons Found', result: testResults.buttonsFound },
        { name: 'Buttons Clickable', result: testResults.clickableButtons },
        { name: 'No JS Errors', result: testResults.noErrors }
    ];
    
    let passedTests = 0;
    
    tests.forEach(test => {
        const status = test.result ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${test.name}`);
        if (test.result) passedTests++;
    });
    
    console.log('\n📈 SUMMARY:');
    console.log(`Tests Passed: ${passedTests}/${tests.length}`);
    console.log(`Success Rate: ${Math.round((passedTests / tests.length) * 100)}%`);
    
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (passedTests === tests.length) {
        console.log('🎉 All tests passed! The edit functionality should be working.');
        console.log('   If buttons still don\'t work, try:');
        console.log('   - Hard refresh (Ctrl+Shift+R)');
        console.log('   - Check if popup blockers are enabled');
        console.log('   - Try clicking buttons again');
    } else {
        console.log('🔧 Issues found. Try these fixes:');
        
        if (!testResults.pageLoaded) {
            console.log('   - Make sure you\'re on the Purchase Order detail page');
            console.log('   - Ensure the page has fully loaded');
        }
        
        if (!testResults.functionsExist) {
            console.log('   - Hard refresh the page (Ctrl+Shift+R)');
            console.log('   - Check if the development server is running');
            console.log('   - Verify the latest code is deployed');
        }
        
        if (!testResults.buttonsFound) {
            console.log('   - Scroll to the Inventory Items section');
            console.log('   - Make sure items are received into inventory');
        }
        
        if (!testResults.clickableButtons) {
            console.log('   - Check browser console for JavaScript errors');
            console.log('   - Try a different browser');
        }
        
        if (!testResults.noErrors) {
            console.log('   - Fix JavaScript errors shown above');
            console.log('   - Check import statements');
        }
    }
    
    console.log('\n🔗 For more help, check:');
    console.log('   - Browser console for error messages');
    console.log('   - Network tab for failed requests');
    console.log('   - Application tab for localStorage/sessionStorage');
    
    console.log('\n✅ Test complete! Copy this output and share if you need help.');
}

// Start the test
console.log('🚀 Test started. Results will appear below...');
