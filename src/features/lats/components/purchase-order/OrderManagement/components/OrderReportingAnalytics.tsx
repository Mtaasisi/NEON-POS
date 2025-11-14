import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Download, FileSpreadsheet, Calendar, Filter, Search, DollarSign, Package, Truck, Clock, CheckCircle, AlertTriangle, Users, Target } from 'lucide-react';
import GlassCard from '../../../../../shared/components/ui/GlassCard';

interface OrderReportData {
  totalOrders: number;
  totalValue: number;
  averageOrderValue: number;
  onTimeDeliveryRate: number;
  orderStatusBreakdown: {
    draft: number;
    sent: number;
    confirmed: number;
    shipped: number;
    partial_received: number;
    received: number;
    completed: number;
    cancelled: number;
  };
  supplierPerformance: Array<{
    supplierName: string;
    totalOrders: number;
    totalValue: number;
    onTimeDeliveries: number;
    averageDeliveryTime: number;
    qualityScore: number;
    paymentTerms: string;
  }>;
  categoryAnalysis: Array<{
    category: string;
    orderCount: number;
    totalValue: number;
    percentage: number;
    growth: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    orderCount: number;
    totalValue: number;
    growth: number;
    avgDeliveryTime: number;
  }>;
  kpiMetrics: {
    orderAccuracy: number;
    supplierSatisfaction: number;
    costSavings: number;
    processEfficiency: number;
  };
}

interface OrderReportingAnalyticsProps {
  className?: string;
  dateRange?: { start: Date; end: Date };
  onExport?: (format: 'csv' | 'excel' | 'pdf', reportType: string) => void;
}

export const OrderReportingAnalytics: React.FC<OrderReportingAnalyticsProps> = ({
  className,
  dateRange,
  onExport
}) => {
  const [reportData, setReportData] = useState<OrderReportData>({
    totalOrders: 0,
    totalValue: 0,
    averageOrderValue: 0,
    onTimeDeliveryRate: 0,
    orderStatusBreakdown: { draft: 0, sent: 0, confirmed: 0, shipped: 0, partial_received: 0, received: 0, completed: 0, cancelled: 0 },
    supplierPerformance: [],
    categoryAnalysis: [],
    monthlyTrends: [],
    kpiMetrics: { orderAccuracy: 0, supplierSatisfaction: 0, costSavings: 0, processEfficiency: 0 }
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'suppliers' | 'categories' | 'trends' | 'kpis'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<string>('all');

  // Mock comprehensive data
  const mockData: OrderReportData = {
    totalOrders: 324,
    totalValue: 45250000,
    averageOrderValue: 139659,
    onTimeDeliveryRate: 84.5,
    orderStatusBreakdown: {
      draft: 15,
      sent: 28,
      confirmed: 45,
      shipped: 67,
      partial_received: 23,
      received: 89,
      completed: 52,
      cancelled: 5
    },
    supplierPerformance: [
      {
        supplierName: 'Global Tech Solutions',
        totalOrders: 67,
        totalValue: 12500000,
        onTimeDeliveries: 62,
        averageDeliveryTime: 4.2,
        qualityScore: 9.1,
        paymentTerms: 'Net 30'
      },
      {
        supplierName: 'Premier Office Supplies',
        totalOrders: 89,
        totalValue: 8900000,
        onTimeDeliveries: 78,
        averageDeliveryTime: 3.8,
        qualityScore: 8.9,
        paymentTerms: 'Net 15'
      },
      {
        supplierName: 'Industrial Parts Co',
        totalOrders: 45,
        totalValue: 15600000,
        onTimeDeliveries: 38,
        averageDeliveryTime: 6.1,
        qualityScore: 8.5,
        paymentTerms: 'Net 45'
      },
      {
        supplierName: 'Quality Electronics',
        totalOrders: 123,
        totalValue: 8250000,
        onTimeDeliveries: 115,
        averageDeliveryTime: 2.9,
        qualityScore: 9.5,
        paymentTerms: 'Net 30'
      }
    ],
    categoryAnalysis: [
      { category: 'IT Equipment', orderCount: 145, totalValue: 18900000, percentage: 41.7, growth: 12.5 },
      { category: 'Office Supplies', orderCount: 98, totalValue: 11200000, percentage: 24.7, growth: 8.9 },
      { category: 'Industrial Parts', orderCount: 52, totalValue: 9800000, percentage: 21.6, growth: -2.1 },
      { category: 'Furniture', orderCount: 29, totalValue: 5400000, percentage: 11.9, growth: 15.3 }
    ],
    monthlyTrends: [
      { month: 'Jul', orderCount: 24, totalValue: 2850000, growth: 0, avgDeliveryTime: 4.1 },
      { month: 'Aug', orderCount: 28, totalValue: 3200000, growth: 12.3, avgDeliveryTime: 3.8 },
      { month: 'Sep', orderCount: 31, totalValue: 3650000, growth: 14.1, avgDeliveryTime: 4.2 },
      { month: 'Oct', orderCount: 35, totalValue: 4100000, growth: 12.3, avgDeliveryTime: 3.9 },
      { month: 'Nov', orderCount: 38, totalValue: 4450000, growth: 8.5, avgDeliveryTime: 4.0 },
      { month: 'Dec', orderCount: 42, totalValue: 4800000, growth: 10.1, avgDeliveryTime: 3.7 }
    ],
    kpiMetrics: {
      orderAccuracy: 96.8,
      supplierSatisfaction: 87.5,
      costSavings: 1245000,
      processEfficiency: 92.3
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1200));
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

  const exportReport = (format: 'csv' | 'excel' | 'pdf', reportType: string) => {
    if (onExport) {
      onExport(format, reportType);
    } else {
      console.log(`Exporting ${reportType} report as ${format.toUpperCase()}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'received':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-purple-100 text-purple-800';
      case 'sent':
        return 'bg-indigo-100 text-indigo-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <GlassCard className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Generating analytics...</span>
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
            <h3 className="text-lg font-semibold text-gray-900">Order Management Analytics</h3>
            <p className="text-sm text-gray-600">Comprehensive order insights and reporting</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-400"
          >
            <option value="all">All Metrics</option>
            <option value="value">Order Value</option>
            <option value="delivery">Delivery Performance</option>
            <option value="supplier">Supplier Performance</option>
          </select>
          <button
            onClick={() => exportReport('csv', activeTab)}
            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
            title="Export as CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => exportReport('excel', activeTab)}
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
            { id: 'trends', label: 'Trends', icon: TrendingUp },
            { id: 'kpis', label: 'KPIs', icon: Target }
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
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Total Orders</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">{reportData.totalOrders}</div>
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

          {/* Order Status Breakdown */}
          <div>
            <h4 className="text-md font-semibold mb-3">Order Status Distribution</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(reportData.orderStatusBreakdown).map(([status, count]) => (
                <div key={status} className={`p-3 rounded-lg text-center ${getStatusColor(status)}`}>
                  <div className="text-lg font-bold">{count}</div>
                  <div className="text-sm capitalize">{status.replace('_', ' ')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Performing Categories */}
          <div>
            <h4 className="text-md font-semibold mb-3">Top Categories by Value</h4>
            <div className="space-y-3">
              {reportData.categoryAnalysis.slice(0, 3).map((category, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="font-medium text-gray-900">{category.category}</div>
                    <div className="text-sm text-gray-600">
                      {category.orderCount} orders • {formatCurrency(category.totalValue)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-blue-600">
                      {formatPercentage(category.percentage)}
                    </span>
                    {getGrowthIcon(category.growth)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <h4 className="text-md font-semibold">Supplier Performance Analysis</h4>
          <div className="space-y-4">
            {reportData.supplierPerformance.map((supplier, index) => (
              <div key={index} className="bg-white border border-gray-200 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h5 className="font-medium text-gray-900 text-lg">{supplier.supplierName}</h5>
                    <p className="text-sm text-gray-600">
                      {supplier.totalOrders} orders • {formatCurrency(supplier.totalValue)} • {supplier.paymentTerms}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {supplier.qualityScore}/10
                    </div>
                    <div className="text-sm text-gray-600">Quality Score</div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-gray-900">
                      {supplier.onTimeDeliveries}/{supplier.totalOrders}
                    </div>
                    <div className="text-gray-600">On-Time</div>
                    <div className={`text-xs mt-1 px-2 py-1 rounded ${
                      (supplier.onTimeDeliveries / supplier.totalOrders) > 0.8 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {formatPercentage((supplier.onTimeDeliveries / supplier.totalOrders) * 100)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{supplier.averageDeliveryTime}d</div>
                    <div className="text-gray-600">Avg Delivery</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">
                      {formatCurrency(supplier.totalValue / supplier.totalOrders)}
                    </div>
                    <div className="text-gray-600">Avg Order</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{supplier.qualityScore}</div>
                    <div className="text-gray-600">Quality</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-4">
          <h4 className="text-md font-semibold">Category Performance Analysis</h4>
          <div className="space-y-3">
            {reportData.categoryAnalysis.map((category, index) => (
              <div key={index} className="bg-white border border-gray-200 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{category.category}</h5>
                    <div className="text-sm text-gray-600">
                      {category.orderCount} orders • {formatCurrency(category.totalValue)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatPercentage(category.percentage)}
                    </div>
                    <div className="text-sm text-gray-600">of total value</div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full"
                        style={{ width: `${category.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getGrowthIcon(category.growth)}
                    <span className={`text-sm font-medium ${
                      category.growth > 0 ? 'text-green-600' :
                      category.growth < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {category.growth > 0 ? '+' : ''}{formatPercentage(category.growth)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="space-y-4">
          <h4 className="text-md font-semibold">Monthly Order Trends</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-3">Order Volume & Value</h5>
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

            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-3">Delivery Performance</h5>
              <div className="space-y-3">
                {reportData.monthlyTrends.map((month, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-900 w-12">{month.month}</div>
                    <div className="text-sm text-gray-600">
                      Avg: {month.avgDeliveryTime} days
                    </div>
                    <div className={`text-sm font-medium px-2 py-1 rounded ${
                      month.avgDeliveryTime <= 4 ? 'bg-green-100 text-green-800' :
                      month.avgDeliveryTime <= 6 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {month.avgDeliveryTime <= 4 ? 'Excellent' :
                       month.avgDeliveryTime <= 6 ? 'Good' : 'Needs Improvement'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'kpis' && (
        <div className="space-y-6">
          <h4 className="text-md font-semibold">Key Performance Indicators</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">Order Accuracy</span>
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-blue-700 mb-1">
                  {formatPercentage(reportData.kpiMetrics.orderAccuracy)}
                </div>
                <div className="text-sm text-blue-600">Target: 95%</div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-900">Supplier Satisfaction</span>
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-green-700 mb-1">
                  {formatPercentage(reportData.kpiMetrics.supplierSatisfaction)}
                </div>
                <div className="text-sm text-green-600">Based on feedback scores</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-900">Cost Savings</span>
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-3xl font-bold text-purple-700 mb-1">
                  {formatCurrency(reportData.kpiMetrics.costSavings)}
                </div>
                <div className="text-sm text-purple-600">This period</div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-orange-900">Process Efficiency</span>
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-3xl font-bold text-orange-700 mb-1">
                  {formatPercentage(reportData.kpiMetrics.processEfficiency)}
                </div>
                <div className="text-sm text-orange-600">Order processing speed</div>
              </div>
            </div>
          </div>

          {/* KPI Trends */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-3">KPI Trends (Last 6 Months)</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">+2.3%</div>
                <div className="text-xs text-gray-600">Order Accuracy</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">+5.1%</div>
                <div className="text-xs text-gray-600">Supplier Satisfaction</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-red-600">-1.2%</div>
                <div className="text-xs text-gray-600">Cost Savings</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">+3.8%</div>
                <div className="text-xs text-gray-600">Process Efficiency</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
};

