import React, { useState, useEffect, useMemo } from 'react';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Target, BarChart3, Zap } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { useRealtimeDashboard } from '../../../../hooks/useRealtimeDashboard';

interface Insight {
  id: string;
  type: 'positive' | 'warning' | 'opportunity' | 'alert';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: 'sales' | 'inventory' | 'customers' | 'operations' | 'financial';
  actionable: boolean;
  confidence: number; // 0-100
  data?: any;
}

interface AIInsightsWidgetProps {
  className?: string;
}

export const AIInsightsWidget: React.FC<AIInsightsWidgetProps> = ({ className }) => {
  const { metrics, updates } = useRealtimeDashboard();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Generate AI-powered insights
  const generateInsights = useMemo(() => {
    const newInsights: Insight[] = [];

    // Sales Insights
    if (metrics.sales.today > 0) {
      // Sales growth analysis
      const growthRate = metrics.sales.growth;
      if (growthRate > 20) {
        newInsights.push({
          id: 'sales-growth-high',
          type: 'positive',
          title: 'Excellent Sales Growth!',
          description: `Sales are up ${growthRate.toFixed(1)}% compared to yesterday. Keep up the great work!`,
          impact: 'high',
          category: 'sales',
          actionable: false,
          confidence: 95
        });
      } else if (growthRate < -10) {
        newInsights.push({
          id: 'sales-decline-warning',
          type: 'warning',
          title: 'Sales Decline Detected',
          description: `Sales are down ${Math.abs(growthRate).toFixed(1)}% from yesterday. Consider reviewing promotions or marketing efforts.`,
          impact: 'high',
          category: 'sales',
          actionable: true,
          confidence: 90
        });
      }

      // Transaction analysis
      const avgTransaction = metrics.sales.today / Math.max(metrics.sales.transactions, 1);
      if (avgTransaction > 50000) { // High-value transactions
        newInsights.push({
          id: 'high-value-transactions',
          type: 'opportunity',
          title: 'High-Value Sales Opportunity',
          description: `Average transaction value is TZS ${avgTransaction.toLocaleString()}. Consider upselling strategies.`,
          impact: 'medium',
          category: 'sales',
          actionable: true,
          confidence: 85
        });
      }
    }

    // Inventory Insights
    if (metrics.inventory.lowStock > 0) {
      newInsights.push({
        id: 'low-stock-alert',
        type: 'alert',
        title: 'Low Stock Alert',
        description: `${metrics.inventory.lowStock} items are running low on stock. Replenish inventory to avoid stockouts.`,
        impact: 'high',
        category: 'inventory',
        actionable: true,
        confidence: 100,
        data: { lowStockCount: metrics.inventory.lowStock }
      });
    }

    if (metrics.inventory.criticalStock > 0) {
      newInsights.push({
        id: 'critical-stock-emergency',
        type: 'alert',
        title: 'Critical Stock Emergency!',
        description: `${metrics.inventory.criticalStock} items are critically low or out of stock. Immediate action required.`,
        impact: 'high',
        category: 'inventory',
        actionable: true,
        confidence: 100,
        data: { criticalStockCount: metrics.inventory.criticalStock }
      });
    }

    // Customer Insights
    if (metrics.customers.newToday > 0) {
      newInsights.push({
        id: 'new-customers-growth',
        type: 'positive',
        title: 'New Customer Acquisition',
        description: `Gained ${metrics.customers.newToday} new customers today. Customer base is growing!`,
        impact: 'medium',
        category: 'customers',
        actionable: false,
        confidence: 95
      });
    }

    // Device/Service Insights
    const totalDevices = metrics.devices.active + metrics.devices.completed + metrics.devices.pending;
    const completionRate = totalDevices > 0 ? (metrics.devices.completed / totalDevices) * 100 : 0;

    if (completionRate < 70) {
      newInsights.push({
        id: 'device-completion-low',
        type: 'warning',
        title: 'Device Completion Rate Low',
        description: `Only ${completionRate.toFixed(1)}% of devices are completed. Consider optimizing repair processes.`,
        impact: 'medium',
        category: 'operations',
        actionable: true,
        confidence: 85
      });
    }

    if (metrics.devices.overdue > 0) {
      newInsights.push({
        id: 'overdue-devices-alert',
        type: 'alert',
        title: 'Overdue Devices',
        description: `${metrics.devices.overdue} devices are past their expected completion date.`,
        impact: 'high',
        category: 'operations',
        actionable: true,
        confidence: 100
      });
    }

    // Employee Insights
    if (metrics.employees.present > 0 && metrics.employees.total > 0) {
      const attendanceRate = (metrics.employees.present / metrics.employees.total) * 100;
      if (attendanceRate < 80) {
        newInsights.push({
          id: 'low-attendance-warning',
          type: 'warning',
          title: 'Low Employee Attendance',
          description: `Only ${attendanceRate.toFixed(1)}% of employees are present today.`,
          impact: 'medium',
          category: 'operations',
          actionable: true,
          confidence: 90
        });
      }
    }

    // Time-based insights
    const currentHour = new Date().getHours();
    if (currentHour >= 9 && currentHour <= 11) {
      // Morning insights
      if (metrics.sales.today < 100000) { // Less than expected morning sales
        newInsights.push({
          id: 'morning-sales-slow',
          type: 'opportunity',
          title: 'Morning Sales Below Target',
          description: 'Sales are slower than usual this morning. Consider running promotions to boost activity.',
          impact: 'medium',
          category: 'sales',
          actionable: true,
          confidence: 75
        });
      }
    }

    // Peak hour analysis (based on typical business hours)
    if (currentHour >= 12 && currentHour <= 14) {
      newInsights.push({
        id: 'lunch-rush-preparation',
        type: 'opportunity',
        title: 'Lunch Rush Preparation',
        description: 'Peak lunch hours approaching. Ensure adequate staffing and inventory for busy period.',
        impact: 'medium',
        category: 'operations',
        actionable: true,
        confidence: 80
      });
    }

    // Sort by impact and confidence
    return newInsights.sort((a, b) => {
      // High impact first, then by confidence
      if (a.impact !== b.impact) {
        const impactOrder = { high: 3, medium: 2, low: 1 };
        return impactOrder[b.impact] - impactOrder[a.impact];
      }
      return b.confidence - a.confidence;
    });

  }, [metrics, updates]);

  useEffect(() => {
    setIsAnalyzing(true);

    // Simulate AI processing time
    const timeout = setTimeout(() => {
      setInsights(generateInsights);
      setIsAnalyzing(false);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [generateInsights]);

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'opportunity':
        return <Lightbulb className="w-5 h-5 text-blue-500" />;
      case 'alert':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <BarChart3 className="w-5 h-5 text-gray-500" />;
    }
  };

  const getInsightColor = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return 'border-l-green-500 bg-green-50';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'opportunity':
        return 'border-l-blue-500 bg-blue-50';
      case 'alert':
        return 'border-l-red-500 bg-red-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getImpactBadge = (impact: Insight['impact']) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[impact]}`}>
        {impact.toUpperCase()}
      </span>
    );
  };

  return (
    <GlassCard className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
            <p className="text-sm text-gray-600">Smart analysis & recommendations</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isAnalyzing && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></div>
              <span>Analyzing...</span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-gray-600">{insights.length} insights</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {insights.length === 0 && !isAnalyzing ? (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No insights available at the moment.</p>
            <p className="text-sm text-gray-400">Insights will appear as data becomes available.</p>
          </div>
        ) : (
          insights.slice(0, 10).map((insight) => (
            <div
              key={insight.id}
              className={`p-4 rounded-lg border-l-4 ${getInsightColor(insight.type)} transition-all hover:shadow-md`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900">{insight.title}</h4>
                      {getImpactBadge(insight.impact)}
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{insight.description}</p>
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      <span className="flex items-center space-x-1">
                        <Target className="w-3 h-3" />
                        <span>{insight.category}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <BarChart3 className="w-3 h-3" />
                        <span>{insight.confidence}% confidence</span>
                      </span>
                      {insight.actionable && (
                        <span className="text-blue-600 font-medium">Actionable</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {insights.length > 10 && (
        <div className="mt-4 text-center">
          <button className="text-sm text-purple-600 hover:text-purple-800 font-medium">
            View all {insights.length} insights
          </button>
        </div>
      )}
    </GlassCard>
  );
};

