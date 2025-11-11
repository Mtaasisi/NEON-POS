import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, TrendingDown, Plus, ExternalLink, DollarSign, Check, X } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../../lib/branchAwareApi';
import toast from 'react-hot-toast';

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
    status: string;
  }>;
  topCategory: string;
  topCategoryAmount: number;
  pendingCount: number;
}

export const ExpensesWidget: React.FC<ExpensesWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [metrics, setMetrics] = useState<ExpenseMetrics>({
    todayExpenses: 0,
    monthExpenses: 0,
    recentExpenses: [],
    topCategory: '',
    topCategoryAmount: 0,
    pendingCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadExpensesData();
  }, []);

  // Handle approve expense
  const handleApproveExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('account_transactions')
        .update({
          status: 'approved',
          metadata: supabase.raw(`metadata || '{"approval_status": "approved", "approved_by": "${currentUser?.id}", "approved_at": "${new Date().toISOString()}"}'::jsonb`)
        })
        .eq('id', expenseId);

      if (error) throw error;

      toast.success('Expense approved!');
      
      // Reload data
      loadExpensesData();
    } catch (error) {
      console.error('Error approving expense:', error);
      toast.error('Failed to approve expense');
    }
  };

  // Handle reject expense
  const handleRejectExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('account_transactions')
        .update({
          status: 'rejected',
          metadata: supabase.raw(`metadata || '{"approval_status": "rejected", "rejected_by": "${currentUser?.id}", "rejected_at": "${new Date().toISOString()}"}'::jsonb`)
        })
        .eq('id', expenseId);

      if (error) throw error;

      toast.success('Expense rejected');
      
      // Reload data
      loadExpensesData();
    } catch (error) {
      console.error('Error rejecting expense:', error);
      toast.error('Failed to reject expense');
    }
  };

  const loadExpensesData = async () => {
    try {
      setIsLoading(true);
      const currentBranchId = getCurrentBranchId();
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Fetch all expense transactions from account_transactions (same as ExpenseManagement component)
      const { data: allTransactions, error: fetchError } = await supabase
        .from('account_transactions')
        .select('*')
        .eq('transaction_type', 'expense')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching expense transactions:', fetchError);
        setMetrics({
          todayExpenses: 0,
          monthExpenses: 0,
          recentExpenses: [],
          topCategory: '',
          topCategoryAmount: 0,
          pendingCount: 0
        });
        return;
      }

      // Don't filter by branch_id since expenses don't have branch_id set
      // Only show approved expenses (or all for users with permission)
      const isAdmin = currentUser?.permissions?.includes('all') || 
                      currentUser?.permissions?.includes('view_financial_reports') ||
                      currentUser?.role === 'admin';
      
      // Count pending expenses for authorized users
      const pendingCount = isAdmin 
        ? (allTransactions || []).filter(t => {
            const status = t.status || t.metadata?.approval_status || 'approved';
            return status === 'pending';
          }).length
        : 0;
      
      const transactions = (allTransactions || []).filter(t => {
        const status = t.status || t.metadata?.approval_status || 'approved';
        return isAdmin || status === 'approved';
      });
      
      console.log('💸 ExpensesWidget - Total transactions found:', transactions.length);
      console.log('💸 ExpensesWidget - Pending expenses:', pendingCount);

      // Filter today's expenses
      const todayExpenses = transactions.filter(t => {
        const transactionDate = new Date(t.created_at);
        return transactionDate >= today && transactionDate < tomorrow;
      });

      // Filter this month's expenses
      const monthExpenses = transactions.filter(t => {
        const transactionDate = new Date(t.created_at);
        return transactionDate >= monthStart;
      });

      // Calculate totals (amounts are stored as positive values)
      const todayTotal = todayExpenses.reduce((sum, exp) => {
        const amount = parseFloat(exp.amount) || 0;
        return sum + amount;
      }, 0);
      
      const monthTotal = monthExpenses.reduce((sum, exp) => {
        const amount = parseFloat(exp.amount) || 0;
        return sum + amount;
      }, 0);

      // Get top category from this month's expenses
      const categoryMap = new Map<string, number>();
      monthExpenses.forEach(exp => {
        // Category is stored in metadata
        const category = exp.metadata?.category || 'Other';
        const amount = parseFloat(exp.amount) || 0;
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

      // Get recent expenses (last 30 days)
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentExpensesData = transactions
        .filter(t => new Date(t.created_at) >= thirtyDaysAgo)
        .sort((a, b) => {
          // For admins: prioritize pending expenses to show first
          if (isAdmin) {
            const aStatus = a.status || a.metadata?.approval_status || 'approved';
            const bStatus = b.status || b.metadata?.approval_status || 'approved';
            if (aStatus === 'pending' && bStatus !== 'pending') return -1;
            if (aStatus !== 'pending' && bStatus === 'pending') return 1;
          }
          // Then sort by date (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
        .slice(0, 5);

      const recentExpenses = recentExpensesData.map(exp => ({
        id: exp.id,
        description: exp.description || 'No description',
        amount: parseFloat(exp.amount) || 0,
        category: exp.metadata?.category || 'Other',
        status: exp.status || exp.metadata?.approval_status || 'approved',
        time: new Date(exp.created_at).toLocaleString('en-US', { 
          month: 'short',
          day: 'numeric',
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }));

      console.log('💸 ExpensesWidget - Calculated metrics:', {
        todayTotal,
        monthTotal,
        recentExpensesCount: recentExpenses.length,
        topCategory,
        topCategoryAmount
      });

      setMetrics({
        todayExpenses: todayTotal,
        monthExpenses: monthTotal,
        recentExpenses,
        topCategory,
        topCategoryAmount,
        pendingCount
      });
      
    } catch (error) {
      console.error('Error loading expenses data:', error);
      setMetrics({
        todayExpenses: 0,
        monthExpenses: 0,
        recentExpenses: [],
        topCategory: '',
        topCategoryAmount: 0
      });
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
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">Expenses</h3>
              {(currentUser?.permissions?.includes('all') || currentUser?.permissions?.includes('view_financial_reports') || currentUser?.role === 'admin') && metrics.pendingCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  {metrics.pendingCount} pending
                </span>
              )}
            </div>
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

      {/* Quick Stats - Auto-fit Grid */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))',
          gap: 'clamp(0.75rem, 2vw, 1rem)',
          gridAutoRows: '1fr'
        }}
        className="mb-8"
      >
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
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-br from-red-50 to-orange-50">
          <p className="text-xs text-gray-500 mb-0.5">Top Category</p>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">{metrics.topCategory}</p>
            <p className="text-base font-bold text-red-600">
              {formatCurrency(metrics.topCategoryAmount)}
            </p>
          </div>
        </div>
      )}

      {/* Recent Expenses */}
      <div className="space-y-3 flex-grow max-h-48 overflow-y-auto mb-6 pr-2">
        {metrics.recentExpenses.length > 0 ? (
          <>
            <h4 className="text-xs text-gray-400 mb-3">Recent Expenses (Last 30 Days)</h4>
            {metrics.recentExpenses.map((expense) => {
              const statusConfig = {
                pending: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-800' },
                approved: { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-green-100 text-green-800' },
                rejected: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-800' }
              };
              const style = statusConfig[expense.status as keyof typeof statusConfig] || statusConfig.approved;
              
              return (
                <div 
                  key={expense.id} 
                  className={`p-3 ${style.bg} border ${style.border} rounded-lg hover:opacity-90 transition-all`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {expense.description}
                        </p>
                        {expense.status !== 'approved' && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${style.badge}`}>
                            {expense.status}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{expense.category}</span>
                        <span className="text-xs text-gray-400">• {expense.time}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-red-600">
                        -{formatCurrency(expense.amount)}
                      </span>
                      {(currentUser?.permissions?.includes('all') || currentUser?.permissions?.includes('view_financial_reports') || currentUser?.role === 'admin') && expense.status === 'pending' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleApproveExpense(expense.id)}
                            className="p-1 rounded bg-green-600 hover:bg-green-700 text-white transition-colors"
                            title="Approve"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => handleRejectExpense(expense.id)}
                            className="p-1 rounded bg-red-600 hover:bg-red-700 text-white transition-colors"
                            title="Reject"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No recent expenses</p>
            <p className="text-xs text-gray-400 mt-1">Last 30 days</p>
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

