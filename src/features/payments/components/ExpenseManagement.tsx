import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import GlassInput from '../../shared/components/ui/GlassInput';
import GlassSelect from '../../shared/components/ui/GlassSelect';
import SearchBar from '../../shared/components/ui/SearchBar';
import Modal from '../../shared/components/ui/Modal';
import {
  Plus, Search, Filter, Download, Calendar, DollarSign,
  TrendingDown, AlertCircle, RefreshCw, Eye, Edit3, Trash2,
  Building, Receipt, FileText, X, Lightbulb, Package, Truck,
  User, Home, CreditCard, Shield, Bug, ChevronDown, ChevronUp,
  Activity, Database, Clock, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';
import { financeAccountService, FinanceAccount } from '../../../lib/financeAccountService';

interface Expense {
  id: string;
  account_id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  reference_number: string;
  vendor_name: string;
  notes: string;
  payment_method: string;
  status: string;
  created_at: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface AccountTransaction {
  id: string;
  account_id: string;
  transaction_type: string;
  amount: number;
  description: string;
  balance_before: number;
  balance_after: number;
  created_at: string;
  reference_number: string;
  metadata?: any;
}

interface DebugLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'api';
  category: string;
  message: string;
  data?: any;
  duration?: number;
}

const ExpenseManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [expenses, setExpenses] = useState<AccountTransaction[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<FinanceAccount[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('30'); // Last 30 days

  // Debug state
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [debugFilter, setDebugFilter] = useState<'all' | 'info' | 'success' | 'error' | 'warning' | 'api'>('all');
  const debugIdCounter = useRef(0);

  // Form state
  const [formData, setFormData] = useState({
    account_id: '',
    category: '',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    vendor_name: '',
    reference_number: '',
    notes: ''
  });

  // Debug logger function
  const addDebugLog = useCallback((
    type: DebugLog['type'],
    category: string,
    message: string,
    data?: any,
    duration?: number
  ) => {
    const log: DebugLog = {
      id: `log-${debugIdCounter.current++}`,
      timestamp: new Date().toISOString(),
      type,
      category,
      message,
      data,
      duration
    };
    
    setDebugLogs(prev => [log, ...prev].slice(0, 100)); // Keep last 100 logs
    
    // Also log to console with styling
    const styles = {
      info: 'color: #3B82F6',
      success: 'color: #10B981',
      error: 'color: #EF4444',
      warning: 'color: #F59E0B',
      api: 'color: #8B5CF6'
    };
    
    console.log(
      `%c[${category}] ${message}`,
      styles[type],
      data ? data : ''
    );
  }, []);

  // Format currency
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Fetch expenses (from account_transactions with type 'expense')
  const fetchExpenses = useCallback(async () => {
    const startTime = performance.now();
    addDebugLog('api', 'FETCH_EXPENSES', 'Starting to fetch expenses...');
    
    try {
      setIsLoading(true);
      addDebugLog('info', 'FETCH_EXPENSES', 'Loading state set to true');
      
      // Fetch expense transactions
      const { data: transactions, error } = await supabase
        .from('account_transactions')
        .select('*')
        .eq('transaction_type', 'expense')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        addDebugLog('error', 'FETCH_EXPENSES', 'Supabase query failed', error);
        throw error;
      }

      addDebugLog('success', 'FETCH_EXPENSES', `Fetched ${transactions?.length || 0} expense transactions`, {
        count: transactions?.length,
        transactions: transactions?.slice(0, 3) // Log first 3 for preview
      });

      // If we have transactions, fetch the associated finance accounts
      if (transactions && transactions.length > 0) {
        const accountIds = [...new Set(transactions.map(t => t.account_id).filter(Boolean))];
        
        addDebugLog('info', 'FETCH_EXPENSES', `Found ${accountIds.length} unique account IDs`, accountIds);
        
        if (accountIds.length > 0) {
          const { data: accounts, error: accountsError } = await supabase
            .from('finance_accounts')
            .select('id, name, type, currency')
            .in('id', accountIds);

          if (!accountsError && accounts) {
            addDebugLog('success', 'FETCH_EXPENSES', `Fetched ${accounts.length} account details`, accounts);
            
            // Map accounts to transactions
            const accountMap = new Map(accounts.map(a => [a.id, a]));
            const expensesWithAccounts = transactions.map(t => ({
              ...t,
              finance_accounts: t.account_id ? accountMap.get(t.account_id) : null
            }));
            setExpenses(expensesWithAccounts);
            
            addDebugLog('success', 'FETCH_EXPENSES', 'Successfully mapped accounts to expenses');
          } else {
            // If account fetch fails, still show transactions without account details
            addDebugLog('warning', 'FETCH_EXPENSES', 'Account fetch failed, showing expenses without account details', accountsError);
            setExpenses(transactions);
          }
        } else {
          setExpenses(transactions);
        }
      } else {
        addDebugLog('info', 'FETCH_EXPENSES', 'No expense transactions found');
        setExpenses([]);
      }
      
      const duration = performance.now() - startTime;
      addDebugLog('success', 'FETCH_EXPENSES', `Fetch completed successfully`, {
        totalExpenses: transactions?.length || 0
      }, duration);
      
    } catch (error) {
      const duration = performance.now() - startTime;
      addDebugLog('error', 'FETCH_EXPENSES', 'Failed to load expenses', error, duration);
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setIsLoading(false);
      addDebugLog('info', 'FETCH_EXPENSES', 'Loading state set to false');
    }
  }, [addDebugLog]);

  // Fetch payment accounts
  const fetchPaymentAccounts = useCallback(async () => {
    const startTime = performance.now();
    addDebugLog('api', 'FETCH_ACCOUNTS', 'Fetching payment accounts...');
    
    try {
      const accounts = await financeAccountService.getPaymentMethods();
      setPaymentAccounts(accounts);
      
      const duration = performance.now() - startTime;
      addDebugLog('success', 'FETCH_ACCOUNTS', `Fetched ${accounts.length} payment accounts`, {
        accounts: accounts.map(a => ({ id: a.id, name: a.name, balance: a.balance }))
      }, duration);
    } catch (error) {
      const duration = performance.now() - startTime;
      addDebugLog('error', 'FETCH_ACCOUNTS', 'Failed to fetch payment accounts', error, duration);
      console.error('Error fetching payment accounts:', error);
    }
  }, [addDebugLog]);

  // Fetch expense categories
  const fetchExpenseCategories = useCallback(async () => {
    const startTime = performance.now();
    addDebugLog('api', 'FETCH_CATEGORIES', 'Fetching expense categories...');
    
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        addDebugLog('error', 'FETCH_CATEGORIES', 'Supabase query failed', error);
        throw error;
      }

      setExpenseCategories(data || []);
      
      const duration = performance.now() - startTime;
      addDebugLog('success', 'FETCH_CATEGORIES', `Fetched ${data?.length || 0} active categories`, {
        categories: data?.map(c => c.name)
      }, duration);
    } catch (error) {
      const duration = performance.now() - startTime;
      addDebugLog('error', 'FETCH_CATEGORIES', 'Failed to fetch expense categories', error, duration);
      console.error('Error fetching expense categories:', error);
    }
  }, [addDebugLog]);

  useEffect(() => {
    addDebugLog('info', 'LIFECYCLE', 'Component mounted, initializing data fetch');
    fetchExpenses();
    fetchPaymentAccounts();
    fetchExpenseCategories();
  }, [fetchExpenses, fetchPaymentAccounts, fetchExpenseCategories, addDebugLog]);

  // Handle form input change
  const handleInputChange = (field: string, value: any) => {
    addDebugLog('info', 'FORM', `Field "${field}" changed`, { field, value });
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle add expense
  const handleAddExpense = async () => {
    const startTime = performance.now();
    addDebugLog('api', 'ADD_EXPENSE', 'Starting expense creation...', formData);
    
    try {
      // Validate
      if (!formData.account_id || !formData.amount || !formData.description) {
        addDebugLog('warning', 'ADD_EXPENSE', 'Validation failed: Missing required fields', {
          account_id: !!formData.account_id,
          amount: !!formData.amount,
          description: !!formData.description
        });
        toast.error('Please fill in all required fields');
        return;
      }

      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        addDebugLog('warning', 'ADD_EXPENSE', 'Validation failed: Invalid amount', { amount: formData.amount });
        toast.error('Please enter a valid amount');
        return;
      }

      addDebugLog('info', 'ADD_EXPENSE', 'Validation passed, inserting into database', {
        amount,
        account_id: formData.account_id,
        category: formData.category
      });

      // Insert into account_transactions
      const { data, error } = await supabase
        .from('account_transactions')
        .insert({
          account_id: formData.account_id,
          transaction_type: 'expense',
          amount: amount,
          description: `${formData.category ? formData.category + ': ' : ''}${formData.description}`,
          reference_number: formData.reference_number || null,
          metadata: {
            category: formData.category || null,
            vendor_name: formData.vendor_name || null,
            notes: formData.notes || null,
            expense_date: formData.expense_date
          },
          created_by: currentUser?.id
        })
        .select()
        .single();

      if (error) {
        addDebugLog('error', 'ADD_EXPENSE', 'Database insert failed', error);
        throw error;
      }

      const duration = performance.now() - startTime;
      addDebugLog('success', 'ADD_EXPENSE', 'Expense created successfully!', {
        expenseId: data.id,
        amount,
        category: formData.category
      }, duration);
      
      toast.success('Expense recorded successfully!');
      
      // Reset form
      addDebugLog('info', 'ADD_EXPENSE', 'Resetting form and refreshing data');
      setFormData({
        account_id: '',
        category: '',
        description: '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        vendor_name: '',
        reference_number: '',
        notes: ''
      });
      
      setShowAddModal(false);
      
      // Refresh data
      fetchExpenses();
      fetchPaymentAccounts();
    } catch (error: any) {
      const duration = performance.now() - startTime;
      addDebugLog('error', 'ADD_EXPENSE', 'Failed to record expense', error, duration);
      console.error('Error adding expense:', error);
      toast.error(error.message || 'Failed to record expense');
    }
  };

  // Filter expenses
  const filteredExpenses = React.useMemo(() => {
    addDebugLog('info', 'FILTER', 'Filtering expenses', {
      searchQuery,
      categoryFilter,
      accountFilter
    });
    
    const filtered = expenses.filter(expense => {
      const matchesSearch = expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           expense.reference_number?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAccount = accountFilter === 'all' || expense.account_id === accountFilter;
      
      // Extract category from description or metadata
      const expenseCategory = expense.metadata?.category || 
                            (expense.description?.split(':')[0] || '').trim();
      const matchesCategory = categoryFilter === 'all' || expenseCategory === categoryFilter;
      
      return matchesSearch && matchesAccount && matchesCategory;
    });
    
    addDebugLog('success', 'FILTER', `Filtered to ${filtered.length} expenses`, {
      total: expenses.length,
      filtered: filtered.length
    });
    
    return filtered;
  }, [expenses, searchQuery, categoryFilter, accountFilter, addDebugLog]);

  // Calculate summary stats
  const summaryStats = React.useMemo(() => {
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const expenseCount = filteredExpenses.length;
    
    // Group by category
    const byCategory: Record<string, number> = {};
    filteredExpenses.forEach(exp => {
      const category = exp.metadata?.category || 'Other';
      byCategory[category] = (byCategory[category] || 0) + Number(exp.amount);
    });

    // Group by account
    const byAccount: Record<string, number> = {};
    filteredExpenses.forEach(exp => {
      const accountName = (exp as any).finance_accounts?.name || 'Unknown';
      byAccount[accountName] = (byAccount[accountName] || 0) + Number(exp.amount);
    });

    const stats = {
      totalExpenses,
      expenseCount,
      byCategory,
      byAccount
    };
    
    addDebugLog('info', 'STATS', 'Calculated summary statistics', stats);
    
    return stats;
  }, [filteredExpenses, addDebugLog]);

  const getCategoryIcon = (categoryName: string) => {
    const iconMap: Record<string, any> = {
      'Rent': Building,
      'Utilities': Lightbulb,
      'Supplies': Package,
      'Transportation': Truck,
      'Salaries': User,
      'Maintenance': Home,
      'Marketing': FileText,
      'Insurance': Shield,
      'Taxes': Receipt,
      'Other': FileText
    };
    const IconComponent = iconMap[categoryName] || FileText;
    return IconComponent;
  };

  // Clear debug logs
  const clearDebugLogs = () => {
    setDebugLogs([]);
    addDebugLog('info', 'DEBUG', 'Debug logs cleared');
  };

  // Export debug logs
  const exportDebugLogs = () => {
    const data = JSON.stringify(debugLogs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-debug-logs-${new Date().toISOString()}.json`;
    a.click();
    addDebugLog('success', 'DEBUG', 'Debug logs exported');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading expenses...</span>
      </div>
    );
  }

  const filteredDebugLogs = debugFilter === 'all' 
    ? debugLogs 
    : debugLogs.filter(log => log.type === debugFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Expense Management</h2>
          <p className="text-gray-600">Track and manage business expenses</p>
        </div>
        <div className="flex gap-2">
          <GlassButton 
            onClick={() => setShowDebugPanel(!showDebugPanel)} 
            variant={showDebugPanel ? "primary" : "secondary"}
            className="flex items-center gap-2"
          >
            <Bug size={16} />
            Debug
          </GlassButton>
          <GlassButton onClick={fetchExpenses} variant="secondary">
            <RefreshCw size={16} />
            Refresh
          </GlassButton>
          <GlassButton onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            Add Expense
          </GlassButton>
        </div>
      </div>

      {/* Debug Panel */}
      {showDebugPanel && (
        <GlassCard className="p-6 bg-gray-900 text-white border-2 border-indigo-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-semibold text-indigo-400">Debug Panel</h3>
              <span className="text-sm text-gray-400">({debugLogs.length} logs)</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportDebugLogs}
                className="px-3 py-1 text-sm bg-indigo-600 hover:bg-indigo-700 rounded flex items-center gap-1"
              >
                <Download size={14} />
                Export
              </button>
              <button
                onClick={clearDebugLogs}
                className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded flex items-center gap-1"
              >
                <Trash2 size={14} />
                Clear
              </button>
            </div>
          </div>

          {/* Debug Filter */}
          <div className="flex gap-2 mb-4">
            {(['all', 'info', 'success', 'error', 'warning', 'api'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setDebugFilter(filter)}
                className={`px-3 py-1 text-xs rounded capitalize ${
                  debugFilter === filter
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Current State */}
          <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-800 rounded">
            <div>
              <div className="text-xs text-gray-400 mb-1">Total Expenses</div>
              <div className="text-lg font-bold">{expenses.length}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Filtered</div>
              <div className="text-lg font-bold">{filteredExpenses.length}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Categories</div>
              <div className="text-lg font-bold">{expenseCategories.length}</div>
            </div>
          </div>

          {/* Debug Logs */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredDebugLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No debug logs yet
              </div>
            ) : (
              filteredDebugLogs.map((log) => {
                const typeColors = {
                  info: 'text-blue-400 bg-blue-900/30',
                  success: 'text-green-400 bg-green-900/30',
                  error: 'text-red-400 bg-red-900/30',
                  warning: 'text-yellow-400 bg-yellow-900/30',
                  api: 'text-purple-400 bg-purple-900/30'
                };
                
                const icons = {
                  info: Activity,
                  success: CheckCircle,
                  error: XCircle,
                  warning: AlertTriangle,
                  api: Database
                };
                
                const Icon = icons[log.type];
                
                return (
                  <div
                    key={log.id}
                    className={`p-3 rounded border ${typeColors[log.type]} border-opacity-50`}
                  >
                    <div className="flex items-start gap-2">
                      <Icon size={16} className="mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                          <Clock size={12} />
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                          <span className="font-mono bg-gray-800 px-2 py-0.5 rounded">
                            {log.category}
                          </span>
                          {log.duration && (
                            <span className="text-green-400">
                              {log.duration.toFixed(2)}ms
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-medium mb-1">{log.message}</div>
                        {log.data && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-gray-400 hover:text-gray-300">
                              View Data
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-950 rounded overflow-x-auto text-xs">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </GlassCard>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-6 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-900">{formatMoney(summaryStats.totalExpenses)}</p>
            </div>
            <div className="p-3 bg-red-500 rounded-lg">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Expense Count</p>
              <p className="text-2xl font-bold text-blue-900">{summaryStats.expenseCount}</p>
            </div>
            <div className="p-3 bg-blue-500 rounded-lg">
              <Receipt className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Categories</p>
              <p className="text-2xl font-bold text-purple-900">{Object.keys(summaryStats.byCategory).length}</p>
            </div>
            <div className="p-3 bg-purple-500 rounded-lg">
              <Building className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Avg per Expense</p>
              <p className="text-2xl font-bold text-green-900">
                {formatMoney(summaryStats.expenseCount > 0 ? summaryStats.totalExpenses / summaryStats.expenseCount : 0)}
              </p>
            </div>
            <div className="p-3 bg-green-500 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  addDebugLog('info', 'SEARCH', `Search query changed: "${e.target.value}"`);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <GlassSelect
              value={accountFilter}
              onChange={(e) => {
                setAccountFilter(e.target.value);
                addDebugLog('info', 'FILTER', `Account filter changed: "${e.target.value}"`);
              }}
              className="min-w-[160px]"
            >
              <option value="all">All Accounts</option>
              {paymentAccounts.map(account => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </GlassSelect>
            <GlassSelect
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                addDebugLog('info', 'FILTER', `Category filter changed: "${e.target.value}"`);
              }}
              className="min-w-[160px]"
            >
              <option value="all">All Categories</option>
              {expenseCategories.map(category => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </GlassSelect>
          </div>
        </div>
      </GlassCard>

      {/* Expenses List */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Expenses ({filteredExpenses.length})
        </h3>
        
          {filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4 inline-block p-6 bg-gray-100 rounded-full">
              <Receipt className="w-16 h-16 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Expenses Found</h3>
            <p className="text-gray-600 mb-4">
              {expenses.length === 0 
                ? 'No expenses have been recorded yet.'
                : 'No expenses match your current filters.'}
            </p>
            {expenses.length === 0 && (
              <GlassButton onClick={() => setShowAddModal(true)}>
                <Plus size={16} />
                Add Your First Expense
              </GlassButton>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Category</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Description</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Account</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Balance Impact</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Reference</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => {
                  const category = expense.metadata?.category || 'Other';
                  const accountName = (expense as any).finance_accounts?.name || 'Unknown';
                  
                  return (
                    <tr key={expense.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {React.createElement(getCategoryIcon(category), {
                            className: "w-5 h-5 text-gray-600"
                          })}
                          <span className="text-sm font-medium text-gray-700">{category}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-900">{expense.description}</div>
                        {expense.metadata?.vendor_name && (
                          <div className="text-xs text-gray-500">Vendor: {expense.metadata.vendor_name}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-gray-700">{accountName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-semibold text-red-600">
                          {formatMoney(expense.amount)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-900">
                          {new Date(expense.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(expense.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs text-gray-600">
                          <div>Before: {formatMoney(expense.balance_before || 0)}</div>
                          <div>After: {formatMoney(expense.balance_after || 0)}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs text-gray-600 font-mono">
                          {expense.reference_number || 'N/A'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Add Expense Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          addDebugLog('info', 'MODAL', 'Add expense modal closed');
        }}
        title="Add New Expense"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Account *
            </label>
            <GlassSelect
              value={formData.account_id}
              onChange={(e) => handleInputChange('account_id', e.target.value)}
              required
            >
              <option value="">Select Account</option>
              {paymentAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} - {formatMoney(account.balance || 0)}
                </option>
              ))}
            </GlassSelect>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <FileText className="w-4 h-4" />
              Category *
            </label>
            <GlassSelect
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              required
            >
              <option value="">Select Category</option>
              {expenseCategories.map(category => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </GlassSelect>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <FileText className="w-4 h-4" />
              Description *
            </label>
            <GlassInput
              type="text"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="e.g., October rent payment"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <DollarSign className="w-4 h-4" />
              Amount (TSh) *
            </label>
            <GlassInput
              type="number"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Building className="w-4 h-4" />
              Vendor Name
            </label>
            <GlassInput
              type="text"
              value={formData.vendor_name}
              onChange={(e) => handleInputChange('vendor_name', e.target.value)}
              placeholder="Vendor or supplier name"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Receipt className="w-4 h-4" />
              Reference Number
            </label>
            <GlassInput
              type="text"
              value={formData.reference_number}
              onChange={(e) => handleInputChange('reference_number', e.target.value)}
              placeholder="e.g., INV-2025-001"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4" />
              Expense Date
            </label>
            <GlassInput
              type="date"
              value={formData.expense_date}
              onChange={(e) => handleInputChange('expense_date', e.target.value)}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <FileText className="w-4 h-4" />
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <GlassButton variant="secondary" onClick={() => {
              setShowAddModal(false);
              addDebugLog('info', 'MODAL', 'Add expense cancelled');
            }}>
              Cancel
            </GlassButton>
            <GlassButton onClick={handleAddExpense}>
              Add Expense
            </GlassButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ExpenseManagement;
