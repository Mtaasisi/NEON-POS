// ================================================================================
// AUTO-GENERATED DEBUG CODE FOR INVENTORY DISPLAY
// ================================================================================
// Add this code to your inventory component to debug the data fetching

console.log('🔍 INVENTORY DEBUG - Starting data fetch...');

// Debug function to log all inventory data
const debugInventoryData = (data) => {
  console.log('📊 INVENTORY DEBUG - Raw data received:', data);
  
  if (!data) {
    console.error('❌ INVENTORY DEBUG - No data received!');
    return;
  }
  
  if (!Array.isArray(data)) {
    console.error('❌ INVENTORY DEBUG - Data is not an array:', typeof data);
    return;
  }
  
  console.log(`✅ INVENTORY DEBUG - Received ${data.length} products`);
  
  data.forEach((product, index) => {
    console.log(`📦 Product ${index + 1}: ${product.name}`);
    console.log(`   ID: ${product.id}`);
    console.log(`   SKU: ${product.sku}`);
    console.log(`   Price: ${product.price}`);
    console.log(`   Stock: ${product.stock}`);
    console.log(`   Status: ${product.status}`);
    console.log(`   Variants: ${product.variantCount}`);
    console.log(`   Category: ${product.category}`);
    console.log(`   Supplier: ${product.supplier}`);
    console.log(`   Image URL: ${product.imageUrl}`);
    console.log('---');
  });
};

// Debug function to check if prices are being displayed
const debugPriceDisplay = (products) => {
  console.log('💰 PRICE DISPLAY DEBUG:');
  
  products.forEach((product, index) => {
    const priceElement = document.querySelector(`[data-product-id="${product.id}"] .price`);
    const stockElement = document.querySelector(`[data-product-id="${product.id}"] .stock`);
    const variantElement = document.querySelector(`[data-product-id="${product.id}"] .variants`);
    
    console.log(`Product ${index + 1}: ${product.name}`);
    console.log(`   Price element found: ${priceElement ? 'YES' : 'NO'}`);
    console.log(`   Stock element found: ${stockElement ? 'YES' : 'NO'}`);
    console.log(`   Variant element found: ${variantElement ? 'YES' : 'NO'}`);
    
    if (priceElement) {
      console.log(`   Price element text: "${priceElement.textContent}"`);
      console.log(`   Price element value: "${priceElement.value || 'N/A'}"`);
    }
    
    if (stockElement) {
      console.log(`   Stock element text: "${stockElement.textContent}"`);
    }
    
    if (variantElement) {
      console.log(`   Variant element text: "${variantElement.textContent}"`);
    }
  });
};

// Debug function to check API calls
const debugAPICalls = () => {
  console.log('🌐 API CALLS DEBUG:');
  
  // Override fetch to log all API calls
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    console.log('📡 API Call:', args[0]);
    return originalFetch.apply(this, args)
      .then(response => {
        console.log('📡 API Response:', response.status, response.statusText);
        return response;
      })
      .catch(error => {
        console.error('📡 API Error:', error);
        throw error;
      });
  };
};

// Debug function to check component state
const debugComponentState = (componentName, state) => {
  console.log(`🔧 COMPONENT DEBUG - ${componentName}:`);
  console.log('State:', state);
  
  if (state.products) {
    console.log(`Products in state: ${state.products.length}`);
    state.products.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name} - Price: ${product.price}, Stock: ${product.stock}`);
    });
  }
  
  if (state.loading) {
    console.log('Component is loading...');
  }
  
  if (state.error) {
    console.error('Component error:', state.error);
  }
};

// Auto-run debug functions when page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 INVENTORY DEBUG - Page loaded, starting debug...');
  debugAPICalls();
});

// Export debug functions for manual use
window.inventoryDebug = {
  debugInventoryData,
  debugPriceDisplay,
  debugAPICalls,
  debugComponentState
};

console.log('✅ INVENTORY DEBUG - Debug functions loaded. Use window.inventoryDebug to access them.');
