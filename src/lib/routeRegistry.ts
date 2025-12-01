/**
 * Centralized Route Registry
 * 
 * This file contains all route definitions for the application.
 * Routes defined here are automatically available in global search.
 * 
 * ✨ HOW TO ADD A NEW PAGE:
 * 
 * When you create a new page/route in your app, simply add it to the APP_ROUTES array below.
 * The route will automatically appear in global search without any additional code changes!
 * 
 * Example:
 * ```typescript
 * {
 *   id: 'my-new-page',                    // Unique identifier
 *   path: '/my-new-page',                  // Route path (must match App.tsx)
 *   title: 'My New Page',                  // Display name in search
 *   description: 'Description of the page', // Help text in search
 *   icon: '🎯',                            // Emoji icon
 *   category: 'main',                      // Optional: 'main' | 'lats' | 'admin' | 'sms' | 'employee' | 'tools' | 'data'
 *   allowedRoles: ['admin', 'manager']     // Optional: array of roles that can access this page
 * }
 * ```
 * 
 * That's it! The page will automatically be searchable in global search (Ctrl+K).
 */

export interface RouteDefinition {
  id: string;
  path: string;
  title: string;
  description: string;
  icon: string;
  allowedRoles?: string[];
  category?: 'main' | 'lats' | 'admin' | 'sms' | 'employee' | 'tools' | 'data';
}

/**
 * All application routes with metadata
 * Routes are automatically included in global search
 */
export const APP_ROUTES: RouteDefinition[] = [
  // Main Pages
  {
    id: 'dashboard',
    path: '/dashboard',
    title: 'Dashboard',
    description: 'View overview and analytics',
    icon: '📊',
    category: 'main',
    allowedRoles: ['admin', 'customer-care', 'technician', 'manager']
  },
  {
    id: 'devices',
    path: '/devices',
    title: 'Devices',
    description: 'Manage repair devices',
    icon: '📱',
    category: 'main',
    allowedRoles: ['admin', 'customer-care', 'technician']
  },
  {
    id: 'customers',
    path: '/customers',
    title: 'Customers',
    description: 'Manage customer information',
    icon: '👥',
    category: 'main',
    allowedRoles: ['admin', 'customer-care']
  },
  {
    id: 'pos',
    path: '/pos',
    title: 'Point of Sale',
    description: 'New sale transaction',
    icon: '💰',
    category: 'main',
    allowedRoles: ['admin', 'customer-care']
  },
  {
    id: 'settings',
    path: '/settings',
    title: 'Settings',
    description: 'Application settings',
    icon: '⚙️',
    category: 'main',
    allowedRoles: ['admin', 'customer-care', 'technician', 'manager']
  },

  // LATS Module Pages
  {
    id: 'lats-dashboard',
    path: '/lats',
    title: 'LATS Dashboard',
    description: 'LATS module dashboard',
    icon: '📊',
    category: 'lats',
    allowedRoles: ['admin']
  },
  {
    id: 'inventory',
    path: '/lats/unified-inventory',
    title: 'Inventory',
    description: 'Manage product inventory',
    icon: '📦',
    category: 'lats',
    allowedRoles: ['admin']
  },
  {
    id: 'inventory-management',
    path: '/lats/inventory-management',
    title: 'Inventory Management',
    description: 'Advanced inventory management',
    icon: '📦',
    category: 'lats',
    allowedRoles: ['admin']
  },
  {
    id: 'storage-rooms',
    path: '/lats/storage-rooms',
    title: 'Storage Rooms',
    description: 'Manage storage locations',
    icon: '🏢',
    category: 'lats',
    allowedRoles: ['admin']
  },
  {
    id: 'spare-parts',
    path: '/lats/spare-parts',
    title: 'Spare Parts',
    description: 'Manage spare parts inventory',
    icon: '🔧',
    category: 'lats',
    allowedRoles: ['admin', 'technician']
  },
  {
    id: 'stock-transfers',
    path: '/lats/stock-transfers',
    title: 'Stock Transfers',
    description: 'Transfer stock between locations',
    icon: '📤',
    category: 'lats',
    allowedRoles: ['admin']
  },
  {
    id: 'sales',
    path: '/lats/sales-reports',
    title: 'Sales Reports',
    description: 'View sales history and reports',
    icon: '📈',
    category: 'lats',
    allowedRoles: ['admin', 'customer-care']
  },
  {
    id: 'loyalty',
    path: '/lats/loyalty',
    title: 'Loyalty Management',
    description: 'Customer loyalty programs',
    icon: '🎁',
    category: 'lats',
    allowedRoles: ['admin']
  },
  {
    id: 'purchase-orders',
    path: '/lats/purchase-orders',
    title: 'Purchase Orders',
    description: 'Manage supplier orders',
    icon: '🛒',
    category: 'lats',
    allowedRoles: ['admin']
  },
  {
    id: 'create-purchase-order',
    path: '/lats/purchase-order/create',
    title: 'Create Purchase Order',
    description: 'Create new purchase order',
    icon: '➕',
    category: 'lats',
    allowedRoles: ['admin']
  },
  {
    id: 'shipped-items',
    path: '/lats/purchase-orders/shipped-items',
    title: 'Shipped Items',
    description: 'View shipped purchase order items',
    icon: '📦',
    category: 'lats',
    allowedRoles: ['admin']
  },
  {
    id: 'trade-in',
    path: '/lats/trade-in/management',
    title: 'Trade-In Management',
    description: 'Manage trade-in transactions',
    icon: '🔄',
    category: 'lats',
    allowedRoles: ['admin']
  },

  // Reports & Analytics
  {
    id: 'admin-reports',
    path: '/admin/reports',
    title: 'Admin Reports',
    description: 'Administrative reports',
    icon: '📊',
    category: 'admin',
    allowedRoles: ['admin', 'manager']
  },

  // Customer Management
  {
    id: 'customer-update',
    path: '/customers/update',
    title: 'Customer Data Update',
    description: 'Update customer information',
    icon: '👤',
    category: 'main',
    allowedRoles: ['admin']
  },
  {
    id: 'new-device',
    path: '/devices/new',
    title: 'New Device',
    description: 'Add new repair device',
    icon: '📱',
    category: 'main',
    allowedRoles: ['admin', 'customer-care']
  },

  // SMS Module
  {
    id: 'sms-control',
    path: '/sms',
    title: 'SMS Control Center',
    description: 'SMS management and control',
    icon: '💬',
    category: 'sms',
    allowedRoles: ['admin', 'customer-care']
  },
  {
    id: 'bulk-sms',
    path: '/sms/bulk',
    title: 'Bulk SMS',
    description: 'Send bulk SMS messages',
    icon: '📨',
    category: 'sms',
    allowedRoles: ['admin', 'customer-care']
  },
  {
    id: 'sms-logs',
    path: '/sms/logs',
    title: 'SMS Logs',
    description: 'View SMS message logs',
    icon: '📋',
    category: 'sms',
    allowedRoles: ['admin', 'customer-care']
  },
  {
    id: 'sms-settings',
    path: '/sms/settings',
    title: 'SMS Settings',
    description: 'Configure SMS settings',
    icon: '⚙️',
    category: 'sms',
    allowedRoles: ['admin']
  },

  // Appointments & Reminders
  {
    id: 'appointments',
    path: '/appointments',
    title: 'Appointments',
    description: 'Manage appointments',
    icon: '📅',
    category: 'main',
    allowedRoles: ['admin', 'customer-care', 'technician']
  },
  {
    id: 'reminders',
    path: '/reminders',
    title: 'Reminders',
    description: 'Manage reminders',
    icon: '⏰',
    category: 'main',
    allowedRoles: ['admin', 'customer-care', 'technician']
  },

  // Special Orders & Installments
  {
    id: 'special-orders',
    path: '/special-orders',
    title: 'Special Orders',
    description: 'Manage special orders',
    icon: '📝',
    category: 'main',
    allowedRoles: ['admin', 'sales', 'manager', 'customer-care']
  },
  {
    id: 'installments',
    path: '/installments',
    title: 'Installments',
    description: 'Manage installment plans',
    icon: '💳',
    category: 'main',
    allowedRoles: ['admin', 'sales', 'manager', 'customer-care']
  },

  // Employee Management
  {
    id: 'employees',
    path: '/employees',
    title: 'Employees',
    description: 'Manage employees',
    icon: '👨‍💼',
    category: 'employee',
    allowedRoles: ['admin', 'manager']
  },
  {
    id: 'my-attendance',
    path: '/my-attendance',
    title: 'My Attendance',
    description: 'View your attendance',
    icon: '✅',
    category: 'employee',
    allowedRoles: ['admin', 'customer-care', 'technician', 'manager', 'sales']
  },

  // Admin & Settings
  {
    id: 'admin-settings',
    path: '/admin-settings',
    title: 'Admin Settings',
    description: 'Administrative settings',
    icon: '⚙️',
    category: 'admin',
    allowedRoles: ['admin']
  },
  {
    id: 'user-management',
    path: '/users',
    title: 'User Management',
    description: 'Manage users and permissions',
    icon: '👥',
    category: 'admin',
    allowedRoles: ['admin']
  },
  {
    id: 'integration-settings',
    path: '/integration-settings',
    title: 'Integration Settings',
    description: 'Configure integrations',
    icon: '🔗',
    category: 'admin',
    allowedRoles: ['admin']
  },
  {
    id: 'integrations-test',
    path: '/integrations-test',
    title: 'Integrations Test',
    description: 'Test integrations',
    icon: '🧪',
    category: 'admin',
    allowedRoles: ['admin']
  },

  // Payment & Expenses
  {
    id: 'payments',
    path: '/payments',
    title: 'Payments',
    description: 'Track payment transactions',
    icon: '💳',
    category: 'main',
    allowedRoles: ['admin']
  },
  {
    id: 'expenses',
    path: '/expenses',
    title: 'Expenses',
    description: 'Manage expenses',
    icon: '💰',
    category: 'main',
    allowedRoles: ['admin']
  },

  // Category & Location Management
  {
    id: 'category-management',
    path: '/category-management',
    title: 'Category Management',
    description: 'Manage product categories',
    icon: '📂',
    category: 'admin',
    allowedRoles: ['admin']
  },
  {
    id: 'store-locations',
    path: '/store-locations',
    title: 'Store Locations',
    description: 'Manage store locations',
    icon: '📍',
    category: 'admin',
    allowedRoles: ['admin']
  },
  {
    id: 'supplier-management',
    path: '/supplier-management',
    title: 'Supplier Management',
    description: 'Manage suppliers',
    icon: '🏪',
    category: 'admin',
    allowedRoles: ['admin']
  },
  {
    id: 'suppliers',
    path: '/lats/purchase-orders/suppliers',
    title: 'Suppliers',
    description: 'Manage suppliers',
    icon: '🏪',
    category: 'lats',
    allowedRoles: ['admin']
  },

  // Data Import/Export
  {
    id: 'excel-import',
    path: '/excel-import',
    title: 'Excel Import',
    description: 'Import data from Excel',
    icon: '📥',
    category: 'data',
    allowedRoles: ['admin']
  },
  {
    id: 'excel-templates',
    path: '/excel-templates',
    title: 'Excel Templates',
    description: 'Download Excel templates',
    icon: '📄',
    category: 'data',
    allowedRoles: ['admin']
  },
  {
    id: 'customer-import',
    path: '/customers/import',
    title: 'Customer Import',
    description: 'Import customers from Excel',
    icon: '📥',
    category: 'data',
    allowedRoles: ['admin']
  },

  // Tools & Utilities
  {
    id: 'ad-generator',
    path: '/ad-generator',
    title: 'Product Ad Generator',
    description: 'Generate product advertisements',
    icon: '🎨',
    category: 'tools',
    allowedRoles: ['admin']
  },
  {
    id: 'bluetooth-printer',
    path: '/bluetooth-printer',
    title: 'Bluetooth Printer',
    description: 'Configure Bluetooth printer',
    icon: '🖨️',
    category: 'tools',
    allowedRoles: ['admin', 'customer-care']
  },
];

/**
 * Get routes filtered by user role
 */
export function getRoutesForRole(userRole: string): RouteDefinition[] {
  return APP_ROUTES.filter(route => {
    // If no allowedRoles specified, allow all authenticated users
    if (!route.allowedRoles || route.allowedRoles.length === 0) {
      return true;
    }
    return route.allowedRoles.includes(userRole);
  });
}

/**
 * Search routes by query
 */
export function searchRoutes(query: string, userRole: string): RouteDefinition[] {
  const filteredRoutes = getRoutesForRole(userRole);
  const lowerQuery = query.toLowerCase().trim();
  
  if (!lowerQuery) {
    return filteredRoutes;
  }

  return filteredRoutes.filter(route => {
    const searchableText = `${route.title} ${route.description} ${route.path}`.toLowerCase();
    return searchableText.includes(lowerQuery);
  });
}

/**
 * Get route by path
 */
export function getRouteByPath(path: string): RouteDefinition | undefined {
  return APP_ROUTES.find(route => route.path === path);
}

/**
 * Get route by id
 */
export function getRouteById(id: string): RouteDefinition | undefined {
  return APP_ROUTES.find(route => route.id === id);
}

