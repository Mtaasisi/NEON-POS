/**
 * Schema Validator
 * 
 * Validates data against the database schema definitions.
 * Ensures data integrity before database operations.
 */

import {
  StoreLocationSchema,
  DataIsolationMode,
  SCHEMA_CONSTRAINTS,
  STORE_LOCATION_DEFAULTS,
} from './storeLocations';

/**
 * Validates a store location object against the schema
 */
export function validateStoreLocation(
  data: Partial<StoreLocationSchema>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate required fields
  if (!data.name) errors.push('name is required');
  if (!data.code) errors.push('code is required');
  if (!data.address) errors.push('address is required');
  if (!data.city) errors.push('city is required');
  if (!data.country) errors.push('country is required');

  // Validate data_isolation_mode
  if (data.data_isolation_mode !== undefined) {
    if (!SCHEMA_CONSTRAINTS.data_isolation_mode.check(data.data_isolation_mode)) {
      errors.push(
        `data_isolation_mode must be one of: ${SCHEMA_CONSTRAINTS.data_isolation_mode.allowedValues.join(', ')}`
      );
    }
  }

  // Validate pricing_model
  if (data.pricing_model !== undefined) {
    if (!SCHEMA_CONSTRAINTS.pricing_model.check(data.pricing_model)) {
      errors.push(
        `pricing_model must be one of: ${SCHEMA_CONSTRAINTS.pricing_model.allowedValues.join(', ')}`
      );
    }
  }

  // Validate code uniqueness (would need database check in real implementation)
  // This is just a placeholder for the validation structure

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Applies default values to a store location object
 */
export function applyStoreLocationDefaults(
  data: Partial<StoreLocationSchema>
): Partial<StoreLocationSchema> {
  return {
    ...STORE_LOCATION_DEFAULTS,
    ...data,
  };
}

/**
 * Checks if a value is a valid DataIsolationMode
 */
export function isValidIsolationMode(value: string): value is DataIsolationMode {
  return SCHEMA_CONSTRAINTS.data_isolation_mode.check(value);
}

/**
 * Gets the expected column name for a shareable entity type
 */
export function getShareColumnName(entityType: string): string | null {
  const columnMap: Record<string, string> = {
    products: 'share_products',
    inventory: 'share_inventory',
    customers: 'share_customers',
    suppliers: 'share_suppliers',
    categories: 'share_categories',
    employees: 'share_employees',
    accounts: 'share_accounts',
    sales: 'share_sales',
    purchase_orders: 'share_purchase_orders',
    devices: 'share_devices',
    payments: 'share_payments',
    appointments: 'share_appointments',
    reminders: 'share_reminders',
    expenses: 'share_expenses',
    trade_ins: 'share_trade_ins',
    special_orders: 'share_special_orders',
    attendance: 'share_attendance',
    loyalty_points: 'share_loyalty_points',
    gift_cards: 'share_gift_cards',
    quality_checks: 'share_quality_checks',
    recurring_expenses: 'share_recurring_expenses',
    communications: 'share_communications',
    reports: 'share_reports',
    finance_transfers: 'share_finance_transfers',
  };

  return columnMap[entityType] || null;
}

