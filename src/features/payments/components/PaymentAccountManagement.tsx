import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import GlassInput from '../../shared/components/ui/GlassInput';
import GlassSelect from '../../shared/components/ui/GlassSelect';
import AccountThumbnail from './AccountThumbnail';
import ManualTransactionModal from './ManualTransactionModal';
import TransferModal from './TransferModal';
import TransactionReversalModal from './TransactionReversalModal';
import TransactionDetailsModal from './TransactionDetailsModal';
import ScheduledTransfersView from './ScheduledTransfersView';
import { 
  Settings, Plus, Edit3, Trash2, Save, X, 
  CheckCircle, XCircle, AlertTriangle, RefreshCw,
  TrendingUp, TrendingDown, Eye, EyeOff, Wallet,
  BarChart3, DollarSign, CreditCard, Building, Smartphone,
  History, Filter, Calendar, ArrowUpRight, ArrowDownRight, ArrowRightLeft,
  RepeatIcon, Download, FileText, Search, ChevronDown, ChevronUp,
  Copy, ExternalLink, Info, ArrowRight, User, Phone, Mail, MapPin
} from 'lucide-react';

// Alias for FileText to avoid conflicts
const FileTextIcon = FileText;
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';
import { addBranchFilter, createWithBranch, getCurrentBranchId } from '../../../lib/branchAwareApi';
import { usePaymentMethodsContext } from '../../../context/PaymentMethodsContext';
import { financeAccountService, FinanceAccount } from '../../../lib/financeAccountService';
import { exportToCSV, exportToPDF } from '../utils/exportTransactions';
import { clearQueryCache } from '../../../lib/deduplicatedQueries';
import { smartCache } from '../../../lib/enhancedCacheManager';

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
  account_id: string;
  related_entity_type?: string;
  related_entity_id?: string;
}

interface AccountWithTransactions extends FinanceAccount {
  recentTransactions: Transaction[];
  initialBalance?: number; // Store the database balance (starting point)
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
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filtersExpanded, setFiltersExpanded] = useState<boolean>(false);
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);
  const [saleDetails, setSaleDetails] = useState<Record<string, any>>({});
  const [loadingSaleDetails, setLoadingSaleDetails] = useState<Record<string, boolean>>({});

  // Manual transaction modal state
  const [showManualTransactionModal, setShowManualTransactionModal] = useState(false);
  const [manualTransactionAccount, setManualTransactionAccount] = useState<FinanceAccount | null>(null);

  // Transfer modal state
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Reversal modal state
  const [showReversalModal, setShowReversalModal] = useState(false);
  const [reversalTransaction, setReversalTransaction] = useState<Transaction | null>(null);

  // Transaction details modal state
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showTransactionDetailsModal, setShowTransactionDetailsModal] = useState(false);

  // View state - toggle between accounts and scheduled transfers
  const [activeView, setActiveView] = useState<'accounts' | 'scheduled'>('accounts');

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
  const formatTransactionType = (transactionType: string): string => {
    const typeMap: Record<string, string> = {
      'payment_received': 'received',
      'payment_made': 'paid',
      'transfer_in': 'transfer in',
      'transfer_out': 'transfer out',
    };
    
    return typeMap[transactionType] || transactionType.replace(/_/g, ' ');
  };

  const formatMoney = (amount: number | undefined | null, currency: string = 'TZS') => {
    const safeAmount = Number(amount);
    if (!isFinite(safeAmount) || isNaN(safeAmount)) {
      return new Intl.NumberFormat('en-TZ', {
        style: 'currency',
        currency: currency || 'TZS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(0);
    }
    
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: currency || 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(safeAmount);
  };

  // Filter accounts by currency
  const filteredAccounts = React.useMemo(() => {
    console.log(`🔍 [filteredAccounts] Filtering ${accounts.length} accounts, currency filter: ${currencyFilter}`);
    const filtered = currencyFilter === 'all' 
      ? accounts 
      : accounts.filter(account => account.currency === currencyFilter);
    console.log(`✅ [filteredAccounts] Result: ${filtered.length} accounts after filtering`);
    if (filtered.length > 0) {
      console.log('   Accounts:', filtered.map(a => a.name));
    }
    return filtered;
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

  // Helper function to apply branch filtering for account transactions
  // This handles the case where accounts might be shared or transactions might have NULL branch_id
  const applyTransactionBranchFilter = async (
    query: any,
    accountBranchId: string | null,
    isAccountShared: boolean
  ) => {
    const currentBranchId = getCurrentBranchId();
    
    // If no branch selected, show all transactions
    if (!currentBranchId) {
      return query;
    }
    
    // If account is shared or belongs to current branch, show all transactions for this account
    if (isAccountShared || accountBranchId === currentBranchId) {
      return query; // Already filtered by account_id, no need for additional branch filter
    }
    
    // Otherwise, filter by branch_id but include NULL for backward compatibility
    return query.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
  };

  // Fetch accounts with transaction data
  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Fetching payment accounts...');
      const currentBranchId = getCurrentBranchId();
      console.log('📍 Current branch ID:', currentBranchId || 'none');
      
      // Get payment method accounts
      const paymentAccounts = await financeAccountService.getPaymentMethods();
      console.log(`✅ Fetched ${paymentAccounts.length} payment accounts:`, paymentAccounts.map(a => ({ name: a.name, branch_id: a.branch_id, is_shared: a.is_shared })));
      
      // Get transaction data for each account
      const accountsWithTransactions: AccountWithTransactions[] = await Promise.all(
        paymentAccounts.map(async (account) => {
          // Get recent transactions with proper branch filtering
          let recentQuery = supabase
            .from('account_transactions')
            .select('*')
            .eq('account_id', account.id)
            .order('created_at', { ascending: false })
            .limit(5);
          recentQuery = await applyTransactionBranchFilter(
            recentQuery,
            account.branch_id || null,
            account.is_shared || false
          );
          const { data: transactions } = await recentQuery;

          // Calculate totals with proper branch filtering
          let totalsQuery = supabase
            .from('account_transactions')
            .select('transaction_type, amount')
            .eq('account_id', account.id);
          totalsQuery = await applyTransactionBranchFilter(
            totalsQuery,
            account.branch_id || null,
            account.is_shared || false
          );
          const { data: allTransactions } = await totalsQuery;

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

          // Use the authoritative database balance directly
          // The database balance is the single source of truth
          const currentBalance = Number(account.balance) || 0;
          
          // Note: totalReceived and totalSpent are for display purposes only
          // The actual balance is maintained by the database through triggers and RPC functions

          return {
            ...account,
            balance: currentBalance, // Authoritative database balance
            recentTransactions: transactions || [],
            totalReceived,
            totalSpent
          };
        })
      );

      console.log(`✅ Setting ${accountsWithTransactions.length} accounts in state`);
      console.log('📋 Accounts being set:', accountsWithTransactions.map(a => ({ id: a.id, name: a.name, branch_id: a.branch_id })));
      
      // Force state update with a new array reference
      setAccounts([...accountsWithTransactions]);
      
      // Also log the state after a brief delay to verify it was set
      setTimeout(() => {
        console.log('🔍 State verification - accounts count:', accountsWithTransactions.length);
      }, 100);
    } catch (error) {
      console.error('❌ Error fetching accounts:', error);
      toast.error('Failed to load payment accounts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh payment methods in global context when accounts change
  const handleAccountChange = useCallback(async () => {
    console.log('🔄 handleAccountChange called - refreshing accounts...');
    
    // Clear all caches first
    const currentBranchId = getCurrentBranchId();
    const cacheKey = `payment-methods-${currentBranchId || 'all'}`;
    clearQueryCache(cacheKey);
    clearQueryCache('payment-methods-all');
    await smartCache.invalidateCache('payment_accounts');
    console.log('🗑️ Cleared all caches');
    
    // Refresh payment methods context
    if (refreshPaymentMethods) {
      await refreshPaymentMethods();
    }
    
    // Force fetch accounts
    await fetchAccounts();
    
    console.log('✅ handleAccountChange completed');
  }, [refreshPaymentMethods, fetchAccounts]);

  // Initial load only - auto-refresh disabled
  useEffect(() => {
    fetchAccounts();
    
    // 🔄 AUTO-REFRESH DISABLED: Update balances every 30 seconds
    // Auto-refresh has been disabled to prevent page from auto-refreshing
    // Uncomment below to re-enable auto-refresh:
    // console.log('🔄 Setting up automatic balance refresh (every 30s)');
    // const refreshInterval = setInterval(() => {
    //   console.log('💳 Auto-refreshing account balances...');
    //   fetchAccounts();
    // }, 30000); // 30 seconds
    // 
    // // Cleanup interval on unmount
    // return () => {
    //   console.log('⏹️ Stopping automatic balance refresh');
    //   clearInterval(refreshInterval);
    // };
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
    // Validation
    if (!formData.name || formData.name.trim() === '') {
      toast.error('Account name is required');
      return;
    }

    if (!formData.type) {
      toast.error('Account type is required');
      return;
    }

    if (!formData.currency) {
      toast.error('Currency is required');
      return;
    }

    if (formData.type === 'bank' && !formData.bank_name) {
      toast.error('Bank name is required for bank accounts');
      return;
    }

    if (formData.type === 'mobile_money' && !formData.bank_name) {
      toast.error('Mobile money provider is required');
      return;
    }

    // Prevent negative balance
    if (formData.balance && formData.balance < 0) {
      toast.error('Balance cannot be negative');
      return;
    }

    try {
      if (editingAccount) {
        // Update existing account (trigger will sync duplicate columns automatically)
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
        // Create new account with branch assignment (respects isolation/sharing rules)
        console.log('📝 Creating new account with data:', formData);
        const newAccount = await createWithBranch(
          'finance_accounts',
          {
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
          },
          'accounts'
        );
        
        console.log('✅ Account created successfully:', {
          id: newAccount?.id,
          name: newAccount?.name,
          branch_id: newAccount?.branch_id,
          is_shared: newAccount?.is_shared
        });
        
        if (!newAccount) {
          throw new Error('Account creation returned no data');
        }
        
        toast.success('Account created successfully');
        
        // Clear all caches to force fresh fetch
        const currentBranchId = getCurrentBranchId();
        const cacheKey = `payment-methods-${currentBranchId || 'all'}`;
        clearQueryCache(cacheKey);
        clearQueryCache('payment-methods-all'); // Also clear the 'all' cache
        await smartCache.invalidateCache('payment_accounts');
        
        console.log('🗑️ Cleared payment methods cache for:', cacheKey);
        
        // Manually add the new account to state as a fallback
        if (newAccount && newAccount.is_payment_method) {
          console.log('➕ Manually adding new account to state as fallback');
          const accountWithTransactions: AccountWithTransactions = {
            ...newAccount,
            recentTransactions: [],
            totalReceived: 0,
            totalSpent: 0
          };
          
          setAccounts(prev => {
            // Check if account already exists to avoid duplicates
            const exists = prev.some(acc => acc.id === newAccount.id);
            if (exists) {
              console.log('⚠️ Account already in state, updating instead');
              // Update existing account instead of adding duplicate
              return prev.map(acc => acc.id === newAccount.id ? accountWithTransactions : acc);
            }
            console.log('➕ Adding new account to state:', newAccount.name);
            const updated = [...prev, accountWithTransactions];
            console.log(`✅ State updated: ${prev.length} -> ${updated.length} accounts`);
            return updated;
          });
        }
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
      
      // Force refresh immediately and also with delay
      console.log('🔄 Forcing immediate account refresh...');
      await handleAccountChange();
      
      // Also refresh after a short delay to catch any race conditions
      setTimeout(async () => {
        console.log('🔄 Delayed refresh (200ms)...');
        await handleAccountChange();
      }, 200);
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
      console.log('🔄 Loading transactions for account:', accountId);
      
      // First, get the account to check its branch_id and sharing status
      const { data: accountData, error: accountError } = await supabase
        .from('finance_accounts')
        .select('id, branch_id, is_shared')
        .eq('id', accountId)
        .single();

      if (accountError) {
        console.error('❌ Error fetching account:', accountError);
        throw accountError;
      }

      console.log('📋 Account data:', { 
        accountId, 
        branch_id: accountData?.branch_id, 
        is_shared: accountData?.is_shared 
      });

      // Build query with proper branch filtering
      let query = supabase
        .from('account_transactions')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });

      // Apply branch filtering based on account's sharing status
      query = await applyTransactionBranchFilter(
        query,
        accountData?.branch_id || null,
        accountData?.is_shared || false
      );

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error loading transactions:', error);
        throw error;
      }

      console.log(`✅ Loaded ${data?.length || 0} transactions for account ${accountId}`);
      if (data && data.length > 0) {
        console.log('📋 Sample transactions:', data.slice(0, 3).map(t => ({
          id: t.id,
          type: t.transaction_type,
          amount: t.amount,
          branch_id: t.branch_id,
          created_at: t.created_at
        })));
      } else {
        console.log('⚠️ No transactions found. Checking if transactions exist in database...');
        // Debug query: check if any transactions exist for this account without branch filtering
        const { data: allData } = await supabase
          .from('account_transactions')
          .select('id, transaction_type, amount, branch_id, created_at')
          .eq('account_id', accountId)
          .limit(5);
        console.log(`🔍 Total transactions in DB (no branch filter): ${allData?.length || 0}`);
        if (allData && allData.length > 0) {
          console.log('📋 Sample transactions from DB:', allData);
        }
      }
      
      setAccountTransactions(data || []);
    } catch (error) {
      console.error('❌ Error loading account transactions:', error);
      toast.error('Failed to load transaction history');
      setAccountTransactions([]);
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
    <div className="space-y-6">
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
              onClick={() => setShowTransferModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl transition-all font-medium shadow-lg shadow-purple-500/30"
            >
              <ArrowRightLeft size={18} />
              <span>Transfer</span>
            </button>
            <button
              onClick={async () => {
                console.log('🔄 Manual refresh triggered');
                setIsLoading(true);
                await fetchAccounts();
                setIsLoading(false);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl transition-all font-medium shadow-lg shadow-green-500/30"
              title="Refresh account balances from database"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
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

        {/* View Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveView('accounts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                activeView === 'accounts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Wallet size={16} />
              Payment Accounts
            </button>
            <button
              onClick={() => setActiveView('scheduled')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                activeView === 'scheduled'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <RepeatIcon size={16} />
              Scheduled Transfers
            </button>
          </nav>
        </div>

        {/* Conditional View Rendering */}
        {activeView === 'scheduled' ? (
          <ScheduledTransfersView onRefresh={fetchAccounts} />
        ) : (
          <React.Fragment>
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
              <p className="text-2xl font-bold text-gray-900">{formatMoney(summaryStats.totalBalance, currencyFilter !== 'all' ? currencyFilter : 'TZS')}</p>
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
              <p className="text-2xl font-bold text-gray-900">{formatMoney(summaryStats.netFlow, currencyFilter !== 'all' ? currencyFilter : 'TZS')}</p>
            </div>
          </div>
        </div>

        {/* Accounts Grid */}
        {filteredAccounts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Payment Accounts</h3>
            <p className="text-gray-500 mb-6">
              {accounts.length === 0 
                ? "You haven't created any payment accounts yet. Create your first account to get started."
                : `No accounts found for currency filter: ${currencyFilter}. Try changing the filter.`}
            </p>
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all font-medium shadow-lg shadow-blue-500/30"
            >
              <Plus size={18} />
              Create Account
            </button>
            {accounts.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">Debug Info:</p>
                <p className="text-xs text-gray-400">Total accounts in state: {accounts.length}</p>
                <p className="text-xs text-gray-400">Filtered accounts: {filteredAccounts.length}</p>
                <p className="text-xs text-gray-400">Currency filter: {currencyFilter}</p>
              </div>
            )}
          </div>
        ) : (
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
                      {account.bank_name && (
                        <p className="text-xs text-gray-600 font-medium mt-1">
                          {account.bank_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setManualTransactionAccount(account);
                        setShowManualTransactionModal(true);
                      }}
                      className="p-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all shadow-sm"
                      title="Add transaction"
                    >
                      <Plus size={14} />
                    </button>
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
                    {formatMoney(account.balance, account.currency)}
                  </p>
                  {account.currency !== 'TZS' && (
                    <p className="text-xs text-gray-500 mt-1">Currency: {account.currency}</p>
                  )}
                  {account.account_number && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded inline-flex">
                      <span className="font-medium">Account #:</span>
                      <span className="font-mono">{account.account_number}</span>
                    </div>
                  )}
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
                    <div className="text-base font-bold text-emerald-900">{formatMoney(account.totalReceived, account.currency)}</div>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                    <div className="flex items-center gap-1.5 text-red-700 mb-1">
                      <TrendingDown size={14} />
                      <span className="text-xs font-semibold uppercase tracking-wide">Spent</span>
                    </div>
                    <div className="text-base font-bold text-red-900">{formatMoney(account.totalSpent, account.currency)}</div>
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
                              {formatMoney(transaction.amount, account.currency)}
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
        )}

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
                  <div className="flex-1">
                    <div className="text-sm font-medium text-blue-900">
                      {formData.name || 'Account Name'}
                    </div>
                    <div className="text-xs text-blue-600 capitalize">
                      {(formData.type || 'cash').replace('_', ' ')}
                    </div>
                    {formData.account_number && (
                      <div className="text-xs text-blue-700 font-mono mt-0.5">
                        #{formData.account_number}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <GlassInput
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Cash Drawer, CRDB Bank"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type || 'cash'}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white/80 backdrop-blur-sm text-sm font-medium transition-all"
                  >
                    <option value="cash">💰 Cash</option>
                    <option value="bank">🏦 Bank</option>
                    <option value="mobile_money">📱 Mobile Money</option>
                    <option value="credit_card">💳 Credit Card</option>
                    <option value="savings">💎 Savings</option>
                    <option value="other">📦 Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.currency || 'TZS'}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white/80 backdrop-blur-sm text-sm font-medium transition-all"
                  >
                    <option value="TZS">🇹🇿 TZS - Tanzanian Shilling</option>
                    <option value="USD">🇺🇸 USD - US Dollar</option>
                    <option value="EUR">🇪🇺 EUR - Euro</option>
                    <option value="GBP">🇬🇧 GBP - British Pound</option>
                    <option value="KES">🇰🇪 KES - Kenyan Shilling</option>
                    <option value="UGX">🇺🇬 UGX - Ugandan Shilling</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Balance</label>
                <GlassInput
                  type="number"
                  value={formData.balance || 0}
                  onChange={(e) => handleInputChange('balance', Number(e.target.value))}
                  placeholder="0"
                  step="0.01"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">Starting balance for this account (cannot be negative)</p>
              </div>

              {/* General Account Number field (visible for all account types) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number
                </label>
                <GlassInput
                  value={formData.account_number || ''}
                  onChange={(e) => handleInputChange('account_number', e.target.value)}
                  placeholder="Enter account number"
                />
                <p className="text-xs text-gray-500 mt-1">Account number, reference ID, or identifier for this account</p>
              </div>

              {/* Bank-specific fields */}
              {formData.type === 'bank' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <GlassInput
                      value={formData.bank_name || ''}
                      onChange={(e) => handleInputChange('bank_name', e.target.value)}
                      placeholder="e.g., CRDB Bank, NMB Bank"
                      required
                    />
                  </div>
                </>
              )}

              {/* Mobile Money-specific fields */}
              {formData.type === 'mobile_money' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile Money Provider <span className="text-red-500">*</span>
                    </label>
                    <GlassInput
                      value={formData.bank_name || ''}
                      onChange={(e) => handleInputChange('bank_name', e.target.value)}
                      placeholder="e.g., M-Pesa, Tigo Pesa, Airtel Money"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Use the Account Number field above for the phone number</p>
                  </div>
                </>
              )}

              {/* Credit Card-specific fields */}
              {formData.type === 'credit_card' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Card Issuer</label>
                    <GlassInput
                      value={formData.bank_name || ''}
                      onChange={(e) => handleInputChange('bank_name', e.target.value)}
                      placeholder="e.g., Visa, Mastercard"
                    />
                    <p className="text-xs text-gray-500 mt-1">Use the Account Number field above for card details</p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Optional notes or description"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white/50 backdrop-blur-sm text-sm"
                  rows={3}
                />
              </div>

              {/* Account Settings */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Account Settings</h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active || false}
                        onChange={(e) => handleInputChange('is_active', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Active Account</span>
                        <p className="text-xs text-gray-500">Enable this account for transactions</p>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_payment_method || false}
                        onChange={(e) => handleInputChange('is_payment_method', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Payment Method</span>
                        <p className="text-xs text-gray-500">Allow this account to be used for payments</p>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.requires_reference || false}
                        onChange={(e) => handleInputChange('requires_reference', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Require Reference Number</span>
                        <p className="text-xs text-gray-500">Require reference/transaction number for payments</p>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.requires_account_number || false}
                        onChange={(e) => handleInputChange('requires_account_number', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Require Account Number</span>
                        <p className="text-xs text-gray-500">Require account/phone number for payments</p>
                      </div>
                    </div>
                  </label>
                </div>
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
        </React.Fragment>
      )}

      {/* Transaction History Modal */}
      {showHistoryModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
            {/* Close Button */}
            <button
              onClick={() => setShowHistoryModal(false)}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Modal Header */}
            <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
              <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
                <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                  <History className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Transaction History</h3>
                  <p className="text-sm text-gray-600 font-medium">{selectedAccount.name}</p>
                </div>
              </div>
            </div>

            {/* Account Summary */}
            <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
              <div className="py-4 space-y-4">
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    Account Summary
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-xs font-medium text-gray-600 mb-1">Initial Balance</p>
                      <p className="text-xl font-bold text-gray-900">{formatMoney(selectedAccount.initialBalance || 0, selectedAccount.currency)}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                      <p className="text-xs font-medium text-emerald-700 mb-1 flex items-center gap-1.5">
                        <TrendingUp size={14} />
                        Received
                      </p>
                      <p className="text-xl font-bold text-emerald-900">{formatMoney(selectedAccount.totalReceived, selectedAccount.currency)}</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                      <p className="text-xs font-medium text-red-700 mb-1 flex items-center gap-1.5">
                        <TrendingDown size={14} />
                        Spent
                      </p>
                      <p className="text-xl font-bold text-red-900">{formatMoney(selectedAccount.totalSpent, selectedAccount.currency)}</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <p className="text-xs font-medium text-blue-700 mb-1">Current Balance</p>
                      <p className="text-xl font-bold text-blue-900">{formatMoney(selectedAccount.balance, selectedAccount.currency)}</p>
                    </div>
                  </div>
                </div>

                {/* Search and Filter Bar */}
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    {/* Search Bar - Left Side */}
                    <div className="flex-1 min-w-[300px]">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search transactions by description, reference, amount..."
                          className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium bg-white"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4 text-gray-400" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Filter Toggle Button */}
                    <button
                      onClick={() => setFiltersExpanded(!filtersExpanded)}
                      className={`px-4 py-3 border-2 rounded-xl transition-all flex items-center gap-2 ${
                        filtersExpanded
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Filter className="w-5 h-5" />
                      {filtersExpanded ? (
                        <>
                          <span className="text-sm font-semibold">Hide Filters</span>
                          <ChevronUp className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-semibold">Filters</span>
                          <ChevronDown className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* Expandable Filters Section */}
                  {filtersExpanded && (
                    <div className="pt-4 border-t border-gray-200 space-y-4 animate-in slide-in-from-top-2 duration-200">
                      {/* Filter Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Transaction Type Filter */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">Transaction Type</label>
                        <select
                          value={transactionTypeFilter}
                          onChange={(e) => setTransactionTypeFilter(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium bg-white"
                        >
                          <option value="all">All Transactions</option>
                          <option value="payment_received">Money In</option>
                          <option value="expense">Expenses</option>
                          <option value="payment_made">Payments Made</option>
                          <option value="transfer_in">Transfers In</option>
                          <option value="transfer_out">Transfers Out</option>
                        </select>
                      </div>
                      
                        {/* Date Range - Start */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">Start Date</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="date"
                              value={dateFilter.start}
                              onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
                              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium bg-white"
                              placeholder="Start date"
                            />
                          </div>
                        </div>
                        
                        {/* Date Range - End */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">End Date</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="date"
                              value={dateFilter.end}
                              onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
                              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm font-medium bg-white"
                              placeholder="End date"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Row */}
                      <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200">
                        {/* Action Buttons */}
                        <div className="flex items-center gap-3">
                          {(dateFilter.start || dateFilter.end || searchQuery) && (
                            <button
                              onClick={() => {
                                setDateFilter({ start: '', end: '' });
                                setSearchQuery('');
                                setTransactionTypeFilter('all');
                              }}
                              className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all"
                            >
                              Clear All
                            </button>
                          )}
                        <button
                          onClick={() => {
                            if (!selectedAccount) return;
                            const filtered = accountTransactions.filter(t => {
                              if (transactionTypeFilter !== 'all' && t.transaction_type !== transactionTypeFilter) return false;
                              if (dateFilter.start && new Date(t.created_at) < new Date(dateFilter.start)) return false;
                              if (dateFilter.end) {
                                const endDate = new Date(dateFilter.end);
                                endDate.setHours(23, 59, 59, 999);
                                if (new Date(t.created_at) > endDate) return false;
                              }
                                if (searchQuery) {
                                  const query = searchQuery.toLowerCase();
                                  const matchesDescription = t.description?.toLowerCase().includes(query);
                                  const matchesReference = t.reference_number?.toLowerCase().includes(query);
                                  const matchesAmount = formatMoney(t.amount, selectedAccount.currency).toLowerCase().includes(query);
                                  if (!matchesDescription && !matchesReference && !matchesAmount) return false;
                              }
                              return true;
                            });
                            exportToCSV(filtered, {
                              accountName: selectedAccount.name,
                              currency: selectedAccount.currency || 'TZS',
                              dateRange: dateFilter.start && dateFilter.end ? dateFilter : undefined,
                            });
                            toast.success('CSV exported successfully');
                          }}
                            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all text-sm font-semibold shadow-lg hover:shadow-xl flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            CSV
                        </button>
                        <button
                          onClick={() => {
                            if (!selectedAccount) return;
                            const filtered = accountTransactions.filter(t => {
                              if (transactionTypeFilter !== 'all' && t.transaction_type !== transactionTypeFilter) return false;
                              if (dateFilter.start && new Date(t.created_at) < new Date(dateFilter.start)) return false;
                              if (dateFilter.end) {
                                const endDate = new Date(dateFilter.end);
                                endDate.setHours(23, 59, 59, 999);
                                if (new Date(t.created_at) > endDate) return false;
                              }
                                if (searchQuery) {
                                  const query = searchQuery.toLowerCase();
                                  const matchesDescription = t.description?.toLowerCase().includes(query);
                                  const matchesReference = t.reference_number?.toLowerCase().includes(query);
                                  const matchesAmount = formatMoney(t.amount, selectedAccount.currency).toLowerCase().includes(query);
                                  if (!matchesDescription && !matchesReference && !matchesAmount) return false;
                              }
                              return true;
                            });
                            exportToPDF(filtered, {
                              accountName: selectedAccount.name,
                              currency: selectedAccount.currency || 'TZS',
                              dateRange: dateFilter.start && dateFilter.end ? dateFilter : undefined,
                            });
                            toast.success('PDF opened in new window');
                          }}
                            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all text-sm font-semibold shadow-lg hover:shadow-xl flex items-center gap-2"
                        >
                            <FileText className="w-4 h-4" />
                            PDF
                        </button>
                      </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Transactions List */}
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600" />
                    Transactions
                    {accountTransactions.length > 0 && (
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                        <span className="text-sm font-semibold text-indigo-700">
                          {accountTransactions.length} transaction{accountTransactions.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </h4>
                  <div className="space-y-3">
                    {isLoadingTransactions ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
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
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {(
                          accountTransactions
                          .filter(t => {
                            // Filter by transaction type
                            if (transactionTypeFilter !== 'all' && t.transaction_type !== transactionTypeFilter) {
                              return false;
                            }
                            // Filter by date range
                            if (dateFilter.start && new Date(t.created_at) < new Date(dateFilter.start)) {
                              return false;
                            }
                            if (dateFilter.end) {
                              const endDate = new Date(dateFilter.end);
                              endDate.setHours(23, 59, 59, 999); // Include the entire end date
                              if (new Date(t.created_at) > endDate) {
                          return false;
                        }
                      }
                            // Filter by search query
                            if (searchQuery) {
                              const query = searchQuery.toLowerCase();
                              const matchesDescription = t.description?.toLowerCase().includes(query);
                              const matchesReference = t.reference_number?.toLowerCase().includes(query);
                              const matchesAmount = formatMoney(t.amount, selectedAccount?.currency || 'TZS').toLowerCase().includes(query);
                              if (!matchesDescription && !matchesReference && !matchesAmount) {
                                return false;
                              }
                            }
                            return true;
                          })
                          .map((transaction, index) => {
                            const isIncome = transaction.transaction_type === 'income';
                            const isIncoming = transaction.transaction_type === 'payment_received' || transaction.transaction_type === 'transfer_in';
                            const isOutgoing = transaction.transaction_type === 'expense' || transaction.transaction_type === 'payment_made' || transaction.transaction_type === 'transfer_out';
                            const isReversed = transaction.metadata?.reversed;
                            const isPartial = transaction.metadata?.is_partial || 
                                             transaction.metadata?.partial || 
                                             (transaction.description?.toLowerCase().includes('partial') ?? false);
                            
                            const isExpanded = expandedTransaction === transaction.id;
                            
                            return (
                              <div 
                                key={transaction.id} 
                                className={`group relative rounded-2xl border-2 transition-all duration-300 ${
                                  isExpanded
                                    ? 'border-indigo-500 shadow-xl'
                                    : isReversed
                                    ? 'bg-white border-gray-300 opacity-60 hover:shadow-md'
                                    : isPartial
                                    ? 'bg-white border-yellow-400 shadow-md hover:shadow-lg'
                                    : isIncoming
                                    ? 'bg-white border-green-300 shadow-md hover:shadow-lg'
                                    : isOutgoing
                                    ? 'bg-white border-red-300 shadow-md hover:shadow-lg'
                                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                }`}
                              >
                                {/* Header - Clickable */}
                                <div 
                                  className="flex items-center justify-between p-5 cursor-pointer"
                                  onClick={() => setExpandedTransaction(isExpanded ? null : transaction.id)}
                                >
                                  {/* Left Section */}
                                  <div className="flex items-center gap-4 flex-1">
                                    {/* Expand/Collapse Icon */}
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                                      isExpanded ? 'bg-indigo-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                                    }`}>
                                      <ChevronDown 
                                        className={`w-5 h-5 transition-transform duration-200 ${
                                          isExpanded ? 'rotate-180' : ''
                                        }`}
                                      />
                                        </div>
                                    
                                    {/* Transaction Type Icon - Circular Badge */}
                                    <div className={`relative flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${
                                      isReversed
                                        ? 'bg-gray-400'
                                        : isPartial
                                        ? 'bg-gradient-to-br from-yellow-500 to-yellow-600'
                                        : isIncome
                                        ? 'bg-gradient-to-br from-yellow-500 to-yellow-600'
                                        : isIncoming
                                        ? 'bg-gradient-to-br from-green-500 to-green-600'
                                        : isOutgoing
                                        ? 'bg-gradient-to-br from-red-500 to-red-600'
                                        : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                    } text-white`}>
                                      {isPartial && !isReversed ? (
                                        <DollarSign className="w-6 h-6" />
                                      ) : isIncoming && !isReversed ? (
                                        <ArrowDownRight className="w-6 h-6" />
                                      ) : isOutgoing && !isReversed ? (
                                        <ArrowUpRight className="w-6 h-6" />
                                      ) : (
                                        <History className="w-6 h-6" />
                                      )}
                                      {isReversed && (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center border-2 border-white">
                                          <X className="w-3 h-3 text-white" />
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Description and Details */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-2">
                                        <h4 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                          {transaction.description || 'No description'}
                                        </h4>
                                      </div>
                                      
                                      <div className="flex items-center gap-3 flex-wrap">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                          <Calendar className="w-3.5 h-3.5" />
                                        {new Date(transaction.created_at).toLocaleString()}
                                      </div>
                                        
                                      {transaction.reference_number && (
                                          <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                                          Ref: {transaction.reference_number}
                                          </span>
                                      )}
                                        
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                                          isPartial && !isReversed
                                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                            : isIncoming && !isReversed
                                            ? 'bg-green-100 text-green-800 border border-green-200'
                                            : isOutgoing && !isReversed
                                            ? 'bg-red-100 text-red-800 border border-red-200'
                                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                                      }`}>
                                          {formatTransactionType(transaction.transaction_type)}
                                        </span>
                                        
                                        {isReversed && (
                                          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                                            Reversed
                                        </span>
                                        )}
                                      </div>
                                      </div>
                                    </div>
                                    
                                  {/* Right Section - Amount */}
                                  <div className="flex-shrink-0 text-right ml-4">
                                    <div className={`text-2xl font-bold mb-1 ${
                                      isReversed
                                        ? 'text-gray-500'
                                        : isPartial
                                        ? 'text-yellow-700'
                                        : isIncoming
                                        ? 'text-green-700'
                                        : isOutgoing
                                        ? 'text-red-700'
                                        : 'text-gray-900'
                                      }`}>
                                      {isPartial && !isReversed && '~'}
                                      {isIncoming && !isReversed && !isPartial && '+'}
                                      {isOutgoing && !isReversed && !isPartial && '-'}
                                        {formatMoney(transaction.amount, selectedAccount.currency)}
                                      </div>
                                    
                                    <div className="text-xs text-gray-500 font-medium">
                                      Balance: {formatMoney(transaction.balance_after, selectedAccount.currency)}
                                    </div>
                                    </div>
                                  </div>
                                  
                                {/* Separator Line - Only show when expanded */}
                                {isExpanded && (
                                  <div className="mt-0 pt-5 border-t-2 border-gray-200 relative">
                                    <div className="absolute top-0 left-0 right-0 flex items-center justify-center -mt-3">
                                      <span className="bg-white px-5 py-1.5 text-xs text-gray-500 font-semibold uppercase tracking-wider rounded-full border border-gray-200 shadow-sm">Transaction Details</span>
                                    </div>
                                  </div>
                                )}

                                {/* Expanded Content */}
                                {isExpanded && (
                                  <TransactionExpandedContent
                                    transaction={transaction}
                                    selectedAccount={selectedAccount}
                                    formatMoney={formatMoney}
                                    saleDetails={saleDetails[transaction.id]}
                                    loadingSaleDetails={loadingSaleDetails[transaction.id]}
                                    onFetchSaleDetails={async (saleId: string) => {
                                      if (saleDetails[transaction.id]) return; // Already loaded
                                      setLoadingSaleDetails(prev => ({ ...prev, [transaction.id]: true }));
                                      try {
                                        const { data: saleData, error: saleError } = await supabase
                                          .from('lats_sales')
                                          .select('*')
                                          .eq('id', saleId)
                                          .single();
                                        
                                        if (saleError) throw saleError;
                                        
                                        // Fetch customer
                                        let customerData = null;
                                        if (saleData.customer_id) {
                                          const { data: customer } = await supabase
                                            .from('customers')
                                            .select('*')
                                            .eq('id', saleData.customer_id)
                                            .single();
                                          customerData = customer;
                                        }
                                        
                                        // Fetch cashier
                                        let cashierName = 'Unknown';
                                        if (saleData.sold_by) {
                                          const { data: userData } = await supabase
                                            .from('users')
                                            .select('full_name, email')
                                            .eq('email', saleData.sold_by)
                                            .single();
                                          cashierName = userData?.full_name || userData?.email || saleData.sold_by;
                                        } else if (saleData.created_by) {
                                          const nameFromEmail = saleData.created_by.split('@')[0].replace(/[._]/g, ' ');
                                          cashierName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
                                        }
                                        
                                        // Fetch sale items
                                        const { data: saleItems } = await supabase
                                          .from('lats_sale_items')
                                          .select('*')
                                          .eq('sale_id', saleId);
                                        
                                        // Fetch products and variants
                                        const productIds = [...new Set(saleItems?.map(item => item.product_id).filter(Boolean) || [])];
                                        const variantIds = [...new Set(saleItems?.map(item => item.variant_id).filter(Boolean) || [])];
                                        
                                        const [productsResult, variantsResult] = await Promise.all([
                                          productIds.length > 0 ? supabase.from('lats_products').select('*').in('id', productIds) : { data: [] },
                                          variantIds.length > 0 ? supabase.from('lats_product_variants').select('*').in('id', variantIds) : { data: [] }
                                        ]);
                                        
                                        const productsMap = new Map((productsResult.data || []).map((p: any) => [p.id, p]));
                                        const variantsMap = new Map((variantsResult.data || []).map((v: any) => [v.id, v]));
                                        
                                        const enhancedItems = (saleItems || []).map((item: any) => ({
                                          ...item,
                                          product: productsMap.get(item.product_id),
                                          variant: variantsMap.get(item.variant_id),
                                          profit: item.total_price - ((item.cost_price || 0) * item.quantity)
                                        }));
                                        
                                        setSaleDetails(prev => ({
                                          ...prev,
                                          [transaction.id]: {
                                            ...saleData,
                                            customer: customerData,
                                            cashierName,
                                            items: enhancedItems
                                          }
                                        }));
                                      } catch (error) {
                                        console.error('Error fetching sale details:', error);
                                      } finally {
                                        setLoadingSaleDetails(prev => ({ ...prev, [transaction.id]: false }));
                                      }
                                    }}
                                  />
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-full px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl text-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Transaction Modal */}
      {showManualTransactionModal && manualTransactionAccount && (
        <ManualTransactionModal
          account={manualTransactionAccount}
          onClose={() => {
            setShowManualTransactionModal(false);
            setManualTransactionAccount(null);
          }}
          onSuccess={() => {
            fetchAccounts();
          }}
        />
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <TransferModal
          accounts={accounts}
          onClose={() => setShowTransferModal(false)}
          onSuccess={() => {
            fetchAccounts();
          }}
        />
      )}

      {/* Transaction Reversal Modal */}
      {showReversalModal && reversalTransaction && selectedAccount && (
        <TransactionReversalModal
          transaction={reversalTransaction}
          account={selectedAccount}
          onClose={() => {
            setShowReversalModal(false);
            setReversalTransaction(null);
          }}
          onSuccess={() => {
            loadAccountTransactions(selectedAccount.id);
            fetchAccounts();
          }}
        />
      )}

      {/* Transaction Details Modal */}
      {showTransactionDetailsModal && selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          account={selectedAccount}
          onClose={() => {
            setShowTransactionDetailsModal(false);
            setSelectedTransaction(null);
          }}
        />
      )}
    </div>
  );
};

// Transaction Expanded Content Component
interface TransactionExpandedContentProps {
  transaction: Transaction;
  selectedAccount: AccountWithTransactions | null;
  formatMoney: (amount: number, currency?: string) => string;
  saleDetails: any;
  loadingSaleDetails: boolean;
  onFetchSaleDetails: (saleId: string) => Promise<void>;
}

const TransactionExpandedContent: React.FC<TransactionExpandedContentProps> = ({
  transaction,
  selectedAccount,
  formatMoney,
  saleDetails,
  loadingSaleDetails,
  onFetchSaleDetails
}) => {
  const isIncoming = transaction.transaction_type === 'payment_received' || transaction.transaction_type === 'transfer_in' || transaction.transaction_type === 'income';
  const isOutgoing = transaction.transaction_type === 'expense' || transaction.transaction_type === 'payment_made' || transaction.transaction_type === 'transfer_out';
  const isReversed = transaction.metadata?.reversed;
  const isPartial = transaction.metadata?.is_partial || 
                   transaction.metadata?.partial || 
                   (transaction.description?.toLowerCase().includes('partial') ?? false);
  
  // Get sale ID from metadata or related_entity fields
  const saleId = transaction.metadata?.sale_id || 
                 transaction.metadata?.saleId ||
                 (transaction.related_entity_type === 'sale' ? transaction.related_entity_id : null) ||
                 (transaction.metadata?.related_entity_type === 'sale' ? transaction.metadata?.related_entity_id : null);
  
  // Fetch sale details when expanded and sale_id exists
  React.useEffect(() => {
    if (saleId && !saleDetails && !loadingSaleDetails) {
      onFetchSaleDetails(saleId);
    }
  }, [saleId, saleDetails, loadingSaleDetails, onFetchSaleDetails]);
  
  return (
    <div className="px-5 pb-5 pt-2 space-y-4">
                                    {/* Balance Impact Section */}
                                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-xl border-2 border-purple-200">
                                      <h4 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-3">
                                        <TrendingUp className="w-5 h-5 text-purple-600" />
                                        Balance Impact
                                      </h4>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <div className="text-center">
                                            <div className="text-xs text-gray-600 mb-1">Before</div>
                                            <div className="text-lg font-bold text-purple-700">{formatMoney(transaction.balance_before, selectedAccount.currency)}</div>
                                          </div>
                                          <ArrowRight className="w-6 h-6 text-gray-400" />
                                          <div className={`text-center ${isIncoming ? 'text-yellow-700' : isOutgoing ? 'text-red-700' : 'text-gray-700'}`}>
                                            <div className="text-xs text-gray-600 mb-1">Change</div>
                                            <div className="text-lg font-bold">
                                              {isIncoming && !isReversed && !isPartial && '+'}
                                              {isOutgoing && !isReversed && !isPartial && '-'}
                                              {isPartial && !isReversed && '~'}
                                              {formatMoney(transaction.amount, selectedAccount.currency)}
                                            </div>
                                          </div>
                                          <ArrowRight className="w-6 h-6 text-gray-400" />
                                          <div className="text-center">
                                            <div className="text-xs text-gray-600 mb-1">After</div>
                                            <div className="text-lg font-bold text-indigo-700">{formatMoney(transaction.balance_after, selectedAccount.currency)}</div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Transaction Details Section - Additional Info */}
                                    <div className="bg-white p-4 rounded-xl border-2 border-gray-200">
                                      <h4 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-3">
                                        <Info className="w-5 h-5 text-indigo-600" />
                                        Additional Details
                                      </h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                          <div className="text-xs text-gray-500 font-medium mb-1">Account</div>
                                          <div className="text-sm font-semibold text-gray-900">
                                            {selectedAccount?.name || 'Unknown Account'}
                                          </div>
                                          <div className="text-xs text-gray-600 mt-1">
                                            {selectedAccount?.type || 'N/A'} • {selectedAccount?.currency || 'TZS'}
                                          </div>
                                        </div>
                                        {transaction.reference_number && (
                                          <div>
                                            <div className="text-xs text-gray-500 font-medium mb-1">Reference Number</div>
                                            <div className="text-sm font-semibold text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200">
                                              {transaction.reference_number}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Customer Information */}
                                        {(transaction.metadata?.customer_name || transaction.metadata?.customer_id || transaction.metadata?.customer) && (
                                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                            <div className="text-xs text-blue-600 font-medium mb-2 flex items-center gap-1">
                                              <User className="w-3.5 h-3.5" />
                                              Customer
                                            </div>
                                            <div className="text-sm font-semibold text-gray-900 mb-2">
                                              {transaction.metadata?.customer_name || transaction.metadata?.customer?.name || 'Unknown Customer'}
                                            </div>
                                            <div className="space-y-1">
                                              {transaction.metadata?.customer_phone && (
                                                <div className="text-xs text-gray-600 flex items-center gap-1.5">
                                                  <Phone className="w-3 h-3" />
                                                  {transaction.metadata.customer_phone}
                                                </div>
                                              )}
                                              {transaction.metadata?.customer_email && (
                                                <div className="text-xs text-gray-600 flex items-center gap-1.5">
                                                  <Mail className="w-3 h-3" />
                                                  {transaction.metadata.customer_email}
                                                </div>
                                              )}
                                              {transaction.metadata?.customer_address && (
                                                <div className="text-xs text-gray-600 flex items-center gap-1.5">
                                                  <MapPin className="w-3 h-3" />
                                                  {transaction.metadata.customer_address}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Supplier Information */}
                                        {transaction.metadata?.supplier && (
                                          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                            <div className="text-xs text-purple-600 font-medium mb-2 flex items-center gap-1">
                                              <Building className="w-3.5 h-3.5" />
                                              Supplier
                                            </div>
                                            <div className="text-sm font-semibold text-gray-900 mb-2">
                                              {typeof transaction.metadata.supplier === 'string' 
                                                ? transaction.metadata.supplier 
                                                : transaction.metadata.supplier.name || 'Unknown Supplier'}
                                            </div>
                                            <div className="space-y-1">
                                              {transaction.metadata?.supplier_phone && (
                                                <div className="text-xs text-gray-600 flex items-center gap-1.5">
                                                  <Phone className="w-3 h-3" />
                                                  {transaction.metadata.supplier_phone}
                                                </div>
                                              )}
                                              {transaction.metadata?.supplier_email && (
                                                <div className="text-xs text-gray-600 flex items-center gap-1.5">
                                                  <Mail className="w-3 h-3" />
                                                  {transaction.metadata.supplier_email}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Payment Method */}
                                        {transaction.metadata?.payment_method && (
                                          <div>
                                            <div className="text-xs text-gray-500 font-medium mb-1">Payment Method</div>
                                            <div className="text-sm font-semibold text-gray-900">
                                              {transaction.metadata.payment_method}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Source Type */}
                                        {transaction.metadata?.type && (
                                          <div>
                                            <div className="text-xs text-gray-500 font-medium mb-1">Source Type</div>
                                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                              {transaction.metadata.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </span>
                                          </div>
                                        )}
                                        
                                        {/* PO Reference */}
                                        {transaction.metadata?.po_reference && (
                                          <div>
                                            <div className="text-xs text-gray-500 font-medium mb-1">Purchase Order</div>
                                            <div className="text-sm font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-200 font-mono">
                                              {transaction.metadata.po_reference}
                                            </div>
                                      </div>
                                    )}
                                        
                                        {/* Sale Reference */}
                                        {transaction.metadata?.sale_reference && (
                                          <div>
                                            <div className="text-xs text-gray-500 font-medium mb-1">Sale Reference</div>
                                            <div className="text-sm font-semibold text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200 font-mono">
                                              {transaction.metadata.sale_reference}
                                  </div>
                                          </div>
                                        )}
                                        
                                        {/* Notes */}
                                        {transaction.metadata?.notes && (
                                          <div className="md:col-span-2">
                                            <div className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
                                              <FileTextIcon className="w-3.5 h-3.5" />
                                              Notes
                                </div>
                                            <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">
                                              {transaction.metadata.notes}
                              </div>
                                          </div>
                                        )}
                              </div>
                            </div>
                            


                                    {/* Sale Details Section */}
                                    {saleId && (
                                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl border-2 border-blue-200">
                                        {loadingSaleDetails ? (
                                          <div className="flex items-center justify-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                            <span className="ml-3 text-gray-600">Loading sale details...</span>
                                          </div>
                                        ) : saleDetails ? (
                                          <div className="space-y-5">
                                            {/* Sale Information */}
                                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                              <h4 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                                                <FileTextIcon className="w-5 h-5 text-blue-600" />
                                                Sale Information
                                              </h4>
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                  <div className="text-xs text-gray-500 font-medium mb-1">Sale Number</div>
                                                  <div className="text-sm font-semibold text-gray-900 font-mono">{saleDetails.sale_number}</div>
                                                </div>
                                                <div>
                                                  <div className="text-xs text-gray-500 font-medium mb-1">Status</div>
                                                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                                    saleDetails.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                    saleDetails.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                  }`}>
                                                    {saleDetails.status}
                                                  </span>
                                      </div>
                                                <div>
                                                  <div className="text-xs text-gray-500 font-medium mb-1">Cashier</div>
                                                  <div className="text-sm font-semibold text-gray-900">{saleDetails.cashierName || 'Unknown'}</div>
                                    </div>
                                                <div>
                                                  <div className="text-xs text-gray-500 font-medium mb-1">Date & Time</div>
                                                  <div className="text-sm font-semibold text-gray-900">
                                                    {new Date(saleDetails.created_at).toLocaleString('en-TZ', {
                                                      year: 'numeric',
                                                      month: 'short',
                                                      day: 'numeric',
                                                      hour: '2-digit',
                                                      minute: '2-digit'
                                                    })}
                                                  </div>
                                                </div>
                                    </div>
                                  </div>
                                  
                                            {/* Customer Information */}
                                            {saleDetails.customer && (
                                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                                <h4 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                                                  <User className="w-5 h-5 text-blue-600" />
                                                  Customer Information
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                  <div>
                                                    <div className="text-xs text-gray-500 font-medium mb-1">Name</div>
                                                    <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                                      {saleDetails.customer.name}
                                                      {saleDetails.customer.customer_tag && (
                                                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                          {saleDetails.customer.customer_tag.toUpperCase()}
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                  {saleDetails.customer.phone && (
                                                    <div>
                                                      <div className="text-xs text-gray-500 font-medium mb-1">Phone</div>
                                                      <div className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                                                        <Phone className="w-3.5 h-3.5" />
                                                        {saleDetails.customer.phone}
                                                      </div>
                                                    </div>
                                                  )}
                                                  {saleDetails.customer.email && (
                                                    <div>
                                                      <div className="text-xs text-gray-500 font-medium mb-1">Email</div>
                                                      <div className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                                                        <Mail className="w-3.5 h-3.5" />
                                                        {saleDetails.customer.email}
                                                      </div>
                                                    </div>
                                                  )}
                                                  {saleDetails.customer.city && (
                                                    <div>
                                                      <div className="text-xs text-gray-500 font-medium mb-1">Location</div>
                                                      <div className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                                                        <MapPin className="w-3.5 h-3.5" />
                                                        {saleDetails.customer.city}
                                                      </div>
                                                    </div>
                                                  )}
                                                  {saleDetails.customer.loyalty_level && (
                                                    <div>
                                                      <div className="text-xs text-gray-500 font-medium mb-1">Loyalty Level</div>
                                                      <div className="text-sm font-semibold text-gray-900">{saleDetails.customer.loyalty_level}</div>
                                                    </div>
                                                  )}
                                                  {saleDetails.customer.total_spent !== undefined && (
                                                    <div>
                                                      <div className="text-xs text-gray-500 font-medium mb-1">Total Spent</div>
                                                      <div className="text-sm font-semibold text-gray-900">{formatMoney(saleDetails.customer.total_spent || 0, selectedAccount?.currency)}</div>
                                                    </div>
                                                  )}
                                                  {saleDetails.customer.points !== undefined && (
                                                    <div>
                                                      <div className="text-xs text-gray-500 font-medium mb-1">Points</div>
                                                      <div className="text-sm font-semibold text-gray-900">{saleDetails.customer.points || 0}</div>
                                                    </div>
                                                  )}
                                                  {saleDetails.customer.last_visit && (
                                                    <div>
                                                      <div className="text-xs text-gray-500 font-medium mb-1">Last Visit</div>
                                                      <div className="text-sm font-semibold text-gray-900">
                                                        {new Date(saleDetails.customer.last_visit).toLocaleString('en-TZ', {
                                                          year: 'numeric',
                                                          month: 'short',
                                                          day: 'numeric',
                                                          hour: '2-digit',
                                                          minute: '2-digit'
                                                        })}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            )}

                                            {/* Payment Information */}
                                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                              <h4 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                                                <CreditCard className="w-5 h-5 text-blue-600" />
                                                Payment Information
                                              </h4>
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                  <div className="text-xs text-gray-500 font-medium mb-1">Payment Method(s)</div>
                                                  <div className="text-sm font-semibold text-gray-900">
                                                    {saleDetails.payment_method ? (
                                                      typeof saleDetails.payment_method === 'string' ? (
                                                        saleDetails.payment_method
                                                      ) : (
                                                        saleDetails.payment_method.method || saleDetails.payment_method.type || 'Unknown'
                                                      )
                                                    ) : 'Cash'}
                                                  </div>
                                                </div>
                                                <div>
                                                  <div className="text-xs text-gray-500 font-medium mb-1">Total Amount</div>
                                                  <div className="text-sm font-semibold text-gray-900">{formatMoney(saleDetails.total_amount || 0, selectedAccount?.currency)}</div>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Financial Summary */}
                                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                              <h4 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                                                <DollarSign className="w-5 h-5 text-blue-600" />
                                                Financial Summary
                                              </h4>
                                              <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                  <span className="text-sm text-gray-600">Subtotal:</span>
                                                  <span className="text-sm font-semibold text-gray-900">{formatMoney(saleDetails.subtotal || saleDetails.total_amount || 0, selectedAccount?.currency)}</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                                  <span className="text-sm font-semibold text-gray-900">Total:</span>
                                                  <span className="text-sm font-bold text-gray-900">{formatMoney(saleDetails.total_amount || 0, selectedAccount?.currency)}</span>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Sale Items */}
                                            {saleDetails.items && saleDetails.items.length > 0 && (
                                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                                <h4 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                                                  <FileTextIcon className="w-5 h-5 text-blue-600" />
                                                  Sale Items ({saleDetails.items.length})
                                                </h4>
                                                <div className="overflow-x-auto">
                                                  <table className="w-full text-sm">
                                                    <thead>
                                                      <tr className="border-b border-gray-200">
                                                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Product</th>
                                                        <th className="text-left py-2 px-3 font-semibold text-gray-700">SKU</th>
                                                        <th className="text-center py-2 px-3 font-semibold text-gray-700">Qty</th>
                                                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Unit Price</th>
                                                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Total</th>
                                                        <th className="text-right py-2 px-3 font-semibold text-gray-700">Profit</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {saleDetails.items.map((item: any, idx: number) => (
                                                        <tr key={idx} className="border-b border-gray-100">
                                                          <td className="py-3 px-3">
                                                            <div className="font-semibold text-gray-900">{item.product?.name || 'Unknown Product'}</div>
                                                            {item.variant && (
                                                              <div className="text-xs text-gray-500 mt-1">
                                                                Variant: {item.variant.variant_name || item.variant.name || item.variant.sku || 'N/A'}
                                                              </div>
                                                            )}
                                                            {item.product?.category_id && (
                                                              <div className="text-xs text-gray-400 mt-0.5">
                                                                {item.product.category_name || 'Accessories'}
                                                              </div>
                                                            )}
                                                          </td>
                                                          <td className="py-3 px-3 text-gray-600 font-mono text-xs">
                                                            {item.variant?.sku || item.product?.sku || item.sku || 'N/A'}
                                                          </td>
                                                          <td className="py-3 px-3 text-center text-gray-900 font-semibold">{item.quantity || 1}</td>
                                                          <td className="py-3 px-3 text-right text-gray-900 font-semibold">
                                                            {formatMoney(item.unit_price || (item.total_price / (item.quantity || 1)), selectedAccount?.currency)}
                                                          </td>
                                                          <td className="py-3 px-3 text-right text-gray-900 font-semibold">
                                                            {formatMoney(item.total_price || 0, selectedAccount?.currency)}
                                                          </td>
                                                          <td className="py-3 px-3 text-right text-green-700 font-semibold">
                                                            {formatMoney(item.profit || 0, selectedAccount?.currency)}
                                                          </td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ) : null}
                                      </div>
                                    )}

                                    {/* Action Buttons Section */}
                                    <div className="mt-5 pt-5 border-t-2 border-gray-200">
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedTransaction(transaction);
                                            setShowTransactionDetailsModal(true);
                                          }}
                                          className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all text-sm font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                        >
                                          <Eye className="w-4 h-4" />
                                          View Details
                                        </button>
                                        
                                        {!isReversed && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setReversalTransaction(transaction);
                                        setShowReversalModal(true);
                                      }}
                                            className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all text-sm font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                    >
                                            <RepeatIcon className="w-4 h-4" />
                                      Reverse
                                    </button>
                                  )}
                                        
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(transaction.id);
                                            toast.success('Transaction ID copied to clipboard');
                                          }}
                                          className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-all text-sm font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                        >
                                          <Copy className="w-4 h-4" />
                                          Copy ID
                                        </button>
                                        
                                        {transaction.reference_number && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              navigator.clipboard.writeText(transaction.reference_number);
                                              toast.success('Reference number copied to clipboard');
                                            }}
                                            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all text-sm font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                          >
                                            <Copy className="w-4 h-4" />
                                            Copy Ref
                                          </button>
                                  )}
                                </div>
                                    </div>
                                )}
                                
                                {/* Connecting Line */}
                                {index < accountTransactions.filter(t => {
                                  if (transactionTypeFilter !== 'all' && t.transaction_type !== transactionTypeFilter) return false;
                                  if (dateFilter.start && new Date(t.created_at) < new Date(dateFilter.start)) return false;
                                  if (dateFilter.end) {
                                    const endDate = new Date(dateFilter.end);
                                    endDate.setHours(23, 59, 59, 999);
                                    if (new Date(t.created_at) > endDate) return false;
                                  }
                                  if (searchQuery) {
                                    const query = searchQuery.toLowerCase();
                                    const matchesDescription = t.description?.toLowerCase().includes(query);
                                    const matchesReference = t.reference_number?.toLowerCase().includes(query);
                                    const matchesAmount = formatMoney(t.amount, selectedAccount?.currency || 'TZS').toLowerCase().includes(query);
                                    if (!matchesDescription && !matchesReference && !matchesAmount) return false;
                                  }
                                  return true;
                                }).length - 1 && (
                                  <div className={`absolute left-7 top-full w-0.5 h-3 ${
                                    isReversed ? 'bg-gray-300' : isPartial ? 'bg-yellow-300' : isIncome ? 'bg-yellow-300' : isIncoming ? 'bg-green-300' : isOutgoing ? 'bg-red-300' : 'bg-gray-300'
                                  }`} />
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-full px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl text-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Transaction Modal */}
      {showManualTransactionModal && manualTransactionAccount && (
        <ManualTransactionModal
          account={manualTransactionAccount}
          onClose={() => {
            setShowManualTransactionModal(false);
            setManualTransactionAccount(null);
          }}
          onSuccess={() => {
            fetchAccounts();
          }}
        />
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <TransferModal
          accounts={accounts}
          onClose={() => setShowTransferModal(false)}
          onSuccess={() => {
            fetchAccounts();
          }}
        />
      )}

      {/* Transaction Reversal Modal */}
      {showReversalModal && reversalTransaction && selectedAccount && (
        <TransactionReversalModal
          transaction={reversalTransaction}
          accountName={selectedAccount.name}
          accountCurrency={selectedAccount.currency || 'TZS'}
          onClose={() => {
            setShowReversalModal(false);
            setReversalTransaction(null);
          }}
          onSuccess={() => {
            fetchAccounts();
            // Reload the transactions for the selected account
            if (selectedAccount) {
              handleViewHistory(selectedAccount);
            }
          }}
        />
      )}

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        isOpen={showTransactionDetailsModal}
        onClose={() => {
          setShowTransactionDetailsModal(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
      />
    </div>
  );
};

export default PaymentAccountManagement;
