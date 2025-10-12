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
  upcomingAppointments: number;
  todayAppointments: number;
  appointmentCompletionRate: number;
  
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
  full_name: string;
  email: string;
  role: string;
  status: 'present' | 'late' | 'absent' | 'on-leave';
  checkInTime?: string;
  avatar?: string;
  department?: string;
}

export interface RecentActivity {
  id: string;
  type: 'device' | 'customer' | 'payment' | 'employee' | 'inventory' | 'appointment';
  title: string;
  description: string;
  time: string;
  timestamp?: string;
  userId?: string;
  userName?: string;
  status?: 'completed' | 'pending' | 'failed';
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  amount?: number;
}

export interface AppointmentSummary {
  id: string;
  customerName: string;
  serviceName: string;
  time: string;
  status: 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'scheduled';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  technicianName?: string;
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
        upcomingAppointments: appointmentsData.upcoming,
        todayAppointments: appointmentsData.today,
        appointmentCompletionRate: appointmentsData.completionRate,
        
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
      console.error('Error fetching dashboard stats:', error instanceof Error ? error.message : error);
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
        .select('status, estimated_completion_date, created_at');

      if (error) {
        console.error('❌ Device stats Supabase error:', JSON.stringify(error, null, 2));
        throw error;
      }

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
          if (!d.estimated_completion_date) return false;
          return new Date(d.estimated_completion_date) < now && 
                 !['done', 'failed', 'repair-complete'].includes(d.status);
        }).length,
        inRepair: devices.filter((d: any) => 
          ['diagnosis-started', 'in-repair', 'reassembled-testing'].includes(d.status)
        ).length
      };
    } catch (error: any) {
      console.error('❌ Error fetching device stats - Full error:', error);
      console.error('❌ Nested error details:', error?.error || error);
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
      console.error('Error fetching customer stats:', error instanceof Error ? error.message : error);
      return { total: 0, active: 0, newThisMonth: 0 };
    }
  }

  /**
   * Get employee statistics
   */
  private async getEmployeeStats() {
    try {
      const { data, error } = await supabase
        .from('users')
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
      console.error('Error fetching employee stats:', error instanceof Error ? error.message : error);
      return { total: 0, presentToday: 0, onLeaveToday: 0, attendanceRate: 0 };
    }
  }

  /**
   * Get payment statistics
   */
  private async getPaymentStats() {
    try {
      const { data, error } = await supabase
        .from('customer_payments')
        .select('amount, payment_date, status');

      if (error) {
        console.error('❌ Payment stats Supabase error:', JSON.stringify(error, null, 2));
        throw error;
      }

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
    } catch (error: any) {
      console.error('❌ Error fetching payment stats - Full error:', error);
      console.error('❌ Nested error details:', error?.error || error);
      return { totalRevenue: 0, today: 0, thisWeek: 0, thisMonth: 0, pending: 0 };
    }
  }

  /**
   * Get appointment statistics
   */
  private async getAppointmentStats() {
    try {
      // TODO: Implement appointments table when available
      // For now, return zeros since appointments table doesn't exist yet
      return {
        today: 0,
        thisWeek: 0,
        upcoming: 0,
        completionRate: 0
      };
    } catch (error) {
      console.error('Error fetching appointment stats:', error instanceof Error ? error.message : error);
      return { today: 0, thisWeek: 0, upcoming: 0, completionRate: 0 };
    }
  }

  /**
   * Get inventory statistics
   */
  private async getInventoryStats() {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('status, cost_price');

      if (error) {
        console.error('❌ Inventory stats Supabase error:', JSON.stringify(error, null, 2));
        throw error;
      }

      const items = data || [];

      // Count items by status
      const lowStock = items.filter((item: any) => item.status === 'available').length;
      const critical = items.filter((item: any) => item.status === 'damaged').length;

      const value = items.reduce((sum: number, item: any) => {
        return sum + (item.cost_price || 0);
      }, 0);

      return {
        total: items.length,
        lowStock,
        critical,
        value
      };
    } catch (error: any) {
      console.error('❌ Error fetching inventory stats - Full error:', error);
      console.error('❌ Nested error details:', error?.error || error);
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
      console.error('Error fetching notifications:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  /**
   * Get today's employee status
   */
  async getTodayEmployeeStatus(): Promise<EmployeeStatus[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, is_active')
        .eq('is_active', true)
        .limit(10);

      if (error) throw error;

      // TODO: Implement actual attendance tracking
      return (data || []).map((emp: any) => ({
        id: emp.id,
        full_name: emp.full_name,
        email: emp.email,
        role: emp.role,
        status: 'present' as const, // Default status
        department: emp.role // Use role as department for now
      }));
    } catch (error) {
      console.error('Error fetching employee status:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  /**
   * Get recent activity feed
   */
  async getRecentActivity(limit: number = 20): Promise<RecentActivity[]> {
    try {
      const activities: RecentActivity[] = [];

      // Get recent devices
      const { data: devicesData, error: devicesError } = await supabase
        .from('devices')
        .select('id, device_name, status, problem_description, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(5);

      if (devicesError) {
        console.error('Recent activity devices error:', devicesError);
        throw devicesError;
      }

      if (devicesData) {
        devicesData.forEach((device: any) => {
          activities.push({
            id: `device-${device.id}`,
            type: 'device',
            title: `Device ${device.status.replace('-', ' ')}`,
            description: `${device.problem_description || 'Service'} - ${device.device_name}`,
            time: device.updated_at,
            status: ['done', 'repair-complete'].includes(device.status) ? 'completed' : 'pending'
          });
        });
      }

      // Get recent payments
      const { data: paymentsData } = await supabase
        .from('customer_payments')
        .select('id, amount, payment_date, status')
        .order('payment_date', { ascending: false })
        .limit(5);

      if (paymentsData) {
        paymentsData.forEach((payment: any) => {
          activities.push({
            id: `payment-${payment.id}`,
            type: 'payment',
            title: 'Payment received',
            description: `Payment of ${payment.amount} TZS`,
            time: payment.payment_date,
            status: payment.status === 'completed' ? 'completed' : 'pending',
            amount: payment.amount
          });
        });
      }

      // Get recent customers
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, name, joined_date')
        .order('joined_date', { ascending: false })
        .limit(3);

      if (customersData) {
        customersData.forEach((customer: any) => {
          activities.push({
            id: `customer-${customer.id}`,
            type: 'customer',
            title: 'New customer registered',
            description: customer.name,
            time: customer.joined_date,
            status: 'completed'
          });
        });
      }

      // Sort by time and limit
      return activities
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, limit);
    } catch (error: any) {
      console.error('Error fetching recent activity:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      return [];
    }
  }

  /**
   * Alias for getRecentActivity
   */
  async getRecentActivities(limit: number = 20): Promise<RecentActivity[]> {
    return this.getRecentActivity(limit);
  }

  /**
   * Get today's appointments
   */
  async getTodayAppointments(limit: number = 10): Promise<AppointmentSummary[]> {
    try {
      // TODO: Implement appointments table when available
      // For now, return empty array since appointments table doesn't exist yet
      return [];
    } catch (error) {
      console.error('Error fetching today appointments:', error instanceof Error ? error.message : error);
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
      console.error('Error fetching customer insights:', error instanceof Error ? error.message : error);
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
        .select('status, created_at, estimated_completion_date');

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
      console.error('Error fetching service metrics:', error instanceof Error ? error.message : error);
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
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('customer_payments')
        .select('amount, payment_date, status, method');

      if (paymentsError) {
        console.error('Financial summary payments error:', paymentsError);
        throw paymentsError;
      }

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
          const method = payment.method || 'cash';
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
    } catch (error: any) {
      console.error('Error fetching financial summary:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
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
      // Inventory items don't have product_name directly, we'll return empty for now
      // TODO: Join with products table to get actual product names
      return [];
    } catch (error: any) {
      console.error('Error fetching inventory alerts:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
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
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('customer_payments')
        .select('amount, payment_date, status');

      if (paymentsError) {
        console.error('Analytics payments error:', paymentsError);
        throw paymentsError;
      }

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
        .select('status, updated_at, problem_description');

      const devices = devicesData || [];

      const completedToday = devices.filter((d: any) => 
        ['done', 'repair-complete'].includes(d.status) &&
        new Date(d.updated_at) >= today
      ).length;

      // Get popular services
      const serviceTypeCounts = devices.reduce((acc: any, device: any) => {
        const service = device.problem_description || 'General Repair';
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
    } catch (error: any) {
      console.error('Error fetching analytics data:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
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
      upcomingAppointments: 0,
      todayAppointments: 0,
      appointmentCompletionRate: 0,
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

