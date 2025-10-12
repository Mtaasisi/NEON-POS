// ================================================================================
// QUICK PRICE DEBUG SCRIPT
// ================================================================================
// Add this to your browser console to debug price display issues
// ================================================================================

console.log('🔍 QUICK PRICE DEBUG - Starting...');

// Function to test the API call directly
async function testPriceAPI() {
  console.log('🧪 Testing price API call...');
  
  try {
    // Test the RPC function
    const response = await fetch('/api/rpc/get_inventory_json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    console.log('📡 API Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📊 API Response data:', data);
    
    // Check prices specifically
    console.log('💰 PRICE CHECK:');
    data.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}:`);
      console.log(`   Price: ${product.price}`);
      console.log(`   Cost Price: ${product.costPrice}`);
      console.log(`   Selling Price: ${product.sellingPrice}`);
      console.log(`   Stock: ${product.stock}`);
      console.log(`   Variants: ${product.variantCount}`);
      console.log('---');
    });
    
    return data;
    
  } catch (error) {
    console.error('❌ API Error:', error);
    return null;
  }
}

// Function to check DOM elements for prices
function checkPriceElements() {
  console.log('🔍 Checking price elements in DOM...');
  
  // Look for common price element selectors
  const priceSelectors = [
    '.price',
    '[class*="price"]',
    '[data-price]',
    '.product-price',
    '.item-price',
    '.cost',
    '.amount',
    '.value'
  ];
  
  let foundElements = 0;
  
  priceSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
      elements.forEach((element, index) => {
        console.log(`   Element ${index + 1}: "${element.textContent}"`);
        console.log(`   Value: "${element.value || 'N/A'}"`);
        console.log(`   InnerHTML: "${element.innerHTML}"`);
      });
      foundElements += elements.length;
    }
  });
  
  if (foundElements === 0) {
    console.log('❌ No price elements found in DOM');
    console.log('💡 Try these selectors in your component:');
    console.log('   - .price');
    console.log('   - [data-price]');
    console.log('   - .product-price');
  }
  
  return foundElements;
}

// Function to check product elements
function checkProductElements() {
  console.log('🔍 Checking product elements...');
  
  const productSelectors = [
    '[data-product-id]',
    '.product',
    '.product-item',
    '.inventory-item',
    '[class*="product"]'
  ];
  
  productSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`✅ Found ${elements.length} product elements with selector: ${selector}`);
      
      elements.forEach((element, index) => {
        const productId = element.getAttribute('data-product-id');
        const productName = element.querySelector('[class*="name"], .product-name, h3, h4');
        
        console.log(`   Product ${index + 1}:`);
        console.log(`     ID: ${productId || 'N/A'}`);
        console.log(`     Name: ${productName ? productName.textContent : 'N/A'}`);
        
        // Check for price elements within this product
        const priceElement = element.querySelector('.price, [class*="price"]');
        if (priceElement) {
          console.log(`     Price element: "${priceElement.textContent}"`);
        } else {
          console.log(`     ❌ No price element found`);
        }
      });
    }
  });
}

// Function to simulate data display
function simulatePriceDisplay(data) {
  console.log('🎭 Simulating price display...');
  
  if (!data || !Array.isArray(data)) {
    console.log('❌ No data to simulate');
    return;
  }
  
  data.forEach((product, index) => {
    console.log(`📦 Product ${index + 1}: ${product.name}`);
    console.log(`   Should display: TSh ${product.price.toLocaleString()}`);
    console.log(`   Stock: ${product.stock} units`);
    console.log(`   Status: ${product.status}`);
    console.log(`   Variants: ${product.variantCount}`);
    
    // Check if price is reasonable
    if (product.price === 0) {
      console.log(`   ⚠️  WARNING: Price is 0 - this might be the issue!`);
    } else if (product.price > 1000000) {
      console.log(`   ⚠️  WARNING: Price is very high (${product.price}) - check if this is correct`);
    } else {
      console.log(`   ✅ Price looks reasonable`);
    }
  });
}

// Main debug function
async function debugPrices() {
  console.log('🚀 Starting price debug...');
  
  // Step 1: Test API
  const data = await testPriceAPI();
  
  // Step 2: Check DOM elements
  checkPriceElements();
  
  // Step 3: Check product elements
  checkProductElements();
  
  // Step 4: Simulate display
  simulatePriceDisplay(data);
  
  console.log('✅ Price debug complete!');
  
  // Return data for manual inspection
  return data;
}

// Auto-run the debug
debugPrices();

// Export functions for manual use
window.priceDebug = {
  testPriceAPI,
  checkPriceElements,
  checkProductElements,
  simulatePriceDisplay,
  debugPrices
};

console.log('✅ Price debug functions loaded. Use window.priceDebug to access them.');
