/**
 * Permission-based Widget & UI Visibility Configuration
 *
 * This file defines which widgets, UI elements, and features are visible based on user permissions.
 * Uses the granular permission system instead of just role-based access.
 * Widgets and features are completely hidden (not just disabled) when permissions are restricted.
 */

export type UserRole = 'admin' | 'technician' | 'customer-care' | 'manager' | 'sales' | 'user' | 'store-keeper';

export interface PermissionBasedWidgetVisibility {
  // Charts
  revenueTrendChart: string[]; // Required permissions
  deviceStatusChart: string[];
  appointmentsTrendChart: string[];
  stockLevelChart: string[];
  performanceMetricsChart: string[];
  customerActivityChart: string[];
  salesFunnelChart: string[];
  purchaseOrderChart: string[];
  paymentMethodsChart: string[];
  salesByCategoryChart: string[];
  profitMarginChart: string[];

  // Widgets
  appointmentWidget: string[];
  employeeWidget: string[];
  notificationWidget: string[];
  financialWidget: string[];
  analyticsWidget: string[];
  serviceWidget: string[];
  reminderWidget: string[];
  customerInsightsWidget: string[];
  systemHealthWidget: string[];
  inventoryWidget: string[];
  activityFeedWidget: string[];
  purchaseOrderWidget: string[];
  chatWidget: string[];
  salesWidget: string[];
  topProductsWidget: string[];
  expensesWidget: string[];
  staffPerformanceWidget: string[];
  // New feature widgets
  tradeInWidget: string[];
  installmentsWidget: string[];
  loyaltyWidget: string[];
  smsWidget: string[];
  sparePartsWidget: string[];
  storageRoomsWidget: string[];
  stockTransfersWidget: string[];
  specialOrdersWidget: string[];
  backupWidget: string[];
  repairWidget: string[];
  // AI-powered widgets
  aiInsightsWidget: string[];
  predictiveAnalyticsWidget: string[];
  alertSystemWidget: string[];
}

export interface RoleQuickActionPermissions {
  // Core Business Features
  devices: boolean;
  addDevice: boolean;
  customers: boolean;
  inventory: boolean;
  appointments: boolean;
  purchaseOrders: boolean;
  payments: boolean;
  adGenerator: boolean;
  pos: boolean;
  reports: boolean;
  employees: boolean;
  whatsapp: boolean;
  settings: boolean;
  search: boolean;
  loyalty: boolean;
  backup: boolean;
  
  // SMS & Communication Features
  sms: boolean;
  bulkSms: boolean;
  smsLogs: boolean;
  smsSettings: boolean;
  
  // Import/Export & Data Management
  excelImport: boolean;
  excelTemplates: boolean;
  productExport: boolean;
  customerImport: boolean;
  
  // Advanced System Features
  userManagement: boolean;
  databaseSetup: boolean;
  integrationSettings: boolean;
  integrationsTest: boolean;
  aiTraining: boolean;
  bluetoothPrinter: boolean;
  
  // Business Management
  categoryManagement: boolean;
  supplierManagement: boolean;
  storeLocations: boolean;
  
  // Advanced Analytics & Reports
  reminders: boolean;
  mobile: boolean;
  myAttendance: boolean;
}

/**
 * Permission-based widget visibility configuration
 * Maps widgets to the permissions required to view them
 */
export const PERMISSION_WIDGET_VISIBILITY: PermissionBasedWidgetVisibility = {
  // Charts
  revenueTrendChart: ['view_reports', 'financial_reports'],
  deviceStatusChart: ['view_devices'],
  appointmentsTrendChart: ['appointments'],
  stockLevelChart: ['view_inventory'],
  performanceMetricsChart: ['view_reports'],
  customerActivityChart: ['view_customers'],
  salesFunnelChart: ['view_reports', 'process_sales'],
  purchaseOrderChart: ['view_purchase_orders'],
  paymentMethodsChart: ['view_payments'],
  salesByCategoryChart: ['view_reports', 'process_sales'],
  profitMarginChart: ['financial_reports'],

  // Widgets
  appointmentWidget: ['appointments'],
  employeeWidget: ['employee_management'],
  notificationWidget: ['view_dashboard'], // Basic dashboard access
  financialWidget: ['financial_reports'],
  analyticsWidget: ['view_reports'],
  serviceWidget: ['view_devices'],
  reminderWidget: ['view_dashboard'], // Basic dashboard access
  customerInsightsWidget: ['view_customers'],
  systemHealthWidget: ['view_settings'],
  inventoryWidget: ['view_inventory'],
  activityFeedWidget: ['view_dashboard'], // Basic dashboard access
  purchaseOrderWidget: ['view_purchase_orders'],
  chatWidget: ['whatsapp_integration'],
  salesWidget: ['process_sales'],
  topProductsWidget: ['view_inventory'],
  expensesWidget: ['financial_reports'],
  staffPerformanceWidget: ['employee_management'],
  // New feature widgets
  tradeInWidget: ['view_devices'], // Trade-ins are device related
  installmentsWidget: ['financial_reports'],
  loyaltyWidget: ['loyalty_program'],
  smsWidget: ['sms_features'],
  sparePartsWidget: ['spare_parts'],
  storageRoomsWidget: ['view_inventory'],
  stockTransfersWidget: ['view_inventory'],
  specialOrdersWidget: ['view_inventory'],
  backupWidget: ['backup_data'],
  repairWidget: ['view_devices'],
  // AI-powered widgets
  aiInsightsWidget: ['view_reports'], // AI insights require report access
  predictiveAnalyticsWidget: ['view_reports'], // Predictive analytics requires report access
  alertSystemWidget: ['view_dashboard'], // Basic dashboard access
};

/**
 * Widget permissions for Admin role
 * Admins have access to all widgets
 */
const adminWidgetPermissions: RoleWidgetPermissions = {
  // Charts - All enabled for admin
  revenueTrendChart: true,
  deviceStatusChart: true,
  appointmentsTrendChart: true,
  stockLevelChart: true,
  performanceMetricsChart: true,
  customerActivityChart: true,
  salesFunnelChart: true,
  purchaseOrderChart: true,
  paymentMethodsChart: true,
  salesByCategoryChart: true,
  profitMarginChart: true,
  
  // Widgets - All enabled for admin
  appointmentWidget: true,
  employeeWidget: true,
  notificationWidget: true,
  financialWidget: true,
  analyticsWidget: true,
  serviceWidget: true,
  reminderWidget: true,
  customerInsightsWidget: true,
  systemHealthWidget: true,
  inventoryWidget: true,
  activityFeedWidget: true,
  purchaseOrderWidget: true,
  chatWidget: true,
  salesWidget: true,
  topProductsWidget: true,
  expensesWidget: true,
  staffPerformanceWidget: true,
  // New feature widgets
  tradeInWidget: true,
  installmentsWidget: true,
  loyaltyWidget: true,
  smsWidget: true,
  sparePartsWidget: true,
  storageRoomsWidget: true,
  stockTransfersWidget: true,
  specialOrdersWidget: true,
  backupWidget: true,
  repairWidget: true,
  // AI-powered widgets
  aiInsightsWidget: true,
  predictiveAnalyticsWidget: true,
  alertSystemWidget: true,
};

/**
 * Widget permissions for Technician role
 * Technicians see device-related, service, and performance widgets
 */
const technicianWidgetPermissions: RoleWidgetPermissions = {
  // Charts - Device and performance focused
  revenueTrendChart: false,
  deviceStatusChart: true,
  appointmentsTrendChart: true,
  stockLevelChart: true, // Can see spare parts inventory
  performanceMetricsChart: true,
  customerActivityChart: false,
  salesFunnelChart: false,
  purchaseOrderChart: false,
  paymentMethodsChart: false,
  salesByCategoryChart: false,
  profitMarginChart: false,
  
  // Widgets - Service and operational focused
  appointmentWidget: true,
  employeeWidget: false,
  notificationWidget: true,
  financialWidget: false,
  analyticsWidget: true,
  serviceWidget: true,
  reminderWidget: true,
  customerInsightsWidget: false,
  systemHealthWidget: true,
  inventoryWidget: true, // Spare parts visibility
  activityFeedWidget: true,
  purchaseOrderWidget: false,
  chatWidget: true,
  salesWidget: false,
  topProductsWidget: false,
  expensesWidget: false,
  staffPerformanceWidget: false,
  // New feature widgets
  tradeInWidget: true,
  installmentsWidget: false,
  loyaltyWidget: false,
  smsWidget: false,
  sparePartsWidget: true,
  storageRoomsWidget: true,
  stockTransfersWidget: true,
  specialOrdersWidget: false,
  backupWidget: false,
  repairWidget: true,
  // AI-powered widgets
  aiInsightsWidget: false,
  predictiveAnalyticsWidget: false,
  alertSystemWidget: true,
};

/**
 * Widget permissions for Customer Care role
 * Customer care sees customer-related, appointment, and communication widgets
 */
const customerCareWidgetPermissions: RoleWidgetPermissions = {
  // Charts - Customer and appointment focused
  revenueTrendChart: false,
  deviceStatusChart: true,
  appointmentsTrendChart: true,
  stockLevelChart: false,
  performanceMetricsChart: true,
  customerActivityChart: true,
  salesFunnelChart: false,
  purchaseOrderChart: false,
  paymentMethodsChart: true,
  salesByCategoryChart: false,
  profitMarginChart: false,
  
  // Widgets - Customer service focused
  appointmentWidget: true,
  employeeWidget: false,
  notificationWidget: true,
  financialWidget: false,
  analyticsWidget: true,
  serviceWidget: true,
  reminderWidget: true,
  customerInsightsWidget: true,
  systemHealthWidget: false,
  inventoryWidget: false,
  activityFeedWidget: true,
  purchaseOrderWidget: false,
  chatWidget: true,
  salesWidget: true,
  topProductsWidget: true,
  expensesWidget: false,
  staffPerformanceWidget: false,
};

/**
 * Quick Action permissions for Admin role
 */
const adminQuickActionPermissions: RoleQuickActionPermissions = {
  // All actions enabled for admin
  devices: true,
  addDevice: true,
  customers: true,
  inventory: true,
  appointments: true,
  purchaseOrders: true,
  payments: true,
  adGenerator: true,
  pos: true,
  reports: true,
  employees: true,
  whatsapp: true,
  settings: true,
  search: true,
  loyalty: true,
  backup: true,
  sms: true,
  bulkSms: true,
  smsLogs: true,
  smsSettings: true,
  excelImport: true,
  excelTemplates: true,
  productExport: true,
  customerImport: true,
  userManagement: true,
  databaseSetup: true,
  integrationSettings: true,
  integrationsTest: true,
  aiTraining: true,
  bluetoothPrinter: true,
  categoryManagement: true,
  supplierManagement: true,
  storeLocations: true,
  reminders: true,
  mobile: true,
  myAttendance: true,
};

/**
 * Quick Action permissions for Technician role
 */
const technicianQuickActionPermissions: RoleQuickActionPermissions = {
  // Core Business Features
  devices: true,
  addDevice: true,
  customers: true, // View customers
  inventory: true, // Spare parts access
  appointments: true,
  purchaseOrders: false,
  payments: false,
  adGenerator: false,
  pos: false,
  reports: true, // Own reports
  employees: false,
  whatsapp: true,
  settings: false,
  search: true,
  loyalty: false,
  backup: false,
  
  // SMS & Communication
  sms: true,
  bulkSms: false,
  smsLogs: true,
  smsSettings: false,
  
  // Import/Export
  excelImport: false,
  excelTemplates: false,
  productExport: false,
  customerImport: false,
  
  // Advanced System Features
  userManagement: false,
  databaseSetup: false,
  integrationSettings: false,
  integrationsTest: false,
  aiTraining: false,
  bluetoothPrinter: true,
  
  // Business Management
  categoryManagement: false,
  supplierManagement: false,
  storeLocations: false,
  
  // Advanced Analytics & Reports
  reminders: true,
  mobile: true,
  myAttendance: true,
};

/**
 * Widget permissions for Store Keeper role
 * Store keepers see inventory and stock-related widgets
 */
const storeKeeperWidgetPermissions: RoleWidgetPermissions = {
  // Charts - Inventory and stock focused
  revenueTrendChart: false,
  deviceStatusChart: false,
  appointmentsTrendChart: false,
  stockLevelChart: true, // Core feature
  performanceMetricsChart: false,
  customerActivityChart: false,
  salesFunnelChart: false,
  purchaseOrderChart: true, // Core feature
  paymentMethodsChart: false,
  salesByCategoryChart: false,
  profitMarginChart: false,
  
  // Widgets - Inventory and stock focused
  appointmentWidget: false,
  employeeWidget: false,
  notificationWidget: true,
  financialWidget: false,
  analyticsWidget: false,
  serviceWidget: false,
  reminderWidget: false,
  customerInsightsWidget: false,
  systemHealthWidget: false,
  inventoryWidget: true, // Core feature
  activityFeedWidget: true,
  purchaseOrderWidget: true, // Core feature
  chatWidget: false,
  salesWidget: false,
  topProductsWidget: true, // Useful for inventory management
  expensesWidget: false,
  staffPerformanceWidget: false,
  // New feature widgets
  tradeInWidget: false,
  installmentsWidget: false,
  loyaltyWidget: false,
  smsWidget: false,
  sparePartsWidget: true, // Core feature for store keeper
  storageRoomsWidget: true, // Core feature for store keeper
  stockTransfersWidget: true, // Core feature for store keeper
  specialOrdersWidget: false,
  backupWidget: false,
  repairWidget: false,
  // AI-powered widgets
  aiInsightsWidget: false,
  predictiveAnalyticsWidget: false,
  alertSystemWidget: true,
};

/**
 * Quick Action permissions for Store Keeper role
 */
const storeKeeperQuickActionPermissions: RoleQuickActionPermissions = {
  // Core Business Features
  devices: false,
  addDevice: false,
  customers: false,
  inventory: true, // Core feature
  appointments: false,
  purchaseOrders: true, // Core feature - view and receive
  payments: false,
  adGenerator: false,
  pos: false,
  reports: true, // Inventory reports
  employees: false,
  whatsapp: false,
  settings: false,
  search: true,
  loyalty: false,
  backup: false,
  
  // SMS & Communication
  sms: false,
  bulkSms: false,
  smsLogs: false,
  smsSettings: false,
  
  // Import/Export
  excelImport: false,
  excelTemplates: false,
  productExport: true, // Can export inventory data
  customerImport: false,
  
  // Advanced System Features
  userManagement: false,
  databaseSetup: false,
  integrationSettings: false,
  integrationsTest: false,
  aiTraining: false,
  bluetoothPrinter: false,
  
  // Business Management
  categoryManagement: false,
  supplierManagement: false,
  storeLocations: false,
  
  // Advanced Analytics & Reports
  reminders: false,
  mobile: true,
  myAttendance: true,
};

/**
 * Quick Action permissions for Customer Care role
 */
const customerCareQuickActionPermissions: RoleQuickActionPermissions = {
  // Core Business Features
  devices: true,
  addDevice: true,
  customers: true,
  inventory: false, // Limited inventory access
  appointments: true,
  purchaseOrders: false,
  payments: true,
  adGenerator: false,
  pos: true,
  reports: true,
  employees: false,
  whatsapp: true,
  settings: false,
  search: true,
  loyalty: true,
  backup: false,
  
  // SMS & Communication
  sms: true,
  bulkSms: true,
  smsLogs: true,
  smsSettings: false,
  
  // Import/Export
  excelImport: false,
  excelTemplates: false,
  productExport: false,
  customerImport: true,
  
  // Advanced System Features
  userManagement: false,
  databaseSetup: false,
  integrationSettings: false,
  integrationsTest: false,
  aiTraining: false,
  bluetoothPrinter: true,
  
  // Business Management
  categoryManagement: false,
  supplierManagement: false,
  storeLocations: false,
  
  // Advanced Analytics & Reports
  reminders: true,
  mobile: true,
  myAttendance: true,
};

/**
 * Map of role to widget permissions
 */
export const ROLE_WIDGET_PERMISSIONS: Record<UserRole, RoleWidgetPermissions> = {
  admin: adminWidgetPermissions,
  technician: technicianWidgetPermissions,
  'customer-care': customerCareWidgetPermissions,
  manager: adminWidgetPermissions, // Managers get admin-level access
  sales: customerCareWidgetPermissions, // Sales get customer-care level access
  'store-keeper': storeKeeperWidgetPermissions,
  user: technicianWidgetPermissions, // Default users get technician-level access
};

/**
 * Map of role to quick action permissions
 */
export const ROLE_QUICK_ACTION_PERMISSIONS: Record<UserRole, RoleQuickActionPermissions> = {
  admin: adminQuickActionPermissions,
  technician: technicianQuickActionPermissions,
  'customer-care': customerCareQuickActionPermissions,
  manager: adminQuickActionPermissions, // Managers get admin-level access
  sales: customerCareQuickActionPermissions, // Sales get customer-care level access
  'store-keeper': storeKeeperQuickActionPermissions,
  user: technicianQuickActionPermissions, // Default users get technician-level access
};

/**
 * Get widget permissions for a specific role
 */
export function getRoleWidgetPermissions(role: string): RoleWidgetPermissions {
  const normalizedRole = role as UserRole;
  return ROLE_WIDGET_PERMISSIONS[normalizedRole] || technicianWidgetPermissions;
}

/**
 * Get quick action permissions for a specific role
 */
export function getRoleQuickActionPermissions(role: string): RoleQuickActionPermissions {
  const normalizedRole = role as UserRole;
  return ROLE_QUICK_ACTION_PERMISSIONS[normalizedRole] || technicianQuickActionPermissions;
}

/**
 * Check if a widget is allowed for a specific role
 */
export function isWidgetAllowedForRole(
  widget: keyof RoleWidgetPermissions,
  role: string
): boolean {
  const permissions = getRoleWidgetPermissions(role);
  return permissions[widget] ?? false;
}

/**
 * Check if a quick action is allowed for a specific role
 */
export function isQuickActionAllowedForRole(
  action: keyof RoleQuickActionPermissions,
  role: string
): boolean {
  const permissions = getRoleQuickActionPermissions(role);
  return permissions[action] ?? false;
}

/**
 * Get dashboard title based on user role
 */
export function getDashboardTitleForRole(role: string): string {
  switch (role) {
    case 'admin':
      return 'Admin Dashboard';
    case 'technician':
      return 'Technician Dashboard';
    case 'customer-care':
      return 'Customer Care Dashboard';
    case 'manager':
      return 'Manager Dashboard';
    case 'sales':
      return 'Sales Dashboard';
    case 'store-keeper':
      return 'Store Keeper Dashboard';
    default:
      return 'Dashboard';
  }
}

/**
 * Get dashboard description based on user role
 */
export function getDashboardDescriptionForRole(role: string, userName?: string): string {
  const greeting = userName ? `Welcome back, ${userName}` : 'Welcome back';

  switch (role) {
    case 'admin':
      return `${greeting} - Full system access`;
    case 'technician':
      return `${greeting} - Manage repairs`;
    case 'customer-care':
      return `${greeting} - Manage customers and support`;
    case 'manager':
      return `${greeting} - Oversee operations`;
    case 'sales':
      return `${greeting} - Track sales and customers`;
    case 'store-keeper':
      return `${greeting} - Manage inventory and stock`;
    default:
      return greeting;
  }
}

/**
 * Check if a widget is visible based on user permissions
 * @param widget - The widget to check
 * @param userPermissions - Array of user permissions
 * @returns true if widget should be visible
 */
export function isWidgetVisibleForPermissions(
  widget: keyof PermissionBasedWidgetVisibility,
  userPermissions: string[]
): boolean {
  const requiredPermissions = PERMISSION_WIDGET_VISIBILITY[widget];

  // If no permissions required, widget is visible
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  // If user has 'all' permission, they can see everything
  if (userPermissions.includes('all')) {
    return true;
  }

  // Check if user has ANY of the required permissions
  return requiredPermissions.some(permission => userPermissions.includes(permission));
}

/**
 * Get all visible widgets for a user based on their permissions
 * @param userPermissions - Array of user permissions
 * @returns Array of visible widget keys
 */
export function getVisibleWidgetsForPermissions(userPermissions: string[]): (keyof PermissionBasedWidgetVisibility)[] {
  const allWidgets = Object.keys(PERMISSION_WIDGET_VISIBILITY) as (keyof PermissionBasedWidgetVisibility)[];

  return allWidgets.filter(widget => isWidgetVisibleForPermissions(widget, userPermissions));
}

/**
 * Get permission-based quick action visibility
 * @param action - The quick action to check
 * @param userPermissions - Array of user permissions
 * @returns true if action should be visible
 */
export function isQuickActionVisibleForPermissions(
  action: keyof RoleQuickActionPermissions,
  userPermissions: string[]
): boolean {
  // If user has 'all' permission, they can see everything
  if (userPermissions.includes('all')) {
    return true;
  }

  // Map quick actions to required permissions
  const actionPermissionMap: Record<keyof RoleQuickActionPermissions, string[]> = {
    // Core Business Features
    devices: ['view_devices'],
    addDevice: ['add_devices'],
    customers: ['view_customers'],
    inventory: ['view_inventory'],
    appointments: ['appointments'],
    purchaseOrders: ['view_purchase_orders'],
    payments: ['view_payments'],
    adGenerator: ['view_dashboard'], // Basic access
    pos: ['access_pos'],
    reports: ['view_reports'],
    employees: ['employee_management'],
    whatsapp: ['whatsapp_integration'],
    settings: ['view_settings'],
    search: ['view_dashboard'], // Basic access
    loyalty: ['loyalty_program'],
    backup: ['backup_data'],

    // SMS & Communication Features
    sms: ['sms_features'],
    bulkSms: ['sms_features'],
    smsLogs: ['sms_features'],
    smsSettings: ['manage_integrations'],

    // Import/Export & Data Management
    excelImport: ['manage_settings'],
    excelTemplates: ['manage_settings'],
    productExport: ['view_inventory'],
    customerImport: ['edit_customers'],

    // Advanced System Features
    userManagement: ['manage_users'],
    databaseSetup: ['database_setup'],
    integrationSettings: ['manage_integrations'],
    integrationsTest: ['manage_integrations'],
    aiTraining: ['view_reports'], // AI features require reports
    bluetoothPrinter: ['view_dashboard'], // Basic access

    // Business Management
    categoryManagement: ['manage_settings'],
    supplierManagement: ['view_purchase_orders'],
    storeLocations: ['manage_settings'],

    // Advanced Analytics & Reports
    reminders: ['view_dashboard'], // Basic access
    mobile: ['view_dashboard'], // Basic access
    myAttendance: ['view_dashboard'] // Basic access
  };

  const requiredPermissions = actionPermissionMap[action] || [];
  if (requiredPermissions.length === 0) {
    return true; // No specific permissions required
  }

  // Check if user has ANY of the required permissions
  return requiredPermissions.some(permission => userPermissions.includes(permission));
}

