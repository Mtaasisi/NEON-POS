#!/usr/bin/env node

/**
 * Fix Currency Conversion Issue
 * Corrects the cost price for the 128GB variant from 10 TZS to 20 TZS
 */

import dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

const VARIANT_SKU = 'SKU-1762822402801-8IC-V01';
const CORRECT_COST = 20; // Should be 20 TZS (10 CNY × 2)

async function fixCurrencyConversion() {
  console.log('💱 Fixing Currency Conversion Issue\n');
  console.log(`Variant: 128GB (${VARIANT_SKU})`);
  console.log(`Correcting cost from TSh 10 → TSh ${CORRECT_COST}\n`);
  
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    // Get current data
    const { rows } = await pool.query(
      `SELECT id, variant_name, cost_price, selling_price, quantity
       FROM lats_product_variants
       WHERE sku = $1`,
      [VARIANT_SKU]
    );
    
    if (rows.length === 0) {
      console.log('❌ Variant not found');
      await pool.end();
      return;
    }
    
    const variant = rows[0];
    const oldCost = parseFloat(variant.cost_price);
    const sellingPrice = parseFloat(variant.selling_price);
    
    console.log('📊 BEFORE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Cost Price:       TSh ${oldCost}`);
    console.log(`Selling Price:    TSh ${sellingPrice.toLocaleString()}`);
    console.log(`Profit per Unit:  TSh ${(sellingPrice - oldCost).toLocaleString()}`);
    console.log(`Markup:           ${oldCost > 0 ? ((sellingPrice - oldCost) / oldCost * 100).toFixed(2) : 'N/A'}%`);
    
    // Update the cost price
    await pool.query(
      `UPDATE lats_product_variants
       SET cost_price = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [CORRECT_COST, variant.id]
    );
    
    console.log('\n📊 AFTER:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Cost Price:       TSh ${CORRECT_COST}`);
    console.log(`Selling Price:    TSh ${sellingPrice.toLocaleString()}`);
    console.log(`Profit per Unit:  TSh ${(sellingPrice - CORRECT_COST).toLocaleString()}`);
    console.log(`Markup:           ${((sellingPrice - CORRECT_COST) / CORRECT_COST * 100).toFixed(2)}%`);
    
    console.log('\n✅ Cost price corrected!');
    
    // Recalculate product-level data
    console.log('\n🔄 Recalculating product totals...');
    
    const productId = '0e5aca19-45f3-4e83-a5de-6900ce434cf6';
    
    const { rows: allVariants } = await pool.query(
      `SELECT 
        AVG(cost_price) as avg_cost,
        AVG(selling_price) as avg_price,
        SUM(quantity) as total_qty,
        SUM(quantity * selling_price) as total_value
       FROM lats_product_variants 
       WHERE product_id = $1 
       AND parent_variant_id IS NULL`,
      [productId]
    );
    
    if (allVariants.length > 0) {
      const stats = allVariants[0];
      await pool.query(
        `UPDATE lats_products 
         SET cost_price = $1,
             selling_price = $2,
             unit_price = $2,
             total_quantity = $3,
             total_value = $4,
             updated_at = NOW()
         WHERE id = $5`,
        [
          parseFloat(stats.avg_cost || 0),
          parseFloat(stats.avg_price || 0),
          parseInt(stats.total_qty || 0),
          parseFloat(stats.total_value || 0),
          productId
        ]
      );
      
      console.log('✅ Product totals updated:');
      console.log(`   Avg Cost:     TSh ${parseFloat(stats.avg_cost || 0).toFixed(2)}`);
      console.log(`   Avg Price:    TSh ${parseFloat(stats.avg_price || 0).toLocaleString()}`);
      console.log(`   Total Qty:    ${stats.total_qty || 0}`);
      console.log(`   Total Value:  TSh ${parseFloat(stats.total_value || 0).toLocaleString()}`);
    }
    
    console.log('\n✨ Currency conversion issue fixed!');
    console.log('🔄 Refresh your browser to see the corrected data.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run the script
fixCurrencyConversion().catch(console.error);

