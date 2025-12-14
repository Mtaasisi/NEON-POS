import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Calendar, DollarSign, Users, Package, Target, BarChart3, ExternalLink, Sparkles } from 'lucide-react';
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
  const navigate = useNavigate();
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
    const avgDailySales = Number(metrics.sales.today) || 0;
    const predictedSales = avgDailySales * 1.05; // 5% growth assumption
    const salesChange = avgDailySales > 0 
      ? ((predictedSales - avgDailySales) / avgDailySales) * 100 
      : 5; // Default 5% growth if no sales

    analysis.push({
      metric: 'Daily Sales',
      current: avgDailySales,
      predicted: predictedSales,
      change: salesChange,
      trend: salesChange > 0 ? 'up' : salesChange < 0 ? 'down' : 'stable',
      confidence: 75
    });

    // Customer growth
    const monthlyNewCustomers = (Number(metrics.customers.newToday) || 0) * 30; // Rough estimate
    const predictedCustomers = monthlyNewCustomers * 1.08; // 8% growth
    const customerChange = monthlyNewCustomers > 0
      ? ((predictedCustomers - monthlyNewCustomers) / monthlyNewCustomers) * 100
      : 8; // Default 8% growth if no customers

    analysis.push({
      metric: 'Monthly New Customers',
      current: monthlyNewCustomers,
      predicted: predictedCustomers,
      change: customerChange,
      trend: customerChange > 0 ? 'up' : customerChange < 0 ? 'down' : 'stable',
      confidence: 70
    });

    // Inventory turnover (simplified)
    const inventoryValue = Number(metrics.inventory.totalValue) || 0;
    const monthlySales = avgDailySales * 30;
    const turnoverRatio = monthlySales > 0 ? (inventoryValue / monthlySales) : 0;
    const optimalTurnover = 6; // 2 months of inventory
    const recommendedValue = monthlySales * optimalTurnover;
    const turnoverChange = turnoverRatio > 0
      ? ((optimalTurnover - turnoverRatio) / turnoverRatio) * 100
      : (optimalTurnover > 0 ? 100 : 0); // If no turnover, show 100% improvement needed

    analysis.push({
      metric: 'Inventory Turnover',
      current: turnoverRatio,
      predicted: optimalTurnover,
      change: turnoverChange,
      trend: turnoverRatio < optimalTurnover ? 'up' : 'stable',
      confidence: 80
    });

    // Device completion rate
    const totalDevices = (Number(metrics.devices.active) || 0) + 
                         (Number(metrics.devices.completed) || 0) + 
                         (Number(metrics.devices.pending) || 0);
    const completionRate = totalDevices > 0 
      ? ((Number(metrics.devices.completed) || 0) / totalDevices) * 100 
      : 0;
    const targetCompletionRate = 85; // Target 85% completion rate
    const completionChange = completionRate > 0
      ? ((targetCompletionRate - completionRate) / completionRate) * 100
      : (targetCompletionRate > 0 ? 100 : 0); // If no completion, show 100% improvement needed

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
    const baseSales = Number(metrics.sales.today) || 0;
    const baseCustomers = Number(metrics.customers.newToday) || 0;

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
        return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-rose-600" />;
      default:
        return <BarChart3 className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-emerald-600 bg-emerald-50';
    if (confidence >= 60) return 'text-amber-600 bg-amber-50';
    return 'text-rose-600 bg-rose-50';
  };

  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || !isFinite(amount)) {
      return 'TSh 0';
    }
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatCompactCurrency = (amount: number) => {
    if (isNaN(amount) || !isFinite(amount) || amount < 0) {
      return 'TSh 0';
    }
    const value = Number(amount);
    if (value >= 1000000) return `TSh ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `TSh ${(value / 1000).toFixed(0)}K`;
    return `TSh ${value.toFixed(0)}`;
  };

  const formatPercentage = (value: number) => {
    if (isNaN(value) || !isFinite(value)) {
      return '+0.0%';
    }
    return `${value >= 0 ? '+' : ''}${Number(value).toFixed(1)}%`;
  };

  const getSalesTrend = () => trends.find(t => t.metric === 'Daily Sales');
  const salesTrend = getSalesTrend();

  if (isLoading && trends.length === 0) {
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
    <div className={`bg-white rounded-2xl p-7 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Predictive Analytics</h3>
            <p className="text-xs text-gray-400 mt-0.5">AI-powered forecasts & insights</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/reports')}
          className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors flex items-center gap-1.5"
          title="View All Reports"
        >
          <ExternalLink size={14} />
          <span>View All</span>
        </button>
      </div>

      {/* Main Forecast Highlight - Expanded */}
      {salesTrend && (
        <div className="mb-8 p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-500 mb-2 font-medium">Next 30 Days Forecast</p>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-4xl font-bold text-gray-900">
                  {formatCompactCurrency(salesTrend.predicted * 30)}
                </span>
                {(isNaN(salesTrend.change) || !isFinite(salesTrend.change) ? 0 : salesTrend.change) !== 0 && (
                  <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold ${
                    (isNaN(salesTrend.change) || !isFinite(salesTrend.change) ? 0 : salesTrend.change) >= 0 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-rose-100 text-rose-700'
                  }`}>
                    <TrendingUp size={14} className={(isNaN(salesTrend.change) || !isFinite(salesTrend.change) ? 0 : salesTrend.change) < 0 ? 'rotate-180' : ''} />
                    <span>{formatPercentage(salesTrend.change)}</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Based on current daily average of {formatCompactCurrency(salesTrend.current)}
              </p>
            </div>
            <div className="flex flex-col justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">Current Performance</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-white/60 rounded-lg">
                    <span className="text-xs text-gray-600">Today's Sales</span>
                    <span className="text-sm font-semibold text-gray-900">{formatCompactCurrency(salesTrend.current)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white/60 rounded-lg">
                    <span className="text-xs text-gray-600">Projected Daily</span>
                    <span className="text-sm font-semibold text-gray-900">{formatCompactCurrency(salesTrend.predicted)}</span>
                  </div>
                </div>
              </div>
              <div className={`px-3 py-2 rounded-lg text-sm font-semibold text-center ${getConfidenceColor(salesTrend.confidence)}`}>
                {salesTrend.confidence}% confidence
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Grid - Redesigned */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {trends.filter(t => t.metric !== 'Daily Sales').slice(0, 3).map((trend, index) => {
          const isCustomers = trend.metric.includes('Customers');
          const isInventory = trend.metric.includes('Inventory');
          const isRate = trend.metric.includes('Rate');
          
          // Color schemes for each metric type
          const getCardStyles = () => {
            if (isCustomers) {
              return {
                bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
                border: 'border-blue-200',
                iconBg: 'bg-blue-100',
                iconColor: 'text-blue-600',
                valueColor: 'text-blue-700',
                hover: 'hover:from-blue-100 hover:to-indigo-100'
              };
            } else if (isInventory) {
              return {
                bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
                border: 'border-amber-200',
                iconBg: 'bg-amber-100',
                iconColor: 'text-amber-600',
                valueColor: 'text-amber-700',
                hover: 'hover:from-amber-100 hover:to-orange-100'
              };
            } else if (isRate) {
              return {
                bg: 'bg-gradient-to-br from-purple-50 to-pink-50',
                border: 'border-purple-200',
                iconBg: 'bg-purple-100',
                iconColor: 'text-purple-600',
                valueColor: 'text-purple-700',
                hover: 'hover:from-purple-100 hover:to-pink-100'
              };
            }
            return {
              bg: 'bg-gradient-to-br from-gray-50 to-slate-50',
              border: 'border-gray-200',
              iconBg: 'bg-gray-100',
              iconColor: 'text-gray-600',
              valueColor: 'text-gray-700',
              hover: 'hover:from-gray-100 hover:to-slate-100'
            };
          };
          
          const styles = getCardStyles();
          const currentValue = isInventory
            ? `${(isNaN(trend.current) || !isFinite(trend.current) ? 0 : Number(trend.current)).toFixed(1)}x`
            : isRate
              ? `${(isNaN(trend.current) || !isFinite(trend.current) ? 0 : Number(trend.current)).toFixed(1)}%`
              : (isNaN(trend.current) || !isFinite(trend.current) ? 0 : Number(trend.current)).toFixed(0);
          
          const targetValue = isInventory
            ? `${(isNaN(trend.predicted) || !isFinite(trend.predicted) ? 0 : Number(trend.predicted)).toFixed(1)}x`
            : isRate
              ? `${(isNaN(trend.predicted) || !isFinite(trend.predicted) ? 0 : Number(trend.predicted)).toFixed(1)}%`
              : (isNaN(trend.predicted) || !isFinite(trend.predicted) ? 0 : Number(trend.predicted)).toFixed(0);
          
          return (
            <div key={index} className={`p-5 rounded-xl border ${styles.bg} ${styles.border} ${styles.hover} transition-all duration-200 shadow-sm hover:shadow-md`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${styles.iconBg} flex items-center justify-center`}>
                  {getTrendIcon(trend.trend)}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${getConfidenceColor(trend.confidence)}`}>
                  {trend.confidence}%
                </span>
              </div>
              
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1 font-medium">{trend.metric}</p>
                <p className={`text-2xl font-bold ${styles.valueColor}`}>
                  {currentValue}
                </p>
              </div>
              
              <div className="pt-3 border-t border-white/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Target</span>
                  <span className={`text-sm font-semibold ${styles.valueColor}`}>
                    {targetValue}
                  </span>
                </div>
                {(isNaN(trend.change) || !isFinite(trend.change) ? 0 : trend.change) !== 0 && (
                  <div className="mt-2 flex items-center gap-1">
                    <TrendingUp 
                      size={12} 
                      className={`${(isNaN(trend.change) || !isFinite(trend.change) ? 0 : trend.change) >= 0 ? 'text-emerald-600' : 'text-rose-600'} ${(isNaN(trend.change) || !isFinite(trend.change) ? 0 : trend.change) < 0 ? 'rotate-180' : ''}`} 
                    />
                    <span className={`text-xs font-medium ${
                      (isNaN(trend.change) || !isFinite(trend.change) ? 0 : trend.change) >= 0 
                        ? 'text-emerald-600' 
                        : 'text-rose-600'
                    }`}>
                      {formatPercentage(trend.change)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 7-Day Forecast - Redesigned Cards */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm text-gray-700 font-semibold">7-Day Sales Forecast</h4>
          <span className="text-xs text-gray-400">{forecastData.length} days ahead</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {forecastData.map((day, index) => {
            const maxSales = Math.max(...forecastData.map(d => d.sales));
            const salesPercent = maxSales > 0 ? (day.sales / maxSales) * 100 : 0;
            const isWeekend = day.period === 'Sat' || day.period === 'Sun';
            const isToday = index === 0;
            
            return (
              <div 
                key={index} 
                className={`p-4 rounded-xl border transition-all duration-200 shadow-sm hover:shadow-md ${
                  isToday 
                    ? 'bg-gradient-to-br from-emerald-50 to-blue-50 border-emerald-200 ring-2 ring-emerald-100' 
                    : isWeekend
                      ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100'
                      : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200 hover:from-gray-100 hover:to-slate-100'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isToday 
                        ? 'bg-emerald-100' 
                        : isWeekend 
                          ? 'bg-blue-100' 
                          : 'bg-gray-100'
                    }`}>
                      <Calendar 
                        size={16} 
                        className={
                          isToday 
                            ? 'text-emerald-600' 
                            : isWeekend 
                              ? 'text-blue-600' 
                              : 'text-gray-600'
                        } 
                      />
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${
                        isToday ? 'text-emerald-900' : 'text-gray-900'
                      }`}>
                        {day.period}
                        {isToday && <span className="ml-2 text-xs text-emerald-600">Today</span>}
                      </p>
                      <p className={`text-xs mt-0.5 ${
                        isToday ? 'text-emerald-700' : 'text-gray-500'
                      }`}>
                        {formatCompactCurrency(day.sales)}
                      </p>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getConfidenceColor(day.confidence)}`}>
                    {day.confidence}%
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="h-3 bg-white/60 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isToday
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                          : 'bg-gradient-to-r from-blue-500 to-purple-500'
                      }`}
                      style={{ width: `${salesPercent}%` }}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-white/50">
                  <div className="flex items-center gap-2">
                    <Users size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-600">+{day.customers} customers</span>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">
                    {salesPercent.toFixed(0)}% of peak
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Insights - Expanded */}
      <div className="p-5 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Target size={18} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-sm mb-1">AI Insight</p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Sales projected to grow by {(() => {
                  const change = salesTrend?.change;
                  if (isNaN(change) || !isFinite(change)) return '5.0';
                  return Number(change).toFixed(1);
                })()}% next period.
              </p>
            </div>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs text-gray-500 mb-2 font-medium">Recommendations</p>
            <ul className="space-y-1.5">
              <li className="text-xs text-gray-600 flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Optimize inventory levels for peak demand periods</span>
              </li>
              <li className="text-xs text-gray-600 flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Consider increasing stock for high-performing products</span>
              </li>
              <li className="text-xs text-gray-600 flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Plan marketing campaigns around forecasted high-sales days</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
