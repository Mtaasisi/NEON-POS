import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useDateRange } from '../../../context/DateRangeContext';
import { dashboardService, DashboardStats } from '../../../services/dashboardService';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MobileAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { dateRange, setDateRange, getDateRangeForQuery } = useDateRange();

  const [isLoading, setIsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('today');

  // Date range presets for mobile
  const dateRangePresets = [
    { id: 'today' as const, label: 'Today' },
    { id: 'week' as const, label: 'Week' },
    { id: 'month' as const, label: 'Month' },
    { id: 'custom' as const, label: 'Custom' }
  ];

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!currentUser?.id) return;

      setIsLoading(true);
      try {
        const dateRangeQuery = getDateRangeForQuery();
        const stats = await dashboardService.getDashboardStats(
          currentUser.id,
          dateRangeQuery.startDate,
          dateRangeQuery.endDate
        );
        setDashboardStats(stats);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [currentUser?.id, dateRange, getDateRangeForQuery]);

  // Handle period change
  const handlePeriodChange = (period: typeof selectedPeriod) => {
    setSelectedPeriod(period);
    
    switch (period) {
      case 'today':
        setDateRange('today');
        break;
      case 'week':
        setDateRange('thisWeek');
        break;
      case 'month':
        setDateRange('thisMonth');
        break;
      case 'custom':
        // Would open date picker modal
        break;
    }
  };

  // Mock stats for display
  const stats = [
    { 
      label: 'Revenue', 
      value: dashboardStats?.totalRevenue ? `TSh ${(dashboardStats.totalRevenue / 1000000).toFixed(1)}M` : 'TSh 0',
      change: '+12%',
      trend: 'up' as const,
      icon: DollarSign,
      color: 'green'
    },
    { 
      label: 'Sales', 
      value: dashboardStats?.totalSales || '0',
      change: '+8%',
      trend: 'up' as const,
      icon: ShoppingCart,
      color: 'blue'
    },
    { 
      label: 'Products', 
      value: dashboardStats?.totalProducts || '0',
      change: '+5',
      trend: 'up' as const,
      icon: Package,
      color: 'purple'
    },
    { 
      label: 'Clients', 
      value: dashboardStats?.totalCustomers || '0',
      change: '+3',
      trend: 'up' as const,
      icon: Users,
      color: 'orange'
    }
  ];

  const topProducts = [
    { name: 'iPhone 13 Pro', sales: 45, revenue: 'TSh 112.5M' },
    { name: 'Samsung Galaxy S21', sales: 32, revenue: 'TSh 57.6M' },
    { name: 'MacBook Pro M2', sales: 18, revenue: 'TSh 81M' }
  ];

  const recentSales = [
    { id: '1', customer: 'John Doe', amount: 'TSh 2,500,000', time: '2 min ago' },
    { id: '2', customer: 'Jane Smith', amount: 'TSh 450,000', time: '15 min ago' },
    { id: '3', customer: 'Mike Johnson', amount: 'TSh 1,200,000', time: '1 hour ago' }
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 pt-3 pb-2">
        <h1 className="text-[32px] font-bold text-black tracking-tight">Analytics</h1>
      </div>

      {/* Period Selector */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex gap-2">
          {dateRangePresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePeriodChange(preset.id)}
              className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-colors ${
                selectedPeriod === preset.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-3"></div>
            <p className="text-gray-500 text-[15px]">Loading analytics...</p>
          </div>
        </div>
      )}

      {/* Content */}
      {!isLoading && (
        <div className="flex-1 overflow-y-auto pb-20">
          {/* Stats Grid */}
          <div className="px-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-start justify-between mb-2">
                      <div className={`p-2 rounded-lg ${
                        stat.color === 'green' ? 'bg-green-100' :
                        stat.color === 'blue' ? 'bg-blue-100' :
                        stat.color === 'purple' ? 'bg-purple-100' :
                        'bg-orange-100'
                      }`}>
                        <Icon size={18} className={`${
                          stat.color === 'green' ? 'text-green-600' :
                          stat.color === 'blue' ? 'text-blue-600' :
                          stat.color === 'purple' ? 'text-purple-600' :
                          'text-orange-600'
                        }`} strokeWidth={2} />
                      </div>
                      <div className={`flex items-center gap-0.5 text-[11px] font-bold ${
                        stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.trend === 'up' ? (
                          <TrendingUp size={11} strokeWidth={3} />
                        ) : (
                          <TrendingDown size={11} strokeWidth={3} />
                        )}
                        <span>{stat.change}</span>
                      </div>
                    </div>
                    <div className="text-[22px] font-bold text-gray-900 mb-1">
                      {stat.value}
                    </div>
                    <div className="text-[12px] text-gray-500">
                      {stat.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Products */}
          <div className="px-4 py-4">
            <div className="text-[13px] text-gray-500 mb-3 uppercase tracking-wide font-semibold">TOP PRODUCTS</div>
            <div className="border-t border-b border-gray-200">
              {topProducts.map((product, index) => {
                const isLast = index === topProducts.length - 1;
                return (
                  <div
                    key={index}
                    className="px-0 py-3 flex items-center justify-between border-b border-gray-200"
                    style={{ borderBottomWidth: isLast ? '0' : '0.5px' }}
                  >
                    <div>
                      <div className="text-[16px] text-gray-900 font-medium">{product.name}</div>
                      <div className="text-[14px] text-gray-500">{product.sales} sales</div>
                    </div>
                    <div className="text-[15px] font-semibold text-green-600">
                      {product.revenue}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Sales */}
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[13px] text-gray-500 uppercase tracking-wide font-semibold">RECENT SALES</div>
              <button
                onClick={() => navigate('/mobile/pos')}
                className="text-blue-500 text-[15px] font-medium"
              >
                View All
              </button>
            </div>
            <div className="border-t border-b border-gray-200">
              {recentSales.map((sale, index) => {
                const isLast = index === recentSales.length - 1;
                return (
                  <div
                    key={sale.id}
                    className="px-0 py-3 flex items-center justify-between border-b border-gray-200"
                    style={{ borderBottomWidth: isLast ? '0' : '0.5px' }}
                  >
                    <div>
                      <div className="text-[16px] text-gray-900">{sale.customer}</div>
                      <div className="text-[14px] text-gray-500">{sale.time}</div>
                    </div>
                    <div className="text-[15px] font-semibold text-gray-900">
                      {sale.amount}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-4">
            <div className="text-[13px] text-gray-500 mb-3 uppercase tracking-wide font-semibold">QUICK ACTIONS</div>
            <div className="border-t border-b border-gray-200">
              <button
                onClick={() => navigate('/mobile/pos')}
                className="w-full px-0 py-3 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-200"
                style={{ borderBottomWidth: '0.5px' }}
              >
                <span className="text-[16px] text-black">New Sale</span>
                <ChevronRight size={18} className="text-gray-400" strokeWidth={2} />
              </button>
              <button
                onClick={() => navigate('/mobile/inventory/add')}
                className="w-full px-0 py-3 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-200"
                style={{ borderBottomWidth: '0.5px' }}
              >
                <span className="text-[16px] text-black">Add Product</span>
                <ChevronRight size={18} className="text-gray-400" strokeWidth={2} />
              </button>
              <button
                onClick={() => navigate('/mobile/clients')}
                className="w-full px-0 py-3 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <span className="text-[16px] text-black">Add Client</span>
                <ChevronRight size={18} className="text-gray-400" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileAnalytics;
