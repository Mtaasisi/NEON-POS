#!/usr/bin/env node

/**
 * Stock Transfer System Diagnostic Tool
 * Run this to identify issues with your stock transfer system
 */

const issues = [];
const checks = [];

console.log('\n🔍 STOCK TRANSFER DIAGNOSTIC TOOL\n');
console.log('=' .repeat(60));

// Check 1: Database Functions Exist
console.log('\n📋 Check 1: Database Functions');
console.log('-'.repeat(60));
const requiredFunctions = [
  'complete_stock_transfer_transaction',
  'reserve_variant_stock',
  'release_variant_stock',
  'reduce_variant_stock',
  'increase_variant_stock',
  'find_or_create_variant_at_branch',
  'check_duplicate_transfer'
];

console.log('Required database functions:');
requiredFunctions.forEach(fn => console.log(`  • ${fn}`));
console.log('\n⚠️  Manual Check Required:');
console.log('  Run this SQL in your database:');
console.log(`  
  SELECT routine_name 
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name IN (
    ${requiredFunctions.map(f => `'${f}'`).join(',\n    ')}
  );
`);
checks.push('Database functions exist');

// Check 2: Table Structure
console.log('\n📋 Check 2: Table Structure');
console.log('-'.repeat(60));
console.log('Required tables:');
console.log('  • branch_transfers');
console.log('  • lats_product_variants');
console.log('  • store_locations');
console.log('\n⚠️  Manual Check Required:');
console.log('  Verify these tables exist with proper columns');
checks.push('Table structure correct');

// Check 3: RLS Policies
console.log('\n📋 Check 3: Row Level Security (RLS) Policies');
console.log('-'.repeat(60));
console.log('Check RLS policies on branch_transfers table:');
console.log(`
  SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
  FROM pg_policies
  WHERE tablename = 'branch_transfers';
`);
issues.push('RLS policies might be blocking queries');
checks.push('RLS policies configured correctly');

// Check 4: Code Issues
console.log('\n📋 Check 4: Common Code Issues');
console.log('-'.repeat(60));

const codeChecks = [
  {
    issue: 'Branch ID not set in localStorage',
    check: 'localStorage.getItem("current_branch_id")',
    fix: 'Set current_branch_id in localStorage',
    severity: '🔴 HIGH'
  },
  {
    issue: 'User not authenticated',
    check: 'User session exists',
    fix: 'Ensure user is logged in',
    severity: '🔴 HIGH'
  },
  {
    issue: 'Database connection error',
    check: 'Supabase client connected',
    fix: 'Check VITE_DATABASE_URL environment variable',
    severity: '🔴 HIGH'
  },
  {
    issue: 'Missing product variants',
    check: 'Products have variants with quantities',
    fix: 'Create product variants with stock quantities',
    severity: '🟡 MEDIUM'
  },
  {
    issue: 'Inactive branches',
    check: 'Both source and destination branches are active',
    fix: 'Activate branches in store_locations table',
    severity: '🟡 MEDIUM'
  }
];

codeChecks.forEach(({issue, check, fix, severity}) => {
  console.log(`\n${severity} ${issue}`);
  console.log(`  Check: ${check}`);
  console.log(`  Fix: ${fix}`);
});

// Check 5: Network Issues
console.log('\n\n📋 Check 5: Network & Console Errors');
console.log('-'.repeat(60));
console.log('Open browser console and check for:');
console.log('  • ❌ Failed to fetch transfers');
console.log('  • ❌ Error reserving stock');
console.log('  • ❌ Error creating transfer');
console.log('  • ❌ Error completing transfer');
console.log('  • ⚠️  No transfers found');
console.log('  • 🚫 CORS errors');
console.log('  • 🚫 Authentication errors');

// Check 6: Data Validation
console.log('\n\n📋 Check 6: Data Validation');
console.log('-'.repeat(60));
console.log('Common validation errors:');
console.log('  1. "Cannot transfer to the same branch"');
console.log('     → Source and destination must be different');
console.log('  2. "Insufficient available stock"');
console.log('     → Check quantity vs reserved_quantity');
console.log('  3. "Product variant does not belong to the source branch"');
console.log('     → Variant branch_id must match from_branch_id');
console.log('  4. "Transfer must be approved or in_transit to complete"');
console.log('     → Follow proper status progression');

// Summary
console.log('\n\n' + '='.repeat(60));
console.log('📊 DIAGNOSTIC SUMMARY');
console.log('='.repeat(60));
console.log(`\n✅ Checks to perform: ${checks.length}`);
checks.forEach((check, i) => console.log(`  ${i + 1}. ${check}`));

console.log(`\n⚠️  Common issues to investigate: ${codeChecks.length}`);
codeChecks.forEach((check, i) => {
  console.log(`  ${i + 1}. ${check.issue} (${check.severity})`);
});

// Testing Steps
console.log('\n\n🧪 TESTING STEPS');
console.log('='.repeat(60));
console.log(`
1. Open your app in the browser
2. Open DevTools Console (F12)
3. Navigate to Stock Transfer page
4. Try to create a transfer
5. Check console for error messages
6. Note any red error messages
7. Check Network tab for failed requests

Common Scenarios to Test:
-------------------------
✓ Create transfer with sufficient stock
✓ Create transfer with insufficient stock (should fail)
✓ Create transfer to same branch (should fail)
✓ Approve a pending transfer
✓ Mark transfer in transit
✓ Complete an in-transit transfer
✓ Reject a pending transfer
✓ Cancel a transfer
`);

// SQL Diagnostic Queries
console.log('\n📝 SQL DIAGNOSTIC QUERIES');
console.log('='.repeat(60));
console.log(`
-- Check if transfers exist
SELECT COUNT(*) as transfer_count FROM branch_transfers;

-- Check transfer statuses
SELECT status, COUNT(*) FROM branch_transfers GROUP BY status;

-- Check for reserved stock
SELECT 
  pv.sku, 
  pv.variant_name,
  pv.quantity,
  pv.reserved_quantity,
  (pv.quantity - COALESCE(pv.reserved_quantity, 0)) as available
FROM lats_product_variants pv
WHERE pv.reserved_quantity > 0
ORDER BY pv.reserved_quantity DESC;

-- Check for pending transfers
SELECT 
  bt.id,
  bt.status,
  bt.quantity,
  fb.name as from_branch,
  tb.name as to_branch,
  pv.sku,
  pv.variant_name
FROM branch_transfers bt
LEFT JOIN store_locations fb ON bt.from_branch_id = fb.id
LEFT JOIN store_locations tb ON bt.to_branch_id = tb.id
LEFT JOIN lats_product_variants pv ON bt.entity_id = pv.id
WHERE bt.status = 'pending'
ORDER BY bt.created_at DESC;

-- Check database functions exist
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%stock%'
  OR routine_name LIKE '%transfer%'
ORDER BY routine_name;
`);

console.log('\n\n✅ DIAGNOSTIC COMPLETE');
console.log('='.repeat(60));
console.log('\n💡 Next Steps:');
console.log('  1. Run the SQL queries above in your database');
console.log('  2. Test the stock transfer feature in your browser');
console.log('  3. Check browser console for errors');
console.log('  4. Share any error messages for further help\n');

