// Repair Management System - Complete Enterprise Solution
// This module provides comprehensive repair management capabilities

// Pages
export { default as RepairManagementPage } from './pages/RepairManagementPage';
export { default as RepairAnalyticsPage } from './pages/RepairAnalyticsPage';
export { default as TechnicianManagementPage } from './pages/TechnicianManagementPage';
export { default as RepairHistoryPage } from './pages/RepairHistoryPage';

// Components
export { default as SparePartsSelector } from './components/SparePartsSelector';
export { default as RepairPartsManager } from './components/RepairPartsManager';
export { default as QualityAssurancePanel } from './components/QualityAssurancePanel';

// Types
export interface RepairMetrics {
  totalRepairs: number;
  activeRepairs: number;
  completedToday: number;
  averageRepairTime: number;
  successRate: number;
  totalRevenue: number;
}

export interface TechnicianStats {
  id: string;
  name: string;
  activeRepairs: number;
  completedToday: number;
  efficiency: number;
  performanceRating: number;
}

export interface RepairHistory {
  id: string;
  deviceId: string;
  technicianId: string;
  startDate: string;
  endDate?: string;
  totalCost: number;
  status: 'completed' | 'failed' | 'cancelled';
}

// Constants
export const REPAIR_STATUS_OPTIONS = [
  { value: 'assigned', label: 'Assigned', color: 'blue' },
  { value: 'diagnosis-started', label: 'Diagnosis Started', color: 'yellow' },
  { value: 'awaiting-parts', label: 'Awaiting Parts', color: 'orange' },
  { value: 'parts-arrived', label: 'Parts Arrived', color: 'purple' },
  { value: 'in-repair', label: 'In Repair', color: 'blue' },
  { value: 'reassembled-testing', label: 'Testing', color: 'cyan' },
  { value: 'repair-complete', label: 'Repair Complete', color: 'green' },
  { value: 'returned-to-customer-care', label: 'Ready for Pickup', color: 'indigo' },
  { value: 'done', label: 'Completed', color: 'emerald' },
  { value: 'failed', label: 'Failed', color: 'red' }
];

export const QUALITY_CATEGORIES = [
  { value: 'hardware', label: 'Hardware', icon: 'Settings' },
  { value: 'software', label: 'Software', icon: 'FileText' },
  { value: 'functionality', label: 'Functionality', icon: 'Zap' },
  { value: 'performance', label: 'Performance', icon: 'TrendingUp' },
  { value: 'appearance', label: 'Appearance', icon: 'Eye' }
];

// Utility functions
export const calculateRepairEfficiency = (completedRepairs: number, totalTime: number): number => {
  if (completedRepairs === 0) return 0;
  // Assuming 8 hours per day, 5 days per week, 4 weeks per month = 160 hours
  const expectedTime = completedRepairs * 8; // 8 hours per repair estimate
  return Math.min(100, (expectedTime / totalTime) * 100);
};

export const getRepairPriority = (device: any): 'low' | 'medium' | 'high' | 'urgent' => {
  const daysSinceCreated = (Date.now() - new Date(device.createdAt).getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceCreated > 30) return 'urgent';
  if (daysSinceCreated > 14) return 'high';
  if (daysSinceCreated > 7) return 'medium';
  return 'low';
};

export const formatRepairDuration = (startDate: string, endDate?: string): string => {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diffDays > 0) {
    return `${diffDays}d ${diffHours}h`;
  }
  return `${diffHours}h`;
};

// Route configuration for repair module
export const repairRoutes = [
  {
    path: '/repair',
    component: RepairManagementPage,
    title: 'Repair Management',
    description: 'Comprehensive repair operations dashboard'
  },
  {
    path: '/repair/analytics',
    component: RepairAnalyticsPage,
    title: 'Repair Analytics',
    description: 'Detailed repair analytics and reporting'
  },
  {
    path: '/repair/technicians',
    component: TechnicianManagementPage,
    title: 'Technician Management',
    description: 'Manage technicians and workload distribution'
  },
  {
    path: '/repair/history',
    component: RepairHistoryPage,
    title: 'Repair History',
    description: 'Complete repair documentation and history'
  }
];

// Navigation menu configuration
export const repairNavigation = {
  main: {
    label: 'Repair Management',
    path: '/repair',
    icon: 'Wrench',
    children: [
      { label: 'Overview', path: '/repair', icon: 'BarChart3' },
      { label: 'Analytics', path: '/repair/analytics', icon: 'TrendingUp' },
      { label: 'Technicians', path: '/repair/technicians', icon: 'Users' },
      { label: 'History', path: '/repair/history', icon: 'History' }
    ]
  }
};

// Permissions configuration
export const repairPermissions = {
  view_repairs: 'View repair information',
  manage_repairs: 'Manage repair operations',
  assign_technicians: 'Assign technicians to repairs',
  quality_approval: 'Approve repair quality',
  view_analytics: 'View repair analytics',
  manage_technicians: 'Manage technician accounts',
  export_reports: 'Export repair reports'
};

// Database table configurations (for reference)
export const repairTables = {
  repair_parts: {
    description: 'Parts used in repairs',
    fields: ['id', 'device_id', 'spare_part_id', 'quantity', 'status', 'cost_per_unit', 'total_cost', 'supplier', 'estimated_arrival']
  },
  quality_tests: {
    description: 'Quality assurance test results',
    fields: ['id', 'device_id', 'checklist_id', 'status', 'notes', 'tested_by', 'tested_at', 'evidence']
  },
  quality_approvals: {
    description: 'Final quality approvals',
    fields: ['id', 'device_id', 'approved', 'notes', 'approved_by', 'approved_at']
  },
  technician_skills: {
    description: 'Technician skills and certifications',
    fields: ['id', 'technician_id', 'skills', 'certifications', 'experience_years']
  }
};

// Default repair settings
export const defaultRepairSettings = {
  defaultRepairTime: 8, // hours
  maxTechnicianWorkload: 5, // concurrent repairs
  qualityApprovalRequired: true,
  autoAssignTechnicians: false,
  customerNotifications: true,
  warrantyPeriod: 90, // days
  profitMarginTarget: 30 // percentage
};

// Integration points with other modules
export const repairIntegrations = {
  inventory: {
    spareParts: 'Spare parts management integration',
    stockTracking: 'Real-time stock level monitoring',
    costCalculation: 'Automatic cost calculation from parts'
  },
  customers: {
    notifications: 'Automated customer communication',
    history: 'Customer repair history tracking',
    loyalty: 'Repair-based loyalty program integration'
  },
  payments: {
    invoicing: 'Repair invoice generation',
    deposits: 'Deposit management for repairs',
    paymentTracking: 'Payment status monitoring'
  },
  reporting: {
    analytics: 'Comprehensive repair analytics',
    export: 'Multiple export formats (PDF, CSV, Excel)',
    dashboards: 'Real-time dashboard updates'
  }
};
