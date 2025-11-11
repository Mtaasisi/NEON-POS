import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Clock, RefreshCw, Users, AlertCircle, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { useMobileBranch, applyBranchFilter } from '../hooks/useMobileBranch';
import { useResponsiveSizes, useScreenInfo } from '../../../hooks/useResponsiveSize';
import { ResponsiveMobileWrapper } from '../components/ResponsiveMobileWrapper';

interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  lowStock: number;
  totalRevenue: number;
  totalCustomers: number;
  totalProducts: number;
  yesterdaySales: number;
  yesterdayOrders: number;
}

interface RecentActivity {
  id: string;
  title: string;
  amount: string;
  time: string;
  icon: any;
  type: 'sale' | 'stock' | 'payment' | 'customer';
}

const MobileDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentBranch, loading: branchLoading, isDataShared } = useMobileBranch();
  const sizes = useResponsiveSizes();
  const screenInfo = useScreenInfo();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayOrders: 0,
    lowStock: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalProducts: 0,
    yesterdaySales: 0,
    yesterdayOrders: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const quickActions = [
    { label: 'New Sale', path: '/mobile/pos', icon: ShoppingCart },
    { label: 'Reports', path: '/mobile/analytics', icon: BarChart3 }
  ];

  // Helper function to format currency with validation
  const formatCurrency = (amount: number): string => {
    if (!amount || isNaN(amount) || !isFinite(amount)) {
      return 'TSh 0';
    }
    if (amount > 1e12) {
      return 'TSh ' + formatCompactNumber(amount);
    }
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Helper function to format large numbers with K, M, B suffixes
  const formatCompactNumber = (num: number): string => {
    if (num === 0 || num === null || num === undefined) return '0';
    if (isNaN(num) || !isFinite(num)) return '0';
    if (num > 1e15 || num < -1e15) return '0';
    
    const absNum = Math.abs(num);
    if (absNum >= 1000000000) {
      return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (absNum >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (absNum >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toFixed(0);
  };

  // Helper function to sanitize monetary values
  const sanitizeAmount = (rawValue: any): number => {
    if (!rawValue) return 0;
    
    let amount = rawValue;
    if (typeof amount === 'string') {
      amount = parseFloat(amount.replace(/[^0-9.-]/g, ''));
    }
    
    if (isNaN(amount) || !isFinite(amount)) return 0;
    if (amount > 1e15) return 0;
    if (amount > 100000000) amount = amount / 100;
    
    return Math.max(0, amount);
  };

  // Helper to get time ago
  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  // Fetch dashboard data with branch filtering
  const fetchDashboardData = async (showToast = true) => {
    // Wait for branch to load
    if (branchLoading) return;

    try {
      console.log('🔍 [MobileDashboard] Fetching dashboard data for branch:', currentBranch?.name);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Build queries with branch filters
      let salesQuery = supabase
        .from('lats_sales')
        .select('*')
        .gte('created_at', today.toISOString());
      
      let customersQuery = supabase
        .from('lats_customers')
        .select('id, total_spent');
      
      let productsQuery = supabase
        .from('lats_products')
        .select('id, stock_quantity, min_stock_level')
        .eq('is_active', true);
      
      let recentSalesQuery = supabase
        .from('lats_sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // Apply branch filters if branch is selected
      if (currentBranch) {
        // Filter sales by branch (always filter sales by branch)
        salesQuery = salesQuery.eq('branch_id', currentBranch.id);
        recentSalesQuery = recentSalesQuery.eq('branch_id', currentBranch.id);

        // Filter customers if isolated
        const customersShared = isDataShared('customers');
        if (!customersShared) {
          customersQuery = applyBranchFilter(
            customersQuery,
            currentBranch.id,
            currentBranch.data_isolation_mode,
            customersShared
          );
        }

        // Filter products if isolated
        const productsShared = isDataShared('products');
        if (!productsShared) {
          productsQuery = applyBranchFilter(
            productsQuery,
            currentBranch.id,
            currentBranch.data_isolation_mode,
            productsShared
          );
        }
      }
      
      // Execute queries
      const { data: salesData, error: salesError } = await salesQuery;
      const { data: customersData } = await customersQuery;
      const { data: productsData } = await productsQuery;
      const { data: recentSalesData } = await recentSalesQuery;
      
      // Calculate today's sales
      let todaySales = 0;
      let todayOrders = 0;
      if (salesData && !salesError) {
        todayOrders = salesData.length;
        todaySales = salesData.reduce((sum, sale) => {
          const amount = sanitizeAmount(sale.total_amount || 0);
          return sum + amount;
        }, 0);
      }
      
      // Calculate total revenue from customers
      let totalRevenue = 0;
      if (customersData) {
        totalRevenue = customersData.reduce((sum, customer) => {
          const spent = sanitizeAmount(customer.total_spent);
          return sum + spent;
        }, 0);
      }
      
      // Calculate low stock items
      let lowStock = 0;
      if (productsData) {
        lowStock = productsData.filter(product => {
          const stock = product.stock_quantity || 0;
          const minStock = product.min_stock_level || 10;
          return stock <= minStock;
        }).length;
      }
      
      // Build recent activities
      const activities: RecentActivity[] = [];
      if (recentSalesData) {
        recentSalesData.slice(0, 5).forEach(sale => {
          const amount = sanitizeAmount(sale.total_amount || 0);
          activities.push({
            id: sale.id,
            title: 'New sale completed',
            amount: 'TSh ' + formatCompactNumber(amount),
            time: getTimeAgo(sale.created_at),
            icon: ShoppingCart,
            type: 'sale'
          });
        });
      }
      
      setStats({
        todaySales,
        todayOrders,
        lowStock,
        totalRevenue,
        totalCustomers: customersData?.length || 0,
        totalProducts: productsData?.length || 0,
        yesterdaySales: 0, // Would need yesterday's data
        yesterdayOrders: 0,
      });
      
      setRecentActivities(activities);
      
      console.log('✅ Dashboard data loaded successfully');
      if (showToast) {
        toast.success('Dashboard updated');
      }
    } catch (error: any) {
      console.error('❌ Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    }
  };

  // Initial load and reload on branch change
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchDashboardData(false);
      setIsLoading(false);
    };
    loadData();

    // Listen for branch changes
    const handleBranchChange = () => {
      console.log('🔄 [MobileDashboard] Branch changed, reloading dashboard...');
      loadData();
    };

    window.addEventListener('branchChanged', handleBranchChange);
    return () => {
      window.removeEventListener('branchChanged', handleBranchChange);
    };
  }, [currentBranch, branchLoading]);

  // Real-time subscriptions
  useEffect(() => {
    const salesChannel = supabase
      .channel('sales-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'lats_sales' }, 
        () => fetchDashboardData(false)
      )
      .subscribe();
    
    const productsChannel = supabase
      .channel('products-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'lats_products' }, 
        () => fetchDashboardData(false)
      )
      .subscribe();
    
    return () => {
      salesChannel.unsubscribe();
      productsChannel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pull to refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollContainerRef.current && scrollContainerRef.current.scrollTop === 0) {
      setPullStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartY > 0 && scrollContainerRef.current && scrollContainerRef.current.scrollTop === 0) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - pullStartY;
      if (distance > 0 && distance < 120) {
        setPullDistance(distance);
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 80) {
      setIsRefreshing(true);
      await fetchDashboardData(false);
      toast.success('Refreshed!');
      setIsRefreshing(false);
    }
    setPullStartY(0);
    setPullDistance(0);
  };

  // Calculate percentage change
  const calculateChange = (current: number, previous: number): { value: string; trend: 'up' | 'down' } => {
    if (previous === 0) return { value: current > 0 ? '+100%' : '0%', trend: 'up' };
    const change = ((current - previous) / previous) * 100;
    return {
      value: `${change >= 0 ? '+' : ''}${change.toFixed(0)}%`,
      trend: change >= 0 ? 'up' : 'down'
    };
  };

  const salesChange = calculateChange(stats.todaySales, stats.yesterdaySales);
  const ordersChange = calculateChange(stats.todayOrders, stats.yesterdayOrders);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Header */}
        <div className="px-4 pt-3 pb-2">
          <h1 className="text-[32px] font-bold text-black tracking-tight">Home</h1>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-3"></div>
              <p className="text-gray-500 text-[15px]">Loading dashboard...</p>
            </div>
          </div>
        )}

        {/* Pull to Refresh Indicator */}
        {pullDistance > 0 && !isLoading && (
          <div 
            className="flex items-center justify-center py-2 transition-all"
            style={{ 
              transform: `translateY(${Math.min(pullDistance, 80)}px)`,
              opacity: Math.min(pullDistance / 80, 1)
            }}
          >
            <RefreshCw 
              size={20} 
              className={`text-blue-500 ${isRefreshing || pullDistance > 80 ? 'animate-spin' : ''}`}
              strokeWidth={2.5}
            />
            <span className="ml-2 text-[14px] text-blue-500 font-medium">
              {pullDistance > 80 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        )}

        {!isLoading && (
          <>
          {/* Today's Summary */}
          <div className="px-4 py-3 bg-gradient-to-br from-blue-50 to-indigo-50 border-y border-blue-100">
            <div className="text-[13px] text-blue-600 mb-2 uppercase tracking-wide font-semibold">TODAY'S SUMMARY</div>
            <div className="flex items-baseline gap-2">
              <span className="text-[28px] font-bold text-gray-900">
                TSh {formatCompactNumber(stats.todaySales)}
              </span>
              <span className={`text-[15px] font-medium flex items-center gap-1 ${
                salesChange.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {salesChange.trend === 'up' ? (
                  <TrendingUp size={14} strokeWidth={3} />
                ) : (
                  <TrendingDown size={14} strokeWidth={3} />
                )}
                {salesChange.value}
              </span>
            </div>
            <div className="text-[15px] text-gray-700 mt-1 flex items-center gap-2">
              <span>{stats.todayOrders} orders</span>
              {stats.lowStock > 0 && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <AlertCircle size={14} className="text-orange-500" />
                    {stats.lowStock} items low stock
                  </span>
                </>
              )}
            </div>
          </div>

      {/* Quick Actions */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex gap-2">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={() => navigate(action.path)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors text-[13px] font-medium shadow-sm"
              >
                <Icon size={18} strokeWidth={2.5} />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="text-[13px] text-gray-500 mb-3 uppercase tracking-wide font-semibold">OVERVIEW</div>
        <div className="grid grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {/* Total Revenue */}
          <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200 shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <DollarSign size={22} className="text-purple-600" strokeWidth={2.5} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-[11px] text-purple-700 uppercase font-semibold mb-0.5">Revenue</div>
              <div className="text-[18px] font-bold text-purple-900 truncate">
                TSh {formatCompactNumber(stats.totalRevenue)}
              </div>
            </div>
          </div>

          {/* Total Customers */}
          <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border border-green-200 shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users size={22} className="text-green-600" strokeWidth={2.5} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-[11px] text-green-700 uppercase font-semibold mb-0.5">Customers</div>
              <div className="text-[18px] font-bold text-green-900">
                {stats.totalCustomers}
              </div>
            </div>
          </div>

          {/* Total Products */}
          <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Package size={22} className="text-blue-600" strokeWidth={2.5} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-[11px] text-blue-700 uppercase font-semibold mb-0.5">Products</div>
              <div className="text-[18px] font-bold text-blue-900">
                {stats.totalProducts}
              </div>
            </div>
          </div>

          {/* Low Stock */}
          <div className={`flex items-center gap-3 p-4 bg-gradient-to-br rounded-2xl border shadow-sm ${
            stats.lowStock > 0 
              ? 'from-orange-50 to-orange-100 border-orange-200' 
              : 'from-gray-50 to-gray-100 border-gray-200'
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              stats.lowStock > 0 ? 'bg-orange-100' : 'bg-gray-100'
            }`}>
              <AlertCircle size={22} className={stats.lowStock > 0 ? 'text-orange-600' : 'text-gray-600'} strokeWidth={2.5} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className={`text-[11px] uppercase font-semibold mb-0.5 ${
                stats.lowStock > 0 ? 'text-orange-700' : 'text-gray-700'
              }`}>Low Stock</div>
              <div className={`text-[18px] font-bold ${
                stats.lowStock > 0 ? 'text-orange-900' : 'text-gray-900'
              }`}>
                {stats.lowStock}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity - iOS List Style */}
      <div className="pb-4">
        <div className="px-4 pt-4 pb-2">
          <div className="text-[13px] text-gray-500 uppercase tracking-wide font-semibold">RECENT ACTIVITY</div>
        </div>
        
        {recentActivities.length > 0 ? (
          <>
            <div className="border-t border-b border-gray-200">
              {recentActivities.map((activity, index) => {
                const Icon = activity.icon;
                const isLast = index === recentActivities.length - 1;
                return (
                  <div
                    key={activity.id}
                    className="px-4 py-3 flex items-center justify-between border-b border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    style={{ borderBottomWidth: isLast ? '0' : '0.5px' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                        <Icon size={18} className="text-blue-500" strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[16px] text-gray-900 truncate">{activity.title}</div>
                        <div className="text-[13px] text-gray-500 flex items-center gap-1">
                          <Clock size={11} />
                          {activity.time}
                        </div>
                      </div>
                    </div>
                    <div className="text-[15px] font-semibold text-blue-500 flex-shrink-0 ml-2">
                      {activity.amount}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* View All Link */}
            <button
              onClick={() => navigate('/mobile/analytics')}
              className="w-full px-4 py-4 flex items-center justify-center gap-2 text-blue-500 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <span className="text-[16px] font-medium">View All Activity</span>
              <ChevronRight size={18} strokeWidth={2} />
            </button>
          </>
        ) : (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <ShoppingCart size={40} className="text-gray-400" strokeWidth={1.5} />
            </div>
            <p className="text-gray-900 text-[17px] font-semibold mb-2">No recent activity</p>
            <p className="text-[15px] text-gray-500 mb-6 max-w-sm mx-auto">
              Start making sales to see recent activity here
            </p>
            <button
              onClick={() => navigate('/mobile/pos')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 active:bg-blue-700 transition-colors shadow-sm"
            >
              <ShoppingCart size={20} strokeWidth={2.5} />
              New Sale
            </button>
          </div>
        )}
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default MobileDashboard;
