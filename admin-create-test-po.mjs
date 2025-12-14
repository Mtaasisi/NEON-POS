#!/usr/bin/env node

/**
 * 🧪 ADMIN TEST UTILITY - Automatic PO Creation
 * 
 * Purpose: Creates a complete test Purchase Order with:
 * - New product with 2 variants
 * - 2 items for each variant (4 total PO items)
 * - Uses existing database data (suppliers, categories, branches)
 * 
 * Run: node admin-create-test-po.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧪 ADMIN TEST UTILITY - Automatic PO Creation');
console.log('='.repeat(70));
console.log('');

/**
 * Get existing data from database
 */
async function getExistingData() {
  console.log('📊 Step 1: Fetching existing database data...');
  
  // Get active supplier
  const { data: suppliers, error: supplierError } = await supabase
    .from('lats_suppliers')
    .select('*')
    .eq('is_active', true)
    .limit(1);

  if (supplierError || !suppliers || suppliers.length === 0) {
    console.error('❌ No active suppliers found. Creating default supplier...');
    
    // Create default supplier
    const { data: newSupplier, error: createError } = await supabase
      .from('lats_suppliers')
      .insert([{
        name: 'Default Test Supplier',
        contact_person: 'Test Contact',
        email: 'supplier@test.com',
        phone: '+255123456789',
        is_active: true
      }])
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Failed to create supplier:', createError);
      return null;
    }
    
    console.log('✅ Created default supplier:', newSupplier.name);
    return { supplier: newSupplier, category: null, branch: null };
  }

  const supplier = suppliers[0];
  console.log('✅ Found supplier:', supplier.name);

  // Get active category
  const { data: categories, error: categoryError } = await supabase
    .from('lats_categories')
    .select('*')
    .eq('is_active', true)
    .limit(1);

  let category = null;
  if (!categoryError && categories && categories.length > 0) {
    category = categories[0];
    console.log('✅ Found category:', category.name);
  } else {
    // Create default category
    const { data: newCategory, error: createCatError } = await supabase
      .from('lats_categories')
      .insert([{
        name: 'Electronics',
        description: 'Electronic devices and accessories',
        is_active: true
      }])
      .select()
      .single();
    
    if (!createCatError && newCategory) {
      category = newCategory;
      console.log('✅ Created default category:', category.name);
    }
  }

  // Get default branch
  const { data: branches, error: branchError } = await supabase
    .from('lats_branches')
    .select('*')
    .limit(1);

  let branch = null;
  if (!branchError && branches && branches.length > 0) {
    branch = branches[0];
    console.log('✅ Found branch:', branch.name || branch.id);
  }

  return { supplier, category, branch };
}

/**
 * Create test product with 2 variants
 */
async function createTestProduct(categoryId, supplierId, branchId) {
  console.log('\n📦 Step 2: Creating test product...');
  
  const timestamp = Date.now();
  const productData = {
    name: `Test Phone ${timestamp}`,
    description: 'Auto-generated test product for PO creation (Admin Test)',
    sku: `TEST-PROD-${timestamp}`,
    category_id: categoryId,
    supplier_id: supplierId,
    cost_price: 0,
    selling_price: 0,
    stock_quantity: 0,
    min_stock_level: 5,
    total_quantity: 0,
    total_value: 0,
    status: 'active',
    is_active: true,
    condition: 'new',
    attributes: {},
    metadata: {
      useVariants: true,
      variantCount: 2,
      createdBy: 'admin-test-utility',
      createdAt: new Date().toISOString(),
      purpose: 'PO testing'
    }
  };

  const { data: product, error: productError } = await supabase
    .from('lats_products')
    .insert([productData])
    .select()
    .single();

  if (productError) {
    console.error('❌ Product creation failed:', productError);
    throw productError;
  }

  console.log('✅ Product created successfully!');
  console.log('   - ID:', product.id);
  console.log('   - Name:', product.name);
  console.log('   - SKU:', product.sku);

  return product;
}

/**
 * Create 2 variants for the product
 */
async function createVariants(product) {
  console.log('\n📦 Step 3: Creating 2 variants...');
  
  const variantsData = [
    {
      product_id: product.id,
      sku: `${product.sku}-V1`,
      name: '128GB Black',
      cost_price: 500000,
      selling_price: 750000,
      quantity: 0,
      min_quantity: 2,
      is_active: true,
      status: 'active',
      attributes: {
        color: 'Black',
        storage: '128GB',
        condition: 'new'
      }
    },
    {
      product_id: product.id,
      sku: `${product.sku}-V2`,
      name: '256GB Silver',
      cost_price: 650000,
      selling_price: 950000,
      quantity: 0,
      min_quantity: 2,
      is_active: true,
      status: 'active',
      attributes: {
        color: 'Silver',
        storage: '256GB',
        condition: 'new'
      }
    }
  ];

  const { data: variants, error: variantsError } = await supabase
    .from('lats_product_variants')
    .insert(variantsData)
    .select();

  if (variantsError) {
    console.error('❌ Variants creation failed:', variantsError);
    throw variantsError;
  }

  console.log('✅ Variants created successfully!');
  variants.forEach((v, index) => {
    console.log(`   ${index + 1}. ${v.name} (ID: ${v.id})`);
    console.log(`      - Cost: TZS ${v.cost_price.toLocaleString()}`);
    console.log(`      - Selling: TZS ${v.selling_price.toLocaleString()}`);
  });

  return variants;
}

/**
 * Create Purchase Order with 4 items (2 for each variant)
 */
async function createPurchaseOrder(product, variants, supplier, branch) {
  console.log('\n📦 Step 4: Creating Purchase Order...');
  
  const timestamp = Date.now();
  
  // Calculate total: (2 items × variant1_cost) + (2 items × variant2_cost)
  const totalAmount = (2 * variants[0].cost_price) + (2 * variants[1].cost_price);
  
  const poData = {
    order_number: `PO-ADMIN-TEST-${timestamp}`,
    supplier_id: supplier.id,
    status: 'draft',
    total_amount: totalAmount,
    notes: `Auto-generated PO for admin testing
Product: ${product.name}
Variants: ${variants.length}
Total Items: 4 (2 per variant)
Created: ${new Date().toISOString()}`,
    expected_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    created_by: null,
    currency: 'TZS',
    payment_terms: 'Net 30'
  };

  const { data: purchaseOrder, error: poError } = await supabase
    .from('lats_purchase_orders')
    .insert([poData])
    .select()
    .single();

  if (poError) {
    console.error('❌ Purchase Order creation failed:', poError);
    throw poError;
  }

  console.log('✅ Purchase Order created successfully!');
  console.log('   - PO Number:', purchaseOrder.order_number);
  console.log('   - ID:', purchaseOrder.id);
  console.log('   - Status:', purchaseOrder.status);
  console.log('   - Total Amount: TZS', totalAmount.toLocaleString());

  return purchaseOrder;
}

/**
 * Create PO Items (2 items for each variant = 4 total)
 */
async function createPOItems(purchaseOrder, product, variants) {
  console.log('\n📦 Step 5: Adding PO items (2 per variant = 4 total)...');
  
  const poItemsData = [
    // Variant 1 - Item 1
    {
      purchase_order_id: purchaseOrder.id,
      product_id: product.id,
      variant_id: variants[0].id,
      quantity: 1,
      received_quantity: 0,
      cost_price: variants[0].cost_price,
      total_price: variants[0].cost_price
    },
    // Variant 1 - Item 2
    {
      purchase_order_id: purchaseOrder.id,
      product_id: product.id,
      variant_id: variants[0].id,
      quantity: 1,
      received_quantity: 0,
      cost_price: variants[0].cost_price,
      total_price: variants[0].cost_price
    },
    // Variant 2 - Item 1
    {
      purchase_order_id: purchaseOrder.id,
      product_id: product.id,
      variant_id: variants[1].id,
      quantity: 1,
      received_quantity: 0,
      cost_price: variants[1].cost_price,
      total_price: variants[1].cost_price
    },
    // Variant 2 - Item 2
    {
      purchase_order_id: purchaseOrder.id,
      product_id: product.id,
      variant_id: variants[1].id,
      quantity: 1,
      received_quantity: 0,
      cost_price: variants[1].cost_price,
      total_price: variants[1].cost_price
    }
  ];

  const { data: poItems, error: poItemsError } = await supabase
    .from('lats_purchase_order_items')
    .insert(poItemsData)
    .select();

  if (poItemsError) {
    console.error('❌ PO Items creation failed:', poItemsError);
    throw poItemsError;
  }

  console.log('✅ PO Items created successfully!');
  console.log('   Total items added: 4');
  console.log('');
  console.log('   Items breakdown:');
  console.log(`   - ${variants[0].name}: 2 items × TZS ${variants[0].cost_price.toLocaleString()} = TZS ${(2 * variants[0].cost_price).toLocaleString()}`);
  console.log(`   - ${variants[1].name}: 2 items × TZS ${variants[1].cost_price.toLocaleString()} = TZS ${(2 * variants[1].cost_price).toLocaleString()}`);

  return poItems;
}

/**
 * Print summary and next steps
 */
function printSummary(supplier, product, variants, purchaseOrder, poItems) {
  console.log('\n' + '='.repeat(70));
  console.log('🎉 TEST PO CREATED SUCCESSFULLY!');
  console.log('='.repeat(70));
  console.log('');
  console.log('📊 SUMMARY:');
  console.log('');
  console.log('Supplier:');
  console.log(`  • Name: ${supplier.name}`);
  console.log(`  • ID: ${supplier.id}`);
  console.log('');
  console.log('Product:');
  console.log(`  • Name: ${product.name}`);
  console.log(`  • SKU: ${product.sku}`);
  console.log(`  • ID: ${product.id}`);
  console.log('');
  console.log('Variants:');
  variants.forEach((v, i) => {
    console.log(`  ${i + 1}. ${v.name}`);
    console.log(`     - ID: ${v.id}`);
    console.log(`     - Cost: TZS ${v.cost_price.toLocaleString()}`);
    console.log(`     - Selling: TZS ${v.selling_price.toLocaleString()}`);
  });
  console.log('');
  console.log('Purchase Order:');
  console.log(`  • PO Number: ${purchaseOrder.order_number}`);
  console.log(`  • ID: ${purchaseOrder.id}`);
  console.log(`  • Status: ${purchaseOrder.status}`);
  console.log(`  • Total Amount: TZS ${purchaseOrder.total_amount.toLocaleString()}`);
  console.log(`  • Items: ${poItems.length} (2 per variant)`);
  console.log('');
  console.log('='.repeat(70));
  console.log('📋 NEXT STEPS FOR TESTING:');
  console.log('='.repeat(70));
  console.log('');
  console.log('1. Open your POS application: http://localhost:5173');
  console.log('');
  console.log('2. Login with your admin credentials');
  console.log('');
  console.log('3. Navigate to: Purchase Orders');
  console.log('');
  console.log(`4. Find PO: ${purchaseOrder.order_number}`);
  console.log('');
  console.log('5. Click "Receive Items" to test receiving:');
  console.log('   - Select "Full Receive" or "Partial Receive"');
  console.log('   - For IMEI tracking products, add IMEI numbers');
  console.log('   - Set pricing if needed');
  console.log('   - Confirm receipt');
  console.log('');
  console.log('6. Verify in Products page:');
  console.log('   - Stock quantities updated');
  console.log('   - Variants show correct inventory');
  console.log('');
  console.log('7. Test in POS:');
  console.log('   - Search for product');
  console.log('   - Select variant');
  console.log('   - Complete sale');
  console.log('');
  console.log('='.repeat(70));
  console.log('');
  console.log('🔍 SQL QUERIES FOR VERIFICATION:');
  console.log('');
  console.log('-- View the purchase order:');
  console.log(`SELECT * FROM lats_purchase_orders WHERE id = '${purchaseOrder.id}';`);
  console.log('');
  console.log('-- View PO items:');
  console.log(`SELECT * FROM lats_purchase_order_items WHERE purchase_order_id = '${purchaseOrder.id}';`);
  console.log('');
  console.log('-- View product and variants:');
  console.log(`SELECT * FROM lats_products WHERE id = '${product.id}';`);
  console.log(`SELECT * FROM lats_product_variants WHERE product_id = '${product.id}';`);
  console.log('');
  console.log('='.repeat(70));
  console.log('');
}

/**
 * Main function
 */
async function main() {
  try {
    // Step 1: Get existing data
    const existingData = await getExistingData();
    if (!existingData || !existingData.supplier) {
      console.error('❌ Failed to get or create required database data');
      process.exit(1);
    }

    const { supplier, category, branch } = existingData;

    // Step 2: Create test product
    const product = await createTestProduct(
      category?.id || null,
      supplier.id,
      branch?.id || null
    );

    // Step 3: Create variants
    const variants = await createVariants(product);

    // Step 4: Create purchase order
    const purchaseOrder = await createPurchaseOrder(product, variants, supplier, branch);

    // Step 5: Create PO items
    const poItems = await createPOItems(purchaseOrder, product, variants);

    // Step 6: Print summary
    printSummary(supplier, product, variants, purchaseOrder, poItems);

    console.log('✅ Admin test utility completed successfully!');
    console.log('');

  } catch (error) {
    console.error('\n❌ Error occurred:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the utility
main();

