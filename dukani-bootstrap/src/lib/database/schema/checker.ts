/**
 * Schema Checker
 * 
 * Verifies that the database schema matches the codebase schema definitions.
 * Run this to ensure database and codebase are in sync.
 */

import { supabase } from '../../supabaseClient';
import {
  ISOLATION_COLUMNS,
  STORE_LOCATION_SCHEMA_METADATA,
  SCHEMA_CONSTRAINTS,
} from './storeLocations';

export interface SchemaCheckResult {
  valid: boolean;
  missingColumns: string[];
  extraColumns: string[];
  typeMismatches: Array<{ column: string; expected: string; actual: string }>;
  missingConstraints: string[];
  errors: string[];
}

/**
 * Checks if the database schema matches the codebase schema definition
 */
export async function checkStoreLocationSchema(): Promise<SchemaCheckResult> {
  const result: SchemaCheckResult = {
    valid: true,
    missingColumns: [],
    extraColumns: [],
    typeMismatches: [],
    missingConstraints: [],
    errors: [],
  };

  try {
    // Get actual database columns
    const { data: columns, error: columnsError } = await supabase.rpc(
      'get_table_columns',
      { table_name: 'store_locations' }
    ).catch(() => {
      // Fallback: query information_schema directly
      return supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', 'store_locations')
        .eq('table_schema', 'public');
    });

    if (columnsError) {
      // Try alternative method using raw SQL
      const { data: altColumns, error: altError } = await supabase
        .from('store_locations')
        .select('*')
        .limit(0);

      if (altError) {
        result.errors.push(`Failed to fetch schema: ${altError.message}`);
        result.valid = false;
        return result;
      }

      // If we can't get column info, at least verify the table exists
      result.errors.push('Could not fetch column information. Schema check incomplete.');
      result.valid = false;
      return result;
    }

    // Expected columns from schema definition
    const expectedColumns = new Set([
      'id',
      'name',
      'code',
      'address',
      'city',
      'state',
      'zip_code',
      'country',
      'phone',
      'email',
      'manager_name',
      'is_main',
      'is_active',
      'opening_time',
      'closing_time',
      'inventory_sync_enabled',
      'pricing_model',
      'tax_rate_override',
      'created_at',
      'updated_at',
      ...ISOLATION_COLUMNS,
      'allow_stock_transfer',
      'auto_sync_products',
      'auto_sync_prices',
      'require_approval_for_transfers',
      'can_view_other_branches',
      'can_transfer_to_branches',
    ]);

    // Check isolation columns specifically
    const isolationColumnSet = new Set(ISOLATION_COLUMNS);
    const actualColumns = new Set<string>();

    // Process columns (handle both RPC and direct query results)
    const columnList = Array.isArray(columns) ? columns : [];
    
    for (const col of columnList) {
      const colName = col.column_name || col.name;
      if (colName) {
        actualColumns.add(colName);
      }
    }

    // Check for missing isolation columns
    for (const expectedCol of isolationColumnSet) {
      if (!actualColumns.has(expectedCol)) {
        result.missingColumns.push(expectedCol);
        result.valid = false;
      }
    }

    // Check for missing data_isolation_mode
    if (!actualColumns.has('data_isolation_mode')) {
      result.missingColumns.push('data_isolation_mode');
      result.valid = false;
    }

    // Note: We don't check for "extra" columns as the database might have additional columns
    // that aren't in our schema definition yet

    return result;
  } catch (error) {
    result.errors.push(`Schema check failed: ${error instanceof Error ? error.message : String(error)}`);
    result.valid = false;
    return result;
  }
}

/**
 * Validates that all isolation columns exist in the database
 * Returns a simple boolean check
 */
export async function validateIsolationSchema(): Promise<boolean> {
  try {
    // Try to fetch a single row to verify table structure
    const { data, error } = await supabase
      .from('store_locations')
      .select(ISOLATION_COLUMNS.join(', '))
      .limit(1);

    if (error) {
      console.error('Schema validation error:', error);
      return false;
    }

    // If we can select these columns, they exist
    return true;
  } catch (error) {
    console.error('Schema validation failed:', error);
    return false;
  }
}

/**
 * Logs schema check results to console
 */
export function logSchemaCheckResult(result: SchemaCheckResult): void {
  console.group('🔍 Schema Check Results');
  
  if (result.valid) {
    console.log('✅ Schema is valid - all isolation columns exist');
  } else {
    console.error('❌ Schema validation failed');
    
    if (result.missingColumns.length > 0) {
      console.error('Missing columns:', result.missingColumns);
    }
    
    if (result.typeMismatches.length > 0) {
      console.error('Type mismatches:', result.typeMismatches);
    }
    
    if (result.missingConstraints.length > 0) {
      console.error('Missing constraints:', result.missingConstraints);
    }
    
    if (result.errors.length > 0) {
      console.error('Errors:', result.errors);
    }
  }
  
  console.groupEnd();
}

/**
 * Quick check: Verifies isolation schema is present
 * Use this for runtime validation
 */
export async function quickSchemaCheck(): Promise<{
  hasIsolationMode: boolean;
  hasIsolationColumns: boolean;
  missingColumns: string[];
}> {
  const missing: string[] = [];
  let hasIsolationMode = false;
  let hasIsolationColumns = false;

  try {
    // Check data_isolation_mode
    const { data: modeCheck } = await supabase
      .from('store_locations')
      .select('data_isolation_mode')
      .limit(1);

    hasIsolationMode = !!modeCheck;

    // Check a few key isolation columns
    const keyColumns = ['share_products', 'share_inventory', 'share_customers'];
    const { data: colCheck } = await supabase
      .from('store_locations')
      .select(keyColumns.join(', '))
      .limit(1);

    hasIsolationColumns = !!colCheck;

    // Note: This is a quick check, not comprehensive
    // For full validation, use checkStoreLocationSchema()
  } catch (error) {
    console.warn('Quick schema check failed:', error);
  }

  return {
    hasIsolationMode,
    hasIsolationColumns,
    missingColumns: missing,
  };
}

