#!/usr/bin/env node

/**
 * Data Quality Check Script
 * Identifies all data quality issues in the system
 */

import dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

async function checkDataQuality() {
  console.log('🔍 Data Quality Check\n');
  console.log('Checking for common data issues...\n');
  
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    // Check if the data quality view exists
    const { rows: viewCheck } = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'data_quality_issues'
      ) as view_exists`
    );
    
    let issues = [];
    
    if (viewCheck[0].view_exists) {
      // Use the view if it exists
      const { rows } = await pool.query('SELECT * FROM data_quality_issues ORDER BY created_at DESC');
      issues = rows;
    } else {
      // Manual check if view doesn't exist yet
      console.log('ℹ️  Data quality view not installed yet. Running manual checks...\n');
      
      // Check 1: Suspicious markups
      const { rows: suspiciousMarkups } = await pool.query(`
        SELECT 
          'Suspicious Markup' as issue_type,
          pv.id as variant_id,
          p.name as product_name,
          pv.variant_name,
          pv.sku,
          pv.cost_price,
          pv.selling_price,
          CASE 
            WHEN pv.cost_price > 0 AND pv.selling_price > 0 
            THEN ROUND(((pv.selling_price - pv.cost_price) / pv.cost_price * 100)::numeric, 2)::TEXT || '%'
            ELSE 'N/A'
          END as markup,
          EXISTS(SELECT 1 FROM lats_purchase_order_items poi WHERE poi.variant_id = pv.id) as has_po,
          pv.created_at
        FROM lats_product_variants pv
        LEFT JOIN lats_products p ON pv.product_id = p.id
        WHERE pv.cost_price > 0 
          AND pv.selling_price > 0
          AND ((pv.selling_price - pv.cost_price) / pv.cost_price * 100) > 100000
      `);
      
      // Check 2: No purchase orders
      const { rows: noPO } = await pool.query(`
        SELECT 
          'No Purchase Order' as issue_type,
          pv.id as variant_id,
          p.name as product_name,
          pv.variant_name,
          pv.sku,
          pv.cost_price,
          pv.selling_price,
          NULL as markup,
          FALSE as has_po,
          pv.created_at
        FROM lats_product_variants pv
        LEFT JOIN lats_products p ON pv.product_id = p.id
        WHERE NOT EXISTS(SELECT 1 FROM lats_purchase_order_items poi WHERE poi.variant_id = pv.id)
          AND pv.cost_price > 0
          AND pv.created_at > NOW() - INTERVAL '30 days'
      `);
      
      // Check 3: Selling below cost
      const { rows: belowCost } = await pool.query(`
        SELECT 
          'Selling Below Cost' as issue_type,
          pv.id as variant_id,
          p.name as product_name,
          pv.variant_name,
          pv.sku,
          pv.cost_price,
          pv.selling_price,
          ROUND(((pv.selling_price - pv.cost_price) / pv.cost_price * 100)::numeric, 2)::TEXT || '%' as markup,
          EXISTS(SELECT 1 FROM lats_purchase_order_items poi WHERE poi.variant_id = pv.id) as has_po,
          pv.created_at
        FROM lats_product_variants pv
        LEFT JOIN lats_products p ON pv.product_id = p.id
        WHERE pv.cost_price > 0 
          AND pv.selling_price > 0
          AND pv.selling_price < pv.cost_price
      `);
      
      // Check 4: Zero prices
      const { rows: zeroPrices } = await pool.query(`
        SELECT 
          'Zero or Missing Price' as issue_type,
          pv.id as variant_id,
          p.name as product_name,
          pv.variant_name,
          pv.sku,
          pv.cost_price,
          pv.selling_price,
          NULL as markup,
          EXISTS(SELECT 1 FROM lats_purchase_order_items poi WHERE poi.variant_id = pv.id) as has_po,
          pv.created_at
        FROM lats_product_variants pv
        LEFT JOIN lats_products p ON pv.product_id = p.id
        WHERE (pv.cost_price = 0 OR pv.selling_price = 0)
          AND pv.is_active = true
      `);
      
      issues = [...suspiciousMarkups, ...noPO, ...belowCost, ...zeroPrices];
    }
    
    // Display results
    if (issues.length === 0) {
      console.log('✅ ═══════════════════════════════════════════');
      console.log('✅ NO DATA QUALITY ISSUES FOUND!');
      console.log('✅ ═══════════════════════════════════════════');
      console.log('\n🎉 All data looks good!\n');
    } else {
      console.log('⚠️  ═══════════════════════════════════════════');
      console.log(`⚠️  FOUND ${issues.length} DATA QUALITY ISSUE(S)`);
      console.log('⚠️  ═══════════════════════════════════════════\n');
      
      // Group by issue type
      const grouped = issues.reduce((acc, issue) => {
        if (!acc[issue.issue_type]) acc[issue.issue_type] = [];
        acc[issue.issue_type].push(issue);
        return acc;
      }, {});
      
      Object.entries(grouped).forEach(([type, items]) => {
        console.log(`\n🔴 ${type.toUpperCase()} (${items.length})`);
        console.log('━'.repeat(60));
        
        items.forEach((item, i) => {
          console.log(`\n${i + 1}. ${item.product_name} - ${item.variant_name}`);
          console.log(`   SKU: ${item.sku || 'N/A'}`);
          console.log(`   Cost: TSh ${parseFloat(item.cost_price || 0).toLocaleString()}`);
          console.log(`   Price: TSh ${parseFloat(item.selling_price || 0).toLocaleString()}`);
          if (item.markup) console.log(`   Markup: ${item.markup}`);
          console.log(`   Has PO: ${item.has_po ? 'Yes ✅' : 'No ❌'}`);
          console.log(`   Created: ${new Date(item.created_at).toLocaleString()}`);
        });
      });
      
      console.log('\n\n📋 RECOMMENDATIONS:');
      console.log('━'.repeat(60));
      
      if (grouped['Suspicious Markup']) {
        console.log('\n⚠️  Suspicious Markups:');
        console.log('   → Verify cost and selling prices are correct');
        console.log('   → Check if a decimal point was missed (e.g., 1000 vs 100.0)');
        console.log('   → Review purchase order for actual cost');
      }
      
      if (grouped['No Purchase Order']) {
        console.log('\n⚠️  Missing Purchase Orders:');
        console.log('   → Create purchase orders for audit trail');
        console.log('   → Or document source in variant notes');
      }
      
      if (grouped['Selling Below Cost']) {
        console.log('\n⚠️  Selling Below Cost:');
        console.log('   → Check if this is intentional (clearance sale)');
        console.log('   → Or verify cost price is correct');
      }
      
      if (grouped['Zero or Missing Price']) {
        console.log('\n⚠️  Zero/Missing Prices:');
        console.log('   → Add actual cost and selling prices');
        console.log('   → Or deactivate variants without data');
        console.log('   → DO NOT make up placeholder data');
      }
      
      console.log('\n');
    }
    
    // Check for currency conversion issues
    console.log('\n🔍 Checking Currency Conversion Issues...\n');
    
    const { rows: currencyIssues } = await pool.query(`
      SELECT 
        pv.id as variant_id,
        p.name as product_name,
        pv.variant_name,
        pv.sku,
        pv.cost_price as current_cost,
        po.po_number,
        po.currency,
        po.exchange_rate,
        poi.unit_cost,
        (poi.unit_cost * po.exchange_rate) as correct_cost,
        (pv.cost_price - (poi.unit_cost * po.exchange_rate)) as difference
      FROM lats_product_variants pv
      JOIN lats_purchase_order_items poi ON poi.variant_id = pv.id
      JOIN lats_purchase_orders po ON poi.purchase_order_id = po.id
      LEFT JOIN lats_products p ON pv.product_id = p.id
      WHERE po.currency IS NOT NULL 
        AND po.currency != 'TZS'
        AND po.exchange_rate IS NOT NULL
        AND po.exchange_rate > 0
        AND ABS(pv.cost_price - (poi.unit_cost * po.exchange_rate)) > 0.01
    `);
    
    if (currencyIssues.length > 0) {
      console.log(`⚠️  Found ${currencyIssues.length} currency conversion issue(s):\n`);
      
      currencyIssues.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue.product_name} - ${issue.variant_name}`);
        console.log(`   PO: ${issue.po_number}`);
        console.log(`   Current Cost: TSh ${parseFloat(issue.current_cost).toFixed(2)}`);
        console.log(`   Should Be: TSh ${parseFloat(issue.correct_cost).toFixed(2)}`);
        console.log(`   (${issue.unit_cost} ${issue.currency} × ${issue.exchange_rate})`);
        console.log(`   Difference: TSh ${parseFloat(issue.difference).toFixed(2)}\n`);
      });
      
      console.log('💡 Run fix_existing_currency_issues() function to fix these.\n');
    } else {
      console.log('✅ No currency conversion issues found.\n');
    }
    
    // Summary
    console.log('\n═══════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════');
    console.log(`Data Quality Issues: ${issues.length}`);
    console.log(`Currency Issues: ${currencyIssues.length}`);
    console.log(`Total Issues: ${issues.length + currencyIssues.length}`);
    console.log('═══════════════════════════════════════════\n');
    
    if (issues.length === 0 && currencyIssues.length === 0) {
      console.log('🎉 Your data is in excellent shape!\n');
    } else {
      console.log('⚠️  Please review and fix the issues above.\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run the script
checkDataQuality().catch(console.error);

