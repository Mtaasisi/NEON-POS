import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Calendar, DollarSign, Users, Package, Target, BarChart3 } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { useRealtimeDashboard } from '../../../../hooks/useRealtimeDashboard';

interface ForecastData {
  period: string;
  sales: number;
  customers: number;
  confidence: number;
}

interface TrendAnalysis {
  metric: string;
  current: number;
  predicted: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
}

interface PredictiveAnalyticsWidgetProps {
  className?: string;
}

export const PredictiveAnalyticsWidget: React.FC<PredictiveAnalyticsWidgetProps> = ({ className }) => {
  const { metrics } = useRealtimeDashboard();
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [trends, setTrends] = useState<TrendAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Generate predictive analytics
  const predictiveAnalysis = useMemo(() => {
    // Simple forecasting based on current data and trends
    // In a real implementation, this would use machine learning models

    const analysis: TrendAnalysis[] = [];

    // Sales forecasting
    const avgDailySales = metrics.sales.today;
    const predictedSales = avgDailySales * 1.05; // 5% growth assumption
    const salesChange = ((predictedSales - avgDailySales) / avgDailySales) * 100;

    analysis.push({
      metric: 'Daily Sales',
      current: avgDailySales,
      predicted: predictedSales,
      change: salesChange,
      trend: salesChange > 0 ? 'up' : salesChange < 0 ? 'down' : 'stable',
      confidence: 75
    });

    // Customer growth
    const monthlyNewCustomers = metrics.customers.newToday * 30; // Rough estimate
    const predictedCustomers = monthlyNewCustomers * 1.08; // 8% growth
    const customerChange = ((predictedCustomers - monthlyNewCustomers) / monthlyNewCustomers) * 100;

    analysis.push({
      metric: 'Monthly New Customers',
      current: monthlyNewCustomers,
      predicted: predictedCustomers,
      change: customerChange,
      trend: customerChange > 0 ? 'up' : customerChange < 0 ? 'down' : 'stable',
      confidence: 70
    });

    // Inventory turnover (simplified)
    const inventoryValue = metrics.inventory.totalValue;
    const monthlySales = avgDailySales * 30;
    const turnoverRatio = monthlySales > 0 ? (inventoryValue / monthlySales) : 0;
    const optimalTurnover = 6; // 2 months of inventory
    const recommendedValue = monthlySales * optimalTurnover;

    analysis.push({
      metric: 'Inventory Turnover',
      current: turnoverRatio,
      predicted: optimalTurnover,
      change: ((optimalTurnover - turnoverRatio) / turnoverRatio) * 100,
      trend: turnoverRatio < optimalTurnover ? 'up' : 'stable',
      confidence: 80
    });

    // Device completion rate
    const totalDevices = metrics.devices.active + metrics.devices.completed + metrics.devices.pending;
    const completionRate = totalDevices > 0 ? (metrics.devices.completed / totalDevices) * 100 : 0;
    const targetCompletionRate = 85; // Target 85% completion rate
    const completionChange = ((targetCompletionRate - completionRate) / completionRate) * 100;

    analysis.push({
      metric: 'Device Completion Rate',
      current: completionRate,
      predicted: targetCompletionRate,
      change: completionChange,
      trend: completionRate < targetCompletionRate ? 'up' : 'stable',
      confidence: 85
    });

    return analysis;
  }, [metrics]);

  // Generate 7-day forecast
  const generateForecast = useMemo(() => {
    const forecast: ForecastData[] = [];
    const baseSales = metrics.sales.today;
    const baseCustomers = metrics.customers.newToday;

    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      // Simple growth patterns (in real app, use ML models)
      const dayOfWeek = date.getDay();
      let salesMultiplier = 1;
      let customerMultiplier = 1;

      // Weekend boost
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        salesMultiplier = 1.2;
        customerMultiplier = 1.1;
      }

      // Mid-week dip
      if (dayOfWeek === 3 || dayOfWeek === 4) {
        salesMultiplier = 0.9;
        customerMultiplier = 0.95;
      }

      forecast.push({
        period: date.toLocaleDateString('en-US', { weekday: 'short' }),
        sales: Math.round(baseSales * salesMultiplier),
        customers: Math.round(baseCustomers * customerMultiplier),
        confidence: Math.max(60, 90 - (i * 5)) // Confidence decreases over time
      });
    }

    return forecast;
  }, [metrics]);

  useEffect(() => {
    setIsLoading(true);

    // Simulate data processing
    const timeout = setTimeout(() => {
      setForecastData(generateForecast);
      setTrends(predictiveAnalysis);
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timeout);
  }, [generateForecast, predictiveAnalysis]);

  const getTrendIcon = (trend: TrendAnalysis['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <BarChart3 className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatCurrency = (amount: number) => {
    return `TZS ${amount.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return (
    <GlassCard className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Target className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Predictive Analytics</h3>
            <p className="text-sm text-gray-600">Forecasts & trend analysis</p>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
            <span className="text-sm text-gray-600">Analyzing...</span>
          </div>
        )}
      </div>

      {/* Trend Analysis */}
      <div className="mb-6">
        <h4 className="text-md font-medium mb-3 flex items-center">
          <TrendingUp className="w-4 h-4 mr-2" />
          Key Metrics Forecast
        </h4>
        <div className="space-y-3">
          {trends.map((trend, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {getTrendIcon(trend.trend)}
                <div>
                  <div className="font-medium text-sm">{trend.metric}</div>
                  <div className="text-xs text-gray-600">
                    Current: {trend.metric.includes('Sales') || trend.metric.includes('Inventory')
                      ? formatCurrency(trend.current)
                      : trend.metric.includes('Rate')
                        ? `${trend.current.toFixed(1)}%`
                        : trend.current.toFixed(0)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-sm">
                  {trend.metric.includes('Sales') || trend.metric.includes('Inventory')
                    ? formatCurrency(trend.predicted)
                    : trend.metric.includes('Rate')
                      ? `${trend.predicted.toFixed(1)}%`
                      : trend.predicted.toFixed(0)}
                </div>
                <div className={`text-xs ${trend.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(trend.change)}
                </div>
                <div className={`text-xs ${getConfidenceColor(trend.confidence)}`}>
                  {trend.confidence}% confidence
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7-Day Forecast */}
      <div>
        <h4 className="text-md font-medium mb-3 flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          7-Day Sales Forecast
        </h4>
        <div className="grid grid-cols-7 gap-2">
          {forecastData.map((day, index) => (
            <div key={index} className="text-center">
              <div className="text-xs font-medium text-gray-600 mb-1">{day.period}</div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <div className="text-sm font-bold text-blue-600">
                  {formatCurrency(day.sales)}
                </div>
                <div className="text-xs text-gray-600">
                  +{day.customers} customers
                </div>
                <div className={`text-xs mt-1 ${getConfidenceColor(day.confidence)}`}>
                  {day.confidence}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-start space-x-2">
          <Target className="w-4 h-4 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium text-blue-900">AI-Powered Insights</div>
            <div className="text-blue-700">
              Based on current trends, sales are expected to grow by {trends.find(t => t.metric === 'Daily Sales')?.change.toFixed(1)}%
              over the next period. Consider increasing inventory for high-demand items.
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

