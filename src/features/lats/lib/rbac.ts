// Role-Based Access Control (RBAC) utility for LATS module
import { hasPermission as checkUserPermission, hasRole as checkUserRole } from '../../../lib/permissionUtils';

export type UserRole = 'admin' | 'customer-care' | 'technician' | 'viewer' | 'store-keeper';

export interface Permission {
  resource: string;
  action: string;
  roles: UserRole[];
}

export interface RoutePermission {
  path: string;
  roles: UserRole[];
  exact?: boolean;
}

export interface User {
  role: string;
  permissions?: string[];
}

// Define permissions for LATS module
const LATS_PERMISSIONS: Permission[] = [
  // Inventory Management
  { resource: 'inventory', action: 'view', roles: ['admin', 'customer-care', 'technician', 'store-keeper'] },
  { resource: 'inventory', action: 'create', roles: ['admin'] },
  { resource: 'inventory', action: 'edit', roles: ['admin'] },
  { resource: 'inventory', action: 'delete', roles: ['admin'] },
  { resource: 'inventory', action: 'manage', roles: ['admin'] },

  // Categories
  { resource: 'categories', action: 'view', roles: ['admin', 'customer-care', 'technician', 'store-keeper'] },
  { resource: 'categories', action: 'create', roles: ['admin'] },
  { resource: 'categories', action: 'edit', roles: ['admin'] },
  { resource: 'categories', action: 'delete', roles: ['admin'] },

  // Brands
  { resource: 'brands', action: 'view', roles: ['admin', 'customer-care', 'technician', 'store-keeper'] },
  { resource: 'brands', action: 'create', roles: ['admin'] },
  { resource: 'brands', action: 'edit', roles: ['admin'] },
  { resource: 'brands', action: 'delete', roles: ['admin'] },

  // Suppliers
  { resource: 'suppliers', action: 'view', roles: ['admin'] },
  { resource: 'suppliers', action: 'create', roles: ['admin'] },
  { resource: 'suppliers', action: 'edit', roles: ['admin'] },
  { resource: 'suppliers', action: 'delete', roles: ['admin'] },

  // Products
  { resource: 'products', action: 'view', roles: ['admin', 'technician', 'store-keeper'] },
  { resource: 'products', action: 'create', roles: ['admin'] },
  { resource: 'products', action: 'edit', roles: ['admin'] },
  { resource: 'products', action: 'delete', roles: ['admin'] },

  // Stock Management
  { resource: 'stock', action: 'view', roles: ['admin', 'technician', 'store-keeper'] },
  { resource: 'stock', action: 'adjust', roles: ['admin', 'technician', 'store-keeper'] },
  { resource: 'stock', action: 'history', roles: ['admin', 'store-keeper'] },

  // Purchase Orders
  { resource: 'purchase-orders', action: 'view', roles: ['admin', 'store-keeper'] },
  { resource: 'purchase-orders', action: 'create', roles: ['admin'] },
  { resource: 'purchase-orders', action: 'edit', roles: ['admin', 'store-keeper'] },
  { resource: 'purchase-orders', action: 'delete', roles: ['admin'] },
  { resource: 'purchase-orders', action: 'receive', roles: ['admin', 'store-keeper'] },

  // Spare Parts
  { resource: 'spare-parts', action: 'view', roles: ['admin', 'technician'] },
  { resource: 'spare-parts', action: 'create', roles: ['admin'] },
  { resource: 'spare-parts', action: 'edit', roles: ['admin'] },
  { resource: 'spare-parts', action: 'delete', roles: ['admin'] },
  { resource: 'spare-parts', action: 'use', roles: ['admin', 'technician'] },

  // POS
  { resource: 'pos', action: 'view', roles: ['admin', 'customer-care'] },
  { resource: 'pos', action: 'sell', roles: ['admin', 'customer-care'] },
  { resource: 'pos', action: 'refund', roles: ['admin'] },
  { resource: 'pos', action: 'void', roles: ['admin'] },

  // POS Inventory
  { resource: 'pos-inventory', action: 'view', roles: ['admin', 'customer-care'] },
  { resource: 'pos-inventory', action: 'search', roles: ['admin', 'customer-care'] },
  { resource: 'pos-inventory', action: 'add-to-cart', roles: ['admin', 'customer-care'] },

  // Sales
  { resource: 'sales', action: 'view', roles: ['admin', 'customer-care'] },
  { resource: 'sales', action: 'create', roles: ['admin', 'customer-care'] },
  { resource: 'sales', action: 'edit', roles: ['admin'] },
  { resource: 'sales', action: 'delete', roles: ['admin'] },
  { resource: 'sales', action: 'refund', roles: ['admin'] },

  // Reports
  { resource: 'reports', action: 'view', roles: ['admin', 'customer-care', 'store-keeper'] },
  { resource: 'reports', action: 'export', roles: ['admin', 'customer-care', 'store-keeper'] },
  { resource: 'reports', action: 'daily-close', roles: ['admin', 'customer-care'] },

  // Analytics
  { resource: 'analytics', action: 'view', roles: ['admin'] },
  { resource: 'analytics', action: 'export', roles: ['admin'] },

  // Settings
  { resource: 'settings', action: 'view', roles: ['admin'] },
  { resource: 'settings', action: 'edit', roles: ['admin'] },

  // System
  { resource: 'system', action: 'admin', roles: ['admin'] },
  { resource: 'system', action: 'debug', roles: ['admin'] }
];

// Define route permissions
const LATS_ROUTE_PERMISSIONS: RoutePermission[] = [
  // Inventory routes
  { path: '/lats/inventory/management', roles: ['admin'] },
  { path: '/lats/inventory/new', roles: ['admin'] },
  { path: '/lats/inventory/products', roles: ['admin', 'technician', 'store-keeper'] },
  { path: '/lats/inventory/products/:id/edit', roles: ['admin'] },
  { path: '/lats/inventory/purchase-orders', roles: ['admin', 'store-keeper'] },
  { path: '/lats/inventory/purchase-orders/new', roles: ['admin'] },

  // Product routes
  { path: '/lats/add-product', roles: ['admin'] },

  // Spare parts routes
  { path: '/lats/spare-parts', roles: ['admin', 'technician'] },

  // POS routes
  { path: '/lats/pos-inventory', roles: ['admin', 'customer-care'] },
  { path: '/lats/pos', roles: ['admin', 'customer-care'] }
];

class RBACManager {
  private permissions: Permission[] = LATS_PERMISSIONS;
  private routePermissions: RoutePermission[] = LATS_ROUTE_PERMISSIONS;

  /**
   * Check if a user has permission for a specific resource and action
   * Now supports both role-based and user permission checking
   */
  can(userRole: UserRole, resource: string, action: string): boolean {
    const permission = this.permissions.find(
      p => p.resource === resource && p.action === action
    );

    if (!permission) {
      return false;
    }

    return permission.roles.includes(userRole);
  }

  /**
   * Check if a user object has permission for a specific resource and action
   * This checks BOTH user.permissions array AND role-based permissions
   */
  canUser(user: User | any, resource: string, action: string): boolean {
    if (!user) return false;

    // Map resource and action to permission strings
    const permissionMap: Record<string, Record<string, string>> = {
      'inventory': {
        'view': 'view_inventory',
        'create': 'add_products',
        'edit': 'edit_products',
        'delete': 'delete_products',
        'manage': 'edit_settings'
      },
      'products': {
        'view': 'view_inventory',
        'create': 'add_products',
        'edit': 'edit_products',
        'delete': 'delete_products'
      },
      'pos': {
        'view': 'access_pos',
        'sell': 'process_sales',
        'refund': 'process_refunds',
        'void': 'process_refunds'
      },
      'pos-inventory': {
        'view': 'view_inventory',
        'search': 'view_inventory',
        'add-to-cart': 'access_pos'
      },
      'sales': {
        'view': 'view_reports',
        'create': 'process_sales',
        'edit': 'process_sales',
        'delete': 'process_sales',
        'refund': 'process_refunds'
      },
      'reports': {
        'view': 'view_reports',
        'export': 'view_reports',
        'daily-close': 'daily_close'
      },
      'settings': {
        'view': 'view_settings',
        'edit': 'edit_settings'
      },
      'purchase-orders': {
        'view': 'view_purchase_orders',
        'create': 'create_purchase_orders',
        'edit': 'edit_purchase_orders',
        'delete': 'delete_purchase_orders',
        'receive': 'edit_purchase_orders'
      },
      'spare-parts': {
        'view': 'view_spare_parts',
        'create': 'create_spare_parts',
        'edit': 'edit_spare_parts',
        'delete': 'delete_spare_parts',
        'use': 'view_spare_parts'
      },
      'categories': {
        'view': 'view_inventory',
        'create': 'add_products',
        'edit': 'edit_products',
        'delete': 'delete_products'
      },
      'suppliers': {
        'view': 'view_inventory',
        'create': 'add_products',
        'edit': 'edit_products',
        'delete': 'delete_products'
      },
      'stock': {
        'view': 'view_inventory',
        'adjust': 'adjust_stock',
        'history': 'view_stock_history'
      },
      'analytics': {
        'view': 'view_financial_reports',
        'export': 'view_financial_reports'
      }
    };

    // Get the permission string for this resource/action
    const permissionString = permissionMap[resource]?.[action];
    
    // Check user permissions first (from their profile)
    if (permissionString && checkUserPermission(user, permissionString)) {
      return true;
    }

    // Fallback to role-based check
    return this.can(user.role as UserRole, resource, action);
  }

  /**
   * Check if a user can access a specific route (role-based)
   */
  canAccessRoute(userRole: UserRole, path: string): boolean {
    // Find matching route permission
    const routePermission = this.routePermissions.find(route => {
      if (route.exact) {
        return route.path === path;
      }
      
      // For non-exact matches, check if the path starts with the route path
      return path.startsWith(route.path);
    });

    if (!routePermission) {
      // If no specific permission is defined, allow access
      return true;
    }

    return routePermission.roles.includes(userRole);
  }

  /**
   * Check if a user object can access a specific route (supports user.permissions)
   */
  canUserAccessRoute(user: User | any, path: string): boolean {
    if (!user) return false;

    // Map routes to permission requirements
    const routePermissionMap: Record<string, string> = {
      '/lats/pos': 'access_pos',
      '/lats/inventory/management': 'edit_settings',
      '/lats/inventory/new': 'add_products',
      '/lats/inventory/products': 'view_inventory',
      '/lats/inventory/products/:id/edit': 'edit_products',
      '/lats/inventory/purchase-orders': 'view_purchase_orders',
      '/lats/inventory/purchase-orders/new': 'create_purchase_orders',
      '/lats/add-product': 'add_products',
      '/lats/spare-parts': 'view_spare_parts',
      '/lats/pos-inventory': 'view_inventory'
    };

    // Check for pattern matches
    for (const [routePath, requiredPermission] of Object.entries(routePermissionMap)) {
      const routePattern = routePath.replace(/:\w+/g, '[^/]+');
      const regex = new RegExp(`^${routePattern}$`);
      
      if (regex.test(path)) {
        if (checkUserPermission(user, requiredPermission)) {
          return true;
        }
      }
    }

    // Fallback to role-based check
    return this.canAccessRoute(user.role as UserRole, path);
  }

  /**
   * Check if a user role has a specific permission
   */
  hasPermission(role: UserRole, resource: string, action: string): boolean {
    const hierarchy = this.getRoleHierarchy();
    const accessibleRoles = hierarchy[role] || [];
    
    return this.permissions.some(permission => 
      permission.resource === resource &&
      permission.action === action &&
      permission.roles.some(r => accessibleRoles.includes(r))
    );
  }

  /**
   * Check if a user object has a specific permission (supports user.permissions)
   * This is the preferred method to use throughout the application
   */
  hasUserPermission(user: User | any, resource: string, action: string): boolean {
    return this.canUser(user, resource, action);
  }

  /**
   * Get all permissions for a specific role
   */
  getRolePermissions(role: UserRole): Permission[] {
    return this.permissions.filter(permission => 
      permission.roles.includes(role)
    );
  }

  /**
   * Get all accessible routes for a specific role
   */
  getAccessibleRoutes(role: UserRole): string[] {
    return this.routePermissions
      .filter(route => route.roles.includes(role))
      .map(route => route.path);
  }

  /**
   * Add a new permission
   */
  addPermission(permission: Permission): void {
    this.permissions.push(permission);
  }

  /**
   * Remove a permission
   */
  removePermission(resource: string, action: string): void {
    this.permissions = this.permissions.filter(
      p => !(p.resource === resource && p.action === action)
    );
  }

  /**
   * Add a new route permission
   */
  addRoutePermission(routePermission: RoutePermission): void {
    this.routePermissions.push(routePermission);
  }

  /**
   * Remove a route permission
   */
  removeRoutePermission(path: string): void {
    this.routePermissions = this.routePermissions.filter(
      r => r.path !== path
    );
  }

  /**
   * Get all available roles
   */
  getAvailableRoles(): UserRole[] {
    return ['admin', 'customer-care', 'technician', 'viewer', 'store-keeper'];
  }

  /**
   * Get role hierarchy (higher roles inherit permissions from lower roles)
   */
  getRoleHierarchy(): Record<UserRole, UserRole[]> {
    return {
      'admin': ['admin', 'customer-care', 'technician', 'viewer', 'store-keeper'],
      'customer-care': ['customer-care', 'viewer'],
      'technician': ['technician', 'viewer'],
      'store-keeper': ['store-keeper', 'viewer'],
      'viewer': ['viewer']
    };
  }

  /**
   * Check if a role has access to another role's permissions
   */
  hasRoleAccess(userRole: UserRole, targetRole: UserRole): boolean {
    const hierarchy = this.getRoleHierarchy();
    return hierarchy[userRole]?.includes(targetRole) || false;
  }

  /**
   * Get all permissions that a role can access (including inherited)
   */
  getAllRolePermissions(role: UserRole): Permission[] {
    const hierarchy = this.getRoleHierarchy();
    const accessibleRoles = hierarchy[role] || [];
    
    return this.permissions.filter(permission => 
      permission.roles.some(r => accessibleRoles.includes(r))
    );
  }

  /**
   * Validate a permission structure
   */
  validatePermission(permission: Permission): boolean {
    return !!(
      permission.resource &&
      permission.action &&
      permission.roles &&
      permission.roles.length > 0 &&
      permission.roles.every(role => this.getAvailableRoles().includes(role))
    );
  }

  /**
   * Validate a route permission structure
   */
  validateRoutePermission(routePermission: RoutePermission): boolean {
    return !!(
      routePermission.path &&
      routePermission.roles &&
      routePermission.roles.length > 0 &&
      routePermission.roles.every(role => this.getAvailableRoles().includes(role))
    );
  }

  /**
   * Get permission summary for a role
   */
  getPermissionSummary(role: UserRole): Record<string, string[]> {
    const permissions = this.getAllRolePermissions(role);
    const summary: Record<string, string[]> = {};

    permissions.forEach(permission => {
      if (!summary[permission.resource]) {
        summary[permission.resource] = [];
      }
      summary[permission.resource].push(permission.action);
    });

    return summary;
  }

  /**
   * Check if a user can perform multiple actions on a resource
   */
  canMultiple(userRole: UserRole, resource: string, actions: string[]): boolean {
    return actions.every(action => this.can(userRole, resource, action));
  }

  /**
   * Get all resources a role can access
   */
  getAccessibleResources(role: UserRole): string[] {
    const permissions = this.getAllRolePermissions(role);
    return [...new Set(permissions.map(p => p.resource))];
  }

  /**
   * Get all actions a role can perform on a specific resource
   */
  getAccessibleActions(role: UserRole, resource: string): string[] {
    const permissions = this.getAllRolePermissions(role);
    return permissions
      .filter(p => p.resource === resource)
      .map(p => p.action);
  }
}

// Export singleton instance
export const rbacManager = new RBACManager();

// Convenience functions
export const allow = (userRole: UserRole, resource: string, action: string): boolean => 
  rbacManager.can(userRole, resource, action);

export const allowRoute = (userRole: UserRole, path: string): boolean => 
  rbacManager.canAccessRoute(userRole, path);

export const getRolePermissions = (role: UserRole): Permission[] => 
  rbacManager.getRolePermissions(role);

export const getAccessibleRoutes = (role: UserRole): string[] => 
  rbacManager.getAccessibleRoutes(role);

export const getAvailableRoles = (): UserRole[] => 
  rbacManager.getAvailableRoles();

export const hasRoleAccess = (userRole: UserRole, targetRole: UserRole): boolean => 
  rbacManager.hasRoleAccess(userRole, targetRole);

export const getAllRolePermissions = (role: UserRole): Permission[] => 
  rbacManager.getAllRolePermissions(role);

export const getPermissionSummary = (role: UserRole): Record<string, string[]> => 
  rbacManager.getPermissionSummary(role);

export const canMultiple = (userRole: UserRole, resource: string, actions: string[]): boolean => 
  rbacManager.canMultiple(userRole, resource, actions);

export const getAccessibleResources = (role: UserRole): string[] => 
  rbacManager.getAccessibleResources(role);

export const getAccessibleActions = (role: UserRole, resource: string): string[] => 
  rbacManager.getAccessibleActions(role, resource);
