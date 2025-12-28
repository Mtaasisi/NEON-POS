import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Target, AlertTriangle, Lightbulb, DollarSign, Package, Clock, CheckCircle, XCircle } from 'lucide-react';
import GlassCard from '../../../shared/components/ui/GlassCard';

interface POAnalytics {
  totalPOs: number;
  activePOs: number;
  completedPOs: number;
  pendingPOs: number;
  totalValue: number;
  averageOrderValue: number;
  topSuppliers: Array<{
    name: string;
    orderCount: number;
    totalValue: number;
  }>;
  lowStockAlerts: Array<{
    productName: string;
    currentStock: number;
    reorderPoint: number;
    supplier: string;
  }>;
  overdueDeliveries: number;
  onTimeDeliveryRate: number;
}

interface POAnalyticsWidgetProps {
  className?: string;
  currentOrder?: any;
  cartItems?: any[];
}

export const POAnalyticsWidget: React.FC<POAnalyticsWidgetProps> = ({
  className,
  currentOrder,
  cartItems = []
}) => {
  const [analytics, setAnalytics] = useState<POAnalytics>({
    totalPOs: 0,
    activePOs: 0,
    completedPOs: 0,
    pendingPOs: 0,
    totalValue: 0,
    averageOrderValue: 0,
    topSuppliers: [],
    lowStockAlerts: [],
    overdueDeliveries: 0,
    onTimeDeliveryRate: 0
  });

  const [insights, setInsights] = useState<Array<{
    type: 'warning' | 'opportunity' | 'success';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
  }>>([]);

  // Generate insights based on current order and analytics
  const generateInsights = useMemo(() => {
    const newInsights = [];

    // Current order insights
    if (currentOrder && cartItems.length > 0) {
      const orderValue = cartItems.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
      const highValueItems = cartItems.filter(item => item.quantity * item.costPrice > 100000); // High value threshold

      if (highValueItems.length > 0) {
        newInsights.push({
          type: 'warning' as const,
          title: 'High-Value Order Items',
          description: `${highValueItems.length} items exceed TZS 100,000. Consider split payments or extended terms.`,
          impact: 'high' as const
        });
      }

      // Low stock alerts
      const lowStockItems = cartItems.filter(item => item.currentStock <= item.reorderPoint);
      if (lowStockItems.length > 0) {
        newInsights.push({
          type: 'opportunity' as const,
          title: 'Critical Stock Items',
          description: `${lowStockItems.length} items are at or below reorder point. Urgent replenishment needed.`,
          impact: 'high' as const
        });
      }

      // Supplier performance
      if (currentOrder.supplier) {
        const supplierStats = analytics.topSuppliers.find(s => s.name === currentOrder.supplier.name);
        if (supplierStats) {
          if (supplierStats.orderCount > 10) {
            newInsights.push({
              type: 'success' as const,
              title: 'Reliable Supplier',
              description: `${currentOrder.supplier.name} has ${supplierStats.orderCount} successful orders. Good choice!`,
              impact: 'medium' as const
            });
          }
        }
      }

      // Order timing insights
      const now = new Date();
      const orderHour = now.getHours();
      if (orderHour >= 16) { // After 4 PM
        newInsights.push({
          type: 'warning' as const,
          title: 'Late Order Creation',
          description: 'Orders created after 4 PM may not be processed until next business day.',
          impact: 'medium' as const
        });
      }

      // Bulk order insights
      if (cartItems.length > 20) {
        newInsights.push({
          type: 'opportunity' as const,
          title: 'Bulk Order Opportunity',
          description: `Large order with ${cartItems.length} items. Consider negotiating bulk discounts.`,
          impact: 'medium' as const
        });
      }
    }

    // Performance insights
    if (analytics.onTimeDeliveryRate < 80) {
      newInsights.push({
        type: 'warning' as const,
        title: 'Delivery Performance Issue',
        description: `On-time delivery rate is ${analytics.onTimeDeliveryRate.toFixed(1)}%. Consider supplier alternatives.`,
        impact: 'high' as const
      });
    }

    if (analytics.overdueDeliveries > 5) {
      newInsights.push({
        type: 'warning' as const,
        title: 'Overdue Deliveries Alert',
        description: `${analytics.overdueDeliveries} deliveries are overdue. Immediate follow-up required.`,
        impact: 'high' as const
      });
    }

    return newInsights;
  }, [currentOrder, cartItems, analytics]);

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

  const formatCurrency = (amount: number) => {
    return `TZS ${amount.toLocaleString()}`;
  };

  return (
    <GlassCard className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <BarChart3 className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">PO Analytics</h3>
            <p className="text-xs text-gray-600">Smart insights & recommendations</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <Package className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-900">Active POs</span>
          </div>
          <div className="text-lg font-bold text-blue-700">{analytics.activePOs}</div>
        </div>

        <div className="bg-green-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-green-900">Total Value</span>
          </div>
          <div className="text-lg font-bold text-green-700">
            {formatCurrency(analytics.totalValue)}
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Smart Insights</h4>
        {insights.length === 0 ? (
          <div className="text-center py-4">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-xs text-gray-500">No insights available</p>
          </div>
        ) : (
          insights.slice(0, 3).map((insight, index) => (
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
            View Reports
          </button>
          <button className="flex-1 text-xs bg-green-100 text-green-700 py-2 px-3 rounded hover:bg-green-200 transition-colors">
            Supplier Stats
          </button>
        </div>
      </div>
    </GlassCard>
  );
};

