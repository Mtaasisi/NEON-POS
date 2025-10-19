/**
 * Branch Data Cleanup Utility
 * Helps identify and fix branch data isolation issues
 */

import { supabase } from './supabaseClient';
import { getCurrentBranchId, getBranchSettings } from './branchAwareApi';

export interface CleanupReport {
  table: string;
  totalRecords: number;
  currentBranchRecords: number;
  otherBranchRecords: number;
  unassignedRecords: number;
  recordsToCleanup: any[];
}

export interface CleanupOptions {
  dryRun?: boolean; // If true, only report without making changes
  action: 'delete' | 'reassign'; // Either delete records or reassign them to current branch
  confirmationRequired?: boolean;
}

/**
 * Analyze data for a specific table
 */
async function analyzeTable(
  tableName: string,
  currentBranchId: string
): Promise<CleanupReport> {
  try {
    console.log(`🔍 Analyzing ${tableName}...`);

    // Count all records
    const { count: totalRecords } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    // Count records for current branch
    const { count: currentBranchRecords } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', currentBranchId);

    // Count records for other branches
    const { count: otherBranchRecords } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .neq('branch_id', currentBranchId)
      .not('branch_id', 'is', null);

    // Count unassigned records (null branch_id)
    const { count: unassignedRecords } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .is('branch_id', null);

    // Get detailed records from other branches (for potential cleanup)
    const { data: recordsToCleanup } = await supabase
      .from(tableName)
      .select('id, branch_id, name, created_at')
      .neq('branch_id', currentBranchId)
      .not('branch_id', 'is', null)
      .limit(100); // Limit to first 100 for performance

    return {
      table: tableName,
      totalRecords: totalRecords || 0,
      currentBranchRecords: currentBranchRecords || 0,
      otherBranchRecords: otherBranchRecords || 0,
      unassignedRecords: unassignedRecords || 0,
      recordsToCleanup: recordsToCleanup || [],
    };
  } catch (error: any) {
    console.error(`❌ Error analyzing ${tableName}:`, error.message);
    return {
      table: tableName,
      totalRecords: 0,
      currentBranchRecords: 0,
      otherBranchRecords: 0,
      unassignedRecords: 0,
      recordsToCleanup: [],
    };
  }
}

/**
 * Run full analysis for all tables
 */
export async function runFullAnalysis(): Promise<CleanupReport[]> {
  const currentBranchId = getCurrentBranchId();
  
  if (!currentBranchId) {
    throw new Error('No branch selected. Please select a branch first.');
  }

  const branchSettings = await getBranchSettings(currentBranchId);
  if (!branchSettings) {
    throw new Error('Branch settings not found');
  }

  console.log('');
  console.log('🔍 ========================================');
  console.log('🔍 BRANCH DATA CLEANUP ANALYSIS');
  console.log('🔍 ========================================');
  console.log(`🏪 Branch: ${branchSettings.name} (${currentBranchId})`);
  console.log(`📋 Isolation Mode: ${branchSettings.data_isolation_mode}`);
  console.log('🔍 ========================================');
  console.log('');

  const tables = [
    'lats_products',
    'customers',
    'lats_suppliers',
    'lats_categories',
  ];

  const reports: CleanupReport[] = [];

  for (const table of tables) {
    const report = await analyzeTable(table, currentBranchId);
    reports.push(report);

    console.log(`📊 ${table}:`);
    console.log(`   Total: ${report.totalRecords}`);
    console.log(`   Current branch: ${report.currentBranchRecords}`);
    console.log(`   Other branches: ${report.otherBranchRecords}`);
    console.log(`   Unassigned: ${report.unassignedRecords}`);
    console.log('');
  }

  console.log('🔍 ========================================');
  console.log('📊 SUMMARY');
  console.log('🔍 ========================================');
  
  const totalOtherBranch = reports.reduce((sum, r) => sum + r.otherBranchRecords, 0);
  const totalUnassigned = reports.reduce((sum, r) => sum + r.unassignedRecords, 0);
  
  console.log(`⚠️  Total records from other branches: ${totalOtherBranch}`);
  console.log(`⚠️  Total unassigned records: ${totalUnassigned}`);
  console.log('');

  if (totalOtherBranch > 0 && branchSettings.data_isolation_mode === 'isolated') {
    console.log('⚠️  WARNING: Branch is in ISOLATED mode but has records from other branches!');
    console.log('   This violates branch isolation.');
    console.log('   Use cleanupBranchData() to fix this issue.');
  }

  console.log('🔍 ========================================');
  console.log('');

  return reports;
}

/**
 * Cleanup data for a specific table
 */
async function cleanupTable(
  tableName: string,
  currentBranchId: string,
  options: CleanupOptions
): Promise<{ success: boolean; affected: number; errors: string[] }> {
  const errors: string[] = [];
  let affected = 0;

  try {
    // Get records from other branches
    const { data: recordsToCleanup, error: fetchError } = await supabase
      .from(tableName)
      .select('id, branch_id')
      .neq('branch_id', currentBranchId)
      .not('branch_id', 'is', null);

    if (fetchError) {
      errors.push(`Failed to fetch records: ${fetchError.message}`);
      return { success: false, affected: 0, errors };
    }

    if (!recordsToCleanup || recordsToCleanup.length === 0) {
      console.log(`✅ ${tableName}: No records to cleanup`);
      return { success: true, affected: 0, errors: [] };
    }

    console.log(`🔧 ${tableName}: Found ${recordsToCleanup.length} records to cleanup`);

    if (options.dryRun) {
      console.log(`   [DRY RUN] Would ${options.action} ${recordsToCleanup.length} records`);
      return { success: true, affected: recordsToCleanup.length, errors: [] };
    }

    if (options.action === 'delete') {
      // Delete records from other branches
      const ids = recordsToCleanup.map(r => r.id);
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .in('id', ids);

      if (deleteError) {
        errors.push(`Failed to delete records: ${deleteError.message}`);
        return { success: false, affected: 0, errors };
      }

      affected = ids.length;
      console.log(`   ✅ Deleted ${affected} records`);
    } else if (options.action === 'reassign') {
      // Reassign records to current branch
      const ids = recordsToCleanup.map(r => r.id);
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ branch_id: currentBranchId })
        .in('id', ids);

      if (updateError) {
        errors.push(`Failed to reassign records: ${updateError.message}`);
        return { success: false, affected: 0, errors };
      }

      affected = ids.length;
      console.log(`   ✅ Reassigned ${affected} records to current branch`);
    }

    return { success: true, affected, errors: [] };
  } catch (error: any) {
    errors.push(`Exception: ${error.message}`);
    return { success: false, affected: 0, errors };
  }
}

/**
 * Cleanup all branch data
 */
export async function cleanupBranchData(options: CleanupOptions): Promise<void> {
  const currentBranchId = getCurrentBranchId();
  
  if (!currentBranchId) {
    throw new Error('No branch selected. Please select a branch first.');
  }

  const branchSettings = await getBranchSettings(currentBranchId);
  if (!branchSettings) {
    throw new Error('Branch settings not found');
  }

  if (branchSettings.data_isolation_mode !== 'isolated') {
    console.warn('⚠️  Branch is not in ISOLATED mode. Cleanup may not be necessary.');
    console.log(`   Current mode: ${branchSettings.data_isolation_mode}`);
  }

  console.log('');
  console.log('🔧 ========================================');
  console.log('🔧 BRANCH DATA CLEANUP');
  console.log('🔧 ========================================');
  console.log(`🏪 Branch: ${branchSettings.name} (${currentBranchId})`);
  console.log(`📋 Action: ${options.action}`);
  console.log(`🔍 Mode: ${options.dryRun ? 'DRY RUN (no changes)' : 'LIVE (will make changes)'}`);
  console.log('🔧 ========================================');
  console.log('');

  if (options.confirmationRequired && !options.dryRun) {
    console.log('⚠️  WARNING: This will modify database records!');
    console.log('   Run with dryRun: true first to preview changes.');
    return;
  }

  const tables = [
    'lats_products',
    'customers',
    'lats_suppliers',
    'lats_categories',
  ];

  let totalAffected = 0;
  const allErrors: string[] = [];

  for (const table of tables) {
    const result = await cleanupTable(table, currentBranchId, options);
    totalAffected += result.affected;
    allErrors.push(...result.errors);
  }

  console.log('');
  console.log('🔧 ========================================');
  console.log('📊 CLEANUP SUMMARY');
  console.log('🔧 ========================================');
  console.log(`✅ Total records affected: ${totalAffected}`);
  
  if (allErrors.length > 0) {
    console.log(`❌ Errors: ${allErrors.length}`);
    allErrors.forEach(error => console.error(`   - ${error}`));
  } else {
    console.log(`✅ No errors`);
  }
  
  console.log('🔧 ========================================');
  console.log('');
}

/**
 * Expose functions to window for console access
 */
if (typeof window !== 'undefined') {
  (window as any).analyzeBranchData = runFullAnalysis;
  (window as any).cleanupBranchData = cleanupBranchData;
  
  console.log('🔧 Branch Data Cleanup Tools loaded!');
  console.log('   Available console commands:');
  console.log('   - window.analyzeBranchData()  - Analyze data for current branch');
  console.log('   - window.cleanupBranchData({ action: "delete", dryRun: true })  - Cleanup (dry run)');
  console.log('   - window.cleanupBranchData({ action: "reassign", dryRun: false })  - Reassign data to current branch');
}

