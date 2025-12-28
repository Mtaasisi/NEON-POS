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


  // console.log removed`);


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


  }


  
  const totalOtherBranch = reports.reduce((sum, r) => sum + r.otherBranchRecords, 0);
  const totalUnassigned = reports.reduce((sum, r) => sum + r.unassignedRecords, 0);
  


  if (totalOtherBranch > 0 && branchSettings.data_isolation_mode === 'isolated') {


    // console.log removed to fix this issue.');
  }


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

      return { success: true, affected: 0, errors: [] };
    }


    if (options.dryRun) {

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

  }


  // console.log removed`);

  // console.log removed' : 'LIVE (will make changes)'}`);


  if (options.confirmationRequired && !options.dryRun) {


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


  
  if (allErrors.length > 0) {

    allErrors.forEach(error => console.error(`   - ${error}`));
  } else {

  }
  


}

/**
 * Expose functions to window for console access
 */
if (typeof window !== 'undefined') {
  (window as any).analyzeBranchData = runFullAnalysis;
  (window as any).cleanupBranchData = cleanupBranchData;
  


  // console.log removed  - Analyze data for current branch');
  // console.log removed  - Cleanup (dry run)');
  // console.log removed  - Reassign data to current branch');
}

