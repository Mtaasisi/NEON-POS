import { supabase } from '../lib/supabaseClient';
import { Device } from '../types';

export interface DashboardStats {
  // General stats
  totalDevices: number;
  totalCustomers: number;
  totalEmployees: number;
  totalRevenue: number;
  
  // Device-specific stats
  activeDevices: number;
  completedDevices: number;
  pendingDevices: number;
  overdueDevices: number;
  devicesInRepair: number;
  
  // Employee stats
  presentToday: number;
  onLeaveToday: number;
  attendanceRate: number;
  
  // Customer stats
  newCustomersThisMonth: number;
  activeCustomers: number;
  
  // Financial stats
  revenueThisMonth: number;
  revenueThisWeek: number;
  revenueToday: number;
  pendingPayments: number;
  
  // Notifications
  unreadNotifications: number;
  urgentNotifications: number;
  
  // Appointments
  appointmentsToday: number;
  appointmentsThisWeek: number;
  
  // Services
  servicesCompleted: number;
  servicesInProgress: number;
  avgServiceRating: number;
  
  // Inventory stats
  lowStockItems: number;
  criticalStockAlerts: number;
  totalProducts: number;
  inventoryValue: number;
}

export interface NotificationSummary {
  id: string;
  title: string;
  message: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  createdAt: string;
  isRead: boolean;
  type: string;
}

export interface EmployeeStatus {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'present' | 'late' | 'absent' | 'on-leave';
  checkInTime?: string;
  avatar?: string;
}

export interface RecentActivity {
  id: string;
  type: 'device' | 'customer' | 'payment' | 'employee';
  title: string;
  description: string;
  timestamp: string;
  userId?: string;
  userName?: string;
}

export interface CustomerInsight {
  totalCustomers: number;
  newThisMonth: number;
  returningCustomers: number;
  avgLifetimeValue: number;
  topCustomers: Array<{
    id: string;
    name: string;
    totalSpent: number;
    deviceCount: number;
  }>;
}

export interface ServiceMetrics {
  totalServices: number;
  completedToday: number;
  inProgress: number;
  avgCompletionTime: number;
  avgRating: number;
}

export interface AnalyticsData {
  revenueGrowth: number;
  customerGrowth: number;
  averageOrderValue: number;
  completedToday: number;
  popularServices: string[];
}

export interface FinancialSummary {
  todayRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  completedPayments: number;
  pendingPayments: number;
  outstandingAmount: number;
  paymentMethods: Array<{
    method: string;
    amount: number;
    count: number;
  }>;
}

export interface InventoryAlert {
  id: string;
  productName: string;
  category: string;
  currentStock: number;
  minimumStock: number;
  alertLevel: 'out-of-stock' | 'critical' | 'low';
}

class DashboardService {
  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(userId: string): Promise<DashboardStats> {
    try {
      // Fetch all necessary data in parallel for better performance
      const [
        devicesData,
        customersData,
        employeesData,
        paymentsData,
        appointmentsData,
        inventoryData
      ] = await Promise.all([
        this.getDeviceStats(),
        this.getCustomerStats(),
        this.getEmployeeStats(),
        this.getPaymentStats(),
        this.getAppointmentStats(),
        this.getInventoryStats()
      ]);

      return {
        // General stats
        totalDevices: devicesData.total,
        totalCustomers: customersData.total,
        totalEmployees: employeesData.total,
        totalRevenue: paymentsData.totalRevenue,
        
        // Device-specific stats
        activeDevices: devicesData.active,
        completedDevices: devicesData.completed,
        pendingDevices: devicesData.pending,
        overdueDevices: devicesData.overdue,
        devicesInRepair: devicesData.inRepair,
        
        // Employee stats
        presentToday: employeesData.presentToday,
        onLeaveToday: employeesData.onLeaveToday,
        attendanceRate: employeesData.attendanceRate,
        
        // Customer stats
        newCustomersThisMonth: customersData.newThisMonth,
        activeCustomers: customersData.active,
        
        // Financial stats
        revenueThisMonth: paymentsData.thisMonth,
        revenueThisWeek: paymentsData.thisWeek,
        revenueToday: paymentsData.today,
        pendingPayments: paymentsData.pending,
        
        // Notifications
        unreadNotifications: 0, // TODO: Implement notifications
        urgentNotifications: 0,
        
        // Appointments
        appointmentsToday: appointmentsData.today,
        appointmentsThisWeek: appointmentsData.thisWeek,
        
        // Services
        servicesCompleted: devicesData.completed,
        servicesInProgress: devicesData.inRepair,
        avgServiceRating: 4.5, // TODO: Calculate from actual ratings
        
        // Inventory stats
        lowStockItems: inventoryData.lowStock,
        criticalStockAlerts: inventoryData.critical,
        totalProducts: inventoryData.total,
        inventoryValue: inventoryData.value
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return this.getDefaultStats();
    }
  }

  /**
   * Get device statistics
   */
  private async getDeviceStats() {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('status, expected_completion_date, created_at');

      if (error) throw error;

      const devices = data || [];
      const now = new Date();

      return {
        total: devices.length,
        active: devices.filter((d: any) => 
          !['done', 'failed', 'repair-complete'].includes(d.status)
        ).length,
        completed: devices.filter((d: any) => 
          ['done', 'repair-complete'].includes(d.status)
        ).length,
        pending: devices.filter((d: any) => 
          ['assigned', 'awaiting-parts'].includes(d.status)
        ).length,
        overdue: devices.filter((d: any) => {
          if (!d.expected_completion_date) return false;
          return new Date(d.expected_completion_date) < now && 
                 !['done', 'failed', 'repair-complete'].includes(d.status);
        }).length,
        inRepair: devices.filter((d: any) => 
          ['diagnosis-started', 'in-repair', 'reassembled-testing'].includes(d.status)
        ).length
      };
    } catch (error) {
      console.error('Error fetching device stats:', error);
      return { total: 0, active: 0, completed: 0, pending: 0, overdue: 0, inRepair: 0 };
    }
  }

  /**
   * Get customer statistics
   */
  private async getCustomerStats() {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, joined_date, is_active');

      if (error) throw error;

      const customers = data || [];
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      return {
        total: customers.length,
        active: customers.filter((c: any) => c.is_active).length,
        newThisMonth: customers.filter((c: any) => 
          new Date(c.joined_date) >= monthStart
        ).length
      };
    } catch (error) {
      console.error('Error fetching customer stats:', error);
      return { total: 0, active: 0, newThisMonth: 0 };
    }
  }

  /**
   * Get employee statistics
   */
  private async getEmployeeStats() {
    try {
      const { data, error } = await supabase
        .from('auth_users')
        .select('id, role, is_active')
        .eq('is_active', true);

      if (error) throw error;

      const employees = data || [];

      // TODO: Implement actual attendance tracking
      const presentToday = Math.floor(employees.length * 0.85);
      const onLeaveToday = employees.length - presentToday;

      return {
        total: employees.length,
        presentToday,
        onLeaveToday,
        attendanceRate: employees.length > 0 ? (presentToday / employees.length) * 100 : 0
      };
    } catch (error) {
      console.error('Error fetching employee stats:', error);
      return { total: 0, presentToday: 0, onLeaveToday: 0, attendanceRate: 0 };
    }
  }

  /**
   * Get payment statistics
   */
  private async getPaymentStats() {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('amount, payment_date, status');

      if (error) throw error;

      const payments = data || [];
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      return {
        totalRevenue: payments
          .filter((p: any) => p.status === 'completed')
          .reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
        today: payments
          .filter((p: any) => 
            new Date(p.payment_date) >= today && p.status === 'completed'
          )
          .reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
        thisWeek: payments
          .filter((p: any) => 
            new Date(p.payment_date) >= weekStart && p.status === 'completed'
          )
          .reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
        thisMonth: payments
          .filter((p: any) => 
            new Date(p.payment_date) >= monthStart && p.status === 'completed'
          )
          .reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
        pending: payments
          .filter((p: any) => p.status === 'pending')
          .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
      };
    } catch (error) {
      console.error('Error fetching payment stats:', error);
      return { totalRevenue: 0, today: 0, thisWeek: 0, thisMonth: 0, pending: 0 };
    }
  }

  /**
   * Get appointment statistics
   */
  private async getAppointmentStats() {
    try {
      // TODO: Implement appointments table
      return {
        today: 0,
        thisWeek: 0
      };
    } catch (error) {
      console.error('Error fetching appointment stats:', error);
      return { today: 0, thisWeek: 0 };
    }
  }

  /**
   * Get inventory statistics
   */
  private async getInventoryStats() {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('current_stock, minimum_stock, reorder_level, cost_price');

      if (error) throw error;

      const items = data || [];

      const lowStock = items.filter((item: any) => {
        const minStock = item.minimum_stock || item.reorder_level || 10;
        const currentStock = item.current_stock || 0;
        return currentStock > 0 && currentStock <= minStock;
      }).length;

      const critical = items.filter((item: any) => {
        const minStock = item.minimum_stock || item.reorder_level || 10;
        const currentStock = item.current_stock || 0;
        return currentStock === 0 || currentStock <= minStock * 0.2;
      }).length;

      const value = items.reduce((sum: number, item: any) => {
        return sum + ((item.current_stock || 0) * (item.cost_price || 0));
      }, 0);

      return {
        total: items.length,
        lowStock,
        critical,
        value
      };
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
      return { total: 0, lowStock: 0, critical: 0, value: 0 };
    }
  }

  /**
   * Get recent notifications
   */
  async getRecentNotifications(userId: string, limit: number = 10): Promise<NotificationSummary[]> {
    try {
      // TODO: Implement notifications system
      return [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Get today's employee status
   */
  async getTodayEmployeeStatus(): Promise<EmployeeStatus[]> {
    try {
      const { data, error } = await supabase
        .from('auth_users')
        .select('id, name, email, role, is_active')
        .eq('is_active', true)
        .limit(10);

      if (error) throw error;

      // TODO: Implement actual attendance tracking
      return (data || []).map((emp: any) => ({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        status: 'present' as const // Default status
      }));
    } catch (error) {
      console.error('Error fetching employee status:', error);
      return [];
    }
  }

  /**
   * Get recent activity feed
   */
  async getRecentActivity(limit: number = 20): Promise<RecentActivity[]> {
    try {
      // TODO: Implement activity tracking
      return [];
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  }

  /**
   * Get customer insights
   */
  async getCustomerInsights(): Promise<CustomerInsight> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, total_spent, joined_date, is_active');

      if (error) throw error;

      const customers = data || [];
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const topCustomers = customers
        .sort((a: any, b: any) => (b.total_spent || 0) - (a.total_spent || 0))
        .slice(0, 5)
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          totalSpent: c.total_spent || 0,
          deviceCount: 0 // TODO: Get actual device count
        }));

      return {
        totalCustomers: customers.length,
        newThisMonth: customers.filter((c: any) => 
          new Date(c.joined_date) >= monthStart
        ).length,
        returningCustomers: customers.filter((c: any) => 
          (c.total_spent || 0) > 0
        ).length,
        avgLifetimeValue: customers.length > 0 
          ? customers.reduce((sum: number, c: any) => sum + (c.total_spent || 0), 0) / customers.length
          : 0,
        topCustomers
      };
    } catch (error) {
      console.error('Error fetching customer insights:', error);
      return {
        totalCustomers: 0,
        newThisMonth: 0,
        returningCustomers: 0,
        avgLifetimeValue: 0,
        topCustomers: []
      };
    }
  }

  /**
   * Get service metrics
   */
  async getServiceMetrics(): Promise<ServiceMetrics> {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('status, created_at, expected_completion_date');

      if (error) throw error;

      const devices = data || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return {
        totalServices: devices.length,
        completedToday: devices.filter((d: any) => 
          ['done', 'repair-complete'].includes(d.status) &&
          new Date(d.created_at) >= today
        ).length,
        inProgress: devices.filter((d: any) => 
          ['diagnosis-started', 'in-repair', 'reassembled-testing'].includes(d.status)
        ).length,
        avgCompletionTime: 0, // TODO: Calculate from actual data
        avgRating: 4.5 // TODO: Calculate from device ratings
      };
    } catch (error) {
      console.error('Error fetching service metrics:', error);
      return {
        totalServices: 0,
        completedToday: 0,
        inProgress: 0,
        avgCompletionTime: 0,
        avgRating: 0
      };
    }
  }

  /**
   * Get financial summary for the FinancialWidget
   */
  async getFinancialSummary(): Promise<FinancialSummary> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      // Get all payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount, payment_date, status, payment_method');

      const payments = paymentsData || [];

      // Calculate revenue metrics
      const todayRevenue = payments
        .filter((p: any) => 
          new Date(p.payment_date) >= today && p.status === 'completed'
        )
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      const weeklyRevenue = payments
        .filter((p: any) => 
          new Date(p.payment_date) >= weekStart && p.status === 'completed'
        )
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      const monthlyRevenue = payments
        .filter((p: any) => 
          new Date(p.payment_date) >= monthStart && p.status === 'completed'
        )
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      const lastMonthRevenue = payments
        .filter((p: any) => 
          new Date(p.payment_date) >= lastMonthStart && 
          new Date(p.payment_date) <= lastMonthEnd && 
          p.status === 'completed'
        )
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      const revenueGrowth = lastMonthRevenue > 0 
        ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : 0;

      const completedPayments = payments.filter((p: any) => p.status === 'completed').length;
      const pendingPayments = payments.filter((p: any) => p.status === 'pending').length;
      const outstandingAmount = payments
        .filter((p: any) => p.status === 'pending')
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      // Group by payment method
      const methodGroups = payments
        .filter((p: any) => p.status === 'completed')
        .reduce((acc: any, payment: any) => {
          const method = payment.payment_method || 'cash';
          if (!acc[method]) {
            acc[method] = { amount: 0, count: 0 };
          }
          acc[method].amount += payment.amount || 0;
          acc[method].count += 1;
          return acc;
        }, {});

      const paymentMethods = Object.entries(methodGroups)
        .map(([method, data]: any) => ({
          method,
          amount: data.amount,
          count: data.count
        }))
        .sort((a, b) => b.amount - a.amount);

      return {
        todayRevenue,
        weeklyRevenue,
        monthlyRevenue,
        revenueGrowth,
        completedPayments,
        pendingPayments,
        outstandingAmount,
        paymentMethods
      };
    } catch (error) {
      console.error('Error fetching financial summary:', error);
      return {
        todayRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0,
        revenueGrowth: 0,
        completedPayments: 0,
        pendingPayments: 0,
        outstandingAmount: 0,
        paymentMethods: []
      };
    }
  }

  /**
   * Get inventory alerts for low stock items
   */
  async getInventoryAlerts(limit: number = 10): Promise<InventoryAlert[]> {
    try {
      const { data: inventoryData, error } = await supabase
        .from('inventory_items')
        .select('id, product_name, category, current_stock, minimum_stock, reorder_level')
        .order('current_stock', { ascending: true })
        .limit(limit * 2); // Get more to filter

      if (error) throw error;

      const items = inventoryData || [];

      // Filter and categorize alerts
      const alerts: InventoryAlert[] = items
        .filter((item: any) => item.current_stock <= (item.minimum_stock || item.reorder_level || 10))
        .map((item: any) => {
          const currentStock = item.current_stock || 0;
          const minimumStock = item.minimum_stock || item.reorder_level || 10;
          
          let alertLevel: 'out-of-stock' | 'critical' | 'low' = 'low';
          if (currentStock === 0) {
            alertLevel = 'out-of-stock';
          } else if (currentStock <= minimumStock * 0.2) {
            alertLevel = 'critical';
          }

          return {
            id: item.id,
            productName: item.product_name,
            category: item.category || 'General',
            currentStock,
            minimumStock,
            alertLevel
          };
        })
        .slice(0, limit);

      return alerts;
    } catch (error) {
      console.error('Error fetching inventory alerts:', error);
      return [];
    }
  }

  /**
   * Get analytics data for the AnalyticsWidget
   */
  async getAnalyticsData(userId: string): Promise<AnalyticsData> {
    try {
      // Get data from last month and this month for growth calculations
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      // Get payment data
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount, payment_date, status');

      const payments = paymentsData || [];

      // Calculate revenue for this month and last month
      const thisMonthRevenue = payments
        .filter((p: any) => 
          new Date(p.payment_date) >= thisMonthStart && p.status === 'completed'
        )
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      const lastMonthRevenue = payments
        .filter((p: any) => 
          new Date(p.payment_date) >= lastMonthStart && 
          new Date(p.payment_date) <= lastMonthEnd && 
          p.status === 'completed'
        )
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      // Calculate revenue growth percentage
      const revenueGrowth = lastMonthRevenue > 0 
        ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : 0;

      // Get customer data
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, joined_date');

      const customers = customersData || [];

      const thisMonthCustomers = customers.filter((c: any) => 
        new Date(c.joined_date) >= thisMonthStart
      ).length;

      const lastMonthCustomers = customers.filter((c: any) => 
        new Date(c.joined_date) >= lastMonthStart && 
        new Date(c.joined_date) <= lastMonthEnd
      ).length;

      // Calculate customer growth percentage
      const customerGrowth = lastMonthCustomers > 0 
        ? Math.round(((thisMonthCustomers - lastMonthCustomers) / lastMonthCustomers) * 100)
        : 0;

      // Calculate average order value
      const completedPayments = payments.filter((p: any) => p.status === 'completed');
      const averageOrderValue = completedPayments.length > 0
        ? completedPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) / completedPayments.length
        : 0;

      // Get completed services today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: devicesData } = await supabase
        .from('devices')
        .select('status, updated_at, service_type');

      const devices = devicesData || [];

      const completedToday = devices.filter((d: any) => 
        ['done', 'repair-complete'].includes(d.status) &&
        new Date(d.updated_at) >= today
      ).length;

      // Get popular services
      const serviceTypeCounts = devices.reduce((acc: any, device: any) => {
        const service = device.service_type || 'General Repair';
        acc[service] = (acc[service] || 0) + 1;
        return acc;
      }, {});

      const popularServices = Object.entries(serviceTypeCounts)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 5)
        .map(([service]) => service as string);

      return {
        revenueGrowth,
        customerGrowth,
        averageOrderValue: Math.round(averageOrderValue),
        completedToday,
        popularServices
      };
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      return {
        revenueGrowth: 0,
        customerGrowth: 0,
        averageOrderValue: 0,
        completedToday: 0,
        popularServices: []
      };
    }
  }

  /**
   * Get default stats when data fetch fails
   */
  private getDefaultStats(): DashboardStats {
    return {
      totalDevices: 0,
      totalCustomers: 0,
      totalEmployees: 0,
      totalRevenue: 0,
      activeDevices: 0,
      completedDevices: 0,
      pendingDevices: 0,
      overdueDevices: 0,
      devicesInRepair: 0,
      presentToday: 0,
      onLeaveToday: 0,
      attendanceRate: 0,
      newCustomersThisMonth: 0,
      activeCustomers: 0,
      revenueThisMonth: 0,
      revenueThisWeek: 0,
      revenueToday: 0,
      pendingPayments: 0,
      unreadNotifications: 0,
      urgentNotifications: 0,
      appointmentsToday: 0,
      appointmentsThisWeek: 0,
      servicesCompleted: 0,
      servicesInProgress: 0,
      avgServiceRating: 0,
      lowStockItems: 0,
      criticalStockAlerts: 0,
      totalProducts: 0,
      inventoryValue: 0
    };
  }
}

export const dashboardService = new DashboardService();

