import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Target, AlertTriangle, Lightbulb, DollarSign, Package, Clock, CheckCircle, XCircle, Users, Truck, AlertCircle } from 'lucide-react';
import GlassCard from '../../../../../shared/components/ui/GlassCard';

interface OrderAnalyticsData {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  overdueOrders: number;
  totalValue: number;
  averageOrderValue: number;
  onTimeDeliveryRate: number;
  pendingApprovals: number;
  criticalOrders: number;
  supplierPerformance: Array<{
    supplierName: string;
    totalOrders: number;
    onTimeDeliveries: number;
    averageDelay: number;
  }>;
}

interface OrderAnalyticsWidgetProps {
  className?: string;
  orders?: any[];
  selectedOrder?: any;
}

export const OrderAnalyticsWidget: React.FC<OrderAnalyticsWidgetProps> = ({
  className,
  orders = [],
  selectedOrder
}) => {
  const [analytics, setAnalytics] = useState<OrderAnalyticsData>({
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    overdueOrders: 0,
    totalValue: 0,
    averageOrderValue: 0,
    onTimeDeliveryRate: 0,
    pendingApprovals: 0,
    criticalOrders: 0,
    supplierPerformance: []
  });

  const [insights, setInsights] = useState<Array<{
    type: 'warning' | 'opportunity' | 'success' | 'alert';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
  }>>([]);

  // Calculate analytics from orders data
  const calculatedAnalytics = useMemo(() => {
    const totalOrders = orders.length;
    const activeOrders = orders.filter(order =>
      ['sent', 'confirmed', 'shipped', 'partial_received'].includes(order.status)
    ).length;
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    const overdueOrders = orders.filter(order => {
      if (!order.estimatedDelivery) return false;
      const deliveryDate = new Date(order.estimatedDelivery);
      return deliveryDate < new Date() && order.status !== 'completed';
    }).length;

    const totalValue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0;

    // Calculate on-time delivery rate
    const deliveredOrders = orders.filter(order => order.status === 'completed');
    const onTimeDeliveries = deliveredOrders.filter(order => {
      if (!order.actualDelivery || !order.estimatedDelivery) return true;
      return new Date(order.actualDelivery) <= new Date(order.estimatedDelivery);
    }).length;
    const onTimeDeliveryRate = deliveredOrders.length > 0 ? (onTimeDeliveries / deliveredOrders.length) * 100 : 0;

    const pendingApprovals = orders.filter(order => order.status === 'draft').length;
    const criticalOrders = orders.filter(order => {
      const isOverdue = order.estimatedDelivery && new Date(order.estimatedDelivery) < new Date();
      const isHighValue = (order.totalAmount || 0) > 500000; // High value threshold
      return isOverdue && isHighValue && order.status !== 'completed';
    }).length;

    // Supplier performance calculation
    const supplierStats = orders.reduce((acc, order) => {
      if (!order.supplier?.name) return acc;
      const supplierName = order.supplier.name;

      if (!acc[supplierName]) {
        acc[supplierName] = {
          totalOrders: 0,
          onTimeDeliveries: 0,
          totalDelay: 0,
          delayCount: 0
        };
      }

      acc[supplierName].totalOrders++;

      if (order.status === 'completed') {
        if (order.actualDelivery && order.estimatedDelivery) {
          const delay = new Date(order.actualDelivery).getTime() - new Date(order.estimatedDelivery).getTime();
          if (delay <= 0) {
            acc[supplierName].onTimeDeliveries++;
          } else {
            acc[supplierName].totalDelay += delay;
            acc[supplierName].delayCount++;
          }
        } else {
          acc[supplierName].onTimeDeliveries++;
        }
      }

      return acc;
    }, {} as Record<string, any>);

    const supplierPerformance = Object.entries(supplierStats).map(([supplierName, stats]: [string, any]) => ({
      supplierName,
      totalOrders: stats.totalOrders,
      onTimeDeliveries: stats.onTimeDeliveries,
      averageDelay: stats.delayCount > 0 ? stats.totalDelay / stats.delayCount / (1000 * 60 * 60 * 24) : 0
    }));

    return {
      totalOrders,
      activeOrders,
      completedOrders,
      overdueOrders,
      totalValue,
      averageOrderValue,
      onTimeDeliveryRate,
      pendingApprovals,
      criticalOrders,
      supplierPerformance
    };
  }, [orders]);

  // Generate AI insights based on analytics and selected order
  const generateInsights = useMemo(() => {
    const newInsights = [];

    // Overdue orders alert
    if (analytics.overdueOrders > 0) {
      newInsights.push({
        type: 'alert' as const,
        title: 'Overdue Orders Alert',
        description: `${analytics.overdueOrders} orders are past their delivery date. Immediate follow-up required.`,
        impact: 'high' as const
      });
    }

    // Critical orders warning
    if (analytics.criticalOrders > 0) {
      newInsights.push({
        type: 'warning' as const,
        title: 'Critical Orders at Risk',
        description: `${analytics.criticalOrders} high-value orders are overdue. Consider expedited shipping options.`,
        impact: 'high' as const
      });
    }

    // Pending approvals
    if (analytics.pendingApprovals > 5) {
      newInsights.push({
        type: 'warning' as const,
        title: 'Approval Backlog',
        description: `${analytics.pendingApprovals} orders pending approval. Streamline approval process.`,
        impact: 'medium' as const
      });
    }

    // On-time delivery performance
    if (analytics.onTimeDeliveryRate < 80) {
      newInsights.push({
        type: 'warning' as const,
        title: 'Delivery Performance Issue',
        description: `On-time delivery rate is ${analytics.onTimeDeliveryRate.toFixed(1)}%. Review supplier performance.`,
        impact: 'medium' as const
      });
    } else if (analytics.onTimeDeliveryRate > 95) {
      newInsights.push({
        type: 'success' as const,
        title: 'Excellent Delivery Performance',
        description: `On-time delivery rate is ${analytics.onTimeDeliveryRate.toFixed(1)}%. Outstanding supplier performance!`,
        impact: 'medium' as const
      });
    }

    // Selected order insights
    if (selectedOrder) {
      const orderValue = selectedOrder.totalAmount || 0;
      const isHighValue = orderValue > 500000;

      if (isHighValue && selectedOrder.status === 'draft') {
        newInsights.push({
          type: 'opportunity' as const,
          title: 'High-Value Order Opportunity',
          description: `This TZS ${orderValue.toLocaleString()} order could benefit from bulk discounts or extended terms.`,
          impact: 'medium' as const
        });
      }

      if (selectedOrder.estimatedDelivery) {
        const deliveryDate = new Date(selectedOrder.estimatedDelivery);
        const now = new Date();
        const daysUntilDelivery = Math.ceil((deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDelivery < 0) {
          newInsights.push({
            type: 'alert' as const,
            title: 'Order Overdue',
            description: `This order is ${Math.abs(daysUntilDelivery)} days overdue. Contact supplier immediately.`,
            impact: 'high' as const
          });
        } else if (daysUntilDelivery <= 3) {
          newInsights.push({
            type: 'warning' as const,
            title: 'Approaching Delivery Date',
            description: `Order delivery in ${daysUntilDelivery} days. Prepare for receipt.`,
            impact: 'medium' as const
          });
        }
      }
    }

    // Supplier performance insights
    const poorPerformers = analytics.supplierPerformance.filter(s =>
      s.totalOrders >= 3 && (s.onTimeDeliveries / s.totalOrders) < 0.7
    );

    if (poorPerformers.length > 0) {
      newInsights.push({
        type: 'warning' as const,
        title: 'Supplier Performance Issues',
        description: `${poorPerformers.length} suppliers have delivery rates below 70%. Consider alternative suppliers.`,
        impact: 'medium' as const
      });
    }

    return newInsights;
  }, [analytics, selectedOrder]);

  useEffect(() => {
    setAnalytics(calculatedAnalytics);
  }, [calculatedAnalytics]);

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
        return <AlertCircle className="w-4 h-4 text-red-500" />;
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
            <h3 className="text-sm font-semibold text-gray-900">Order Analytics</h3>
            <p className="text-xs text-gray-600">Smart insights & performance metrics</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <Package className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-900">Active Orders</span>
          </div>
          <div className="text-lg font-bold text-blue-700">{analytics.activeOrders}</div>
        </div>

        <div className="bg-red-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-xs font-medium text-red-900">Overdue</span>
          </div>
          <div className="text-lg font-bold text-red-700">{analytics.overdueOrders}</div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-600">On-Time Delivery</span>
          <span className={`font-medium ${analytics.onTimeDeliveryRate >= 80 ? 'text-green-600' : 'text-red-600'}`}>
            {analytics.onTimeDeliveryRate.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${analytics.onTimeDeliveryRate >= 80 ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(analytics.onTimeDeliveryRate, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Smart Insights</h4>
        {insights.length === 0 ? (
          <div className="text-center py-4">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
            <p className="text-xs text-gray-500">All systems operational</p>
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

