import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { latsEventBus } from '../features/lats/lib/data/eventBus';

interface RealtimeMetrics {
  sales: {
    today: number;
    yesterday: number;
    growth: number;
    transactions: number;
  };
  customers: {
    newToday: number;
    totalActive: number;
    retention: number;
  };
  inventory: {
    lowStock: number;
    criticalStock: number;
    totalValue: number;
  };
  devices: {
    active: number;
    completed: number;
    pending: number;
    overdue: number;
  };
  employees: {
    present: number;
    total: number;
    attendance: number;
  };
}

interface RealtimeUpdate {
  type: 'sales' | 'customer' | 'inventory' | 'device' | 'employee' | 'system';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
}

export const useRealtimeDashboard = () => {
  const { currentUser } = useAuth();
  const [metrics, setMetrics] = useState<RealtimeMetrics>({
    sales: { today: 0, yesterday: 0, growth: 0, transactions: 0 },
    customers: { newToday: 0, totalActive: 0, retention: 0 },
    inventory: { lowStock: 0, criticalStock: 0, totalValue: 0 },
    devices: { active: 0, completed: 0, pending: 0, overdue: 0 },
    employees: { present: 0, total: 0, attendance: 0 }
  });

  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [updates, setUpdates] = useState<RealtimeUpdate[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const subscriptionRef = useRef<any>();

  // Initialize real-time subscriptions
  const initializeRealtime = useCallback(async () => {
    try {
      // Subscribe to sales updates
      const salesSubscription = supabase
        .channel('sales_updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'lats_sales'
        }, (payload) => {
          handleSalesUpdate(payload);
        })
        .subscribe();

      // Subscribe to customer updates
      const customerSubscription = supabase
        .channel('customer_updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'customers'
        }, (payload) => {
          handleCustomerUpdate(payload);
        })
        .subscribe();

      // Subscribe to device updates
      const deviceSubscription = supabase
        .channel('device_updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'lats_product_variants'
        }, (payload) => {
          handleDeviceUpdate(payload);
        })
        .subscribe();

      // Subscribe to inventory updates
      const inventorySubscription = supabase
        .channel('inventory_updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'products'
        }, (payload) => {
          handleInventoryUpdate(payload);
        })
        .subscribe();

      // Subscribe to attendance updates
      const attendanceSubscription = supabase
        .channel('attendance_updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'attendance_records'
        }, (payload) => {
          handleAttendanceUpdate(payload);
        })
        .subscribe();

      subscriptionRef.current = {
        sales: salesSubscription,
        customers: customerSubscription,
        devices: deviceSubscription,
        inventory: inventorySubscription,
        attendance: attendanceSubscription
      };

      setIsConnected(true);

      // Load initial data
      await loadInitialMetrics();

    } catch (error) {
      console.error('Failed to initialize real-time dashboard:', error);
      setIsConnected(false);

      // Retry connection after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        initializeRealtime();
      }, 5000);
    }
  }, []);

  // Handle sales updates
  const handleSalesUpdate = useCallback((payload: any) => {
    const update: RealtimeUpdate = {
      type: 'sales',
      action: payload.eventType,
      data: payload.new || payload.old,
      timestamp: new Date().toISOString()
    };

    setUpdates(prev => [update, ...prev.slice(0, 49)]); // Keep last 50 updates
    setLastUpdate(new Date());

    // Update sales metrics
    setMetrics(prev => ({
      ...prev,
      sales: {
        ...prev.sales,
        today: prev.sales.today + (payload.new?.total_amount || 0),
        transactions: prev.sales.transactions + 1
      }
    }));

    // Trigger event bus for widget updates
    latsEventBus.emit('dashboard:sales:update', update);
  }, []);

  // Handle customer updates
  const handleCustomerUpdate = useCallback((payload: any) => {
    const update: RealtimeUpdate = {
      type: 'customer',
      action: payload.eventType,
      data: payload.new || payload.old,
      timestamp: new Date().toISOString()
    };

    setUpdates(prev => [update, ...prev.slice(0, 49)]);
    setLastUpdate(new Date());

    // Update customer metrics
    if (payload.eventType === 'INSERT') {
      setMetrics(prev => ({
        ...prev,
        customers: {
          ...prev.customers,
          newToday: prev.customers.newToday + 1,
          totalActive: prev.customers.totalActive + 1
        }
      }));
    }

    latsEventBus.emit('dashboard:customer:update', update);
  }, []);

  // Handle device updates
  const handleDeviceUpdate = useCallback((payload: any) => {
    const update: RealtimeUpdate = {
      type: 'device',
      action: payload.eventType,
      data: payload.new || payload.old,
      timestamp: new Date().toISOString()
    };

    setUpdates(prev => [update, ...prev.slice(0, 49)]);
    setLastUpdate(new Date());

    // Update device metrics based on status changes
    setMetrics(prev => ({
      ...prev,
      devices: {
        ...prev.devices,
        // Update counts based on status
        active: payload.new?.status === 'active' ? prev.devices.active + 1 :
                payload.old?.status === 'active' ? prev.devices.active - 1 : prev.devices.active,
        completed: payload.new?.status === 'completed' ? prev.devices.completed + 1 :
                  payload.old?.status === 'completed' ? prev.devices.completed - 1 : prev.devices.completed,
        pending: payload.new?.status === 'pending' ? prev.devices.pending + 1 :
                payload.old?.status === 'pending' ? prev.devices.pending - 1 : prev.devices.pending
      }
    }));

    latsEventBus.emit('dashboard:device:update', update);
  }, []);

  // Handle inventory updates
  const handleInventoryUpdate = useCallback((payload: any) => {
    const update: RealtimeUpdate = {
      type: 'inventory',
      action: payload.eventType,
      data: payload.new || payload.old,
      timestamp: new Date().toISOString()
    };

    setUpdates(prev => [update, ...prev.slice(0, 49)]);
    setLastUpdate(new Date());

    // Update inventory metrics
    setMetrics(prev => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        // Recalculate low stock items if needed
        lowStock: payload.new?.stock_quantity <= 10 ? prev.inventory.lowStock + 1 :
                  payload.old?.stock_quantity <= 10 ? prev.inventory.lowStock - 1 : prev.inventory.lowStock
      }
    }));

    latsEventBus.emit('dashboard:inventory:update', update);
  }, []);

  // Handle attendance updates
  const handleAttendanceUpdate = useCallback((payload: any) => {
    const update: RealtimeUpdate = {
      type: 'employee',
      action: payload.eventType,
      data: payload.new || payload.old,
      timestamp: new Date().toISOString()
    };

    setUpdates(prev => [update, ...prev.slice(0, 49)]);
    setLastUpdate(new Date());

    // Update attendance metrics
    setMetrics(prev => ({
      ...prev,
      employees: {
        ...prev.employees,
        present: payload.new?.status === 'present' ? prev.employees.present + 1 :
                 payload.old?.status === 'present' ? prev.employees.present - 1 : prev.employees.present
      }
    }));

    latsEventBus.emit('dashboard:employee:update', update);
  }, []);

  // Load initial metrics
  const loadInitialMetrics = useCallback(async () => {
    try {
      // Load today's sales
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: salesData } = await supabase
        .from('lats_sales')
        .select('total_amount')
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      const todaySales = salesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;

      // Load customer count
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Load device counts
      const { data: deviceData } = await supabase
        .from('lats_product_variants')
        .select('status')
        .eq('is_active', true);

      const deviceCounts = deviceData?.reduce((acc, device) => {
        acc[device.status] = (acc[device.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Load employee attendance
      const todayStr = today.toISOString().split('T')[0];
      const { data: attendanceData } = await supabase
        .from('attendance_records')
        .select('status')
        .eq('attendance_date', todayStr);

      const presentCount = attendanceData?.filter(record => record.status === 'present').length || 0;

      // Update metrics
      setMetrics({
        sales: {
          today: todaySales,
          yesterday: 0, // Would need to calculate
          growth: 0, // Would need to calculate
          transactions: salesData?.length || 0
        },
        customers: {
          newToday: 0, // Would need to track new customers today
          totalActive: customerCount || 0,
          retention: 0 // Would need to calculate
        },
        inventory: {
          lowStock: 0, // Would need to calculate
          criticalStock: 0, // Would need to calculate
          totalValue: 0 // Would need to calculate
        },
        devices: {
          active: deviceCounts.active || 0,
          completed: deviceCounts.completed || 0,
          pending: deviceCounts.pending || 0,
          overdue: 0 // Would need to calculate
        },
        employees: {
          present: presentCount,
          total: 0, // Would need to get total employees
          attendance: 0 // Would need to calculate percentage
        }
      });

    } catch (error) {
      console.error('Failed to load initial metrics:', error);
    }
  }, []);

  // Cleanup subscriptions
  const cleanup = useCallback(() => {
    if (subscriptionRef.current) {
      Object.values(subscriptionRef.current).forEach((subscription: any) => {
        subscription.unsubscribe();
      });
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setIsConnected(false);
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (currentUser) {
      initializeRealtime();
    }

    return () => {
      cleanup();
    };
  }, [currentUser, initializeRealtime, cleanup]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    await loadInitialMetrics();
    setLastUpdate(new Date());
  }, [loadInitialMetrics]);

  return {
    metrics,
    isConnected,
    lastUpdate,
    updates,
    refresh
  };
};

