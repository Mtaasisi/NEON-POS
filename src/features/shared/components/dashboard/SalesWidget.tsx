import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, TrendingUp, ShoppingBag, CreditCard, Plus, ExternalLink } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../../lib/branchAwareApi';

interface SalesWidgetProps {
  className?: string;
}

interface SalesMetrics {
  todaySales: number;
  todayTransactions: number;
  averageTransaction: number;
  yesterdaySales: number;
  growth: number;
  recentTransactions: Array<{
    id: string;
    amount: number;
    customer: string;
    time: string;
  }>;
}

export const SalesWidget: React.FC<SalesWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [metrics, setMetrics] = useState<SalesMetrics>({
    todaySales: 0,
    todayTransactions: 0,
    averageTransaction: 0,
    yesterdaySales: 0,
    growth: 0,
    recentTransactions: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSalesData();
  }, []);

  const loadSalesData = async () => {
    try {
      setIsLoading(true);
      const currentBranchId = getCurrentBranchId();
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Query today's sales
      let todayQuery = supabase
        .from('lats_sales')
        .select('id, total_amount, customer_name, created_at')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });
      
      if (currentBranchId) {
        todayQuery = todayQuery.eq('branch_id', currentBranchId);
      }
      
      const { data: todaySalesData, error: todayError } = await todayQuery;
      
      if (todayError) throw todayError;
      
      // Query yesterday's sales for comparison
      let yesterdayQuery = supabase
        .from('lats_sales')
        .select('total_amount')
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString());
      
      if (currentBranchId) {
        yesterdayQuery = yesterdayQuery.eq('branch_id', currentBranchId);
      }
      
      const { data: yesterdaySalesData, error: yesterdayError } = await yesterdayQuery;
      
      if (yesterdayError) throw yesterdayError;
      
      // Calculate metrics
      const allTodaySales = todaySalesData || [];
      const todayTotal = allTodaySales.reduce((sum, sale) => {
        const amount = typeof sale.total_amount === 'string' 
          ? parseFloat(sale.total_amount) 
          : sale.total_amount;
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      
      const yesterdayTotal = (yesterdaySalesData || []).reduce((sum, sale) => {
        const amount = typeof sale.total_amount === 'string' 
          ? parseFloat(sale.total_amount) 
          : sale.total_amount;
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      
      const transactionCount = allTodaySales.length;
      const avgTransaction = transactionCount > 0 ? todayTotal / transactionCount : 0;
      const growthPercent = yesterdayTotal > 0 
        ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 
        : 0;
      
      // Get recent transactions
      const recentTransactions = allTodaySales.slice(0, 5).map(sale => ({
        id: sale.id,
        amount: typeof sale.total_amount === 'string' 
          ? parseFloat(sale.total_amount) 
          : sale.total_amount,
        customer: sale.customer_name || 'Walk-in Customer',
        time: new Date(sale.created_at).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }));
      
      setMetrics({
        todaySales: todayTotal,
        todayTransactions: transactionCount,
        averageTransaction: avgTransaction,
        yesterdaySales: yesterdayTotal,
        growth: Math.round(growthPercent * 10) / 10,
        recentTransactions
      });
      
    } catch (error) {
      console.error('Error loading sales data:', error);
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
    if (amount >= 1000000) return `TSh ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `TSh ${(amount / 1000).toFixed(0)}K`;
    return `TSh ${amount.toFixed(0)}`;
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-2xl p-7 flex flex-col ${className}`}>
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
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Today's Sales</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {metrics.todayTransactions} transactions
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/lats/sales')}
          className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors flex items-center gap-1.5"
          title="View All Sales"
        >
          <ExternalLink size={14} />
          <span>View All</span>
        </button>
      </div>

      {/* Main Stats */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-bold text-gray-900">
            {formatCompactCurrency(metrics.todaySales)}
          </span>
          {metrics.growth !== 0 && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
              metrics.growth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              <TrendingUp size={12} className={metrics.growth < 0 ? 'rotate-180' : ''} />
              <span>{metrics.growth >= 0 ? '+' : ''}{metrics.growth}%</span>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500">
          vs yesterday: {formatCompactCurrency(metrics.yesterdaySales)}
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag size={14} className="text-blue-500" />
            <span className="text-xs text-gray-500">Transactions</span>
          </div>
          <span className="text-2xl font-semibold text-gray-900">
            {metrics.todayTransactions}
          </span>
        </div>

        <div className="p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={14} className="text-purple-500" />
            <span className="text-xs text-gray-500">Avg Sale</span>
          </div>
          <span className="text-2xl font-semibold text-gray-900">
            {formatCompactCurrency(metrics.averageTransaction)}
          </span>
        </div>
      </div>

      {/* Recent Transactions */}
      {metrics.recentTransactions.length > 0 && (
        <div className="mb-6 flex-grow max-h-48 overflow-y-auto">
          <h4 className="text-xs text-gray-400 mb-3">Recent Transactions</h4>
          <div className="space-y-2">
            {metrics.recentTransactions.map((transaction) => (
              <div 
                key={transaction.id} 
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {transaction.customer}
                  </p>
                  <p className="text-xs text-gray-500">{transaction.time}</p>
                </div>
                <span className="text-sm font-semibold text-emerald-600 ml-2">
                  {formatCompactCurrency(transaction.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto pt-6">
        <button
          onClick={() => navigate('/pos')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-sm text-white hover:bg-gray-800 transition-colors"
        >
          <Plus size={14} />
          <span>New Sale</span>
        </button>
        <button
          onClick={() => navigate('/lats/sales')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 text-sm text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <ExternalLink size={14} />
          <span>All Sales</span>
        </button>
      </div>
    </div>
  );
};

