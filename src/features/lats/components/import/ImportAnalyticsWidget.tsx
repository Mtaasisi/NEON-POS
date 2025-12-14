import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Target, AlertTriangle, Lightbulb, Upload, FileSpreadsheet, Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import GlassCard from '../../../shared/components/ui/GlassCard';

interface ImportAnalyticsData {
  totalImports: number;
  thisMonthImports: number;
  lastMonthImports: number;
  mostImportedType: string;
  successRate: number;
  averageProcessingTime: number;
  userAdoptionRate: number;
  errorRate: number;
  dataQualityScore: number;
  importMethods: Array<{
    method: string;
    count: number;
    percentage: number;
  }>;
  importTrends: Array<{
    month: string;
    count: number;
    successRate: number;
    growth: number;
  }>;
}

interface ImportAnalyticsWidgetProps {
  className?: string;
}

export const ImportAnalyticsWidget: React.FC<ImportAnalyticsWidgetProps> = ({
  className
}) => {
  const [analytics, setAnalytics] = useState<ImportAnalyticsData>({
    totalImports: 0,
    thisMonthImports: 0,
    lastMonthImports: 0,
    mostImportedType: '',
    successRate: 0,
    averageProcessingTime: 0,
    userAdoptionRate: 0,
    errorRate: 0,
    dataQualityScore: 0,
    importMethods: [],
    importTrends: []
  });

  const [insights, setInsights] = useState<Array<{
    type: 'warning' | 'opportunity' | 'success' | 'alert';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
  }>>([]);

  // Mock data for demonstration
  const mockAnalytics: ImportAnalyticsData = {
    totalImports: 1847,
    thisMonthImports: 156,
    lastMonthImports: 142,
    mostImportedType: 'Product Data',
    successRate: 91.2,
    averageProcessingTime: 4.7,
    userAdoptionRate: 68.9,
    errorRate: 8.8,
    dataQualityScore: 87.5,
    importMethods: [
      { method: 'CSV Upload', count: 892, percentage: 48.3 },
      { method: 'Excel File', count: 634, percentage: 34.3 },
      { method: 'API Integration', count: 234, percentage: 12.7 },
      { method: 'Manual Entry', count: 87, percentage: 4.7 }
    ],
    importTrends: [
      { month: 'Jul', count: 134, successRate: 89.2, growth: 0 },
      { month: 'Aug', count: 145, successRate: 90.8, growth: 8.2 },
      { month: 'Sep', count: 158, successRate: 91.5, growth: 9 },
      { month: 'Oct', count: 167, successRate: 92.1, growth: 5.7 },
      { month: 'Nov', count: 178, successRate: 91.8, growth: 6.6 },
      { month: 'Dec', count: 189, successRate: 91.2, growth: 6.2 }
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

    // Success rate analysis
    if (analytics.successRate < 85) {
      newInsights.push({
        type: 'warning' as const,
        title: 'Import Success Rate Low',
        description: `Only ${analytics.successRate.toFixed(1)}% of imports succeed. Check data quality and validation rules.`,
        impact: 'high' as const
      });
    } else if (analytics.successRate > 95) {
      newInsights.push({
        type: 'success' as const,
        title: 'Excellent Import Performance',
        description: `${analytics.successRate.toFixed(1)}% success rate shows great data quality and processes.`,
        impact: 'medium' as const
      });
    }

    // Error rate analysis
    if (analytics.errorRate > 15) {
      newInsights.push({
        type: 'alert' as const,
        title: 'High Error Rate Detected',
        description: `${analytics.errorRate.toFixed(1)}% of imports have errors. Immediate attention needed.`,
        impact: 'high' as const
      });
    }

    // Data quality analysis
    if (analytics.dataQualityScore < 80) {
      newInsights.push({
        type: 'warning' as const,
        title: 'Data Quality Issues',
        description: `Data quality score is ${analytics.dataQualityScore.toFixed(1)}%. Consider data validation improvements.`,
        impact: 'medium' as const
      });
    }

    // Processing time analysis
    if (analytics.averageProcessingTime > 10) {
      newInsights.push({
        type: 'warning' as const,
        title: 'Slow Import Processing',
        description: `Average import time is ${analytics.averageProcessingTime.toFixed(1)} minutes. Performance optimization needed.`,
        impact: 'medium' as const
      });
    }

    // User adoption analysis
    if (analytics.userAdoptionRate < 50) {
      newInsights.push({
        type: 'opportunity' as const,
        title: 'Low Import Adoption',
        description: `Only ${analytics.userAdoptionRate.toFixed(1)}% of users perform imports. Training may be needed.`,
        impact: 'medium' as const
      });
    }

    // Method preference insights
    const csvUsage = analytics.importMethods.find(m => m.method === 'CSV Upload')?.percentage || 0;
    if (csvUsage > 50) {
      newInsights.push({
        type: 'opportunity' as const,
        title: 'CSV Dominates Imports',
        description: `${csvUsage.toFixed(1)}% of imports use CSV. Consider optimizing CSV workflows.`,
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
      case 'alert':
        return <XCircle className="w-4 h-4 text-red-500" />;
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
      case 'alert':
        return 'border-l-red-500 bg-red-50';
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

  const importGrowth = formatGrowth(analytics.thisMonthImports, analytics.lastMonthImports);

  return (
    <GlassCard className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <BarChart3 className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Import Analytics</h3>
            <p className="text-xs text-gray-600">Usage insights & performance metrics</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <Upload className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-900">This Month</span>
          </div>
          <div className="text-lg font-bold text-blue-700">{analytics.thisMonthImports}</div>
          <div className={`text-xs flex items-center space-x-1 ${
            importGrowth.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {importGrowth.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{importGrowth.formatted}</span>
          </div>
        </div>

        <div className="bg-green-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-green-900">Success Rate</span>
          </div>
          <div className="text-lg font-bold text-green-700">{analytics.successRate.toFixed(1)}%</div>
          <div className="text-xs text-green-600">Import success rate</div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-600">Total Imports</span>
          <span className="font-medium text-gray-900">{analytics.totalImports.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-600">Most Imported</span>
          <span className="font-medium text-gray-900">{analytics.mostImportedType}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-600">Avg Processing Time</span>
          <span className="font-medium text-gray-900">{analytics.averageProcessingTime.toFixed(1)} min</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-600">Data Quality Score</span>
          <span className="font-medium text-gray-900">{analytics.dataQualityScore.toFixed(1)}/100</span>
        </div>
      </div>

      {/* Method Popularity */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Import Methods</h4>
        <div className="space-y-2">
          {analytics.importMethods.map((method, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <span className="text-gray-600">{method.method}</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full"
                    style={{ width: `${method.percentage}%` }}
                  ></div>
                </div>
                <span className="font-medium w-8 text-right">{method.percentage.toFixed(0)}%</span>
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
            Error Analysis
          </button>
        </div>
      </div>
    </GlassCard>
  );
};

