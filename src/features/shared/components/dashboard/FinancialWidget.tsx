import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, AlertCircle, ExternalLink } from 'lucide-react';
import { dashboardService, FinancialSummary } from '../../../../services/dashboardService';

interface FinancialWidgetProps {
  className?: string;
}

export const FinancialWidget: React.FC<FinancialWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const [financialData, setFinancialData] = useState<FinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Starting to fetch financial data...');
      const data = await dashboardService.getFinancialSummary();
      console.log('💰 Financial Data Loaded:', data);
      console.log('💳 Payment Methods Detail:', data.paymentMethods.map(m => ({
        method: m.method,
        amount: m.amount,
        formatted: formatCompactCurrency(m.amount)
      })));
      setFinancialData(data);
    } catch (error) {
      console.error('❌ Error loading financial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatCompactCurrency = (amount: number) => {
    // Handle invalid or suspicious amounts
    if (!amount || isNaN(amount) || amount < 0) {
      return 'TSh 0';
    }
    
    // Cap at reasonable amount (100 billion TZS)
    if (amount > 100000000000) {
      console.warn('⚠️ Suspicious payment amount detected:', amount);
      return 'TSh ??? (Check Data)';
    }
    
    if (amount >= 1000000000) {
      return `TSh ${(amount / 1000000000).toFixed(1)}B`;
    }
    if (amount >= 1000000) {
      return `TSh ${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `TSh ${(amount / 1000).toFixed(1)}K`;
    }
    return formatCurrency(amount);
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp size={12} />;
    if (growth < 0) return <TrendingDown size={12} />;
    return null;
  };

  const getPaymentMethodColor = (index: number) => {
    const colors = [
      { bg: 'bg-blue-50', hover: 'hover:bg-blue-100', icon: 'text-blue-500', text: 'text-blue-900' },
      { bg: 'bg-emerald-50', hover: 'hover:bg-emerald-100', icon: 'text-emerald-500', text: 'text-emerald-900' },
      { bg: 'bg-purple-50', hover: 'hover:bg-purple-100', icon: 'text-purple-500', text: 'text-purple-900' },
      { bg: 'bg-orange-50', hover: 'hover:bg-orange-100', icon: 'text-orange-500', text: 'text-orange-900' },
      { bg: 'bg-pink-50', hover: 'hover:bg-pink-100', icon: 'text-pink-500', text: 'text-pink-900' },
      { bg: 'bg-cyan-50', hover: 'hover:bg-cyan-100', icon: 'text-cyan-500', text: 'text-cyan-900' },
      { bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100', icon: 'text-indigo-500', text: 'text-indigo-900' },
      { bg: 'bg-teal-50', hover: 'hover:bg-teal-100', icon: 'text-teal-500', text: 'text-teal-900' },
    ];
    return colors[index % colors.length];
  };

  if (isLoading) {
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

  if (!financialData) {
    return (
      <div className={`bg-white rounded-2xl p-7 ${className}`}>
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">Unable to load financial data</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl p-7 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Financial Overview</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-gray-400">
                {formatCompactCurrency(financialData.monthlyRevenue)} this month
              </p>
              {financialData.revenueGrowth !== 0 && (
                <div className={`flex items-center gap-0.5 ${
                  financialData.revenueGrowth > 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}>
                  {getGrowthIcon(financialData.revenueGrowth)}
                  <span className="text-xs font-medium">
                    {Math.abs(financialData.revenueGrowth)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {financialData.outstandingAmount > 0 && (
            <div className="px-3 py-1.5 rounded-full bg-amber-50">
              <span className="text-xs font-medium text-amber-600">
                {formatCompactCurrency(financialData.outstandingAmount)}
              </span>
            </div>
          )}
          <button
            onClick={() => navigate('/finance/payments')}
            className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors flex items-center gap-1.5"
            title="View All Payments"
          >
            <ExternalLink size={14} />
            <span>View All</span>
          </button>
        </div>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Today</p>
          <p className="text-xl font-semibold text-gray-900">
            {formatCompactCurrency(financialData.todayRevenue)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">This Week</p>
          <p className="text-xl font-semibold text-gray-900">
            {formatCompactCurrency(financialData.weeklyRevenue)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Payments</p>
          <p className="text-xl font-semibold text-gray-900">
            {financialData.completedPayments}
          </p>
        </div>
      </div>

      {/* Payment Methods Summary */}
      <div className="space-y-2 mb-6 flex-grow max-h-64 overflow-y-auto">
        <h4 className="text-xs text-gray-400 mb-3">Payment Methods</h4>
        {financialData.paymentMethods.length > 0 ? (
          financialData.paymentMethods.map((method, index) => {
            const colorScheme = getPaymentMethodColor(index);
            return (
              <div key={index} className={`flex items-center justify-between p-3 ${colorScheme.bg} rounded-lg ${colorScheme.hover} transition-colors`}>
                <div className="flex items-center gap-2">
                  <CreditCard size={14} className={colorScheme.icon} />
                  <span className={`text-sm font-medium ${colorScheme.text} capitalize`}>
                    {method.method}
                  </span>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${colorScheme.text}`}>
                    {formatCompactCurrency(method.amount)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {method.count} trans.
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No payment data</p>
          </div>
        )}
      </div>

      {/* Outstanding Payments Alert */}
      {financialData.outstandingAmount > 0 && (
        <div className="mb-6 p-3 bg-amber-50 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                Outstanding: {formatCurrency(financialData.outstandingAmount)}
              </p>
              <p className="text-xs text-amber-600">
                {financialData.pendingPayments} pending payments
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
