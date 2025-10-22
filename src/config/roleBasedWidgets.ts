/**
 * Role-based Widget Permissions Configuration
 * 
 * This file defines which widgets and quick actions are available for each user role.
 * Admins have access to all widgets, while technician and customer-care have restricted access.
 */

export type UserRole = 'admin' | 'technician' | 'customer-care' | 'manager' | 'sales' | 'user';

export interface RoleWidgetPermissions {
  // Charts
  revenueTrendChart: boolean;
  deviceStatusChart: boolean;
  appointmentsTrendChart: boolean;
  stockLevelChart: boolean;
  performanceMetricsChart: boolean;
  customerActivityChart: boolean;
  salesFunnelChart: boolean;
  purchaseOrderChart: boolean;
  salesChart: boolean;
  paymentMethodsChart: boolean;
  salesByCategoryChart: boolean;
  profitMarginChart: boolean;
  
  // Widgets
  appointmentWidget: boolean;
  employeeWidget: boolean;
  notificationWidget: boolean;
  financialWidget: boolean;
  analyticsWidget: boolean;
  serviceWidget: boolean;
  reminderWidget: boolean;
  customerInsightsWidget: boolean;
  systemHealthWidget: boolean;
  inventoryWidget: boolean;
  activityFeedWidget: boolean;
  purchaseOrderWidget: boolean;
  chatWidget: boolean;
  salesWidget: boolean;
  topProductsWidget: boolean;
  expensesWidget: boolean;
  staffPerformanceWidget: boolean;
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
  salesChart: true,
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
  salesChart: false,
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
  salesChart: true,
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
    default:
      return greeting;
  }
}

