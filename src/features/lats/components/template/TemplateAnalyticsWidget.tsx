import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Target, AlertTriangle, Lightbulb, Download, FileSpreadsheet, Users, Clock, CheckCircle } from 'lucide-react';
import GlassCard from '../../../shared/components/ui/GlassCard';

interface TemplateUsageStats {
  totalDownloads: number;
  thisMonthDownloads: number;
  lastMonthDownloads: number;
  mostPopularTemplate: string;
  successRate: number;
  averageProcessingTime: number;
  userAdoptionRate: number;
}

interface TemplateAnalyticsWidgetProps {
  className?: string;
}

export const TemplateAnalyticsWidget: React.FC<TemplateAnalyticsWidgetProps> = ({
  className
}) => {
  const [stats, setStats] = useState<TemplateUsageStats>({
    totalDownloads: 0,
    thisMonthDownloads: 0,
    lastMonthDownloads: 0,
    mostPopularTemplate: '',
    successRate: 0,
    averageProcessingTime: 0,
    userAdoptionRate: 0
  });

  const [insights, setInsights] = useState<Array<{
    type: 'warning' | 'opportunity' | 'success';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
  }>>([]);

  // Mock data for demonstration
  const mockStats: TemplateUsageStats = {
    totalDownloads: 1247,
    thisMonthDownloads: 89,
    lastMonthDownloads: 76,
    mostPopularTemplate: 'Product Import Template',
    successRate: 94.2,
    averageProcessingTime: 2.3,
    userAdoptionRate: 78.5
  };

  useEffect(() => {
    // Simulate loading data
    const loadStats = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStats(mockStats);
    };
    loadStats();
  }, []);

  // Generate insights based on stats
  const generateInsights = useMemo(() => {
    const newInsights = [];

    // Download trend analysis
    const growthRate = ((stats.thisMonthDownloads - stats.lastMonthDownloads) / stats.lastMonthDownloads) * 100;

    if (growthRate > 20) {
      newInsights.push({
        type: 'success' as const,
        title: 'Template Usage Growing!',
        description: `Template downloads increased by ${growthRate.toFixed(1)}% this month. Great adoption rate!`,
        impact: 'high' as const
      });
    } else if (growthRate < -10) {
      newInsights.push({
        type: 'warning' as const,
        title: 'Template Usage Declining',
        description: `Template downloads decreased by ${Math.abs(growthRate).toFixed(1)}%. Consider user training or feature updates.`,
        impact: 'medium' as const
      });
    }

    // Success rate analysis
    if (stats.successRate < 90) {
      newInsights.push({
        type: 'warning' as const,
        title: 'Import Success Rate Low',
        description: `Only ${stats.successRate.toFixed(1)}% of template imports succeed. Template may need improvements.`,
        impact: 'high' as const
      });
    }

    // User adoption analysis
    if (stats.userAdoptionRate < 70) {
      newInsights.push({
        type: 'opportunity' as const,
        title: 'Low User Adoption',
        description: `Only ${stats.userAdoptionRate.toFixed(1)}% of users are using templates. Consider better promotion.`,
        impact: 'medium' as const
      });
    }

    // Processing time analysis
    if (stats.averageProcessingTime > 5) {
      newInsights.push({
        type: 'warning' as const,
        title: 'Slow Import Processing',
        description: `Average import time is ${stats.averageProcessingTime.toFixed(1)} minutes. Performance optimization needed.`,
        impact: 'medium' as const
      });
    }

    return newInsights;
  }, [stats]);

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

  const downloadGrowth = formatGrowth(stats.thisMonthDownloads, stats.lastMonthDownloads);

  return (
    <GlassCard className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <BarChart3 className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Template Analytics</h3>
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
          <div className="text-lg font-bold text-blue-700">{stats.thisMonthDownloads}</div>
          <div className={`text-xs flex items-center space-x-1 ${
            downloadGrowth.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {downloadGrowth.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{downloadGrowth.formatted}</span>
          </div>
        </div>

        <div className="bg-green-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-green-900">Success Rate</span>
          </div>
          <div className="text-lg font-bold text-green-700">{stats.successRate.toFixed(1)}%</div>
          <div className="text-xs text-green-600">Import success rate</div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-600">Total Downloads</span>
          <span className="font-medium text-gray-900">{stats.totalDownloads.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-600">Most Popular</span>
          <span className="font-medium text-gray-900">{stats.mostPopularTemplate}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-600">Avg Processing Time</span>
          <span className="font-medium text-gray-900">{stats.averageProcessingTime.toFixed(1)} min</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-600">User Adoption</span>
          <span className="font-medium text-gray-900">{stats.userAdoptionRate.toFixed(1)}%</span>
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

