import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Download, FileSpreadsheet, Calendar, Filter, Search, DollarSign, Package, Truck, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import GlassCard from '../../../shared/components/ui/GlassCard';

interface POReportData {
  totalPOs: number;
  totalValue: number;
  averageOrderValue: number;
  onTimeDeliveryRate: number;
  supplierPerformance: Array<{
    supplierName: string;
    totalOrders: number;
    totalValue: number;
    onTimeDeliveries: number;
    averageDeliveryTime: number;
    qualityScore: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    orderCount: number;
    totalValue: number;
    percentage: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    orderCount: number;
    totalValue: number;
    growth: number;
  }>;
  statusBreakdown: {
    draft: number;
    sent: number;
    received: number;
    cancelled: number;
  };
}

interface POReportingAnalyticsProps {
  className?: string;
  dateRange?: { start: Date; end: Date };
  onExport?: (format: 'csv' | 'excel' | 'pdf') => void;
}

export const POReportingAnalytics: React.FC<POReportingAnalyticsProps> = ({
  className,
  dateRange,
  onExport
}) => {
  const [reportData, setReportData] = useState<POReportData>({
    totalPOs: 0,
    totalValue: 0,
    averageOrderValue: 0,
    onTimeDeliveryRate: 0,
    supplierPerformance: [],
    categoryBreakdown: [],
    monthlyTrends: [],
    statusBreakdown: { draft: 0, sent: 0, received: 0, cancelled: 0 }
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'suppliers' | 'categories' | 'trends'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for demonstration
  const mockData: POReportData = {
    totalPOs: 247,
    totalValue: 12500000,
    averageOrderValue: 50607,
    onTimeDeliveryRate: 87.5,
    supplierPerformance: [
      {
        supplierName: 'TechCorp Ltd',
        totalOrders: 45,
        totalValue: 3200000,
        onTimeDeliveries: 42,
        averageDeliveryTime: 3.2,
        qualityScore: 9.2
      },
      {
        supplierName: 'Global Supplies Inc',
        totalOrders: 38,
        totalValue: 2800000,
        onTimeDeliveries: 35,
        averageDeliveryTime: 4.1,
        qualityScore: 8.7
      },
      {
        supplierName: 'Local Distributors',
        totalOrders: 67,
        totalValue: 1950000,
        onTimeDeliveries: 58,
        averageDeliveryTime: 2.8,
        qualityScore: 9.5
      }
    ],
    categoryBreakdown: [
      { category: 'Electronics', orderCount: 89, totalValue: 4500000, percentage: 36 },
      { category: 'Office Supplies', orderCount: 67, totalValue: 3200000, percentage: 25.6 },
      { category: 'Furniture', orderCount: 45, totalValue: 2800000, percentage: 22.4 },
      { category: 'IT Equipment', orderCount: 34, totalValue: 1500000, percentage: 12 },
      { category: 'Other', orderCount: 12, totalValue: 500000, percentage: 4 }
    ],
    monthlyTrends: [
      { month: 'Jan', orderCount: 18, totalValue: 850000, growth: 0 },
      { month: 'Feb', orderCount: 22, totalValue: 920000, growth: 8.2 },
      { month: 'Mar', orderCount: 25, totalValue: 1100000, growth: 19.6 },
      { month: 'Apr', orderCount: 28, totalValue: 1250000, growth: 13.6 },
      { month: 'May', orderCount: 32, totalValue: 1350000, growth: 8 },
      { month: 'Jun', orderCount: 35, totalValue: 1480000, growth: 9.6 }
    ],
    statusBreakdown: {
      draft: 12,
      sent: 45,
      received: 185,
      cancelled: 5
    }
  };

  useEffect(() => {
    // Simulate loading data
    const loadData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setReportData(mockData);
      setIsLoading(false);
    };

    loadData();
  }, [dateRange]);

  const formatCurrency = (amount: number) => {
    return `TZS ${amount.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (growth < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <BarChart3 className="w-4 h-4 text-gray-500" />;
  };

  const exportReport = (format: 'csv' | 'excel' | 'pdf') => {
    if (onExport) {
      onExport(format);
    } else {
      // Default export functionality
      console.log(`Exporting report as ${format.toUpperCase()}`);
    }
  };

  if (isLoading) {
    return (
      <GlassCard className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <BarChart3 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">PO Analytics & Reporting</h3>
            <p className="text-sm text-gray-600">Comprehensive purchase order insights</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => exportReport('csv')}
            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
            title="Export as CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => exportReport('excel')}
            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
            title="Export as Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-6">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'suppliers', label: 'Suppliers', icon: Truck },
            { id: 'categories', label: 'Categories', icon: Package },
            { id: 'trends', label: 'Trends', icon: TrendingUp }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Total POs</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">{reportData.totalPOs}</div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Total Value</span>
              </div>
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(reportData.totalValue)}
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Avg Order Value</span>
              </div>
              <div className="text-2xl font-bold text-purple-700">
                {formatCurrency(reportData.averageOrderValue)}
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">On-Time Delivery</span>
              </div>
              <div className="text-2xl font-bold text-orange-700">
                {formatPercentage(reportData.onTimeDeliveryRate)}
              </div>
            </div>
          </div>

          {/* Status Breakdown */}
          <div>
            <h4 className="text-md font-semibold mb-3">Order Status Breakdown</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(reportData.statusBreakdown).map(([status, count]) => (
                <div key={status} className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="text-lg font-bold text-gray-700">{count}</div>
                  <div className="text-sm text-gray-600 capitalize">{status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <h4 className="text-md font-semibold">Supplier Performance</h4>
          <div className="space-y-3">
            {reportData.supplierPerformance.map((supplier, index) => (
              <div key={index} className="bg-white border border-gray-200 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h5 className="font-medium text-gray-900">{supplier.supplierName}</h5>
                    <p className="text-sm text-gray-600">
                      {supplier.totalOrders} orders • {formatCurrency(supplier.totalValue)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-600">
                      {supplier.qualityScore}/10 Quality
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">On-Time:</span>
                    <span className="ml-2 font-medium">
                      {supplier.onTimeDeliveries}/{supplier.totalOrders}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Avg Delivery:</span>
                    <span className="ml-2 font-medium">{supplier.averageDeliveryTime} days</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Success Rate:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {formatPercentage((supplier.onTimeDeliveries / supplier.totalOrders) * 100)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-4">
          <h4 className="text-md font-semibold">Category Breakdown</h4>
          <div className="space-y-3">
            {reportData.categoryBreakdown.map((category, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{category.category}</div>
                  <div className="text-sm text-gray-600">
                    {category.orderCount} orders • {formatCurrency(category.totalValue)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">
                    {formatPercentage(category.percentage)}
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="space-y-4">
          <h4 className="text-md font-semibold">Monthly Trends</h4>
          <div className="space-y-3">
            {reportData.monthlyTrends.map((month, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="font-medium text-gray-900 w-12">{month.month}</div>
                  <div className="text-sm text-gray-600">
                    {month.orderCount} orders • {formatCurrency(month.totalValue)}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getGrowthIcon(month.growth)}
                  <span className={`text-sm font-medium ${
                    month.growth > 0 ? 'text-green-600' :
                    month.growth < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {month.growth > 0 ? '+' : ''}{formatPercentage(month.growth)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
};

