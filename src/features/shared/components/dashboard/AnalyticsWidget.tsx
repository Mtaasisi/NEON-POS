import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, TrendingUp, TrendingDown, ExternalLink, Target, Users } from 'lucide-react';
import { dashboardService } from '../../../../services/dashboardService';
import { useAuth } from '../../../../context/AuthContext';

interface AnalyticsWidgetProps {
  className?: string;
}

interface AnalyticsMetrics {
  revenueGrowth: number;
  customerGrowth: number;
  avgOrderValue: number;
  totalOrders: number;
  topPerformingServices: string[];
}

export const AnalyticsWidget: React.FC<AnalyticsWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    revenueGrowth: 0,
    customerGrowth: 0,
    avgOrderValue: 0,
    totalOrders: 0,
    topPerformingServices: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      const stats = await dashboardService.getAnalyticsData(currentUser?.id || '');
      
      setMetrics({
        revenueGrowth: stats.revenueGrowth,
        customerGrowth: stats.customerGrowth,
        avgOrderValue: stats.averageOrderValue,
        totalOrders: stats.completedToday,
        topPerformingServices: stats.popularServices
      });
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    // Handle null, undefined, or invalid values
    if (amount === null || amount === undefined || isNaN(amount)) {
      return 'TSh 0';
    }
    if (amount >= 1000000000) {
      return `TSh ${(amount / 1000000000).toFixed(1)}B`;
    }
    if (amount >= 1000000) {
      return `TSh ${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `TSh ${(amount / 1000).toFixed(1)}K`;
    }
    return `TSh ${amount.toLocaleString()}`;
  };

  const getGrowthColor = (growth: number | null | undefined) => {
    if (growth === null || growth === undefined) return 'text-gray-600 bg-gray-100';
    if (growth > 0) return 'text-green-600 bg-green-100';
    if (growth < 0) return 'text-red-600 bg-red-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getGrowthIcon = (growth: number | null | undefined) => {
    if (growth === null || growth === undefined) return <Target size={12} />;
    if (growth > 0) return <TrendingUp size={12} />;
    if (growth < 0) return <TrendingDown size={12} />;
    return <Target size={12} />;
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-2xl p-7 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-75"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-150"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl p-7 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Business Analytics</h3>
            <p className="text-xs text-gray-400 mt-0.5">Key performance indicators</p>
          </div>
        </div>
      </div>

      {/* Growth Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            {metrics.revenueGrowth > 0 ? (
              <TrendingUp size={14} className="text-emerald-500" />
            ) : metrics.revenueGrowth < 0 ? (
              <TrendingDown size={14} className="text-rose-500" />
            ) : (
              <Target size={14} className="text-gray-500" />
            )}
            <span className="text-xs text-gray-500">Revenue Growth</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-2xl font-semibold ${
              metrics.revenueGrowth > 0 ? 'text-emerald-600' : 
              metrics.revenueGrowth < 0 ? 'text-rose-600' : 
              'text-gray-900'
            }`}>
              {metrics.revenueGrowth > 0 ? '+' : ''}{metrics.revenueGrowth}%
            </span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            {metrics.customerGrowth > 0 ? (
              <TrendingUp size={14} className="text-emerald-500" />
            ) : metrics.customerGrowth < 0 ? (
              <TrendingDown size={14} className="text-rose-500" />
            ) : (
              <Users size={14} className="text-gray-500" />
            )}
            <span className="text-xs text-gray-500">Customer Growth</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-2xl font-semibold ${
              metrics.customerGrowth > 0 ? 'text-emerald-600' : 
              metrics.customerGrowth < 0 ? 'text-rose-600' : 
              'text-gray-900'
            }`}>
              {metrics.customerGrowth > 0 ? '+' : ''}{metrics.customerGrowth}%
            </span>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Avg Order Value</p>
          <p className="text-xl font-semibold text-gray-900">
            {formatCurrency(metrics.avgOrderValue)}
          </p>
        </div>
        
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Orders Today</p>
          <p className="text-xl font-semibold text-gray-900">
            {metrics.totalOrders ?? 0}
          </p>
        </div>
      </div>

      {/* Top Services */}
      {metrics.topPerformingServices.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs text-gray-400 mb-3">Popular Services</h4>
          <div className="space-y-2">
            {metrics.topPerformingServices.slice(0, 3).map((service, index) => (
              <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white">{index + 1}</span>
                </div>
                <span className="text-sm text-gray-900 truncate">{service}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => navigate('/lats/analytics')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-sm text-white hover:bg-gray-800 transition-colors"
        >
          <ExternalLink size={14} />
          <span>View Analytics</span>
        </button>
      </div>
    </div>
  );
};
