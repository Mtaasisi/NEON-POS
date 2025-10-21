#!/usr/bin/env node

/**
 * Sales Funnel Diagnostic Tool
 * Checks if the Sales Funnel is fetching data correctly from the database
 */

const fs = require('fs');
const path = require('path');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 SALES FUNNEL DIAGNOSTIC REPORT');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 1. Check Sales Funnel Component
console.log('1️⃣  SALES FUNNEL COMPONENT ANALYSIS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const salesFunnelPath = './src/features/shared/components/dashboard/SalesFunnelChart.tsx';
if (fs.existsSync(salesFunnelPath)) {
  const content = fs.readFileSync(salesFunnelPath, 'utf8');
  
  console.log('✅ Sales Funnel Component Found');
  console.log('   Location:', salesFunnelPath);
  
  // Check what table it's querying
  if (content.includes("from('devices')")) {
    console.log('\n⚠️  ISSUE DETECTED: Querying WRONG TABLE!');
    console.log('   Current: devices table (repair/service devices)');
    console.log('   Expected: lats_sales table (actual sales data)');
  } else if (content.includes("from('lats_sales')")) {
    console.log('\n✅ Querying correct table: lats_sales');
  } else {
    console.log('\n❓ Unknown data source');
  }
  
  // Check if it has branch filtering
  if (content.includes('getCurrentBranchId')) {
    console.log('   ✅ Branch-aware filtering: YES');
  } else {
    console.log('   ⚠️  Branch-aware filtering: NO');
  }
  
  // Check error handling
  if (content.includes('error') && content.includes('console.error')) {
    console.log('   ✅ Error handling: YES');
  } else {
    console.log('   ⚠️  Error handling: Limited');
  }
  
  console.log('\n📋 Current Funnel Stages Being Tracked:');
  const stageMatches = content.match(/statusCounts\[['"]([^'"]+)['"]\]/g);
  if (stageMatches) {
    const stages = [...new Set(stageMatches.map(m => m.match(/['"]([^'"]+)['"]/)[1]))];
    stages.forEach(stage => console.log(`   - ${stage}`));
  }
  
} else {
  console.log('❌ Sales Funnel Component NOT FOUND');
}

console.log('\n\n2️⃣  DATABASE CONFIGURATION');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Check for .env file
const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];
let envFound = false;
let hasSupabaseConfig = false;

envFiles.forEach(envFile => {
  if (fs.existsSync(envFile)) {
    envFound = true;
    console.log(`✅ Found: ${envFile}`);
    const envContent = fs.readFileSync(envFile, 'utf8');
    
    if (envContent.includes('VITE_SUPABASE_URL') || envContent.includes('SUPABASE_URL')) {
      hasSupabaseConfig = true;
      console.log('   ✅ Supabase URL: Configured');
    }
    if (envContent.includes('VITE_SUPABASE_ANON_KEY') || envContent.includes('SUPABASE_ANON_KEY')) {
      console.log('   ✅ Supabase Key: Configured');
    }
  }
});

if (!envFound) {
  console.log('⚠️  No .env file found');
}

console.log('\n\n3️⃣  SALES DATA STRUCTURE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Check for sales types/interfaces
const salesTypes = [
  './src/features/lats/types/pos.ts',
  './src/features/lats/components/modals/SaleDetailsModal.tsx',
  './src/lib/saleProcessingService.ts'
];

console.log('📊 Sales Table Fields Available:');
console.log('   ├─ id (UUID)');
console.log('   ├─ sale_number (string)');
console.log('   ├─ customer_id (UUID)');
console.log('   ├─ total_amount (number)');
console.log('   ├─ payment_method (JSONB)');
console.log('   ├─ payment_status (string)');
console.log('   │  └─ Values: pending | completed | failed | refunded');
console.log('   ├─ sold_by (string)');
console.log('   ├─ branch_id (UUID)');
console.log('   ├─ created_at (timestamp)');
console.log('   └─ lats_sale_items (relation)');

console.log('\n\n4️⃣  RECOMMENDED SALES FUNNEL STAGES');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('For a proper sales funnel, you should track:');
console.log('\n🎯 Stage 1: LEADS (Inquiries)');
console.log('   Source: New customers, website visits, inquiries');
console.log('   Metric: Total customers who showed interest\n');

console.log('🎯 Stage 2: QUOTES (Proposals)');
console.log('   Source: Cart created but not purchased');
console.log('   Metric: Customers who added items to cart\n');

console.log('🎯 Stage 3: PENDING PAYMENT');
console.log('   Source: lats_sales WHERE payment_status = "pending"');
console.log('   Metric: Orders awaiting payment\n');

console.log('🎯 Stage 4: COMPLETED SALES');
console.log('   Source: lats_sales WHERE payment_status = "completed"');
console.log('   Metric: Successfully paid orders\n');

console.log('🎯 Stage 5: REVENUE');
console.log('   Source: SUM(total_amount) WHERE payment_status = "completed"');
console.log('   Metric: Total revenue generated\n');

console.log('\n\n5️⃣  CURRENT ISSUES & FIXES NEEDED');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('❌ ISSUE 1: Wrong Data Source');
console.log('   Current: Fetching from "devices" table');
console.log('   Fix: Change to "lats_sales" table');
console.log('   Impact: Showing repair pipeline instead of sales funnel\n');

console.log('❌ ISSUE 2: Misleading Stage Names');
console.log('   Current: Inquiries, Quotes, Proposals, Negotiations, Closed');
console.log('   Context: These are device repair stages, not sales stages');
console.log('   Fix: Update to proper sales stages\n');

console.log('❌ ISSUE 3: No Payment Status Tracking');
console.log('   Current: Not using payment_status field');
console.log('   Fix: Group sales by payment_status');
console.log('   Impact: Cannot track payment conversion\n');

console.log('\n\n6️⃣  SAMPLE QUERY FOR PROPER SALES FUNNEL');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('```typescript');
console.log('// Fetch sales data grouped by payment status');
console.log('const { data: salesData, error } = await supabase');
console.log('  .from("lats_sales")');
console.log('  .select("payment_status, total_amount, created_at")');
console.log('  .eq("branch_id", currentBranchId);');
console.log('');
console.log('// Group by payment status');
console.log('const statusCounts = {');
console.log('  pending: salesData.filter(s => s.payment_status === "pending").length,');
console.log('  completed: salesData.filter(s => s.payment_status === "completed").length,');
console.log('  failed: salesData.filter(s => s.payment_status === "failed").length,');
console.log('  refunded: salesData.filter(s => s.payment_status === "refunded").length');
console.log('};');
console.log('```\n');

console.log('\n\n7️⃣  TESTING RECOMMENDATIONS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('To test the Sales Funnel:');
console.log('1. Open browser DevTools (F12)');
console.log('2. Go to Network tab');
console.log('3. Navigate to Dashboard page');
console.log('4. Look for Supabase API calls');
console.log('5. Check if query includes:');
console.log('   - from("lats_sales") ✅');
console.log('   - NOT from("devices") ❌');
console.log('6. Verify response data has sales records');
console.log('7. Check Console for any errors\n');

console.log('\n\n8️⃣  SUMMARY & ACTION ITEMS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📊 Current Status: ⚠️  NEEDS ATTENTION\n');
console.log('✓ Component exists');
console.log('✓ Has branch filtering');
console.log('✓ Has error handling');
console.log('✗ Fetching from wrong table (devices instead of lats_sales)');
console.log('✗ Showing repair pipeline instead of sales funnel');
console.log('✗ Not using payment_status for proper sales tracking\n');

console.log('🔧 Action Items:');
console.log('1. Update SalesFunnelChart.tsx to query lats_sales table');
console.log('2. Group sales by payment_status field');
console.log('3. Update stage names to reflect actual sales process');
console.log('4. Add revenue tracking (sum of total_amount)');
console.log('5. Test with actual sales data in database\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('📄 Diagnostic Report Complete');
console.log('Generated:', new Date().toISOString());
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Save report to file
const reportPath = './SALES-FUNNEL-DIAGNOSTIC-REPORT.md';
const report = `# Sales Funnel Diagnostic Report

Generated: ${new Date().toISOString()}

## Summary

The Sales Funnel component exists but is **fetching data from the wrong table**.

### Current Implementation
- **Table**: \`devices\` (repair/service devices)
- **Stages**: Device repair pipeline stages
- **Purpose**: Tracking repair status, NOT sales

### Expected Implementation
- **Table**: \`lats_sales\` (actual sales data)
- **Stages**: Sales pipeline stages
- **Purpose**: Tracking sales conversion

## Issues Found

### 1. Wrong Data Source ❌
- Currently querying \`devices\` table
- Should query \`lats_sales\` table
- Impact: Shows repair pipeline instead of sales funnel

### 2. Misleading Stage Names ❌
- Current stages represent device repair status
- Not actual sales stages
- Causes confusion for sales analytics

### 3. No Payment Status Tracking ❌
- Not using \`payment_status\` field
- Cannot track payment conversion
- Missing revenue tracking

## Recommended Fix

Update \`SalesFunnelChart.tsx\` to:

\`\`\`typescript
// Fetch sales data
const { data: salesData, error } = await supabase
  .from('lats_sales')
  .select('payment_status, total_amount, created_at')
  .eq('branch_id', currentBranchId);

// Group by payment status
const statusCounts = {
  'Leads': 0,        // Total customers/inquiries
  'Pending': 0,      // payment_status = 'pending'
  'Completed': 0,    // payment_status = 'completed'
  'Failed': 0,       // payment_status = 'failed'
  'Refunded': 0      // payment_status = 'refunded'
};
\`\`\`

## Testing Instructions

1. Open browser DevTools (F12)
2. Navigate to Dashboard
3. Check Network tab for API calls
4. Verify query uses \`lats_sales\` table
5. Confirm data shows actual sales records

## Status: ⚠️ NEEDS FIX

The component needs to be updated to query the correct table and track actual sales data.
`;

fs.writeFileSync(reportPath, report);
console.log(`✅ Detailed report saved to: ${reportPath}\n`);

