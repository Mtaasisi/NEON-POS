// ================================================================================
// AUTO-GENERATED REACT COMPONENT DEBUG CODE
// ================================================================================
// Add this to your inventory component to debug React state and rendering

import React, { useState, useEffect } from 'react';

const InventoryDebugComponent = () => {
  const [debugInfo, setDebugInfo] = useState({
    products: [],
    loading: false,
    error: null,
    apiCalls: [],
    renderCount: 0
  });

  // Debug effect to log component updates
  useEffect(() => {
    console.log('🔄 INVENTORY COMPONENT - Component updated');
    console.log('Debug info:', debugInfo);
    
    setDebugInfo(prev => ({
      ...prev,
      renderCount: prev.renderCount + 1
    }));
  });

  // Debug function to test data fetching
  const testDataFetch = async () => {
    console.log('🧪 TESTING DATA FETCH...');
    setDebugInfo(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Test the RPC function directly
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
      
      setDebugInfo(prev => ({
        ...prev,
        products: data,
        loading: false,
        apiCalls: [...prev.apiCalls, {
          timestamp: new Date().toISOString(),
          status: 'success',
          dataLength: data.length
        }]
      }));
      
      // Debug the data
      if (window.inventoryDebug) {
        window.inventoryDebug.debugInventoryData(data);
      }
      
    } catch (error) {
      console.error('❌ DATA FETCH ERROR:', error);
      setDebugInfo(prev => ({
        ...prev,
        loading: false,
        error: error.message,
        apiCalls: [...prev.apiCalls, {
          timestamp: new Date().toISOString(),
          status: 'error',
          error: error.message
        }]
      }));
    }
  };

  // Debug function to check DOM elements
  const checkDOMElements = () => {
    console.log('🔍 CHECKING DOM ELEMENTS...');
    
    const productElements = document.querySelectorAll('[data-product-id]');
    console.log(`Found ${productElements.length} product elements in DOM`);
    
    productElements.forEach((element, index) => {
      const productId = element.getAttribute('data-product-id');
      const priceElement = element.querySelector('.price, [class*="price"]');
      const stockElement = element.querySelector('.stock, [class*="stock"]');
      const variantElement = element.querySelector('.variants, [class*="variant"]');
      
      console.log(`Product ${index + 1} (ID: ${productId}):`);
      console.log(`  Price element: ${priceElement ? 'FOUND' : 'NOT FOUND'}`);
      console.log(`  Stock element: ${stockElement ? 'FOUND' : 'NOT FOUND'}`);
      console.log(`  Variant element: ${variantElement ? 'FOUND' : 'NOT FOUND'}`);
      
      if (priceElement) {
        console.log(`  Price text: "${priceElement.textContent}"`);
      }
      if (stockElement) {
        console.log(`  Stock text: "${stockElement.textContent}"`);
      }
      if (variantElement) {
        console.log(`  Variant text: "${variantElement.textContent}"`);
      }
    });
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      border: '2px solid #007bff', 
      padding: '10px', 
      borderRadius: '5px',
      zIndex: 9999,
      maxWidth: '300px',
      fontSize: '12px'
    }}>
      <h4>🔧 Inventory Debug Panel</h4>
      
      <div>
        <strong>Products:</strong> {debugInfo.products.length}<br/>
        <strong>Loading:</strong> {debugInfo.loading ? 'YES' : 'NO'}<br/>
        <strong>Error:</strong> {debugInfo.error || 'None'}<br/>
        <strong>Renders:</strong> {debugInfo.renderCount}<br/>
        <strong>API Calls:</strong> {debugInfo.apiCalls.length}
      </div>
      
      <div style={{ marginTop: '10px' }}>
        <button onClick={testDataFetch} style={{ marginRight: '5px' }}>
          Test Data Fetch
        </button>
        <button onClick={checkDOMElements}>
          Check DOM
        </button>
      </div>
      
      {debugInfo.error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          <strong>Error:</strong> {debugInfo.error}
        </div>
      )}
      
      {debugInfo.products.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <strong>Sample Product:</strong><br/>
          Name: {debugInfo.products[0].name}<br/>
          Price: {debugInfo.products[0].price}<br/>
          Stock: {debugInfo.products[0].stock}
        </div>
      )}
    </div>
  );
};

export default InventoryDebugComponent;
