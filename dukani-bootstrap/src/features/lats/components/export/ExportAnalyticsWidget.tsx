import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Target, AlertTriangle, Lightbulb, Download, FileSpreadsheet, Users, Clock, CheckCircle, Activity } from 'lucide-react';
import GlassCard from '../../../shared/components/ui/GlassCard';

interface ExportAnalyticsData {
  totalExports: number;
  thisMonthExports: number;
  lastMonthExports: number;
  mostExportedType: string;
  successRate: number;
  averageProcessingTime: number;
  userAdoptionRate: number;
  popularFormats: Array<{
    format: string;
    count: number;
    percentage: number;
  }>;
  exportTrends: Array<{
    month: string;
    count: number;
    growth: number;
  }>;
}

interface ExportAnalyticsWidgetProps {
  className?: string;
}

export const ExportAnalyticsWidget: React.FC<ExportAnalyticsWidgetProps> = ({
  className
}) => {
  const [analytics, setAnalytics] = useState<ExportAnalyticsData>({
    totalExports: 0,
    thisMonthExports: 0,
    lastMonthExports: 0,
    mostExportedType: '',
    successRate: 0,
    averageProcessingTime: 0,
    userAdoptionRate: 0,
    popularFormats: [],
    exportTrends: []
  });

  const [insights, setInsights] = useState<Array<{
    type: 'warning' | 'opportunity' | 'success';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
  }>>([]);

  // Mock data for demonstration
  const mockAnalytics: ExportAnalyticsData = {
    totalExports: 2856,
    thisMonthExports: 234,
    lastMonthExports: 198,
    mostExportedType: 'Product Catalog',
    successRate: 97.3,
    averageProcessingTime: 3.2,
    userAdoptionRate: 72.4,
    popularFormats: [
      { format: 'Excel', count: 1456, percentage: 51 },
      { format: 'CSV', count: 892, percentage: 31.3 },
      { format: 'PDF', count: 345, percentage: 12.1 },
      { format: 'JSON', count: 163, percentage: 5.7 }
    ],
    exportTrends: [
      { month: 'Jul', count: 156, growth: 0 },
      { month: 'Aug', count: 178, growth: 14.1 },
      { month: 'Sep', count: 201, growth: 12.9 },
      { month: 'Oct', count: 223, growth: 11 },
      { month: 'Nov', count: 245, growth: 9.9 },
      { month: 'Dec', count: 267, growth: 8.98 }
    ]
  };

  useEffect(() => {
    // Simulate loading data
    const loadAnalytics = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAnalytics(mockAnalytics);
    };
    loadAnalytics();
  }, []);

  // Generate insights based on analytics
  const generateInsights = useMemo(() => {
    const newInsights = [];

    // Export growth analysis
    const growthRate = ((analytics.thisMonthExports - analytics.lastMonthExports) / analytics.lastMonthExports) * 100;

    if (growthRate > 15) {
      newInsights.push({
        type: 'success' as const,
        title: 'Export Usage Surging!',
        description: `Exports increased by ${growthRate.toFixed(1)}% this month. High demand for data portability!`,
        impact: 'high' as const
      });
    } else if (growthRate < -10) {
      newInsights.push({
        type: 'warning' as const,
        title: 'Export Usage Declining',
        description: `Exports decreased by ${Math.abs(growthRate).toFixed(1)}%. Consider improving export features or user training.`,
        impact: 'medium' as const
      });
    }

    // Success rate analysis
    if (analytics.successRate < 95) {
      newInsights.push({
        type: 'warning' as const,
        title: 'Export Success Rate Low',
        description: `Only ${analytics.successRate.toFixed(1)}% of exports succeed. Check for system issues or user errors.`,
        impact: 'high' as const
      });
    }

    // Processing time analysis
    if (analytics.averageProcessingTime > 5) {
      newInsights.push({
        type: 'warning' as const,
        title: 'Slow Export Processing',
        description: `Average export time is ${analytics.averageProcessingTime.toFixed(1)} minutes. Performance optimization needed.`,
        impact: 'medium' as const
      });
    }

    // User adoption analysis
    if (analytics.userAdoptionRate < 60) {
      newInsights.push({
        type: 'opportunity' as const,
        title: 'Low Export Adoption',
        description: `Only ${analytics.userAdoptionRate.toFixed(1)}% of users export data. Promote export features more effectively.`,
        impact: 'medium' as const
      });
    }

    // Format popularity insights
    const excelUsage = analytics.popularFormats.find(f => f.format === 'Excel')?.percentage || 0;
    if (excelUsage > 60) {
      newInsights.push({
        type: 'opportunity' as const,
        title: 'Excel Dominates Exports',
        description: `${excelUsage.toFixed(1)}% of exports use Excel. Consider optimizing Excel export features.`,
        impact: 'low' as const
      });
    }

    return newInsights;
  }, [analytics]);

  useEffect(() => {
    setInsights(generateInsights);
  }, [generateInsights]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'opportunity':
        return <Lightbulb className="w-4 h-4 text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <BarChart3 className="w-4 h-4 text-gray-500" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'opportunity':
        return 'border-l-blue-500 bg-blue-50';
      case 'success':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const formatGrowth = (current: number, previous: number) => {
    const growth = ((current - previous) / previous) * 100;
    return {
      value: growth,
      isPositive: growth > 0,
      formatted: `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`
    };
  };

  const exportGrowth = formatGrowth(analytics.thisMonthExports, analytics.lastMonthExports);

  return (
    <GlassCard className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <BarChart3 className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Export Analytics</h3>
            <p className="text-xs text-gray-600">Usage insights & performance metrics</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <Download className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-900">This Month</span>
          </div>
          <div className="text-lg font-bold text-blue-700">{analytics.thisMonthExports}</div>
          <div className={`text-xs flex items-center space-x-1 ${
            exportGrowth.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {exportGrowth.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{exportGrowth.formatted}</span>
          </div>
        </div>

        <div className="bg-green-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-green-900">Success Rate</span>
          </div>
          <div className="text-lg font-bold text-green-700">{analytics.successRate.toFixed(1)}%</div>
          <div className="text-xs text-green-600">Export success rate</div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-600">Total Exports</span>
          <span className="font-medium text-gray-900">{analytics.totalExports.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-600">Most Exported</span>
          <span className="font-medium text-gray-900">{analytics.mostExportedType}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-600">Avg Processing Time</span>
          <span className="font-medium text-gray-900">{analytics.averageProcessingTime.toFixed(1)} min</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-600">User Adoption</span>
          <span className="font-medium text-gray-900">{analytics.userAdoptionRate.toFixed(1)}%</span>
        </div>
      </div>

      {/* Format Popularity */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Popular Formats</h4>
        <div className="space-y-2">
          {analytics.popularFormats.map((format, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <span className="text-gray-600">{format.format}</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full"
                    style={{ width: `${format.percentage}%` }}
                  ></div>
                </div>
                <span className="font-medium w-8 text-right">{format.percentage.toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Insights */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Smart Insights</h4>
        {insights.length === 0 ? (
          <div className="text-center py-4">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
            <p className="text-xs text-gray-500">All systems performing well</p>
          </div>
        ) : (
          insights.slice(0, 2).map((insight, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border-l-4 text-xs ${getInsightColor(insight.type)}`}
            >
              <div className="flex items-start space-x-2">
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{insight.title}</div>
                  <div className="text-gray-700 mt-1">{insight.description}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex space-x-2">
          <button className="flex-1 text-xs bg-blue-100 text-blue-700 py-2 px-3 rounded hover:bg-blue-200 transition-colors">
            View Full Report
          </button>
          <button className="flex-1 text-xs bg-green-100 text-green-700 py-2 px-3 rounded hover:bg-green-200 transition-colors">
            Usage Trends
          </button>
        </div>
      </div>
    </GlassCard>
  );
};

