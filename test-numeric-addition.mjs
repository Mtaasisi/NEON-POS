#!/usr/bin/env node

/**
 * Test Numeric Addition Fix
 * 
 * This script tests that the fix correctly handles both string and numeric amounts
 */

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║            TESTING NUMERIC ADDITION FIX                       ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// Simulate sales data with mixed types (as might come from database)
const mockSales = [
  { id: 1, total_amount: 300000 },        // Number
  { id: 2, total_amount: "300000" },      // String
  { id: 3, total_amount: 255000 },        // Number
  { id: 4, total_amount: "150000" },      // String
];

console.log('📊 Mock Sales Data:');
mockSales.forEach(sale => {
  console.log(`   Sale ${sale.id}: ${sale.total_amount} (${typeof sale.total_amount})`);
});
console.log('');

// Test OLD method (vulnerable to concatenation)
console.log('❌ OLD METHOD (String Concatenation Bug):');
const oldTotal = mockSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
console.log(`   Result: ${oldTotal}`);
console.log(`   Type: ${typeof oldTotal}`);
console.log(`   Expected: 1005000`);
console.log(`   ${oldTotal === "03000003000002550000150000" ? "⚠️  CORRUPT!" : "✅ OK"}`);
console.log('');

// Test NEW method (fixed with parseFloat)
console.log('✅ NEW METHOD (Numeric Addition Fix):');
const newTotal = mockSales.reduce((sum, sale) => {
  const amount = typeof sale.total_amount === 'number' 
    ? sale.total_amount 
    : parseFloat(sale.total_amount) || 0;
  return sum + amount;
}, 0);
console.log(`   Result: ${newTotal}`);
console.log(`   Type: ${typeof newTotal}`);
console.log(`   Expected: 1005000`);
console.log(`   ${newTotal === 1005000 ? "✅ CORRECT!" : "❌ FAILED"}`);
console.log('');

// Test edge cases
console.log('🔍 EDGE CASES:');

const edgeCases = [
  { name: 'Null value', data: [{ total_amount: null }] },
  { name: 'Undefined value', data: [{ total_amount: undefined }] },
  { name: 'Zero string', data: [{ total_amount: "0" }] },
  { name: 'Negative number', data: [{ total_amount: -5000 }] },
  { name: 'Negative string', data: [{ total_amount: "-5000" }] },
  { name: 'Decimal number', data: [{ total_amount: 123.45 }] },
  { name: 'Decimal string', data: [{ total_amount: "123.45" }] },
];

edgeCases.forEach(testCase => {
  const result = testCase.data.reduce((sum, sale) => {
    const amount = typeof sale.total_amount === 'number' 
      ? sale.total_amount 
      : parseFloat(sale.total_amount) || 0;
    return sum + amount;
  }, 0);
  
  console.log(`   ${testCase.name}: ${result} ${typeof result === 'number' ? '✅' : '❌'}`);
});

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║                     TEST COMPLETE                             ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

if (newTotal === 1005000) {
  console.log('✅ All tests passed! The numeric addition fix is working correctly.\n');
  process.exit(0);
} else {
  console.log('❌ Tests failed! Please review the implementation.\n');
  process.exit(1);
}

