import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import GlassInput from '../../shared/components/ui/GlassInput';
import GlassSelect from '../../shared/components/ui/GlassSelect';
import AccountThumbnail from './AccountThumbnail';
import { 
  Settings, Plus, Edit3, Trash2, Save, X, 
  CheckCircle, XCircle, AlertTriangle, RefreshCw,
  TrendingUp, TrendingDown, Eye, EyeOff, Wallet,
  BarChart3, DollarSign, CreditCard, Building, Smartphone,
  History, Filter, Calendar, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';
import { usePaymentMethodsContext } from '../../../context/PaymentMethodsContext';
import { financeAccountService, FinanceAccount } from '../../../lib/financeAccountService';

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string;
  created_at: string;
  balance_after: number;
  balance_before: number;
  reference_number?: string;
  metadata?: any;
}

interface AccountWithTransactions extends FinanceAccount {
  recentTransactions: Transaction[];
  totalReceived: number;
  totalSpent: number;
}

const PaymentAccountManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const { refreshPaymentMethods } = usePaymentMethodsContext();
  const [accounts, setAccounts] = useState<AccountWithTransactions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinanceAccount | null>(null);
  const [currencyFilter, setCurrencyFilter] = useState('all');
  
  // History modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountWithTransactions | null>(null);
  const [accountTransactions, setAccountTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState<Partial<FinanceAccount>>({
    name: '',
    type: 'cash',
    balance: 0,
    currency: 'TZS',
    is_active: true,
    is_payment_method: true,
    requires_reference: false,
    requires_account_number: false
  });

  // Format currency with NaN protection
  const formatMoney = (amount: number | undefined | null) => {
    const safeAmount = Number(amount);
    if (!isFinite(safeAmount) || isNaN(safeAmount)) {
      return new Intl.NumberFormat('en-TZ', {
        style: 'currency',
        currency: 'TZS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(0);
    }
    
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(safeAmount);
  };

  // Filter accounts by currency
  const filteredAccounts = React.useMemo(() => {
    if (currencyFilter === 'all') return accounts;
    return accounts.filter(account => account.currency === currencyFilter);
  }, [accounts, currencyFilter]);

  // Calculate summary statistics
  const summaryStats = React.useMemo(() => {
    const totalAccounts = filteredAccounts.length;
    const activeAccounts = filteredAccounts.filter(account => account.is_active).length;
    const totalBalance = filteredAccounts.reduce((sum, account) => {
      const balance = Number(account.balance);
      return sum + (isNaN(balance) ? 0 : balance);
    }, 0);
    const totalReceived = filteredAccounts.reduce((sum, account) => {
      const received = Number(account.totalReceived);
      return sum + (isNaN(received) ? 0 : received);
    }, 0);
    const totalSpent = filteredAccounts.reduce((sum, account) => {
      const spent = Number(account.totalSpent);
      return sum + (isNaN(spent) ? 0 : spent);
    }, 0);
    
    // Group by account type
    const accountTypes = filteredAccounts.reduce((acc, account) => {
      acc[account.type] = (acc[account.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalAccounts,
      activeAccounts,
      totalBalance,
      totalReceived,
      totalSpent,
      netFlow: totalReceived - totalSpent, // Add net flow calculation
      accountTypes
    };
  }, [filteredAccounts]);


  // Fetch accounts with transaction data
  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get payment method accounts
      const paymentAccounts = await financeAccountService.getPaymentMethods();
      
      // Get transaction data for each account
      const accountsWithTransactions: AccountWithTransactions[] = await Promise.all(
        paymentAccounts.map(async (account) => {
          // Get recent transactions
          const { data: transactions } = await supabase
            .from('account_transactions')
            .select('*')
            .eq('account_id', account.id)
            .order('created_at', { ascending: false })
            .limit(5);

          // Calculate totals
          const { data: allTransactions } = await supabase
            .from('account_transactions')
            .select('transaction_type, amount')
            .eq('account_id', account.id);

          // Transaction types that increase balance (money in)
          const totalReceived = allTransactions
            ?.filter(t => t.transaction_type === 'payment_received' || t.transaction_type === 'transfer_in')
            .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

          // Transaction types that decrease balance (money out)
          const totalSpent = allTransactions
            ?.filter(t => 
              t.transaction_type === 'payment_made' || 
              t.transaction_type === 'expense' || 
              t.transaction_type === 'transfer_out'
            )
            .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

          // Calculate actual balance from transactions
          const calculatedBalance = totalReceived - totalSpent;

          return {
            ...account,
            balance: calculatedBalance, // Use calculated balance instead of database balance
            recentTransactions: transactions || [],
            totalReceived,
            totalSpent
          };
        })
      );

      setAccounts(accountsWithTransactions);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load payment accounts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh payment methods in global context when accounts change
  const handleAccountChange = useCallback(async () => {
    await refreshPaymentMethods();
    await fetchAccounts();
  }, [refreshPaymentMethods, fetchAccounts]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Handle form input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save account
  const handleSave = async () => {
    try {
      if (editingAccount) {
        // Update existing account
        const { error } = await supabase
          .from('finance_accounts')
          .update({
            name: formData.name,
            type: formData.type,
            balance: formData.balance,
            currency: formData.currency,
            is_active: formData.is_active,
            is_payment_method: formData.is_payment_method,
            requires_reference: formData.requires_reference,
            requires_account_number: formData.requires_account_number,
            account_number: formData.account_number,
            bank_name: formData.bank_name,
            notes: formData.notes
          })
          .eq('id', editingAccount.id);

        if (error) throw error;
        toast.success('Account updated successfully');
      } else {
        // Create new account
        const { error } = await supabase
          .from('finance_accounts')
          .insert({
            name: formData.name,
            type: formData.type,
            balance: formData.balance || 0,
            currency: formData.currency || 'TZS',
            is_active: formData.is_active,
            is_payment_method: formData.is_payment_method,
            requires_reference: formData.requires_reference,
            requires_account_number: formData.requires_account_number,
            account_number: formData.account_number,
            bank_name: formData.bank_name,
            notes: formData.notes
          });

        if (error) throw error;
        toast.success('Account created successfully');
      }

      setShowAddModal(false);
      setEditingAccount(null);
      setFormData({
        name: '',
        type: 'cash',
        balance: 0,
        currency: 'TZS',
        is_active: true,
        is_payment_method: true,
        requires_reference: false,
        requires_account_number: false
      });
      await handleAccountChange();
    } catch (error: any) {
      console.error('Error saving account:', error);
      toast.error(error.message || 'Failed to save account');
    }
  };

  // Delete account
  const handleDelete = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      const { error } = await supabase
        .from('finance_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
      toast.success('Account deleted successfully');
      await handleAccountChange();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(error.message || 'Failed to delete account');
    }
  };

  // Edit account
  const handleEdit = (account: FinanceAccount) => {
    setEditingAccount(account);
    setFormData(account);
    setShowAddModal(true);
  };

  // Add new account
  const handleAdd = () => {
    setEditingAccount(null);
    setFormData({
      name: '',
      type: 'cash',
      balance: 0,
      currency: 'TZS',
      is_active: true,
      is_payment_method: true,
      requires_reference: false,
      requires_account_number: false
    });
    setShowAddModal(true);
  };

  // Load all transactions for an account
  const loadAccountTransactions = async (accountId: string) => {
    setIsLoadingTransactions(true);
    try {
      const { data, error } = await supabase
        .from('account_transactions')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccountTransactions(data || []);
    } catch (error) {
      console.error('Error loading account transactions:', error);
      toast.error('Failed to load transaction history');
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  // Open history modal for an account
  const handleViewHistory = async (account: AccountWithTransactions) => {
    setSelectedAccount(account);
    setShowHistoryModal(true);
    setTransactionTypeFilter('all');
    await loadAccountTransactions(account.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading payment accounts...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-1">Payment Accounts</h2>
            <p className="text-gray-500">Track balances and manage your payment methods</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchAccounts}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm text-gray-700 rounded-xl transition-all font-medium"
            >
              <RefreshCw size={18} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all font-medium shadow-lg shadow-blue-500/30"
            >
              <Plus size={18} />
              <span>Add Account</span>
            </button>
          </div>
        </div>

        {/* Currency Filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Filter size={18} className="text-gray-400" />
              <select
                value={currencyFilter}
                onChange={(e) => setCurrencyFilter(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm font-medium"
              >
                <option value="all">All Currencies</option>
                <option value="TZS">Tanzanian Shilling (TZS)</option>
                <option value="USD">US Dollar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="GBP">British Pound (GBP)</option>
              </select>
            </div>
            {currencyFilter !== 'all' && (
              <button
                onClick={() => setCurrencyFilter('all')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <X size={14} />
                Clear Filter
              </button>
            )}
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Accounts */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/30">
                <Wallet className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium mb-1">Total Accounts</p>
              <p className="text-3xl font-bold text-gray-900">{summaryStats.totalAccounts}</p>
            </div>
          </div>

          {/* Total Balance */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/30">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium mb-1">Total Balance</p>
              <p className="text-2xl font-bold text-gray-900">{formatMoney(summaryStats.totalBalance)}</p>
            </div>
          </div>

          {/* Active Accounts */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg shadow-purple-500/30">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium mb-1">Active Accounts</p>
              <p className="text-3xl font-bold text-gray-900">{summaryStats.activeAccounts}</p>
            </div>
          </div>

          {/* Net Flow */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg shadow-orange-500/30">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium mb-1">Net Flow</p>
              <p className="text-2xl font-bold text-gray-900">{formatMoney(summaryStats.netFlow)}</p>
            </div>
          </div>
        </div>

        {/* Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAccounts.map((account) => (
            <div 
              key={account.id} 
              className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl hover:border-gray-300 transition-all group"
            >
              {/* Header with gradient background */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 border-b border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <AccountThumbnail type={account.type} size="md" />
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{account.name}</h3>
                      <p className="text-xs text-gray-500 capitalize flex items-center gap-1 mt-0.5">
                        {account.type === 'cash' && <DollarSign className="w-3 h-3" />}
                        {account.type === 'bank' && <Building className="w-3 h-3" />}
                        {account.type === 'mobile_money' && <Smartphone className="w-3 h-3" />}
                        {account.type === 'credit_card' && <CreditCard className="w-3 h-3" />}
                        {account.type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(account);
                      }}
                      className="p-2 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-lg transition-all border border-gray-200 shadow-sm"
                      title="Edit account"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(account.id);
                      }}
                      className="p-2 bg-white hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-lg transition-all border border-gray-200 shadow-sm"
                      title="Delete account"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Balance */}
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Current Balance</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatMoney(account.balance)}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Financial Stats */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                    <div className="flex items-center gap-1.5 text-emerald-700 mb-1">
                      <TrendingUp size={14} />
                      <span className="text-xs font-semibold uppercase tracking-wide">Received</span>
                    </div>
                    <div className="text-base font-bold text-emerald-900">{formatMoney(account.totalReceived)}</div>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                    <div className="flex items-center gap-1.5 text-red-700 mb-1">
                      <TrendingDown size={14} />
                      <span className="text-xs font-semibold uppercase tracking-wide">Spent</span>
                    </div>
                    <div className="text-base font-bold text-red-900">{formatMoney(account.totalSpent)}</div>
                  </div>
                </div>

                {/* Recent Transactions */}
                {account.recentTransactions.length > 0 && (
                  <div className="mb-5">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Activity</h4>
                    <div className="space-y-2">
                      {account.recentTransactions.slice(0, 2).map((transaction) => {
                        const isIncoming = transaction.transaction_type === 'payment_received' || transaction.transaction_type === 'transfer_in';
                        return (
                          <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-100">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-gray-900 font-medium truncate">{transaction.description}</div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {new Date(transaction.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div className={`text-sm font-bold ml-3 ${
                              isIncoming ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                              {isIncoming ? '+' : '-'}
                              {formatMoney(transaction.amount)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                        account.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {account.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {account.is_active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    {account.is_payment_method && (
                      <div className="flex items-center gap-1 text-xs text-blue-700 bg-blue-100 px-3 py-1.5 rounded-lg font-medium">
                        <CreditCard size={12} />
                        Payment Method
                      </div>
                    )}
                  </div>
                  
                  {/* View History Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewHistory(account);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all font-semibold text-sm shadow-lg shadow-blue-500/30 hover:shadow-xl"
                  >
                    <History size={16} />
                    View Full History
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Wallet className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingAccount ? 'Edit Account' : 'Add New Account'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {editingAccount ? 'Update account details' : 'Create a new payment account'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Account Preview */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <AccountThumbnail type={formData.type || 'cash'} size="sm" />
                  <div>
                    <div className="text-sm font-medium text-blue-900">
                      {formData.name || 'Account Name'}
                    </div>
                    <div className="text-xs text-blue-600 capitalize">
                      {(formData.type || 'cash').replace('_', ' ')}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                <GlassInput
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Cash Drawer, CRDB Bank"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                <GlassSelect
                  value={formData.type || 'cash'}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="savings">Savings</option>
                  <option value="other">Other</option>
                </GlassSelect>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Balance</label>
                <GlassInput
                  type="number"
                  value={formData.balance || 0}
                  onChange={(e) => handleInputChange('balance', Number(e.target.value))}
                  placeholder="0"
                />
              </div>

              {formData.type === 'bank' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                    <GlassInput
                      value={formData.bank_name || ''}
                      onChange={(e) => handleInputChange('bank_name', e.target.value)}
                      placeholder="e.g., CRDB Bank"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                    <GlassInput
                      value={formData.account_number || ''}
                      onChange={(e) => handleInputChange('account_number', e.target.value)}
                      placeholder="Account number"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <GlassInput
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Optional notes"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active || false}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_payment_method || false}
                    onChange={(e) => handleInputChange('is_payment_method', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Payment Method</span>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2"
              >
                <Save size={16} />
                {editingAccount ? 'Update Account' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History Modal */}
      {showHistoryModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="relative p-8 border-b border-gray-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30">
                    <History className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Transaction History</h3>
                    <p className="text-sm text-gray-600 mt-0.5">{selectedAccount.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-xl transition-all"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Account Summary */}
            <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Current Balance</div>
                  <div className="text-2xl font-bold text-gray-900">{formatMoney(selectedAccount.balance)}</div>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-5 rounded-2xl border border-emerald-200 hover:shadow-md transition-shadow">
                  <div className="text-xs text-emerald-700 font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <TrendingUp size={14} />
                    Received
                  </div>
                  <div className="text-2xl font-bold text-emerald-900">{formatMoney(selectedAccount.totalReceived)}</div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-2xl border border-red-200 hover:shadow-md transition-shadow">
                  <div className="text-xs text-red-700 font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <TrendingDown size={14} />
                    Spent
                  </div>
                  <div className="text-2xl font-bold text-red-900">{formatMoney(selectedAccount.totalSpent)}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Total Transactions</div>
                  <div className="text-2xl font-bold text-gray-900">{accountTransactions.length}</div>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="p-6 bg-white border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <Filter size={18} className="text-gray-400" />
                  <select
                    value={transactionTypeFilter}
                    onChange={(e) => setTransactionTypeFilter(e.target.value)}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm font-medium bg-white"
                  >
                    <option value="all">All Transactions</option>
                    <option value="payment_received">Money In</option>
                    <option value="expense">Expenses</option>
                    <option value="payment_made">Payments Made</option>
                    <option value="transfer_in">Transfers In</option>
                    <option value="transfer_out">Transfers Out</option>
                  </select>
                </div>
                <div className="text-sm text-gray-500 bg-gray-100 px-4 py-2.5 rounded-xl font-medium">
                  {transactionTypeFilter === 'all' 
                    ? `${accountTransactions.length} transactions`
                    : `${accountTransactions.filter(t => t.transaction_type === transactionTypeFilter).length} transactions`
                  }
                </div>
              </div>
            </div>

            {/* Transactions List */}
            <div className="flex-1 overflow-y-auto p-8">
              {isLoadingTransactions ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                  <span className="mt-4 text-gray-600 font-medium">Loading transactions...</span>
                </div>
              ) : accountTransactions.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl mb-4">
                    <History size={36} className="text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No transactions yet</h3>
                  <p className="text-gray-500">This account has no transaction history.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accountTransactions
                    .filter(t => transactionTypeFilter === 'all' || t.transaction_type === transactionTypeFilter)
                    .map((transaction) => {
                      const isIncoming = transaction.transaction_type === 'payment_received' || transaction.transaction_type === 'transfer_in';
                      const isOutgoing = transaction.transaction_type === 'expense' || transaction.transaction_type === 'payment_made' || transaction.transaction_type === 'transfer_out';
                      
                      return (
                        <div 
                          key={transaction.id} 
                          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {isIncoming && (
                                  <div className="p-1 bg-green-100 rounded">
                                    <ArrowDownRight size={14} className="text-green-600" />
                                  </div>
                                )}
                                {isOutgoing && (
                                  <div className="p-1 bg-red-100 rounded">
                                    <ArrowUpRight size={14} className="text-red-600" />
                                  </div>
                                )}
                                <h4 className="font-medium text-gray-900">{transaction.description || 'No description'}</h4>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Calendar size={12} />
                                  {new Date(transaction.created_at).toLocaleString()}
                                </div>
                                {transaction.reference_number && (
                                  <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                                    Ref: {transaction.reference_number}
                                  </div>
                                )}
                                <div className={`text-xs px-2 py-1 rounded capitalize ${
                                  isIncoming ? 'bg-green-100 text-green-700' : 
                                  isOutgoing ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {transaction.transaction_type.replace('_', ' ')}
                                </div>
                              </div>
                              
                              {/* Show metadata if it's a PO payment */}
                              {transaction.metadata?.type === 'purchase_order_payment' && (
                                <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                                  <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                    PO: {transaction.metadata.po_reference}
                                  </span>
                                  {transaction.metadata.supplier && (
                                    <span>Supplier: {transaction.metadata.supplier}</span>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <div className="text-right ml-4">
                              <div className={`text-xl font-bold ${
                                isIncoming ? 'text-green-600' : 
                                isOutgoing ? 'text-red-600' : 'text-gray-900'
                              }`}>
                                {isIncoming && '+'}
                                {isOutgoing && '-'}
                                {formatMoney(transaction.amount)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Balance: {formatMoney(transaction.balance_after)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentAccountManagement;
