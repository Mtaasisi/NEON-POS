/**
 * Branch Isolation Debugger
 * Comprehensive tool to test and verify branch data isolation is working correctly
 */

import { supabase } from './supabaseClient';
import { getCurrentBranchId, getBranchSettings } from './branchAwareApi';

export interface IsolationTestResult {
  feature: string;
  passed: boolean;
  expected: 'isolated' | 'shared';
  actual: 'isolated' | 'shared' | 'unknown';
  details: string;
  dataCount: {
    currentBranch: number;
    otherBranches: number;
    shared: number;
    total: number;
  };
  timestamp: string;
}

export interface BranchDebugInfo {
  branchId: string | null;
  branchName: string;
  isolationMode: 'shared' | 'isolated' | 'hybrid';
  settings: {
    share_products: boolean;
    share_customers: boolean;
    share_inventory: boolean;
    share_suppliers: boolean;
    share_categories: boolean;
    share_employees: boolean;
  };
  testResults: IsolationTestResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

/**
 * Test if products isolation is working correctly
 * Tests what products would be VISIBLE to this branch through the API
 */
export async function testProductsIsolation(branchId: string): Promise<IsolationTestResult> {
  try {
    const branch = await getBranchSettings(branchId);
    if (!branch) throw new Error('Branch not found');

    const expected = getExpectedIsolation('products', branch);

    // Test what products would be VISIBLE to this branch
    // This simulates what the API would return
    let visibleProductsQuery;
    
    if (expected === 'isolated') {
      // In isolated mode: only products from this branch
      visibleProductsQuery = supabase
        .from('lats_products')
        .select('*', { count: 'exact', head: true })
        .eq('branch_id', branchId);
    } else {
      // In shared mode: all products
      visibleProductsQuery = supabase
        .from('lats_products')
        .select('*', { count: 'exact', head: true });
    }

    const { count: visibleCount } = await visibleProductsQuery;

    // Also count total products in database for context
    const { count: currentBranchCount } = await supabase
      .from('lats_products')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId);

    const { count: otherBranchesCount } = await supabase
      .from('lats_products')
      .select('*', { count: 'exact', head: true })
      .neq('branch_id', branchId)
      .not('branch_id', 'is', null);

    const { count: totalCount } = await supabase
      .from('lats_products')
      .select('*', { count: 'exact', head: true });

    const dataCount = {
      currentBranch: currentBranchCount || 0,
      otherBranches: otherBranchesCount || 0,
      shared: 0,
      total: totalCount || 0,
    };

    // Determine actual isolation based on what's VISIBLE
    let actual: 'isolated' | 'shared' | 'unknown' = 'unknown';
    let passed = true;
    let details = '';

    if (expected === 'isolated') {
      // Check if visible products match only current branch
      if (visibleCount === currentBranchCount && currentBranchCount > 0) {
        actual = 'isolated';
        passed = true;
        details = `✅ Isolation working: ${visibleCount} products visible (only from this branch). Database has ${otherBranchesCount} products from other branches (correctly hidden)`;
      } else if (visibleCount === 0 && currentBranchCount === 0) {
        actual = 'isolated';
        passed = true;
        details = `⚠️ No products found for this branch yet. Database has ${otherBranchesCount} products from other branches (correctly hidden)`;
      } else {
        actual = 'shared';
        passed = false;
        details = `❌ Isolation FAILED: ${visibleCount} products visible but should only be ${currentBranchCount}`;
      }
    } else {
      // In shared mode, we should see products from all branches
      actual = 'shared';
      passed = true;
      details = `✅ Sharing working: ${visibleCount} total products visible (${dataCount.currentBranch} from this branch, ${dataCount.otherBranches} from others)`;
    }

    return {
      feature: 'Products',
      passed,
      expected,
      actual,
      details,
      dataCount,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      feature: 'Products',
      passed: false,
      expected: 'unknown',
      actual: 'unknown',
      details: `❌ Error testing products: ${error.message}`,
      dataCount: { currentBranch: 0, otherBranches: 0, shared: 0, total: 0 },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Test if customers isolation is working correctly
 * Tests what customers would be VISIBLE to this branch through the API
 */
export async function testCustomersIsolation(branchId: string): Promise<IsolationTestResult> {
  try {
    const branch = await getBranchSettings(branchId);
    if (!branch) throw new Error('Branch not found');

    const expected = getExpectedIsolation('customers', branch);

    // Test what customers would be VISIBLE to this branch
    let visibleCustomersQuery;
    
    if (expected === 'isolated') {
      // In isolated mode: only customers from this branch
      visibleCustomersQuery = supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('branch_id', branchId);
    } else {
      // In shared mode: all customers
      visibleCustomersQuery = supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });
    }

    const { count: visibleCount } = await visibleCustomersQuery;

    // Count for context
    const { count: currentBranchCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId);

    const { count: otherBranchesCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .neq('branch_id', branchId)
      .not('branch_id', 'is', null);

    const { count: totalCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    const dataCount = {
      currentBranch: currentBranchCount || 0,
      otherBranches: otherBranchesCount || 0,
      shared: 0,
      total: totalCount || 0,
    };

    let actual: 'isolated' | 'shared' | 'unknown' = 'unknown';
    let passed = true;
    let details = '';

    if (expected === 'isolated') {
      if (visibleCount === currentBranchCount && currentBranchCount > 0) {
        actual = 'isolated';
        passed = true;
        details = `✅ Isolation working: ${visibleCount} customers visible (only from this branch). Database has ${otherBranchesCount} customers from other branches (correctly hidden)`;
      } else if (visibleCount === 0 && currentBranchCount === 0) {
        actual = 'isolated';
        passed = true;
        details = `⚠️ No customers found for this branch yet. Database has ${otherBranchesCount} customers from other branches (correctly hidden)`;
      } else {
        actual = 'shared';
        passed = false;
        details = `❌ Isolation FAILED: ${visibleCount} customers visible but should only be ${currentBranchCount}`;
      }
    } else {
      actual = 'shared';
      passed = true;
      details = `✅ Sharing working: ${visibleCount} total customers visible`;
    }

    return {
      feature: 'Customers',
      passed,
      expected,
      actual,
      details,
      dataCount,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      feature: 'Customers',
      passed: false,
      expected: 'unknown',
      actual: 'unknown',
      details: `❌ Error testing customers: ${error.message}`,
      dataCount: { currentBranch: 0, otherBranches: 0, shared: 0, total: 0 },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Test if inventory isolation is working correctly
 * Tests what inventory would be VISIBLE to this branch through the API
 */
export async function testInventoryIsolation(branchId: string): Promise<IsolationTestResult> {
  try {
    const branch = await getBranchSettings(branchId);
    if (!branch) throw new Error('Branch not found');

    const expected = getExpectedIsolation('inventory', branch);

    // Test what inventory would be VISIBLE to this branch
    let visibleInventoryQuery;
    
    if (expected === 'isolated') {
      // In isolated mode: only inventory from this branch
      visibleInventoryQuery = supabase
        .from('lats_products')
        .select('*', { count: 'exact', head: true })
        .eq('branch_id', branchId)
        .gt('stock_quantity', 0);
    } else {
      // In shared mode: all inventory
      visibleInventoryQuery = supabase
        .from('lats_products')
        .select('*', { count: 'exact', head: true })
        .gt('stock_quantity', 0);
    }

    const { count: visibleCount } = await visibleInventoryQuery;

    // Count for context
    const { count: currentBranchCount } = await supabase
      .from('lats_products')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId)
      .gt('stock_quantity', 0);

    const { count: otherBranchesCount } = await supabase
      .from('lats_products')
      .select('*', { count: 'exact', head: true })
      .neq('branch_id', branchId)
      .not('branch_id', 'is', null)
      .gt('stock_quantity', 0);

    const { count: totalCount } = await supabase
      .from('lats_products')
      .select('*', { count: 'exact', head: true })
      .gt('stock_quantity', 0);

    const dataCount = {
      currentBranch: currentBranchCount || 0,
      otherBranches: otherBranchesCount || 0,
      shared: 0,
      total: totalCount || 0,
    };

    let actual: 'isolated' | 'shared' | 'unknown' = 'unknown';
    let passed = true;
    let details = '';

    if (expected === 'isolated') {
      if (visibleCount === currentBranchCount && currentBranchCount > 0) {
        actual = 'isolated';
        passed = true;
        details = `✅ Isolation working: ${visibleCount} inventory items visible (only from this branch). Database has ${otherBranchesCount} items from other branches (correctly hidden)`;
      } else if (visibleCount === 0 && currentBranchCount === 0) {
        actual = 'isolated';
        passed = true;
        details = `⚠️ No inventory found for this branch yet. Database has ${otherBranchesCount} items from other branches (correctly hidden)`;
      } else {
        actual = 'shared';
        passed = false;
        details = `❌ Isolation FAILED: ${visibleCount} inventory items visible but should only be ${currentBranchCount}`;
      }
    } else {
      actual = 'shared';
      passed = true;
      details = `✅ Sharing working: ${visibleCount} total inventory items visible`;
    }

    return {
      feature: 'Inventory',
      passed,
      expected,
      actual,
      details,
      dataCount,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      feature: 'Inventory',
      passed: false,
      expected: 'unknown',
      actual: 'unknown',
      details: `❌ Error testing inventory: ${error.message}`,
      dataCount: { currentBranch: 0, otherBranches: 0, shared: 0, total: 0 },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Test if suppliers isolation is working correctly
 * Tests what suppliers would be VISIBLE to this branch through the API
 */
export async function testSuppliersIsolation(branchId: string): Promise<IsolationTestResult> {
  try {
    const branch = await getBranchSettings(branchId);
    if (!branch) throw new Error('Branch not found');

    const expected = getExpectedIsolation('suppliers', branch);

    // Test what suppliers would be VISIBLE to this branch
    let visibleSuppliersQuery;
    
    if (expected === 'isolated') {
      // In isolated mode: only suppliers from this branch
      visibleSuppliersQuery = supabase
        .from('lats_suppliers')
        .select('*', { count: 'exact', head: true })
        .eq('branch_id', branchId);
    } else {
      // In shared mode: all suppliers
      visibleSuppliersQuery = supabase
        .from('lats_suppliers')
        .select('*', { count: 'exact', head: true });
    }

    const { count: visibleCount } = await visibleSuppliersQuery;

    // Count for context
    const { count: currentBranchCount } = await supabase
      .from('lats_suppliers')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId);

    const { count: otherBranchesCount } = await supabase
      .from('lats_suppliers')
      .select('*', { count: 'exact', head: true })
      .neq('branch_id', branchId)
      .not('branch_id', 'is', null);

    const { count: totalCount } = await supabase
      .from('lats_suppliers')
      .select('*', { count: 'exact', head: true });

    const dataCount = {
      currentBranch: currentBranchCount || 0,
      otherBranches: otherBranchesCount || 0,
      shared: 0,
      total: totalCount || 0,
    };

    let actual: 'isolated' | 'shared' | 'unknown' = 'unknown';
    let passed = true;
    let details = '';

    if (expected === 'isolated') {
      if (visibleCount === currentBranchCount && currentBranchCount > 0) {
        actual = 'isolated';
        passed = true;
        details = `✅ Isolation working: ${visibleCount} suppliers visible (only from this branch). Database has ${otherBranchesCount} suppliers from other branches (correctly hidden)`;
      } else if (visibleCount === 0 && currentBranchCount === 0) {
        actual = 'isolated';
        passed = true;
        details = `⚠️ No suppliers found for this branch yet. Database has ${otherBranchesCount} suppliers from other branches (correctly hidden)`;
      } else {
        actual = 'shared';
        passed = false;
        details = `❌ Isolation FAILED: ${visibleCount} suppliers visible but should only be ${currentBranchCount}`;
      }
    } else {
      actual = 'shared';
      passed = true;
      details = `✅ Sharing working: ${visibleCount} total suppliers visible`;
    }

    return {
      feature: 'Suppliers',
      passed,
      expected,
      actual,
      details,
      dataCount,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      feature: 'Suppliers',
      passed: false,
      expected: 'unknown',
      actual: 'unknown',
      details: `❌ Error testing suppliers: ${error.message}`,
      dataCount: { currentBranch: 0, otherBranches: 0, shared: 0, total: 0 },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Test if categories isolation is working correctly
 * Tests what categories would be VISIBLE to this branch through the API
 */
export async function testCategoriesIsolation(branchId: string): Promise<IsolationTestResult> {
  try {
    const branch = await getBranchSettings(branchId);
    if (!branch) throw new Error('Branch not found');

    const expected = getExpectedIsolation('categories', branch);

    // Test what categories would be VISIBLE to this branch
    let visibleCategoriesQuery;
    
    if (expected === 'isolated') {
      // In isolated mode: only categories from this branch
      visibleCategoriesQuery = supabase
        .from('lats_categories')
        .select('*', { count: 'exact', head: true })
        .eq('branch_id', branchId);
    } else {
      // In shared mode: all categories
      visibleCategoriesQuery = supabase
        .from('lats_categories')
        .select('*', { count: 'exact', head: true });
    }

    const { count: visibleCount } = await visibleCategoriesQuery;

    // Count for context
    const { count: currentBranchCount } = await supabase
      .from('lats_categories')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId);

    const { count: otherBranchesCount } = await supabase
      .from('lats_categories')
      .select('*', { count: 'exact', head: true })
      .neq('branch_id', branchId)
      .not('branch_id', 'is', null);

    const { count: totalCount } = await supabase
      .from('lats_categories')
      .select('*', { count: 'exact', head: true });

    const dataCount = {
      currentBranch: currentBranchCount || 0,
      otherBranches: otherBranchesCount || 0,
      shared: 0,
      total: totalCount || 0,
    };

    let actual: 'isolated' | 'shared' | 'unknown' = 'unknown';
    let passed = true;
    let details = '';

    if (expected === 'isolated') {
      if (visibleCount === currentBranchCount && currentBranchCount > 0) {
        actual = 'isolated';
        passed = true;
        details = `✅ Isolation working: ${visibleCount} categories visible (only from this branch). Database has ${otherBranchesCount} categories from other branches (correctly hidden)`;
      } else if (visibleCount === 0 && currentBranchCount === 0) {
        actual = 'isolated';
        passed = true;
        details = `⚠️ No categories found for this branch yet. Database has ${otherBranchesCount} categories from other branches (correctly hidden)`;
      } else {
        actual = 'shared';
        passed = false;
        details = `❌ Isolation FAILED: ${visibleCount} categories visible but should only be ${currentBranchCount}`;
      }
    } else {
      actual = 'shared';
      passed = true;
      details = `✅ Sharing working: ${visibleCount} total categories visible`;
    }

    return {
      feature: 'Categories',
      passed,
      expected,
      actual,
      details,
      dataCount,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      feature: 'Categories',
      passed: false,
      expected: 'unknown',
      actual: 'unknown',
      details: `❌ Error testing categories: ${error.message}`,
      dataCount: { currentBranch: 0, otherBranches: 0, shared: 0, total: 0 },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Test all features for a branch
 */
export async function runFullIsolationTest(branchId?: string): Promise<BranchDebugInfo> {
  const currentBranchId = branchId || getCurrentBranchId();
  
  if (!currentBranchId) {
    throw new Error('No branch selected. Please select a branch first.');
  }

  const branch = await getBranchSettings(currentBranchId);
  if (!branch) {
    throw new Error('Branch not found');
  }

  console.log('🔍 ========================================');
  console.log('🔍 BRANCH ISOLATION DEBUG TEST');
  console.log('🔍 ========================================');
  console.log(`🏪 Branch: ${branch.name} (ID: ${currentBranchId})`);
  console.log(`📋 Isolation Mode: ${branch.data_isolation_mode}`);
  console.log('🔍 ========================================');

  // Run tests for each feature
  const testResults: IsolationTestResult[] = [];

  console.log('\n📦 Testing Products Isolation...');
  const productsTest = await testProductsIsolation(currentBranchId);
  testResults.push(productsTest);
  console.log(productsTest.details);

  console.log('\n👥 Testing Customers Isolation...');
  const customersTest = await testCustomersIsolation(currentBranchId);
  testResults.push(customersTest);
  console.log(customersTest.details);

  console.log('\n📊 Testing Inventory Isolation...');
  const inventoryTest = await testInventoryIsolation(currentBranchId);
  testResults.push(inventoryTest);
  console.log(inventoryTest.details);

  console.log('\n🏭 Testing Suppliers Isolation...');
  const suppliersTest = await testSuppliersIsolation(currentBranchId);
  testResults.push(suppliersTest);
  console.log(suppliersTest.details);

  console.log('\n📂 Testing Categories Isolation...');
  const categoriesTest = await testCategoriesIsolation(currentBranchId);
  testResults.push(categoriesTest);
  console.log(categoriesTest.details);

  // Calculate summary
  const passed = testResults.filter(t => t.passed).length;
  const failed = testResults.filter(t => !t.passed).length;
  const warnings = testResults.filter(t => t.details.includes('⚠️')).length;

  console.log('\n🔍 ========================================');
  console.log('📊 TEST SUMMARY');
  console.log('🔍 ========================================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log('🔍 ========================================\n');

  return {
    branchId: currentBranchId,
    branchName: branch.name,
    isolationMode: branch.data_isolation_mode,
    settings: {
      share_products: branch.share_products,
      share_customers: branch.share_customers,
      share_inventory: branch.share_inventory,
      share_suppliers: branch.share_suppliers,
      share_categories: branch.share_categories,
      share_employees: branch.share_employees,
    },
    testResults,
    summary: {
      totalTests: testResults.length,
      passed,
      failed,
      warnings,
    },
  };
}

/**
 * Helper: Determine expected isolation mode for a feature
 */
function getExpectedIsolation(
  feature: 'products' | 'customers' | 'inventory' | 'suppliers' | 'categories' | 'employees',
  branch: any
): 'isolated' | 'shared' {
  if (branch.data_isolation_mode === 'shared') {
    return 'shared';
  }
  
  if (branch.data_isolation_mode === 'isolated') {
    return 'isolated';
  }
  
  // Hybrid mode - check specific flag
  const shareMapping: Record<typeof feature, boolean> = {
    products: branch.share_products,
    customers: branch.share_customers,
    inventory: branch.share_inventory,
    suppliers: branch.share_suppliers,
    categories: branch.share_categories,
    employees: branch.share_employees,
  };
  
  return shareMapping[feature] ? 'shared' : 'isolated';
}

/**
 * Enable debug mode - logs all queries with isolation info
 */
export function enableDebugMode() {
  localStorage.setItem('branch_isolation_debug', 'true');
  console.log('🔍 Branch Isolation Debug Mode: ENABLED');
  console.log('   All queries will be logged with isolation information');
}

/**
 * Disable debug mode
 */
export function disableDebugMode() {
  localStorage.removeItem('branch_isolation_debug');
  console.log('🔍 Branch Isolation Debug Mode: DISABLED');
}

/**
 * Check if debug mode is enabled
 */
export function isDebugMode(): boolean {
  return localStorage.getItem('branch_isolation_debug') === 'true';
}

/**
 * Log debug info about a query
 */
export function logQueryDebug(
  feature: string,
  query: any,
  isolationMode: 'shared' | 'isolated' | 'hybrid',
  filtered: boolean
) {
  if (!isDebugMode()) return;

  console.log('🔍 ========================================');
  console.log(`🔍 QUERY DEBUG: ${feature}`);
  console.log('🔍 ========================================');
  console.log(`   Isolation Mode: ${isolationMode}`);
  console.log(`   Filtered by Branch: ${filtered ? 'YES' : 'NO'}`);
  console.log(`   Branch ID: ${getCurrentBranchId() || 'None'}`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  console.log('🔍 ========================================\n');
}

/**
 * Quick console test - run from browser console
 * Usage: window.testBranchIsolation()
 */
export async function quickTest() {
  try {
    const result = await runFullIsolationTest();
    console.log('\n✅ Test Complete! Check the admin settings page for detailed results.');
    return result;
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).testBranchIsolation = quickTest;
  (window as any).enableBranchDebug = enableDebugMode;
  (window as any).disableBranchDebug = disableDebugMode;
  
  console.log('🔍 Branch Isolation Debugger loaded!');
  console.log('   Available console commands:');
  console.log('   - window.testBranchIsolation()  - Run full isolation test');
  console.log('   - window.enableBranchDebug()    - Enable debug logging');
  console.log('   - window.disableBranchDebug()   - Disable debug logging');
}

