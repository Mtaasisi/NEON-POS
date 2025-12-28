/**
 * Permission Utility Functions
 * 
 * This module provides comprehensive permission checking that works with BOTH:
 * 1. User-specific permissions from their profile (user.permissions array)
 * 2. Role-based permissions as a fallback
 * 
 * This ensures that if permissions are set in a user's profile, they are respected,
 * otherwise the system falls back to role-based permissions.
 */

// Map of permission strings to permission categories
export const PERMISSION_MAP = {
  // General permissions
  all: 'all',
  
  // Device permissions
  view_devices: 'devices',
  add_device: 'devices',
  edit_device: 'devices',
  delete_device: 'devices',
  update_device_status: 'devices',
  assign_devices: 'devices',
  
  // Customer permissions
  view_customers: 'customers',
  create_customers: 'customers',
  edit_customers: 'customers',
  delete_customers: 'customers',
  
  // Inventory permissions
  view_inventory: 'inventory',
  add_products: 'inventory',
  edit_products: 'inventory',
  delete_products: 'inventory',
  adjust_stock: 'inventory',
  view_stock_history: 'inventory',
  
  // POS permissions
  access_pos: 'pos',
  process_sales: 'pos',
  process_refunds: 'pos',
  apply_discounts: 'pos',
  
  // Reports permissions
  view_reports: 'reports',
  view_financial_reports: 'reports',
  daily_close: 'reports',
  
  // Settings permissions
  view_settings: 'settings',
  edit_settings: 'settings',
  manage_users: 'settings',
  
  // Purchase orders
  view_purchase_orders: 'purchase_orders',
  create_purchase_orders: 'purchase_orders',
  edit_purchase_orders: 'purchase_orders',
  delete_purchase_orders: 'purchase_orders',
  approve_purchase_orders: 'purchase_orders',
  
  // Spare parts
  view_spare_parts: 'spare_parts',
  create_spare_parts: 'spare_parts',
  edit_spare_parts: 'spare_parts',
  delete_spare_parts: 'spare_parts'
} as const;

// Permission categories with their required permissions
export const PERMISSION_CATEGORIES = {
  devices: ['view_devices', 'add_device', 'edit_device', 'delete_device', 'update_device_status', 'assign_devices'],
  customers: ['view_customers', 'create_customers', 'edit_customers', 'delete_customers'],
  inventory: ['view_inventory', 'add_products', 'edit_products', 'delete_products', 'adjust_stock', 'view_stock_history'],
  pos: ['access_pos', 'process_sales', 'process_refunds', 'apply_discounts'],
  reports: ['view_reports', 'view_financial_reports', 'daily_close'],
  settings: ['view_settings', 'edit_settings', 'manage_users'],
  purchase_orders: ['view_purchase_orders', 'create_purchase_orders', 'edit_purchase_orders', 'delete_purchase_orders', 'approve_purchase_orders'],
  spare_parts: ['view_spare_parts', 'create_spare_parts', 'edit_spare_parts', 'delete_spare_parts']
} as const;

// Role-based default permissions (fallback when user.permissions is not set)
export const ROLE_PERMISSIONS = {
  admin: ['all'],
  manager: ['all'],
  'customer-care': [
    'view_devices', 'add_device', 'edit_device', 'assign_devices',
    'view_customers', 'create_customers', 'edit_customers',
    'access_pos', 'process_sales', 'apply_discounts',
    'view_reports'
  ],
  technician: [
    'view_devices', 'update_device_status',
    'view_customers',
    'view_inventory', 'view_stock_history',
    'view_spare_parts'
  ],
  sales: [
    'view_customers', 'create_customers', 'edit_customers',
    'access_pos', 'process_sales', 'apply_discounts',
    'view_reports'
  ],
  'store-keeper': [
    'view_inventory',
    'view_stock_history',
    'adjust_stock',
    'view_purchase_orders',
    'edit_purchase_orders', // For receiving stock
    'view_reports' // Inventory reports only
  ],
  user: [
    'view_devices', 'view_customers'
  ]
} as const;

// Route permission map - maps routes to required permissions
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/lats/pos': ['access_pos'],
  '/lats/inventory/management': ['view_inventory', 'edit_settings'],
  '/lats/inventory/new': ['add_products'],
  '/lats/inventory/products': ['view_inventory'],
  '/lats/inventory/products/:id/edit': ['edit_products'],
  '/lats/inventory/purchase-orders': ['view_purchase_orders'],
  '/lats/inventory/purchase-orders/new': ['create_purchase_orders'],
  '/lats/inventory/stock-transfer': ['view_inventory', 'adjust_stock'],
  '/lats/add-product': ['add_products'],
  '/lats/spare-parts': ['view_spare_parts'],
  '/lats/reports': ['view_reports'],
  '/lats/sales-reports': ['view_reports'],
  '/settings': ['view_settings'],
  '/admin': ['manage_users'],
  '/users': ['manage_users']
};

/**
 * Check if a user has a specific permission
 * 
 * @param user - The user object with role and permissions
 * @param requiredPermission - The permission to check (e.g., 'view_devices', 'edit_products')
 * @returns boolean - true if user has the permission
 */
export function hasPermission(user: any, requiredPermission: string): boolean {
  if (!user) return false;
  
  // Get user's permissions - either from their profile or from their role
  const userPermissions = getUserPermissions(user);
  
  // Check if user has 'all' permission (admin)
  if (userPermissions.includes('all')) {
    return true;
  }
  
  // Check if user has the specific permission
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }
  
  // Check if user has category-level permission
  // For example, if they have 'inventory' permission, they can do all inventory actions
  const category = PERMISSION_MAP[requiredPermission as keyof typeof PERMISSION_MAP];
  if (category && userPermissions.includes(category)) {
    return true;
  }
  
  return false;
}

/**
 * Check if a user has ANY of the specified permissions
 * 
 * @param user - The user object
 * @param permissions - Array of permissions to check
 * @returns boolean - true if user has at least one of the permissions
 */
export function hasAnyPermission(user: any, permissions: string[]): boolean {
  if (!user || !permissions || permissions.length === 0) return false;
  
  return permissions.some(permission => hasPermission(user, permission));
}

/**
 * Check if a user has ALL of the specified permissions
 * 
 * @param user - The user object
 * @param permissions - Array of permissions to check
 * @returns boolean - true if user has all the permissions
 */
export function hasAllPermissions(user: any, permissions: string[]): boolean {
  if (!user || !permissions || permissions.length === 0) return false;
  
  return permissions.every(permission => hasPermission(user, permission));
}

/**
 * Check if a user can access a specific route
 * 
 * @param user - The user object
 * @param path - The route path to check
 * @returns boolean - true if user can access the route
 */
export function canAccessRoute(user: any, path: string): boolean {
  if (!user) return false;
  
  // Admin always has access
  if (hasPermission(user, 'all')) {
    return true;
  }
  
  // Find matching route permission
  for (const [routePath, requiredPermissions] of Object.entries(ROUTE_PERMISSIONS)) {
    // Check for exact match or pattern match
    const routePattern = routePath.replace(/:\w+/g, '[^/]+');
    const regex = new RegExp(`^${routePattern}$`);
    
    if (regex.test(path)) {
      // User needs at least one of the required permissions
      return hasAnyPermission(user, requiredPermissions);
    }
  }
  
  // If no specific permission is defined for this route, allow access
  return true;
}

/**
 * Get all permissions for a user (from profile or role-based fallback)
 * 
 * @param user - The user object
 * @returns string[] - Array of permission strings
 */
export function getUserPermissions(user: any): string[] {
  if (!user) return [];
  
  // First, check if user has permissions array in their profile
  if (user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions;
  }
  
  // Fallback to role-based permissions
  const role = user.role as keyof typeof ROLE_PERMISSIONS;
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user;
}

/**
 * Check if a user has a specific role
 * 
 * @param user - The user object
 * @param roles - Role or array of roles to check
 * @returns boolean - true if user has the role
 */
export function hasRole(user: any, roles: string | string[]): boolean {
  if (!user || !user.role) return false;
  
  const roleArray = Array.isArray(roles) ? roles : [roles];
  return roleArray.includes(user.role);
}

/**
 * Check if user has permission based on role OR permissions
 * This is the most flexible check that respects both systems
 * 
 * @param user - The user object
 * @param options - Object with optional role and permission requirements
 * @returns boolean - true if user meets the requirements
 */
export function checkAccess(user: any, options: {
  roles?: string[];
  permissions?: string[];
  requireAll?: boolean; // If true, requires ALL permissions, otherwise ANY
}): boolean {
  if (!user) return false;
  
  const { roles, permissions, requireAll = false } = options;
  
  // Check role-based access
  if (roles && roles.length > 0) {
    if (hasRole(user, roles)) {
      return true;
    }
  }
  
  // Check permission-based access
  if (permissions && permissions.length > 0) {
    if (requireAll) {
      return hasAllPermissions(user, permissions);
    } else {
      return hasAnyPermission(user, permissions);
    }
  }
  
  // If no requirements specified, deny access
  return false;
}

/**
 * Helper function to check common permission patterns
 */
export const Permission = {
  // Device permissions
  canViewDevices: (user: any) => hasPermission(user, 'view_devices'),
  canAddDevice: (user: any) => hasPermission(user, 'add_device'),
  canEditDevice: (user: any) => hasPermission(user, 'edit_device'),
  canDeleteDevice: (user: any) => hasPermission(user, 'delete_device'),
  canUpdateDeviceStatus: (user: any) => hasPermission(user, 'update_device_status'),
  
  // Customer permissions
  canViewCustomers: (user: any) => hasPermission(user, 'view_customers'),
  canCreateCustomers: (user: any) => hasPermission(user, 'create_customers'),
  canEditCustomers: (user: any) => hasPermission(user, 'edit_customers'),
  canDeleteCustomers: (user: any) => hasPermission(user, 'delete_customers'),
  
  // Inventory permissions
  canViewInventory: (user: any) => hasPermission(user, 'view_inventory'),
  canAddProducts: (user: any) => hasPermission(user, 'add_products'),
  canEditProducts: (user: any) => hasPermission(user, 'edit_products'),
  canDeleteProducts: (user: any) => hasPermission(user, 'delete_products'),
  canAdjustStock: (user: any) => hasPermission(user, 'adjust_stock'),
  
  // POS permissions
  canAccessPOS: (user: any) => hasPermission(user, 'access_pos'),
  canProcessSales: (user: any) => hasPermission(user, 'process_sales'),
  canProcessRefunds: (user: any) => hasPermission(user, 'process_refunds'),
  canApplyDiscounts: (user: any) => hasPermission(user, 'apply_discounts'),
  
  // Reports permissions
  canViewReports: (user: any) => hasPermission(user, 'view_reports'),
  canViewFinancialReports: (user: any) => hasPermission(user, 'view_financial_reports'),
  canCloseDailySales: (user: any) => hasPermission(user, 'daily_close'),
  
  // Settings permissions
  canViewSettings: (user: any) => hasPermission(user, 'view_settings'),
  canEditSettings: (user: any) => hasPermission(user, 'edit_settings'),
  canManageUsers: (user: any) => hasPermission(user, 'manage_users'),
  
  // Purchase orders
  canViewPurchaseOrders: (user: any) => hasPermission(user, 'view_purchase_orders'),
  canCreatePurchaseOrders: (user: any) => hasPermission(user, 'create_purchase_orders'),
  canEditPurchaseOrders: (user: any) => hasPermission(user, 'edit_purchase_orders'),
  canApprovePurchaseOrders: (user: any) => hasPermission(user, 'approve_purchase_orders'),
  
  // Admin check
  isAdmin: (user: any) => hasPermission(user, 'all') || hasRole(user, ['admin', 'manager'])
};

