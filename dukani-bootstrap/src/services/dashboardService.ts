import { supabase } from '../lib/supabaseClient';
import { getCurrentBranchId } from '../lib/branchAwareApi';
import { 
  fetchDeviceStats as fetchDeviceStatsDedup,
  fetchCustomerStats as fetchCustomerStatsDedup,
  fetchPaymentStats as fetchPaymentStatsDedup,
  fetchInventoryStats as fetchInventoryStatsDedup
} from '../lib/deduplicatedQueries';

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


export interface AnalyticsData {
  revenueGrowth: number;
  customerGrowth: number;
  averageOrderValue: number;
  completedToday: number;
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
  async getDashboardStats(
    userId: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<DashboardStats> {
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
        this.getDeviceStats(startDate, endDate),
        this.getCustomerStats(startDate, endDate),
        this.getEmployeeStats(),
        this.getPaymentStats(startDate, endDate),
        this.getAppointmentStats(startDate, endDate),
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
        unreadNotifications: await this.getNotificationCounts(userId).then(counts => counts.unread),
        urgentNotifications: await this.getNotificationCounts(userId).then(counts => counts.urgent),
        
        // Appointments
        appointmentsToday: appointmentsData.today,
        appointmentsThisWeek: appointmentsData.thisWeek,
        upcomingAppointments: appointmentsData.upcoming,
        todayAppointments: appointmentsData.today,
        appointmentCompletionRate: appointmentsData.completionRate,
        
        
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
  private async getDeviceStats(startDate?: string, endDate?: string) {
    try {
      // Use deduplicated query to prevent duplicate calls
      const devices = await fetchDeviceStatsDedup();
      const now = new Date();

      // Filter by date range if provided
      let filteredDevices = devices;
      if (startDate && endDate) {
        filteredDevices = devices.filter((d: any) => {
          const deviceDate = new Date(d.created_at);
          return deviceDate >= new Date(startDate) && deviceDate <= new Date(endDate);
        });
      }

      return {
        total: filteredDevices.length,
        active: filteredDevices.filter((d: any) => 
          !['done', 'failed', 'repair-complete'].includes(d.status)
        ).length,
        completed: filteredDevices.filter((d: any) => 
          ['done', 'repair-complete'].includes(d.status)
        ).length,
        pending: filteredDevices.filter((d: any) => 
          ['assigned', 'awaiting-parts'].includes(d.status)
        ).length,
        overdue: filteredDevices.filter((d: any) => {
          if (!d.estimated_completion_date) return false;
          return new Date(d.estimated_completion_date) < now && 
                 !['done', 'failed', 'repair-complete'].includes(d.status);
        }).length,
        inRepair: filteredDevices.filter((d: any) => 
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
  private async getCustomerStats(startDate?: string, endDate?: string) {
    try {
      // Use deduplicated query to prevent duplicate calls
      const customers = await fetchCustomerStatsDedup();

      // Filter by date range if provided
      let filteredCustomers = customers;
      if (startDate && endDate) {
        filteredCustomers = customers.filter((c: any) => {
          const joinDate = new Date(c.joined_date);
          return joinDate >= new Date(startDate) && joinDate <= new Date(endDate);
        });
      }

      return {
        total: customers.length, // Total is always all customers
        active: customers.filter((c: any) => c.is_active).length,
        newThisMonth: filteredCustomers.length // New customers in selected date range
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
      const today = new Date().toISOString().split('T')[0];
      const currentBranchId = getCurrentBranchId();
      
      // Get employees for current branch
      let empQuery = supabase
        .from('employees')
        .select('id, status');
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        empQuery = empQuery.eq('branch_id', currentBranchId);
      }
      
      const { data: employees, error: empError } = await empQuery;

      if (empError) throw empError;

      const total = employees?.length || 0;
      const onLeaveCount = employees?.filter((e: any) => e.status === 'on-leave').length || 0;

      // Get today's attendance for current branch
      let attQuery = supabase
        .from('attendance_records')
        .select('status')
        .eq('attendance_date', today);
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        attQuery = attQuery.eq('branch_id', currentBranchId);
      }
      
      const { data: attendance, error: attError } = await attQuery;

      if (attError) throw attError;

      const presentToday = attendance?.filter((a: any) => a.status === 'present' || a.status === 'late').length || 0;
      const attendanceRate = total > 0 ? (presentToday / total) * 100 : 0;

      return {
        total,
        presentToday,
        onLeaveToday: onLeaveCount,
        attendanceRate: Math.round(attendanceRate)
      };
    } catch (error) {
      console.error('Error fetching employee stats:', error instanceof Error ? error.message : error);
      return { total: 0, presentToday: 0, onLeaveToday: 0, attendanceRate: 0 };
    }
  }

  /**
   * Get payment statistics
   */
  private async getPaymentStats(startDate?: string, endDate?: string) {
    try {
      // Use deduplicated query to prevent duplicate calls
      const payments = await fetchPaymentStatsDedup();

      // Filter by date range if provided
      let filteredPayments = payments;
      if (startDate && endDate) {
        filteredPayments = payments.filter((p: any) => {
          const paymentDate = new Date(p.payment_date);
          return paymentDate >= new Date(startDate) && paymentDate <= new Date(endDate);
        });
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      return {
        totalRevenue: payments
          .filter((p: any) => p.status === 'completed')
          .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0),
        today: filteredPayments
          .filter((p: any) => 
            new Date(p.payment_date) >= today && p.status === 'completed'
          )
          .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0),
        thisWeek: filteredPayments
          .filter((p: any) => 
            new Date(p.payment_date) >= weekStart && p.status === 'completed'
          )
          .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0),
        thisMonth: filteredPayments
          .filter((p: any) => 
            new Date(p.payment_date) >= monthStart && p.status === 'completed'
          )
          .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0),
        pending: filteredPayments
          .filter((p: any) => p.status === 'pending')
          .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
      };
    } catch (error: any) {
      console.error('❌ Error fetching payment stats - Full error:', error);
      console.error('❌ Nested error details:', error?.error || error);
      return { totalRevenue: 0, today: 0, thisWeek: 0, thisMonth: 0, pending: 0 };
    }
  }

  /**
   * Get appointment statistics
   * ✅ FIXED: Now properly handles appointment_date as TIMESTAMPTZ
   */
  private async getAppointmentStats(startDate?: string, endDate?: string) {
    try {
      const currentBranchId = getCurrentBranchId();
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setHours(23, 59, 59, 999);
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      
      // Query appointments for current branch
      let query = supabase
        .from('appointments')
        .select('id, status, appointment_date, created_at');
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }

      // Apply date range filter if provided
      if (startDate && endDate) {
        query = query
          .gte('appointment_date', startDate)
          .lte('appointment_date', endDate);
      }
      
      const { data: appointments, error } = await query;
      
      if (error) {
        console.error('Error fetching appointments:', error);
        // Don't throw - return zeros gracefully
        return { today: 0, thisWeek: 0, upcoming: 0, completionRate: 0 };
      }
      
      const allAppointments = appointments || [];
      
      console.log('📅 Appointments Data:', {
        total: allAppointments.length,
        sample: allAppointments.slice(0, 3).map((a: any) => ({
          id: a.id,
          date: a.appointment_date,
          status: a.status
        }))
      });
      
      // Calculate metrics using appointment_date (which is TIMESTAMPTZ)
      const todayAppointments = allAppointments.filter((a: any) => {
        const aptDate = new Date(a.appointment_date);
        return aptDate >= todayStart && aptDate <= todayEnd;
      });
      
      const upcomingAppointments = allAppointments.filter((a: any) => 
        new Date(a.appointment_date) >= todayStart
      );
      
      const completedToday = todayAppointments.filter((a: any) => 
        a.status === 'completed'
      ).length;
      
      const completionRate = todayAppointments.length > 0 
        ? Math.round((completedToday / todayAppointments.length) * 100)
        : 0;
      
      return {
        today: todayAppointments.length,
        thisWeek: allAppointments.filter((a: any) => 
          new Date(a.appointment_date) >= weekStart
        ).length,
        upcoming: upcomingAppointments.length,
        completionRate
      };
    } catch (error) {
      console.error('Error fetching appointment stats:', error instanceof Error ? error.message : error);
      return { today: 0, thisWeek: 0, upcoming: 0, completionRate: 0 };
    }
  }

  /**
   * Get inventory statistics
   * ✅ FIXED: Now uses correct logic for low/critical stock and value calculation
   */
  private async getInventoryStats() {
    try {
      // Use deduplicated query to prevent duplicate calls
      const variants = await fetchInventoryStatsDedup();

      // ✅ FIXED: Count low stock items correctly (quantity <= min_quantity but > 0)
      const lowStock = variants.filter((variant: any) => {
        const quantity = Number(variant.quantity) || 0;
        const minQuantity = Number(variant.min_quantity) || 0;
        return quantity > 0 && quantity <= minQuantity;
      }).length;

      // ✅ FIXED: Count critical items correctly (quantity = 0 or very low)
      const critical = variants.filter((variant: any) => {
        const quantity = Number(variant.quantity) || 0;
        return quantity === 0;
      }).length;

      // ✅ FIXED: Calculate value correctly (cost_price * quantity)
      const value = variants.reduce((sum: number, variant: any) => {
        const costPrice = Number(variant.cost_price) || 0;
        const quantity = Number(variant.quantity) || 0;
        return sum + (costPrice * quantity);
      }, 0);

      console.log('📦 Inventory Stats Calculated:', {
        totalVariants: variants.length,
        lowStock,
        critical,
        sampleVariants: variants.slice(0, 3).map((v: any) => ({
          cost_price: v.cost_price,
          quantity: v.quantity,
          min_quantity: v.min_quantity,
          value: (Number(v.cost_price) || 0) * (Number(v.quantity) || 0)
        })),
        calculatedValue: value,
        valueType: typeof value
      });

      return {
        total: variants.length,
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
   * Get notification counts for dashboard stats
   */
  async getNotificationCounts(userId: string): Promise<{ unread: number; urgent: number }> {
    try {
      const currentBranchId = getCurrentBranchId();
      
      let query = supabase
        .from('notifications')
        .select('status, priority')
        .eq('user_id', userId);
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data, error } = await query;

      if (error) throw error;

      const notifications = data || [];
      const unread = notifications.filter((n: any) => n.status === 'unread').length;
      const urgent = notifications.filter((n: any) => n.priority === 'urgent' && n.status === 'unread').length;

      return { unread, urgent };
    } catch (error) {
      console.error('Error fetching notification counts:', error instanceof Error ? error.message : error);
      return { unread: 0, urgent: 0 };
    }
  }

  /**
   * Get recent notifications
   */
  async getRecentNotifications(userId: string, limit: number = 10): Promise<NotificationSummary[]> {
    try {
      const currentBranchId = getCurrentBranchId();
      
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data, error } = await query;

      if (error) throw error;

      // Transform database notifications to NotificationSummary format
      return (data || []).map((notification: any) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        createdAt: notification.created_at,
        isRead: notification.status === 'read' || notification.status === 'actioned',
        type: notification.type
      }));
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
      const today = new Date().toISOString().split('T')[0];
      const currentBranchId = getCurrentBranchId();
      
      // Get active employees for current branch
      // ✅ Note: employees table uses 'full_name' column (updated schema)
      // ✅ Note: employees table uses 'position' column
      let empQuery = supabase
        .from('employees')
        .select('id, full_name, email, phone, position')
        .eq('is_active', true)
        .limit(10);
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        empQuery = empQuery.eq('branch_id', currentBranchId);
      }
      
      const { data: employees, error: empError } = await empQuery;

      if (empError) throw empError;

      if (!employees || employees.length === 0) {
        return [];
      }

      // Get today's attendance for these employees in current branch
      const employeeIds = employees.map((emp: any) => emp.id);
      let attQuery = supabase
        .from('attendance_records')
        .select('employee_id, status, check_in_time')
        .eq('attendance_date', today)
        .in('employee_id', employeeIds);
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        attQuery = attQuery.eq('branch_id', currentBranchId);
      }
      
      const { data: attendance, error: attError } = await attQuery;

      if (attError) throw attError;

      // Map employees with their attendance status
      return employees.map((emp: any) => {
        const att = attendance?.find((a: any) => a.employee_id === emp.id);
        
        return {
          id: emp.id,
          full_name: emp.full_name || 'Unknown',
          email: emp.email,
          role: emp.position || 'Staff',
          status: att?.status || 'absent',
          department: emp.position || '',
          checkInTime: att?.check_in_time ? new Date(att.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined
        };
      });
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
      const currentBranchId = getCurrentBranchId();

      // Get recent devices for current branch
      let devicesQuery = supabase
        .from('devices')
        .select('id, device_name, status, problem_description, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(5);
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        devicesQuery = devicesQuery.eq('branch_id', currentBranchId);
      }
      
      const { data: devicesData, error: devicesError } = await devicesQuery;

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

      // Get recent payments for current branch
      let paymentsQuery = supabase
        .from('customer_payments')
        .select('id, amount, payment_date, status')
        .order('payment_date', { ascending: false })
        .limit(5);
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        paymentsQuery = paymentsQuery.eq('branch_id', currentBranchId);
      }
      
      const { data: paymentsData } = await paymentsQuery;

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

      // Get recent sales for current branch (POS sales - main activity)
      let salesQuery = supabase
        .from('lats_sales')
        .select('id, sale_number, total_amount, customer_name, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        salesQuery = salesQuery.eq('branch_id', currentBranchId);
      }
      
      const { data: salesData } = await salesQuery;

      if (salesData) {
        salesData.forEach((sale: any) => {
          activities.push({
            id: `sale-${sale.id}`,
            type: 'payment',
            title: 'Sale completed',
            description: `${sale.customer_name || 'Walk-in customer'} - ${sale.sale_number}`,
            time: sale.created_at,
            status: 'completed',
            amount: sale.total_amount
          });
        });
      }

      // Get recent customers for current branch
      let customersQuery = supabase
        .from('customers')
        .select('id, name, joined_date')
        .order('joined_date', { ascending: false })
        .limit(3);
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        customersQuery = customersQuery.eq('branch_id', currentBranchId);
      }
      
      const { data: customersData } = await customersQuery;

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
   * ✅ FIXED: Now uses correct schema fields
   */
  async getTodayAppointments(limit: number = 10): Promise<AppointmentSummary[]> {
    try {
      const currentBranchId = getCurrentBranchId();
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setHours(23, 59, 59, 999);
      
      // Query appointments for current branch using actual schema fields
      // Note: Try to get all possible fields, some might not exist in DB
      let query = supabase
        .from('appointments')
        .select('*')
        .gte('appointment_date', todayStart.toISOString())
        .lte('appointment_date', todayEnd.toISOString())
        .order('appointment_date', { ascending: true })
        .limit(limit);
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching appointments:', error);
        return [];
      }
      
      // Get customer names separately
      const appointments = data || [];
      if (appointments.length === 0) return [];
      
      const customerIds = appointments.map((a: any) => a.customer_id).filter(Boolean);
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name')
        .in('id', customerIds);
      
      const customerMap = new Map((customers || []).map((c: any) => [c.id, c.name]));
      
      return appointments.map((apt: any) => ({
        id: apt.id,
        customerName: customerMap.get(apt.customer_id) || 'Unknown',
        // Handle different field combinations: title, service_type, or description
        serviceName: apt.title || apt.service_type || apt.description || 'Appointment',
        time: new Date(apt.appointment_date).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        status: apt.status || 'scheduled',
        priority: apt.priority || 'medium',
        technicianName: undefined
      }));
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
      const currentBranchId = getCurrentBranchId();
      
      let query = supabase
        .from('customers')
        .select('id, name, total_spent, joined_date, is_active');
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        query = query.eq('branch_id', currentBranchId);
      }
      
      const { data, error } = await query;

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
   * Get financial summary for the FinancialWidget
   * ✅ FIXED: Now includes both sales revenue and service payments
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

      // Get current branch for filtering
      const currentBranchId = getCurrentBranchId();
      console.log('🏢 Current Branch ID:', currentBranchId);

      // Get sales data (main revenue source)
      let salesQuery = supabase
        .from('lats_sales')
        .select('total_amount, created_at, payment_method, sale_number');
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        salesQuery = salesQuery.eq('branch_id', currentBranchId);
      }
      
      const { data: salesData, error: salesError } = await salesQuery;

      if (salesError) {
        console.error('Financial summary sales error:', salesError);
        throw salesError;
      }

      // Also get service payments (secondary revenue source)
      let paymentsQuery = supabase
        .from('customer_payments')
        .select('amount, payment_date, status, method');
      
      if (currentBranchId) {
        paymentsQuery = paymentsQuery.eq('branch_id', currentBranchId);
      }
      
      const { data: paymentsData } = await paymentsQuery;

      const sales = salesData || [];
      const servicePayments = paymentsData || [];
      
      console.log('💰 Financial Data:', {
        salesCount: sales.length,
        servicePaymentsCount: servicePayments.length,
        sampleSale: sales[0]
      });

      // Helper function to convert any currency to TZS
      const convertToTZS = (amount: number, currency: string = 'TZS', exchangeRate: number = 1): number => {
        if (currency === 'TZS' || !currency) return amount;
        // Use provided exchange rate or fallback to common rates
        const rate = exchangeRate && exchangeRate > 1 ? exchangeRate : 
          (currency === 'USD' ? 2500 : currency === 'EUR' ? 2700 : currency === 'GBP' ? 3200 : 1);
        return amount * rate;
      };

      // Calculate revenue metrics from SALES (primary source) - all in TZS
      const todaySales = sales
        .filter((s: any) => new Date(s.created_at) >= today)
        .reduce((sum: number, s: any) => sum + (Number(s.total_amount) || 0), 0);
      
      // Service payments may have different currencies - convert to TZS
      const todayServiceRevenue = servicePayments
        .filter((p: any) => new Date(p.payment_date) >= today && p.status === 'completed')
        .reduce((sum: number, p: any) => {
          const amount = Number(p.amount) || 0;
          const amountInTZS = convertToTZS(amount, p.currency, p.exchange_rate);
          return sum + amountInTZS;
        }, 0);
      
      const todayRevenue = todaySales + todayServiceRevenue;

      const weeklySales = sales
        .filter((s: any) => new Date(s.created_at) >= weekStart)
        .reduce((sum: number, s: any) => sum + (Number(s.total_amount) || 0), 0);
      
      const weeklyServiceRevenue = servicePayments
        .filter((p: any) => new Date(p.payment_date) >= weekStart && p.status === 'completed')
        .reduce((sum: number, p: any) => {
          const amount = Number(p.amount) || 0;
          const amountInTZS = convertToTZS(amount, p.currency, p.exchange_rate);
          return sum + amountInTZS;
        }, 0);
      
      const weeklyRevenue = weeklySales + weeklyServiceRevenue;

      const monthlySales = sales
        .filter((s: any) => new Date(s.created_at) >= monthStart)
        .reduce((sum: number, s: any) => sum + (Number(s.total_amount) || 0), 0);
      
      const monthlyServiceRevenue = servicePayments
        .filter((p: any) => new Date(p.payment_date) >= monthStart && p.status === 'completed')
        .reduce((sum: number, p: any) => {
          const amount = Number(p.amount) || 0;
          const amountInTZS = convertToTZS(amount, p.currency, p.exchange_rate);
          return sum + amountInTZS;
        }, 0);
      
      const monthlyRevenue = monthlySales + monthlyServiceRevenue;

      const lastMonthSales = sales
        .filter((s: any) => 
          new Date(s.created_at) >= lastMonthStart && 
          new Date(s.created_at) <= lastMonthEnd
        )
        .reduce((sum: number, s: any) => sum + (Number(s.total_amount) || 0), 0);
      
      const lastMonthServiceRevenue = servicePayments
        .filter((p: any) => 
          new Date(p.payment_date) >= lastMonthStart && 
          new Date(p.payment_date) <= lastMonthEnd && 
          p.status === 'completed'
        )
        .reduce((sum: number, p: any) => {
          const amount = Number(p.amount) || 0;
          const amountInTZS = convertToTZS(amount, p.currency, p.exchange_rate);
          return sum + amountInTZS;
        }, 0);
      
      const lastMonthRevenue = lastMonthSales + lastMonthServiceRevenue;

      const revenueGrowth = lastMonthRevenue > 0 
        ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : 0;

      // Count completed transactions (sales + service payments)
      const completedPayments = sales.length + servicePayments.filter((p: any) => p.status === 'completed').length;
      const pendingPayments = servicePayments.filter((p: any) => p.status === 'pending').length;
      const outstandingAmount = servicePayments
        .filter((p: any) => p.status === 'pending')
        .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

      // Group by payment method (from both sales and service payments)
      const methodGroups: any = {};
      
      // Add sales payment methods (handle JSONB object)
      sales.forEach((sale: any) => {
        let method = 'cash';
        
        // Handle payment_method which can be a string or JSONB object
        if (sale.payment_method) {
          if (typeof sale.payment_method === 'string') {
            method = sale.payment_method;
          } else if (typeof sale.payment_method === 'object') {
            // payment_method is stored as JSONB object, extract the method name
            method = sale.payment_method.method || 
                     sale.payment_method.name || 
                     sale.payment_method.type ||
                     Object.keys(sale.payment_method)[0] || 
                     'cash';
          }
        }
        
        if (!methodGroups[method]) {
          methodGroups[method] = { amount: 0, count: 0 };
        }
        methodGroups[method].amount += Number(sale.total_amount) || 0;
        methodGroups[method].count += 1;
      });
      
      // Add service payment methods
      servicePayments
        .filter((p: any) => p.status === 'completed')
        .forEach((payment: any) => {
          const method = payment.method || 'cash';
          if (!methodGroups[method]) {
            methodGroups[method] = { amount: 0, count: 0 };
          }
          methodGroups[method].amount += Number(payment.amount) || 0;
          methodGroups[method].count += 1;
        });

      console.log('💳 Payment Method Groups Final:', methodGroups);

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
   * ✅ FIXED: Now properly fetches and returns low stock alerts
   */
  async getInventoryAlerts(): Promise<InventoryAlert[]> {
    try {
      const currentBranchId = getCurrentBranchId();
      
      // Get products with their variants
      let productsQuery = supabase
        .from('lats_products')
        .select('id, name, category_id, is_active, branch_id, is_shared')
        .eq('is_active', true);
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        productsQuery = productsQuery.or(`is_shared.eq.true,branch_id.eq.${currentBranchId}`);
      }
      
      const { data: products, error: productsError } = await productsQuery;
      
      if (productsError) throw productsError;
      
      if (!products || products.length === 0) {
        return [];
      }
      
      // Get product IDs
      const productIds = products.map((p: any) => p.id);
      
      // Get variants that are low on stock
      let variantsQuery = supabase
        .from('lats_product_variants')
        .select('id, product_id, quantity, min_quantity, branch_id, is_shared')
        .in('product_id', productIds);
      
      // Apply branch filter to variants if branch is selected
      if (currentBranchId) {
        variantsQuery = variantsQuery.or(`is_shared.eq.true,branch_id.eq.${currentBranchId}`);
      }
      
      const { data: variants, error: variantsError } = await variantsQuery;
      
      if (variantsError) throw variantsError;
      
      // Get categories - only if there are category IDs
      const categoryIds = [...new Set(products.map((p: any) => p.category_id).filter(Boolean))];
      const { data: categories } = categoryIds.length > 0
        ? await supabase
            .from('lats_categories')
            .select('id, name')
            .in('id', categoryIds)
        : { data: [] };
      
      const categoryMap = new Map((categories || []).map((c: any) => [c.id, c.name]));
      
      // Create a map of products for quick lookup
      const productMap = new Map(products.map((p: any) => [p.id, p]));
      
      // Filter and map variants to alerts
      const alerts: InventoryAlert[] = [];
      
      (variants || []).forEach((variant: any) => {
        const quantity = Number(variant.quantity) || 0;
        const minQuantity = Number(variant.min_quantity) || 0;
        const product = productMap.get(variant.product_id);
        
        if (!product) return;
        
        let alertLevel: 'out-of-stock' | 'critical' | 'low' | undefined;
        
        if (quantity === 0) {
          alertLevel = 'out-of-stock';
        } else if (quantity <= minQuantity * 0.25) {
          alertLevel = 'critical';
        } else if (quantity <= minQuantity) {
          alertLevel = 'low';
        }
        
        if (alertLevel) {
          alerts.push({
            id: variant.id,
            productName: (product as any).name || 'Unknown Product',
            category: (categoryMap.get((product as any).category_id) as string) || 'Uncategorized',
            currentStock: quantity,
            minimumStock: minQuantity,
            alertLevel
          });
        }
      });
      
      // Sort by severity (out-of-stock first, then critical, then low)
      const severityOrder = { 'out-of-stock': 0, 'critical': 1, 'low': 2 };
      alerts.sort((a, b) => severityOrder[a.alertLevel] - severityOrder[b.alertLevel]);
      
      return alerts.slice(0, 10);
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
  async getAnalyticsData(startDate?: string, endDate?: string): Promise<AnalyticsData> {
    try {
      // Get data from last month and this month for growth calculations
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      const currentBranchId = getCurrentBranchId();

      // Get payment data for current branch
      let paymentsQuery = supabase
        .from('customer_payments')
        .select('amount, payment_date, status');
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        paymentsQuery = paymentsQuery.eq('branch_id', currentBranchId);
      }

      // Apply date range filter if provided
      if (startDate && endDate) {
        paymentsQuery = paymentsQuery
          .gte('payment_date', startDate)
          .lte('payment_date', endDate);
      }
      
      const { data: paymentsData, error: paymentsError } = await paymentsQuery;

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
        .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

      const lastMonthRevenue = payments
        .filter((p: any) => 
          new Date(p.payment_date) >= lastMonthStart && 
          new Date(p.payment_date) <= lastMonthEnd && 
          p.status === 'completed'
        )
        .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

      // Calculate revenue growth percentage
      const revenueGrowth = lastMonthRevenue > 0 
        ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : 0;

      // Get customer data for current branch
      let customersQuery = supabase
        .from('customers')
        .select('id, joined_date');
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        customersQuery = customersQuery.eq('branch_id', currentBranchId);
      }
      
      const { data: customersData } = await customersQuery;

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

      // Calculate average order value from actual sales (not payments)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let salesQuery = supabase
        .from('lats_sales')
        .select('total_amount, created_at');
      
      // Apply branch filter if branch is selected
      if (currentBranchId) {
        salesQuery = salesQuery.eq('branch_id', currentBranchId);
      }
      
      const { data: salesData } = await salesQuery;
      const allSales = salesData || [];
      
      // Calculate average order value from sales
      const averageOrderValue = allSales.length > 0
        ? allSales.reduce((sum: number, s: any) => sum + (Number(s.total_amount) || 0), 0) / allSales.length
        : 0;

      // Get orders completed today
      const completedToday = allSales.filter((s: any) => 
        new Date(s.created_at) >= today
      ).length;


      return {
        revenueGrowth,
        customerGrowth,
        averageOrderValue: Math.round(averageOrderValue),
        completedToday
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
        completedToday: 0
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
      lowStockItems: 0,
      criticalStockAlerts: 0,
      totalProducts: 0,
      inventoryValue: 0
    };
  }
}

export const dashboardService = new DashboardService();

