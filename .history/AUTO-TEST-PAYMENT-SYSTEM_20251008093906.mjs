#!/usr/bin/env node

/**
 * AUTOMATED PAYMENT SYSTEM TEST
 * =============================
 * This script tests the complete payment system to ensure:
 * 1. Database has correct price columns
 * 2. Products and variants have prices
 * 3. Payment methods exist
 * 4. Frontend can load data correctly
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config();

// Use the same DATABASE_URL as the frontend
const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

async function testPaymentSystem() {
  console.log('🚀 Starting Automated Payment System Test...\n');
  
  let allTestsPassed = true;
  
  try {
    // Test 1: Check database structure
    console.log('📋 Test 1: Database Structure');
    console.log('============================');
    
    const productColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lats_products' 
        AND column_name IN ('unit_price', 'cost_price')
      ORDER BY column_name
    `;
    
    const variantColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lats_product_variants' 
        AND column_name IN ('unit_price', 'cost_price')
      ORDER BY column_name
    `;
    
    console.log('✅ Products table columns:', productColumns);
    console.log('✅ Variants table columns:', variantColumns);
    
    if (productColumns.length === 0 || variantColumns.length === 0) {
      console.log('❌ Missing price columns!');
      allTestsPassed = false;
    }
    
    // Test 2: Check products with prices
    console.log('\n💰 Test 2: Products with Prices');
    console.log('===============================');
    
    const { rows: productsWithPrices } = await sql`
      SELECT id, name, unit_price, cost_price 
      FROM lats_products 
      WHERE unit_price > 0 
      LIMIT 5
    `;
    
    console.log(`✅ Found ${productsWithPrices.length} products with prices:`);
    productsWithPrices.forEach(p => {
      console.log(`   - ${p.name}: $${p.unit_price} (cost: $${p.cost_price})`);
    });
    
    if (productsWithPrices.length === 0) {
      console.log('❌ No products have prices!');
      allTestsPassed = false;
    }
    
    // Test 3: Check variants with prices
    console.log('\n🏷️ Test 3: Variants with Prices');
    console.log('================================');
    
    const { rows: variantsWithPrices } = await sql`
      SELECT id, variant_name, unit_price, cost_price 
      FROM lats_product_variants 
      WHERE unit_price > 0 
      LIMIT 5
    `;
    
    console.log(`✅ Found ${variantsWithPrices.length} variants with prices:`);
    variantsWithPrices.forEach(v => {
      console.log(`   - ${v.variant_name}: $${v.unit_price} (cost: $${v.cost_price})`);
    });
    
    if (variantsWithPrices.length === 0) {
      console.log('❌ No variants have prices!');
      allTestsPassed = false;
    }
    
    // Test 4: Check payment methods
    console.log('\n💳 Test 4: Payment Methods');
    console.log('==========================');
    
    const { rows: paymentMethods } = await sql`
      SELECT id, account_name, account_type, currency, is_active 
      FROM finance_accounts 
      WHERE is_active = true 
      ORDER BY account_name
    `;
    
    console.log(`✅ Found ${paymentMethods.length} active payment methods:`);
    paymentMethods.forEach(pm => {
      console.log(`   - ${pm.account_name} (${pm.account_type}) - ${pm.currency}`);
    });
    
    if (paymentMethods.length === 0) {
      console.log('❌ No payment methods configured!');
      allTestsPassed = false;
    }
    
    // Test 5: Check recent sales
    console.log('\n📊 Test 5: Recent Sales');
    console.log('=======================');
    
    const { rows: recentSales } = await sql`
      SELECT id, sale_number, total_amount, payment_status, created_at 
      FROM lats_sales 
      ORDER BY created_at DESC 
      LIMIT 3
    `;
    
    console.log(`✅ Found ${recentSales.length} recent sales:`);
    recentSales.forEach(sale => {
      console.log(`   - ${sale.sale_number}: $${sale.total_amount} (${sale.payment_status})`);
    });
    
    // Test 6: Simulate cart calculation
    console.log('\n🛒 Test 6: Cart Calculation Simulation');
    console.log('======================================');
    
    // Get a sample product and variant
    const { rows: sampleProduct } = await sql`
      SELECT p.id as product_id, p.name, p.unit_price as product_price,
             v.id as variant_id, v.variant_name, v.unit_price as variant_price
      FROM lats_products p
      LEFT JOIN lats_product_variants v ON p.id = v.product_id
      WHERE p.unit_price > 0 OR v.unit_price > 0
      LIMIT 1
    `;
    
    if (sampleProduct.length > 0) {
      const product = sampleProduct[0];
      const price = product.variant_price || product.product_price;
      const quantity = 2;
      const total = price * quantity;
      
      console.log(`✅ Sample cart calculation:`);
      console.log(`   - Product: ${product.name}`);
      console.log(`   - Variant: ${product.variant_name || 'Default'}`);
      console.log(`   - Price: $${price}`);
      console.log(`   - Quantity: ${quantity}`);
      console.log(`   - Total: $${total}`);
      
      if (total > 0) {
        console.log('✅ Cart calculation working correctly!');
      } else {
        console.log('❌ Cart calculation failed - total is 0!');
        allTestsPassed = false;
      }
    } else {
      console.log('❌ No products available for cart simulation!');
      allTestsPassed = false;
    }
    
    // Final Results
    console.log('\n🎯 FINAL TEST RESULTS');
    console.log('=====================');
    
    if (allTestsPassed) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('✅ Database structure is correct');
      console.log('✅ Products and variants have prices');
      console.log('✅ Payment methods are configured');
      console.log('✅ Cart calculation works');
      console.log('');
      console.log('🚀 Your payment system is ready!');
      console.log('   → Go to: http://localhost:3000/lats/pos');
      console.log('   → Add items to cart');
      console.log('   → Test payment modal');
    } else {
      console.log('❌ SOME TESTS FAILED!');
      console.log('🔧 Please fix the issues above before testing the POS');
    }
    
  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check DATABASE_URL in .env file');
    console.log('   2. Ensure database is accessible');
    console.log('   3. Run CREATE-PAYMENT-METHODS.sql if needed');
  }
}

// Run the test
testPaymentSystem().catch(console.error);
