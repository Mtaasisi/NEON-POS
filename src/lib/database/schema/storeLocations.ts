/**
 * Store Locations Database Schema Definition
 * 
 * This file defines the complete schema for the store_locations table,
 * including all branch isolation features. This ensures the codebase
 * always knows what columns and constraints exist in the database.
 * 
 * When the database schema changes, update this file to keep codebase
 * and database in sync.
 */

/**
 * Data Isolation Mode
 * Controls how data is shared/isolated across branches
 */
export type DataIsolationMode = 'shared' | 'isolated' | 'hybrid';

/**
 * Complete Store Location Schema
 * Matches the database table structure exactly
 */
export interface StoreLocationSchema {
  // Primary identifiers
  id: string; // UUID
  name: string;
  code: string;
  address: string;
  city: string;
  state?: string | null;
  zip_code?: string | null;
  country: string; // Default: 'Tanzania'
  
  // Contact information
  phone?: string | null;
  email?: string | null;
  manager_name?: string | null;
  
  // Status flags
  is_main: boolean; // Default: false
  is_active: boolean; // Default: true
  
  // Operating hours
  opening_time?: string | null; // Time format: 'HH:MM:SS'
  closing_time?: string | null; // Time format: 'HH:MM:SS'
  
  // Inventory settings
  inventory_sync_enabled: boolean; // Default: true
  pricing_model: 'centralized' | 'location-specific'; // Default: 'centralized'
  tax_rate_override?: number | null; // numeric(5,2)
  
  // Timestamps
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
  
  // =====================================================
  // BRANCH ISOLATION FEATURES
  // =====================================================
  
  /**
   * Main isolation mode
   * - 'shared': All data is shared across branches (share_* flags ignored)
   * - 'isolated': All data is isolated per branch (share_* flags ignored)
   * - 'hybrid': Use individual share_* flags for granular control
   */
  data_isolation_mode: DataIsolationMode; // Default: 'shared'
  
  // Core data isolation flags (used in hybrid mode)
  share_products: boolean; // Default: true
  share_inventory: boolean; // Default: false
  share_customers: boolean; // Default: true
  share_suppliers: boolean; // Default: true
  share_categories: boolean; // Default: true
  share_employees: boolean; // Default: false
  share_accounts: boolean; // Default: true
  
  // Business operations isolation flags
  share_sales: boolean; // Default: false
  share_purchase_orders: boolean; // Default: false
  share_devices: boolean; // Default: false
  share_payments: boolean; // Default: false
  share_appointments: boolean; // Default: false
  share_reminders: boolean; // Default: false
  share_expenses: boolean; // Default: false
  share_trade_ins: boolean; // Default: false
  share_special_orders: boolean; // Default: false
  share_attendance: boolean; // Default: false
  share_loyalty_points: boolean; // Default: false
  
  // Additional features isolation flags
  share_gift_cards: boolean; // Default: true
  share_quality_checks: boolean; // Default: false
  share_recurring_expenses: boolean; // Default: false
  share_communications: boolean; // Default: false
  share_reports: boolean; // Default: false
  share_finance_transfers: boolean; // Default: false
  
  // Stock transfer settings
  allow_stock_transfer: boolean; // Default: true
  auto_sync_products: boolean; // Default: true
  auto_sync_prices: boolean; // Default: true
  require_approval_for_transfers: boolean; // Default: false
  can_view_other_branches: boolean; // Default: false
  can_transfer_to_branches: string[]; // Default: []
}

/**
 * Default values for new store locations
 * These match the database schema defaults
 */
export const STORE_LOCATION_DEFAULTS: Partial<StoreLocationSchema> = {
  country: 'Tanzania',
  is_main: false,
  is_active: true,
  opening_time: '09:00:00',
  closing_time: '18:00:00',
  inventory_sync_enabled: true,
  pricing_model: 'centralized',
  data_isolation_mode: 'shared',
  share_products: true,
  share_inventory: false,
  share_customers: true,
  share_suppliers: true,
  share_categories: true,
  share_employees: false,
  share_accounts: true,
  share_sales: false,
  share_purchase_orders: false,
  share_devices: false,
  share_payments: false,
  share_appointments: false,
  share_reminders: false,
  share_expenses: false,
  share_trade_ins: false,
  share_special_orders: false,
  share_attendance: false,
  share_loyalty_points: false,
  share_gift_cards: true,
  share_quality_checks: false,
  share_recurring_expenses: false,
  share_communications: false,
  share_reports: false,
  share_finance_transfers: false,
  allow_stock_transfer: true,
  auto_sync_products: true,
  auto_sync_prices: true,
  require_approval_for_transfers: false,
  can_view_other_branches: false,
  can_transfer_to_branches: [],
};

/**
 * All isolation column names
 * Used for validation and dynamic queries
 */
export const ISOLATION_COLUMNS = [
  'data_isolation_mode',
  'share_products',
  'share_inventory',
  'share_customers',
  'share_suppliers',
  'share_categories',
  'share_employees',
  'share_accounts',
  'share_sales',
  'share_purchase_orders',
  'share_devices',
  'share_payments',
  'share_appointments',
  'share_reminders',
  'share_expenses',
  'share_trade_ins',
  'share_special_orders',
  'share_attendance',
  'share_loyalty_points',
  'share_gift_cards',
  'share_quality_checks',
  'share_recurring_expenses',
  'share_communications',
  'share_reports',
  'share_finance_transfers',
] as const;

/**
 * Entity types that can be shared/isolated
 * Maps to share_* columns
 */
export type ShareableEntityType =
  | 'products'
  | 'inventory'
  | 'customers'
  | 'suppliers'
  | 'categories'
  | 'employees'
  | 'accounts'
  | 'sales'
  | 'purchase_orders'
  | 'devices'
  | 'payments'
  | 'appointments'
  | 'reminders'
  | 'expenses'
  | 'trade_ins'
  | 'special_orders'
  | 'attendance'
  | 'loyalty_points'
  | 'gift_cards'
  | 'quality_checks'
  | 'recurring_expenses'
  | 'communications'
  | 'reports'
  | 'finance_transfers';

/**
 * Maps entity types to their corresponding share_* column names
 */
export const ENTITY_TO_COLUMN_MAP: Record<ShareableEntityType, keyof StoreLocationSchema> = {
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
} as const;

/**
 * Database constraints
 * These match the database check constraints
 */
export const SCHEMA_CONSTRAINTS = {
  data_isolation_mode: {
    allowedValues: ['shared', 'isolated', 'hybrid'] as const,
    check: (value: string): value is DataIsolationMode => {
      return ['shared', 'isolated', 'hybrid'].includes(value);
    },
  },
  pricing_model: {
    allowedValues: ['centralized', 'location-specific'] as const,
    check: (value: string): boolean => {
      return ['centralized', 'location-specific'].includes(value);
    },
  },
} as const;

/**
 * Schema metadata for validation and documentation
 */
export const STORE_LOCATION_SCHEMA_METADATA = {
  tableName: 'store_locations',
  primaryKey: 'id',
  uniqueColumns: ['code'],
  requiredColumns: ['name', 'code', 'address', 'city', 'country'],
  isolationColumns: ISOLATION_COLUMNS,
  entityColumnMap: ENTITY_TO_COLUMN_MAP,
  constraints: SCHEMA_CONSTRAINTS,
  defaults: STORE_LOCATION_DEFAULTS,
} as const;

