#!/usr/bin/env node

/**
 * 🧪 TEST PRODUCT API FIX
 * Tests the fixed product API to see if it loads real products
 */

import { getProducts } from './src/lib/latsProductApi.ts';

async function testProductApiFix() {
  try {
    console.log('🔍 Testing fixed product API...');
    
    const products = await getProducts();
    
    console.log(`✅ Successfully loaded ${products.length} products`);
    
    if (products.length > 0) {
      console.log('\n📋 First 5 products:');
      products.slice(0, 5).forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   SKU: ${product.sku}`);
        console.log(`   Category: ${product.category?.name || 'No category'}`);
        console.log(`   Supplier: ${product.supplier?.name || 'No supplier'}`);
        console.log(`   Price: ${product.price}`);
        console.log(`   Quantity: ${product.totalQuantity}`);
        console.log(`   Variants: ${product.variants?.length || 0}`);
        console.log('');
      });
      
      // Check if we have sample products (which would indicate the fallback is still being used)
      const hasSampleProducts = products.some(p => p.name.includes('Sample'));
      if (hasSampleProducts) {
        console.log('⚠️ WARNING: Still seeing sample products - fallback may still be active');
      } else {
        console.log('✅ No sample products found - real products are loading!');
      }
    } else {
      console.log('⚠️ No products loaded');
    }
    
  } catch (error) {
    console.error('❌ Error testing product API:', error.message);
    console.error('Error details:', error);
  }
}

testProductApiFix();
