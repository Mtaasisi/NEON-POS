#!/usr/bin/env node

/**
 * 🔍 CHECK RECENTLY CREATED PRODUCT
 * ==================================
 * Verifies the product created by automated test
 */

import postgres from 'postgres';
import { config } from 'dotenv';

config();

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const log = (emoji, message, color = colors.reset) => {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
};

async function main() {
  console.log('\n');
  log('🔍', '═══════════════════════════════════════════════', colors.blue);
  log('🔍', '  CHECKING RECENTLY CREATED PRODUCTS', colors.bright);
  log('🔍', '═══════════════════════════════════════════════', colors.blue);
  console.log('\n');

  let sql;

  try {
    // Connect to database
    log('🔌', 'Connecting to database...', colors.cyan);
    sql = postgres(process.env.VITE_DATABASE_URL || process.env.DATABASE_URL, {
      ssl: 'require',
      max: 1,
    });
    log('✅', 'Connected successfully', colors.green);

    // Get the most recent products (last 5)
    log('📦', 'Fetching recently created products...', colors.cyan);
    
    const recentProducts = await sql`
      SELECT 
        id,
        name,
        barcode,
        category,
        price,
        cost_price,
        quantity,
        branch_id,
        created_at,
        updated_at
      FROM lats_products
      WHERE name LIKE 'Test Product%'
      ORDER BY created_at DESC
      LIMIT 10
    `;

    if (recentProducts.length === 0) {
      log('⚠️', 'No test products found in database', colors.yellow);
      
      // Get any recent products
      const anyRecent = await sql`
        SELECT 
          id,
          name,
          barcode,
          category,
          price,
          cost_price,
          quantity,
          created_at
        FROM lats_products
        ORDER BY created_at DESC
        LIMIT 5
      `;
      
      if (anyRecent.length > 0) {
        console.log('\n');
        log('📋', 'Last 5 products in database:', colors.magenta);
        console.table(anyRecent.map(p => ({
          Name: p.name,
          Barcode: p.barcode,
          Category: p.category,
          Price: `$${p.price}`,
          Quantity: p.quantity,
          Created: new Date(p.created_at).toLocaleString(),
        })));
      }
      
      return;
    }

    log('✅', `Found ${recentProducts.length} test product(s)`, colors.green);
    console.log('\n');

    // Display the most recent test product in detail
    const latestProduct = recentProducts[0];
    
    log('🎯', 'LATEST TEST PRODUCT DETAILS:', colors.bright + colors.green);
    console.log('─'.repeat(60));
    
    const details = {
      'ID': latestProduct.id,
      'Name': latestProduct.name,
      'Barcode': latestProduct.barcode,
      'Category': latestProduct.category || 'N/A',
      'Price': `$${latestProduct.price}`,
      'Cost Price': `$${latestProduct.cost_price || 0}`,
      'Quantity': latestProduct.quantity,
      'Branch ID': latestProduct.branch_id,
      'Created At': new Date(latestProduct.created_at).toLocaleString(),
      'Updated At': new Date(latestProduct.updated_at).toLocaleString(),
    };

    for (const [key, value] of Object.entries(details)) {
      console.log(`${colors.cyan}${key.padEnd(15)}${colors.reset}: ${colors.bright}${value}${colors.reset}`);
    }
    
    console.log('─'.repeat(60));

    // Calculate profit margin
    if (latestProduct.cost_price && latestProduct.price) {
      const profit = latestProduct.price - latestProduct.cost_price;
      const profitMargin = ((profit / latestProduct.price) * 100).toFixed(2);
      console.log('\n');
      log('💰', `Profit per unit: $${profit.toFixed(2)}`, colors.green);
      log('📊', `Profit margin: ${profitMargin}%`, colors.green);
      log('💵', `Total inventory value: $${(latestProduct.price * latestProduct.quantity).toFixed(2)}`, colors.cyan);
    }

    // Show all test products if more than one
    if (recentProducts.length > 1) {
      console.log('\n');
      log('📋', `All Test Products (${recentProducts.length} total):`, colors.magenta);
      console.table(recentProducts.map(p => ({
        Name: p.name,
        Barcode: p.barcode,
        Price: `$${p.price}`,
        Quantity: p.quantity,
        'Created At': new Date(p.created_at).toLocaleString(),
      })));
    }

    // Get branch information
    if (latestProduct.branch_id) {
      try {
        const branch = await sql`
          SELECT id, name, location
          FROM lats_branches
          WHERE id = ${latestProduct.branch_id}
        `;
        
        if (branch.length > 0) {
          console.log('\n');
          log('🏢', 'BRANCH INFORMATION:', colors.cyan);
          console.log(`   Name: ${branch[0].name}`);
          console.log(`   Location: ${branch[0].location || 'N/A'}`);
        }
      } catch (err) {
        // Branch info not critical
      }
    }

    // Get total product statistics
    console.log('\n');
    log('📊', 'DATABASE STATISTICS:', colors.magenta);
    
    const stats = await sql`
      SELECT 
        COUNT(*) as total_products,
        SUM(quantity) as total_quantity,
        SUM(price * quantity) as total_value,
        COUNT(DISTINCT category) as total_categories
      FROM lats_products
      WHERE quantity > 0
    `;

    if (stats.length > 0) {
      console.log(`   ${colors.cyan}Total Products:${colors.reset} ${stats[0].total_products}`);
      console.log(`   ${colors.cyan}Total Units in Stock:${colors.reset} ${stats[0].total_quantity}`);
      console.log(`   ${colors.cyan}Total Inventory Value:${colors.reset} $${parseFloat(stats[0].total_value || 0).toFixed(2)}`);
      console.log(`   ${colors.cyan}Categories:${colors.reset} ${stats[0].total_categories}`);
    }

    console.log('\n');
    log('🎉', '═══════════════════════════════════════════════', colors.green);
    log('🎉', '  PRODUCT VERIFICATION COMPLETE!', colors.bright + colors.green);
    log('🎉', '═══════════════════════════════════════════════', colors.green);
    console.log('\n');

  } catch (error) {
    log('💥', `ERROR: ${error.message}`, colors.red);
    console.error(error);
    throw error;
  } finally {
    if (sql) {
      await sql.end();
      log('🔌', 'Database connection closed', colors.cyan);
    }
  }
}

// Run the check
main()
  .then(() => {
    log('✅', 'Check completed successfully', colors.green);
    process.exit(0);
  })
  .catch((error) => {
    log('❌', 'Check failed', colors.red);
    console.error(error);
    process.exit(1);
  });

