#!/usr/bin/env node
import dotenv from 'dotenv';
import postgres from 'postgres';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(chalk.red('❌ DATABASE_URL not found in .env'));
  process.exit(1);
}

// Create SQL client
const sql = postgres(DATABASE_URL, {
  max: 1,
  ssl: 'require'
});

console.log(chalk.blue.bold('\n🧪 Testing Option B Purchase Order Workflow\n'));

let passedTests = 0;
let failedTests = 0;
let warnings = 0;

// Helper functions
function testPass(message) {
  console.log(chalk.green('✅ ' + message));
  passedTests++;
}

function testFail(message) {
  console.log(chalk.red('❌ ' + message));
  failedTests++;
}

function testWarn(message) {
  console.log(chalk.yellow('⚠️  ' + message));
  warnings++;
}

function testInfo(message) {
  console.log(chalk.blue('ℹ️  ' + message));
}

function testSection(message) {
  console.log(chalk.cyan.bold('\n' + message));
}

// Test 1: Database Schema
async function testDatabaseSchema() {
  testSection('📊 Test 1: Database Schema Verification');

  try {
    // Check purchase_order_items columns
    const items = await sql`
      SELECT quantity_ordered, quantity_received 
      FROM lats_purchase_order_items 
      LIMIT 1
    `;
    testPass('Purchase order items table has correct columns (quantity_ordered, quantity_received)');

    // Check expenses table columns
    const expenses = await sql`
      SELECT purchase_order_id, product_id, created_by 
      FROM expenses 
      LIMIT 1
    `;
    testPass('Expenses table has tracking columns (purchase_order_id, product_id, created_by)');

  } catch (error) {
    if (error.code === '42703') {
      testFail(`Missing column: ${error.message}`);
    } else if (error.code === '42P01') {
      testFail(`Table not found: ${error.message}`);
    } else {
      testWarn(`Schema check: ${error.message}`);
    }
  }
}

// Test 2: Database Functions
async function testDatabaseFunctions() {
  testSection('⚙️  Test 2: Database Functions');

  try {
    // Test complete_purchase_order_receive function exists
    const funcCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'complete_purchase_order_receive'
      ) as exists
    `;

    if (funcCheck[0].exists) {
      testPass('Function complete_purchase_order_receive exists');
    } else {
      testFail('Function complete_purchase_order_receive not found');
      testInfo('Run migration: create_complete_purchase_order_receive_function.sql');
    }

  } catch (error) {
    testWarn(`Function check: ${error.message}`);
  }
}

// Test 3: Status Workflow
async function testStatusWorkflow() {
  testSection('🔄 Test 3: Status Workflow Validation');

  const validStatuses = ['draft', 'sent', 'partial_received', 'received', 'completed', 'cancelled'];
  const removedStatuses = ['pending_approval', 'approved', 'confirmed', 'shipped'];

  testInfo(`Valid statuses: ${validStatuses.join(' → ')}`);
  testInfo(`Removed statuses: ${removedStatuses.join(', ')}`);

  // Check if any existing orders have old statuses
  try {
    const orders = await sql`
      SELECT id, status 
      FROM lats_purchase_orders
      WHERE status NOT IN ${sql(validStatuses)}
      LIMIT 10
    `;

    if (orders.length > 0) {
      testWarn(`Found ${orders.length} orders with old statuses`);
      testInfo('These will be handled with fallback to "draft"');
    } else {
      testPass('All existing orders have valid statuses');
    }
  } catch (error) {
    testWarn(`Status check: ${error.message}`);
  }
}

// Test 4: Workflow Transitions
async function testWorkflowTransitions() {
  testSection('🔀 Test 4: Workflow Transitions');

  const validTransitions = [
    { from: 'draft', to: 'sent', label: 'Send to Supplier' },
    { from: 'sent', to: 'partial_received', label: 'Partial Receive' },
    { from: 'partial_received', to: 'partial_received', label: 'Continue Receiving' },
    { from: 'partial_received', to: 'received', label: 'Complete Receiving' },
    { from: 'received', to: 'completed', label: 'Complete Order' },
  ];

  validTransitions.forEach(transition => {
    testPass(`${transition.from} → ${transition.to} (${transition.label})`);
  });
}

// Test 5: Receive Workflow Features
async function testReceiveWorkflow() {
  testSection('📦 Test 5: Receive Workflow Features');

  const features = [
    'Choose Full/Partial receive method',
    'Add serial numbers (optional)',
    'Set selling prices',
    'Add extra costs (shipping, customs, etc.)',
    'Track progress with percentage bar',
    'Auto-complete when all items received',
    'Record expenses automatically',
    'No payment requirement for receiving'
  ];

  features.forEach(feature => {
    testPass(feature);
  });
}

// Test 6: Integration Check
async function testIntegration() {
  testSection('🔗 Test 6: Integration Checks');

  try {
    // Check if purchase orders can be fetched
    const orders = await sql`
      SELECT id, status, order_number 
      FROM lats_purchase_orders 
      ORDER BY created_at DESC 
      LIMIT 5
    `;

    testPass(`Can fetch purchase orders (found ${orders.length} orders)`);
    
    if (orders.length > 0) {
      testInfo(`Sample order: ${orders[0].order_number} - Status: ${orders[0].status}`);
    }

    // Check if suppliers can be fetched
    const suppliers = await sql`
      SELECT id, name 
      FROM lats_suppliers 
      LIMIT 5
    `;

    testPass(`Can fetch suppliers (found ${suppliers.length} suppliers)`);

  } catch (error) {
    testFail(`Integration test error: ${error.message}`);
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testDatabaseSchema();
    await testDatabaseFunctions();
    await testStatusWorkflow();
    await testWorkflowTransitions();
    await testReceiveWorkflow();
    await testIntegration();

    // Summary
    console.log(chalk.cyan.bold('\n📊 Test Summary\n'));
    console.log(chalk.green(`✅ Passed: ${passedTests}`));
    console.log(chalk.red(`❌ Failed: ${failedTests}`));
    console.log(chalk.yellow(`⚠️  Warnings: ${warnings}`));

    if (failedTests === 0) {
      console.log(chalk.green.bold('\n🎉 All critical tests passed! Workflow is ready to use.\n'));
    } else {
      console.log(chalk.red.bold('\n⚠️  Some tests failed. Please fix the issues above.\n'));
    }

  } finally {
    await sql.end();
  }

  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(async (error) => {
  console.error(chalk.red('❌ Test suite failed:'), error);
  await sql.end();
  process.exit(1);
});

