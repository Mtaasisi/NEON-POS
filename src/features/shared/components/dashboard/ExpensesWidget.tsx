import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, TrendingDown, Plus, ExternalLink, DollarSign } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../../lib/branchAwareApi';

interface ExpensesWidgetProps {
  className?: string;
}

interface ExpenseMetrics {
  todayExpenses: number;
  monthExpenses: number;
  recentExpenses: Array<{
    id: string;
    description: string;
    amount: number;
    category: string;
    time: string;
  }>;
  topCategory: string;
  topCategoryAmount: number;
}

export const ExpensesWidget: React.FC<ExpensesWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [metrics, setMetrics] = useState<ExpenseMetrics>({
    todayExpenses: 0,
    monthExpenses: 0,
    recentExpenses: [],
    topCategory: '',
    topCategoryAmount: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadExpensesData();
  }, []);

  const loadExpensesData = async () => {
    try {
      setIsLoading(true);
      const currentBranchId = getCurrentBranchId();
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Query today's expenses
      let todayQuery = supabase
        .from('expenses')
        .select('*')
        .gte('date', today.toISOString())
        .order('date', { ascending: false });
      
      if (currentBranchId) {
        todayQuery = todayQuery.eq('branch_id', currentBranchId);
      }
      
      const { data: todayExpenses, error: todayError } = await todayQuery;
      
      if (todayError && todayError.code !== 'PGRST116') {
        console.error('Error fetching today expenses:', todayError);
      }
      
      // Query month's expenses
      let monthQuery = supabase
        .from('expenses')
        .select('*')
        .gte('date', monthStart.toISOString());
      
      if (currentBranchId) {
        monthQuery = monthQuery.eq('branch_id', currentBranchId);
      }
      
      const { data: monthExpenses, error: monthError } = await monthQuery;
      
      if (monthError && monthError.code !== 'PGRST116') {
        console.error('Error fetching month expenses:', monthError);
      }
      
      // Calculate metrics
      const todayTotal = (todayExpenses || []).reduce((sum, exp) => {
        const amount = typeof exp.amount === 'string' ? parseFloat(exp.amount) : exp.amount;
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      
      const monthTotal = (monthExpenses || []).reduce((sum, exp) => {
        const amount = typeof exp.amount === 'string' ? parseFloat(exp.amount) : exp.amount;
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      
      // Get top category
      const categoryMap = new Map<string, number>();
      (monthExpenses || []).forEach(exp => {
        const category = exp.category || 'Other';
        const amount = typeof exp.amount === 'string' ? parseFloat(exp.amount) : exp.amount || 0;
        categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
      });
      
      let topCategory = '';
      let topCategoryAmount = 0;
      categoryMap.forEach((amount, category) => {
        if (amount > topCategoryAmount) {
          topCategoryAmount = amount;
          topCategory = category;
        }
      });
      
      // Get recent expenses
      const recentExpenses = (todayExpenses || []).slice(0, 5).map(exp => ({
        id: exp.id,
        description: exp.description || 'No description',
        amount: typeof exp.amount === 'string' ? parseFloat(exp.amount) : exp.amount || 0,
        category: exp.category || 'Other',
        time: new Date(exp.date).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }));
      
      setMetrics({
        todayExpenses: todayTotal,
        monthExpenses: monthTotal,
        recentExpenses,
        topCategory,
        topCategoryAmount
      });
      
    } catch (error) {
      console.error('Error loading expenses data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
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
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Expenses</h3>
            <p className="text-xs text-gray-400 mt-0.5">Track your spending</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/expenses')}
          className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors flex items-center gap-1.5"
          title="View All Expenses"
        >
          <ExternalLink size={14} />
          <span>View All</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={14} className="text-red-500" />
            <span className="text-xs text-gray-500">Today</span>
          </div>
          <span className="text-2xl font-semibold text-gray-900">
            {formatCurrency(metrics.todayExpenses)}
          </span>
        </div>

        <div className="p-4 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} className="text-orange-500" />
            <span className="text-xs text-gray-500">This Month</span>
          </div>
          <span className="text-2xl font-semibold text-gray-900">
            {formatCurrency(metrics.monthExpenses)}
          </span>
        </div>
      </div>

      {/* Top Category */}
      {metrics.topCategory && (
        <div className="mb-6 p-4 rounded-lg bg-gradient-to-br from-red-50 to-orange-50">
          <p className="text-xs text-gray-600 mb-1">Top Expense Category</p>
          <p className="text-sm font-semibold text-gray-900">{metrics.topCategory}</p>
          <p className="text-lg font-bold text-red-600 mt-1">
            {formatCurrency(metrics.topCategoryAmount)}
          </p>
        </div>
      )}

      {/* Recent Expenses */}
      <div className="space-y-3 flex-grow max-h-48 overflow-y-auto mb-6">
        {metrics.recentExpenses.length > 0 ? (
          <>
            <h4 className="text-xs text-gray-400 mb-3">Recent Expenses</h4>
            {metrics.recentExpenses.map((expense) => (
              <div 
                key={expense.id} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {expense.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{expense.category}</span>
                    <span className="text-xs text-gray-400">• {expense.time}</span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-red-600 ml-2">
                  -{formatCurrency(expense.amount)}
                </span>
              </div>
            ))}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No expenses today</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto pt-6">
        <button
          onClick={() => navigate('/expenses/new')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-sm text-white hover:bg-gray-800 transition-colors"
        >
          <Plus size={14} />
          <span>Add Expense</span>
        </button>
      </div>
    </div>
  );
};

