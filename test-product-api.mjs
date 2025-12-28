#!/usr/bin/env node
import { getProducts } from './src/lib/latsProductApi.ts';

async function test() {
  try {
    console.log('🔍 Testing getProducts API call...');
    const products = await getProducts({ forceRefresh: true });
    console.log('✅ Success: Found', products.length, 'products');
    return products;
  } catch (error) {
    console.error('❌ Error calling getProducts:', error.message);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    throw error;
  }
}

test();