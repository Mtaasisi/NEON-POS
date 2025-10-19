import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, ExternalLink, AlertCircle } from 'lucide-react';
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
    <div className={`bg-white rounded-2xl p-7 ${className}`}>
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
        
        {financialData.outstandingAmount > 0 && (
          <div className="px-3 py-1.5 rounded-full bg-amber-50">
            <span className="text-xs font-medium text-amber-600">
              {formatCompactCurrency(financialData.outstandingAmount)}
            </span>
          </div>
        )}
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
      <div className="space-y-2 max-h-48 overflow-y-auto mb-6">
        <h4 className="text-xs text-gray-400 mb-3">Payment Methods</h4>
        {financialData.paymentMethods.length > 0 ? (
          financialData.paymentMethods.slice(0, 3).map((method, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-2">
                <CreditCard size={14} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {method.method}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {formatCompactCurrency(method.amount)}
                </p>
                <p className="text-xs text-gray-400">
                  {method.count} trans.
                </p>
              </div>
            </div>
          ))
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

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => navigate('/finance/payments')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-sm text-white hover:bg-gray-800 transition-colors"
        >
          <ExternalLink size={14} />
          <span>View Finances</span>
        </button>
      </div>
    </div>
  );
};
