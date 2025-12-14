import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useSearchParams, useLocation } from 'react-router-dom';
import { PageErrorBoundary } from '../../shared/components/PageErrorBoundary';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import GlassSelect from '../../shared/components/ui/GlassSelect';
import GlassTabs from '../../shared/components/ui/GlassTabs';
import SearchBar from '../../shared/components/ui/SearchBar';
import { BackButton } from '../../shared/components/ui/BackButton';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { 
  CreditCard, RefreshCw, Download, Settings, ShoppingCart, Search, Filter, 
  Calendar, ChevronLeft, ChevronRight, CheckSquare, Square, MoreHorizontal,
  AlertTriangle, CheckCircle, Clock, XCircle, TrendingUp, TrendingDown, Eye,
  History, Copy, Printer, Share, Edit, Trash2, ArrowDownRight, X, User, Mail,
  Phone, Hash, DollarSign, Building2, FileText, CalendarDays, Banknote,
  Wallet, Repeat, ArrowUpRight, ArrowRightLeft, List, LayoutGrid, Plus
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';
import Modal from '../../shared/components/ui/Modal';
import ConfirmationDialog from '../../shared/components/ui/ConfirmationDialog';
import PurchaseOrderPaymentDashboard from '../components/PurchaseOrderPaymentDashboard';
import PaymentAccountManagement from '../components/PaymentAccountManagement';
import ExpenseManagement from '../components/ExpenseManagement';
import RecurringExpenseManagement from '../components/RecurringExpenseManagement';
import { financeAccountService } from '../../../lib/financeAccountService';
import { PaymentTrackingService } from '../../lats/payments/PaymentTrackingService';
import type { PaymentTransaction as PaymentHistoryTransaction } from '../../lats/payments/types';
import { paymentTrackingService } from '../../../lib/paymentTrackingService';
import type { PaymentTransaction as ComprehensivePaymentTransaction } from '../../../lib/paymentTrackingService';
import { format } from '../../lats/lib/format';
import { useLoadingJob } from '../../../hooks/useLoadingJob';

const EnhancedPaymentManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  
  // Initialize active tab from URL params or default to 'providers'
  const getTabFromParams = () => {
    const tab = searchParams.get('tab') || 'providers';
    // Map old tab names to new ones
    const tabMapping: Record<string, 'providers' | 'purchase-orders' | 'transactions'> = {
      'history': 'transactions',
      'expenses': 'transactions',
      'recurring': 'transactions'
    };
    const mappedTab = tabMapping[tab] || tab;
    if (mappedTab === 'providers' || mappedTab === 'purchase-orders' || mappedTab === 'transactions') {
      return mappedTab;
    }
    return 'providers';
  };

  const [activeTab, setActiveTab] = useState<'providers' | 'purchase-orders' | 'transactions'>(getTabFromParams());
  
  // Update tab when URL changes
  useEffect(() => {
    const newTab = getTabFromParams();
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Error handling
  const { errorState, handleError, clearError, withErrorHandling } = useErrorHandler({
    maxRetries: 3,
    showToast: true,
    logToConsole: true
  });

  // Trigger refresh of all payment data
  const handleDataRefresh = useCallback(() => {
    console.log('🔄 Triggering refresh of all payment data...');
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Payment History and Expenses State
  const [historyTransactions, setHistoryTransactions] = useState<ComprehensivePaymentTransaction[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState({
    status: 'all',
    provider: 'all',
    dateRange: '30',
    source: 'all'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<ComprehensivePaymentTransaction | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    amount: '',
    currency: '',
    status: '',
    notes: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [historyViewMode, setHistoryViewMode] = useState<'timeline' | 'table'>('table');
  const [expandedHistoryTransaction, setExpandedHistoryTransaction] = useState<string | null>(null);
  
  // Expense modals state
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showRecurringExpenseModal, setShowRecurringExpenseModal] = useState(false);

  // Load payment history
  const loadPaymentHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      console.log('📊 Loading comprehensive payment history from all sources...');
      
      // Clear cache to ensure fresh data
      paymentTrackingService.clearPaymentCache();
      
      // Use comprehensive payment tracking service to fetch from all sources:
      // - POS sales
      // - Device/repair payments
      // - Purchase order payments
      // - Payment transactions
      const data = await paymentTrackingService.fetchPaymentTransactions();
      console.log('📊 Loaded payment history:', data.length, 'transactions from all sources');
      console.log('📊 Payment sources:', {
        posSales: data.filter(p => p.source === 'pos_sale').length,
        devicePayments: data.filter(p => p.source === 'device_payment').length,
        purchaseOrders: data.filter(p => p.source === 'purchase_order').length
      });
      
      if (data && data.length > 0) {
        setHistoryTransactions(data);
      } else {
        setHistoryTransactions([]);
        console.warn('⚠️ No payment transactions found in database');
      }
    } catch (error) {
      console.error('❌ Error loading payment history:', error);
      toast.error('Failed to load payment history');
      setHistoryTransactions([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    setExpensesLoading(true);
    try {
      console.log('📊 Loading expenses...');
      
      // Fetch expense transactions
      const branchAccounts = await financeAccountService.getPaymentMethods();
      const accountIdsForBranch = [...new Set(branchAccounts.map(a => a.id))];

      if (accountIdsForBranch.length === 0) {
        setExpenses([]);
        setExpensesLoading(false);
        return;
      }

      const { data: transactions, error } = await supabase
        .from('account_transactions')
        .select('*, finance_accounts!account_id(id, name, type, currency)')
        .eq('transaction_type', 'expense')
        .in('account_id', accountIdsForBranch)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      if (transactions && transactions.length > 0) {
        // Convert expenses to transaction format for unified display
        const expensesAsTransactions = transactions.map(expense => ({
          id: expense.id,
          transactionId: expense.reference_number || expense.id,
          amount: Math.abs(expense.amount),
          currency: expense.finance_accounts?.currency || 'TZS',
          method: expense.metadata?.payment_method || 'Expense',
          status: expense.metadata?.status || 'completed',
          date: expense.created_at,
          timestamp: expense.created_at,
          source: 'expense',
          customerName: expense.metadata?.vendor_name || expense.description || 'Expense',
          reference: expense.reference_number || expense.id,
          description: expense.description,
          metadata: {
            ...expense.metadata,
            account_id: expense.account_id,
            account_name: expense.finance_accounts?.name,
            category: expense.metadata?.category
          },
          createdAt: expense.created_at
        }));
        
        setExpenses(expensesAsTransactions);
        console.log('📊 Loaded expenses:', expensesAsTransactions.length);
      } else {
        setExpenses([]);
      }
    } catch (error) {
      console.error('❌ Error loading expenses:', error);
      toast.error('Failed to load expenses');
      setExpenses([]);
    } finally {
      setExpensesLoading(false);
    }
  }, []);

  // Load payment history and expenses
  useEffect(() => {
    if (activeTab === 'transactions') {
      loadPaymentHistory();
      loadExpenses();
    }
  }, [activeTab, historyFilter, loadPaymentHistory, loadExpenses]);


  const getStatusBadgeVariant = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'completed':
      case 'success':
        return 'success';
      case 'failed':
      case 'cancelled':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const normalizeStatus = (status: string): string => {
    const normalized = status.toLowerCase();
    if (normalized === 'success') return 'Completed';
    if (normalized === 'pending') return 'Pending';
    if (normalized === 'failed') return 'Failed';
    if (normalized === 'cancelled') return 'Cancelled';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'multiple':
        return '🔀';
      case 'm-pesa':
      case 'mpesa':
        return '📱';
      case 'tigopesa':
        return '📱';
      case 'airtel money':
      case 'airtelmoney':
        return '📱';
      case 'mobile_money':
        return '📱';
      case 'zenopay':
        return '📱';
      case 'stripe':
        return '💳';
      case 'card':
        return '💳';
      case 'bank transfer':
      case 'transfer':
        return '🏦';
      case 'paypal':
        return '🔵';
      case 'flutterwave':
        return '🌊';
      case 'cash':
        return '💵';
      case 'credit':
        return '🎫';
      case 'mock':
        return '🧪';
      default:
        return '💰';
    }
  };

  // Merge expenses with payment transactions
  const allTransactions = useMemo(() => {
    return [...historyTransactions, ...expenses];
  }, [historyTransactions, expenses]);

  const filteredTransactions = allTransactions
    .filter(transaction => {
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchableText = [
          transaction.transactionId,
          transaction.customerName,
          transaction.method,
          transaction.reference,
          transaction.deviceName,
          transaction.purchaseOrderNumber,
          transaction.status,
          transaction.source,
          transaction.amount?.toString(),
          transaction.description,
          transaction.metadata?.category,
          transaction.metadata?.vendor_name
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!searchableText.includes(query)) {
          return false;
        }
      }
      
      // Status filter
      if (historyFilter.status !== 'all') {
        const normalizedStatus = transaction.status.toLowerCase();
        const filterStatus = historyFilter.status;
        
        // Map SUCCESS to completed for filtering
        if (filterStatus === 'completed' && normalizedStatus !== 'success' && normalizedStatus !== 'completed') {
          return false;
        } else if (filterStatus !== 'completed' && normalizedStatus !== filterStatus) {
          return false;
        }
      }
      
      // Payment method/provider filter
      if (historyFilter.provider !== 'all' && transaction.method !== historyFilter.provider) {
        return false;
      }
      
      // Source filter (POS, Device Payment, Purchase Order, Expense)
      if (historyFilter.source !== 'all' && transaction.source !== historyFilter.source) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort by date descending (most recent first)
      const dateA = new Date(a.date || a.timestamp || a.createdAt).getTime();
      const dateB = new Date(b.date || b.timestamp || b.createdAt).getTime();
      return dateB - dateA;
    });

  // Action handlers for history transactions
  const handleCopyTransaction = (transaction: ComprehensivePaymentTransaction) => {
    let transactionText = `Transaction: ${transaction.transactionId}
Customer: ${transaction.customerName || 'N/A'}
Amount: ${format.money(transaction.amount)}
Payment Method: ${transaction.method}
Source: ${transaction.source}
Status: ${normalizeStatus(transaction.status)}
Date: ${new Date(transaction.date || transaction.timestamp).toLocaleString()}
Reference: ${transaction.reference || 'N/A'}`;

    // Add additional details based on source
    if (transaction.source === 'device_payment' && transaction.deviceName) {
      transactionText += `\nDevice: ${transaction.deviceName}`;
    } else if (transaction.source === 'purchase_order' && transaction.purchaseOrderNumber) {
      transactionText += `\nPurchase Order: ${transaction.purchaseOrderNumber}`;
      transactionText += `\nSupplier: ${transaction.supplierName || 'N/A'}`;
    }
    
    if (transaction.customerPhone) {
      transactionText += `\nPhone: ${transaction.customerPhone}`;
    }
    if (transaction.customerEmail) {
      transactionText += `\nEmail: ${transaction.customerEmail}`;
    }
    
    navigator.clipboard.writeText(transactionText).then(() => {
      toast.success('Transaction details copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  const handlePrintTransaction = (transaction: ComprehensivePaymentTransaction) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const sourceLabel = transaction.source === 'pos_sale' ? 'POS Sale' 
        : transaction.source === 'device_payment' ? 'Device Payment' 
        : 'Purchase Order';
      
      let printContent = `
        <html>
          <head>
            <title>Transaction Receipt</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h2 { color: #1a202c; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
              .detail { margin: 10px 0; }
              .label { font-weight: bold; color: #4b5563; }
              .source-badge { display: inline-block; padding: 4px 12px; background-color: #e0e7ff; color: #4338ca; border-radius: 12px; font-size: 12px; margin: 10px 0; }
            </style>
          </head>
          <body>
            <h2>Transaction Receipt</h2>
            <div class="source-badge">${sourceLabel}</div>
            <div class="detail"><span class="label">Transaction ID:</span> ${transaction.transactionId}</div>
            <div class="detail"><span class="label">Customer:</span> ${transaction.customerName || 'N/A'}</div>
            <div class="detail"><span class="label">Email:</span> ${transaction.customerEmail || 'N/A'}</div>
            <div class="detail"><span class="label">Phone:</span> ${transaction.customerPhone || 'N/A'}</div>
            <div class="detail"><span class="label">Amount:</span> ${format.money(transaction.amount)}</div>
            <div class="detail"><span class="label">Payment Method:</span> ${transaction.method}</div>
            <div class="detail"><span class="label">Status:</span> ${normalizeStatus(transaction.status)}</div>
            <div class="detail"><span class="label">Date:</span> ${new Date(transaction.date || transaction.timestamp).toLocaleString()}</div>
            <div class="detail"><span class="label">Reference:</span> ${transaction.reference || 'N/A'}</div>
            <div class="detail"><span class="label">Cashier:</span> ${transaction.cashier || 'N/A'}</div>`;

      // Add source-specific details
      if (transaction.source === 'device_payment' && transaction.deviceName) {
        printContent += `<div class="detail"><span class="label">Device:</span> ${transaction.deviceName}</div>`;
      } else if (transaction.source === 'purchase_order') {
        if (transaction.purchaseOrderNumber) {
          printContent += `<div class="detail"><span class="label">Purchase Order:</span> ${transaction.purchaseOrderNumber}</div>`;
        }
        if (transaction.supplierName) {
          printContent += `<div class="detail"><span class="label">Supplier:</span> ${transaction.supplierName}</div>`;
        }
      }

      printContent += `
          </body>
        </html>`;

      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleShareTransaction = (transaction: ComprehensivePaymentTransaction) => {
    if (navigator.share) {
      navigator.share({
        title: 'Transaction Details',
        text: `Transaction ${transaction.transactionId} - ${transaction.customerName || 'N/A'} - ${format.money(transaction.amount)}`,
        url: window.location.href
      }).catch(() => {
        toast.error('Failed to share');
      });
    } else {
      handleCopyTransaction(transaction);
    }
  };

  const handleEditTransaction = (transaction: ComprehensivePaymentTransaction) => {
    setEditForm({
      amount: transaction.amount.toString(),
      currency: transaction.currency || 'TZS',
      status: transaction.status.toLowerCase(),
      notes: ''
    });
    setEditModalOpen(true);
  };

  const handleDeleteTransaction = () => {
    setDeleteDialogOpen(true);
  };

  const handleRefundTransaction = async (transaction: ComprehensivePaymentTransaction) => {
    try {
      setIsProcessing(true);
      
      // Update the transaction status to refunded
      const { error } = await supabase
        .from('payment_transactions')
        .update({ 
          status: 'FAILED',
          metadata: {
            ...transaction.metadata,
            refunded: true,
            refunded_at: new Date().toISOString(),
            refunded_by: currentUser?.id
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      if (error) throw error;

      toast.success('Transaction refunded successfully');
      loadPaymentHistory();
      setSelectedTransaction(null);
    } catch (error) {
      console.error('Error refunding transaction:', error);
      toast.error('Failed to refund transaction');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedTransaction) return;

    try {
      setIsProcessing(true);
      
      const amount = parseFloat(editForm.amount);
      if (isNaN(amount) || amount < 0) {
        toast.error('Please enter a valid amount');
        return;
      }
      
      const { error } = await supabase
        .from('payment_transactions')
        .update({
          amount: amount,
          currency: editForm.currency,
          status: editForm.status.toUpperCase(),
          metadata: {
            ...selectedTransaction.metadata,
            edited: true,
            edited_at: new Date().toISOString(),
            edited_by: currentUser?.id,
            notes: editForm.notes
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTransaction.id);

      if (error) throw error;

      toast.success('Transaction updated successfully');
      setEditModalOpen(false);
      loadPaymentHistory();
      setSelectedTransaction(null);
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedTransaction) return;

    try {
      setIsProcessing(true);
      
      const { error } = await supabase
        .from('payment_transactions')
        .delete()
        .eq('id', selectedTransaction.id);

      if (error) throw error;

      toast.success('Transaction deleted successfully');
      setDeleteDialogOpen(false);
      loadPaymentHistory();
      setSelectedTransaction(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    } finally {
      setIsProcessing(false);
    }
  };

  // Update URL when tab changes
  const handleTabChange = useCallback((tabId: string) => {
    const validTabs = ['providers', 'purchase-orders', 'transactions'];
    if (validTabs.includes(tabId)) {
      const newTab = tabId as 'providers' | 'purchase-orders' | 'transactions';
      setActiveTab(newTab);
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('tab', newTab);
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <PageErrorBoundary pageName="Payment Management" showDetails={true}>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Combined Container - All sections in one */}
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[95vh]">
          {/* Fixed Header Section - Enhanced Modal Style */}
          <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              {/* Left: Icon + Text */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Payment Management</h1>
                <p className="text-sm text-gray-600">Manage payments, providers, and purchase orders</p>
              </div>
              </div>

              {/* Right: Back Button */}
              <BackButton to="/dashboard" label="" className="!w-12 !h-12 !p-0 !rounded-full !bg-blue-600 hover:!bg-blue-700 !shadow-lg flex items-center justify-center" iconClassName="text-white" />
            </div>
          </div>

          {/* Action Bar - Tab Navigation */}
          <div className="px-8 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/50 flex-shrink-0">
          <GlassTabs
            tabs={[
              {
                id: 'providers',
                label: 'Payment Accounts',
                icon: <Wallet size={20} />
              },
              {
                id: 'purchase-orders',
                label: 'Purchase Orders',
                icon: <ShoppingCart size={20} />
              },
              {
                id: 'transactions',
                label: 'Transactions',
                icon: <History size={20} />
              }
            ]}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            variant="modern"
            size="md"
          />
        </div>

          {/* Main Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
          {/* Tab Content */}
            <div className="p-6">
            {activeTab === 'providers' && (
              <PaymentAccountManagement />
            )}
            {activeTab === 'purchase-orders' && (
              <PurchaseOrderPaymentDashboard
                onViewDetails={(payment) => {
                  console.log('View purchase order payment details:', payment);
                }}
                onMakePayment={(purchaseOrder) => {
                  console.log('Make payment for purchase order:', purchaseOrder);
                  handleDataRefresh();
                }}
                onExport={() => {
                  console.log('Export purchase order data');
                }}
              />
            )}
            {activeTab === 'transactions' && (
              <div className="space-y-6">
                {/* Action Buttons */}
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => setShowAddExpenseModal(true)}
                    className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg hover:from-orange-600 hover:to-amber-700"
                  >
                    <Plus size={18} />
                    <span>Add Expense</span>
                  </button>
                  <button
                    onClick={() => setShowRecurringExpenseModal(true)}
                    className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:from-blue-600 hover:to-blue-700"
                  >
                    <Repeat size={18} />
                    <span>Recurring Expenses</span>
                  </button>
                  <button
                    onClick={() => {
                      loadPaymentHistory();
                      loadExpenses();
                    }}
                    disabled={historyLoading || expensesLoading}
                    className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-blue-300 disabled:opacity-50 bg-white shadow-sm"
                  >
                    {(historyLoading || expensesLoading) ? (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <RefreshCw size={18} />
                    )}
                    <span>Refresh</span>
                  </button>
                </div>

                {/* Search and Filter Toggle */}
                <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search Bar */}
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by transaction ID, customer, amount, reference..."
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white text-sm font-medium"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Filter Toggle Button */}
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 border-2 ${
                        showFilters
                          ? 'bg-blue-500 text-white border-blue-600 shadow-lg'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Filter className="w-4 h-4" />
                      Filters
                      {(historyFilter.status !== 'all' || historyFilter.provider !== 'all' || historyFilter.source !== 'all' || historyFilter.dateRange !== '30') && (
                        <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-semibold">
                          Active
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Filters - Collapsible */}
                {showFilters && (
                  <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 mb-6 shadow-sm">
                  <div className="space-y-4">
                    {/* Source Filter */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-medium text-gray-600 min-w-[100px]">Source:</span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'all', label: 'All' },
                          { value: 'pos_sale', label: 'POS Sales' },
                          { value: 'device_payment', label: 'Device Repairs' },
                          { value: 'purchase_order', label: 'Purchase Orders' },
                          { value: 'expense', label: 'Expenses' }
                        ].map(option => (
                          <button
                            key={option.value}
                            onClick={() => setHistoryFilter(prev => ({ ...prev, source: option.value }))}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                              historyFilter.source === option.value
                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-medium text-gray-600 min-w-[100px]">Status:</span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setHistoryFilter(prev => ({ ...prev, status: 'all' }))}
                          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                            historyFilter.status === 'all'
                              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                              : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setHistoryFilter(prev => ({ ...prev, status: 'pending' }))}
                          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                            historyFilter.status === 'pending'
                              ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30'
                              : 'bg-white text-gray-600 border border-gray-200 hover:border-yellow-300 hover:text-yellow-600'
                          }`}
                        >
                          Pending
                        </button>
                        <button
                          onClick={() => setHistoryFilter(prev => ({ ...prev, status: 'completed' }))}
                          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                            historyFilter.status === 'completed'
                              ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                              : 'bg-white text-gray-600 border border-gray-200 hover:border-green-300 hover:text-green-600'
                          }`}
                        >
                          Completed
                        </button>
                        <button
                          onClick={() => setHistoryFilter(prev => ({ ...prev, status: 'failed' }))}
                          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                            historyFilter.status === 'failed'
                              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                              : 'bg-white text-gray-600 border border-gray-200 hover:border-red-300 hover:text-red-600'
                          }`}
                        >
                          Failed
                        </button>
                        <button
                          onClick={() => setHistoryFilter(prev => ({ ...prev, status: 'cancelled' }))}
                          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                            historyFilter.status === 'cancelled'
                              ? 'bg-gray-500 text-white shadow-lg shadow-gray-500/30'
                              : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:text-gray-600'
                          }`}
                        >
                          Cancelled
                        </button>
                      </div>
                    </div>

                    {/* Payment Method Filter */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-medium text-gray-600 min-w-[100px]">Payment:</span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'all', label: 'All' },
                          { value: 'Cash', label: 'Cash' },
                          { value: 'M-Pesa', label: 'M-Pesa' },
                          { value: 'Tigopesa', label: 'Tigopesa' },
                          { value: 'Airtel Money', label: 'Airtel' },
                          { value: 'Bank Transfer', label: 'Bank' },
                          { value: 'Card', label: 'Card' },
                          { value: 'Credit', label: 'Credit' }
                        ].map(option => (
                          <button
                            key={option.value}
                            onClick={() => setHistoryFilter(prev => ({ ...prev, provider: option.value }))}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                              historyFilter.provider === option.value
                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Date Range Filter */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-medium text-gray-600 min-w-[100px]">Period:</span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: '7', label: '7 days' },
                          { value: '30', label: '30 days' },
                          { value: '90', label: '90 days' },
                          { value: '365', label: '1 year' }
                        ].map(option => (
                          <button
                            key={option.value}
                            onClick={() => setHistoryFilter(prev => ({ ...prev, dateRange: option.value }))}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                              historyFilter.dateRange === option.value
                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {/* Transactions List */}
                <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">All Transactions ({filteredTransactions.length})</h3>
                    <div className="flex items-center gap-3">
                      {/* View Toggle */}
                      <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => setHistoryViewMode('timeline')}
                          className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-2 ${
                            historyViewMode === 'timeline'
                              ? 'bg-white text-indigo-600 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                          title="Timeline View"
                        >
                          <LayoutGrid className="w-4 h-4" />
                          <span className="text-sm font-medium">Timeline</span>
                        </button>
                        <button
                          onClick={() => setHistoryViewMode('table')}
                          className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-2 ${
                            historyViewMode === 'table'
                              ? 'bg-white text-indigo-600 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                          title="Table View"
                        >
                          <List className="w-4 h-4" />
                          <span className="text-sm font-medium">Table</span>
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          loadPaymentHistory();
                          loadExpenses();
                        }}
                        disabled={historyLoading || expensesLoading}
                        className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-blue-300 disabled:opacity-50 bg-white shadow-sm"
                      >
                        {(historyLoading || expensesLoading) ? (
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <RefreshCw size={18} />
                        )}
                        <span>{(historyLoading || expensesLoading) ? 'Loading...' : 'Refresh'}</span>
                      </button>
                    </div>
                  </div>

                  {historyLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <LoadingSpinner size="lg" color="blue" />
                      <p className="mt-4 text-gray-600 font-medium">Loading transactions...</p>
                    </div>
                  ) : filteredTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <CreditCard className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">No Transactions Found</h3>
                      <p className="text-gray-600 mb-6">
                        {allTransactions.length === 0 
                          ? 'No transactions have been recorded yet.'
                          : 'No transactions match your current filters.'}
                      </p>
                      {allTransactions.length > 0 && (
                        <button
                          onClick={() => {
                            setHistoryFilter({ status: 'all', provider: 'all', dateRange: '30', source: 'all' });
                            setSearchQuery('');
                          }}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
                        >
                          <span>Clear Filters</span>
                        </button>
                      )}
                    </div>
                  ) : historyViewMode === 'table' ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Customer</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Source</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Amount</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">
                              <div className="flex items-center gap-1">
                                Date
                                <TrendingDown className="w-4 h-4 text-blue-600" title="Most recent first" />
                              </div>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Method</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Reference</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTransactions.map((transaction, index) => {
                            // Determine if it's income (incoming) or expense (outgoing)
                            const isIncome = transaction.source === 'pos_sale' || transaction.source === 'device_payment';
                            const isExpense = transaction.source === 'purchase_order' || transaction.source === 'expense';
                            const isInstallment = transaction.method?.toLowerCase().includes('installment') || 
                                                 transaction.reference?.includes('INS-');
                            
                            return (
                            <tr 
                              key={transaction.id} 
                              className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                              onClick={() => setSelectedTransaction(transaction)}
                            >
                              <td className="py-3 px-4">
                                <div className={`relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md ${
                                  isIncome
                                    ? 'bg-gradient-to-br from-green-500 to-green-600'
                                    : isExpense
                                    ? 'bg-gradient-to-br from-red-500 to-red-600'
                                    : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                } text-white`}>
                                  {isInstallment ? (
                                    index + 1
                                  ) : isIncome ? (
                                    <ArrowDownRight className="w-5 h-5" />
                                  ) : isExpense ? (
                                    <ArrowUpRight className="w-5 h-5" />
                                  ) : (
                                    <ArrowRightLeft className="w-5 h-5" />
                                  )}
                                  {transaction.status === 'completed' && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                                      <CheckCircle className="w-2.5 h-2.5 text-white" />
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div>
                                  <div className="font-semibold text-gray-900 text-lg">{transaction.customerName || 'N/A'}</div>
                                  {transaction.customerEmail && (
                                    <div className="text-gray-500 text-xs">{transaction.customerEmail}</div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full font-medium ${
                                  transaction.source === 'pos_sale' ? 'bg-purple-100 text-purple-800' :
                                  transaction.source === 'device_payment' ? 'bg-green-100 text-green-800' :
                                  transaction.source === 'expense' ? 'bg-red-100 text-red-800' :
                                  'bg-orange-100 text-orange-800'
                                }`}>
                                  {transaction.source === 'pos_sale' ? '🛒 POS' :
                                   transaction.source === 'device_payment' ? '🔧 Repair' :
                                   transaction.source === 'expense' ? '💰 Expense' :
                                   '📦 PO'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-semibold text-gray-900">
                                  {format.money(transaction.amount)}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-sm text-gray-600">
                                  {new Date(transaction.date || transaction.timestamp).toLocaleDateString()}
                                  <br />
                                  <span className="text-xs text-gray-400">
                                    {new Date(transaction.date || transaction.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{getProviderIcon(transaction.method)}</span>
                                  <span className="text-sm font-medium text-gray-700">
                                    {transaction.method}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                  getStatusBadgeVariant(transaction.status) === 'success' ? 'bg-green-100 text-green-800' :
                                  getStatusBadgeVariant(transaction.status) === 'error' ? 'bg-red-100 text-red-800' :
                                  getStatusBadgeVariant(transaction.status) === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {normalizeStatus(transaction.status)}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-sm text-gray-600 font-mono">
                                  {transaction.reference || 'N/A'}
                                </div>
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    // Timeline View
                    <div className="space-y-3 pr-1">
                      {filteredTransactions.map((transaction, index) => {
                        const isIncome = transaction.source === 'pos_sale' || transaction.source === 'device_payment';
                        const isExpense = transaction.source === 'purchase_order' || transaction.source === 'expense';
                        const isInstallment = transaction.method?.toLowerCase().includes('installment') || 
                                             transaction.reference?.includes('INS-');
                        const isExpanded = expandedHistoryTransaction === transaction.id;
                        const isCompleted = transaction.status === 'completed';
                        
                        const transactionDate = new Date(transaction.date || transaction.timestamp);
                        const formattedDate = transactionDate.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        });
                        
                        return (
                          <div 
                            key={transaction.id} 
                            className={`group relative p-5 rounded-2xl border-2 transition-all duration-200 ${
                              isExpanded
                                ? 'border-indigo-500 shadow-xl'
                                : isIncome
                                ? 'bg-white border-green-300 shadow-md hover:shadow-lg'
                                : isExpense
                                ? 'bg-white border-red-300 shadow-md hover:shadow-lg'
                                : 'bg-white border-gray-200 shadow-md hover:shadow-lg'
                            }`}
                          >
                            <div 
                              className="flex items-center justify-between cursor-pointer"
                              onClick={() => setExpandedHistoryTransaction(isExpanded ? null : transaction.id)}
                            >
                              <div className="flex items-center gap-4 flex-1">
                                {/* Transaction Icon Badge */}
                                <div className={`relative flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shadow-lg ${
                                  isIncome
                                    ? 'bg-gradient-to-br from-green-500 to-green-600'
                                    : isExpense
                                    ? 'bg-gradient-to-br from-red-500 to-red-600'
                                    : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                } text-white`}>
                                  {isInstallment ? (
                                    index + 1
                                  ) : isIncome ? (
                                    <ArrowDownRight className="w-6 h-6" />
                                  ) : isExpense ? (
                                    <ArrowUpRight className="w-6 h-6" />
                                  ) : (
                                    <ArrowRightLeft className="w-6 h-6" />
                                  )}
                                  {isCompleted && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                                      <CheckCircle className="w-3 h-3 text-white" />
                                    </div>
                                  )}
                                </div>
                                
                                {/* Description and Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="w-4 h-4 flex-shrink-0 text-gray-600" />
                                    <div className="text-base font-bold text-gray-900">
                                      {formattedDate}
                                    </div>
                                  </div>
                                  
                                  <div className="text-sm font-semibold text-gray-900 mb-1">
                                    {transaction.customerName || 'N/A'}
                                  </div>
                                  
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase ${
                                      transaction.source === 'pos_sale' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                      transaction.source === 'device_payment' ? 'bg-green-100 text-green-800 border border-green-200' :
                                      transaction.source === 'expense' ? 'bg-red-100 text-red-800 border border-red-200' :
                                      'bg-orange-100 text-orange-800 border border-orange-200'
                                    }`}>
                                      {transaction.source === 'pos_sale' ? '🛒 POS' :
                                       transaction.source === 'device_payment' ? '🔧 Repair' :
                                       transaction.source === 'expense' ? '💰 Expense' :
                                       '📦 PO'}
                                    </span>
                                    {isCompleted && (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase bg-green-100 text-green-800 border border-green-200">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        Completed
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Right Section - Amount */}
                              <div className="flex-shrink-0 text-right ml-4">
                                <div className={`text-2xl font-bold mb-1 ${
                                  isIncome ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  {isIncome ? '+' : '-'}{format.money(Math.abs(transaction.amount))}
                                </div>
                                <div className="text-xs text-gray-500 font-medium mt-1">
                                  {transaction.method || 'N/A'}
                                </div>
                                {transaction.reference && (
                                  <div className="text-xs text-gray-500 font-mono mt-1">
                                    {transaction.reference}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Connecting Line */}
                            {index < filteredTransactions.length - 1 && (
                              <div className={`absolute left-7 top-full w-0.5 h-3 ${
                                isIncome ? 'bg-green-300' : (isExpense || transaction.source === 'expense') ? 'bg-red-300' : 'bg-gray-300'
                              }`}></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Detail Modal - Redesigned */}
      {selectedTransaction && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 pt-16 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden animate-slideUp">
              {/* Modal Header - Gradient */}
              <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-8 py-6 text-white">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">Payment Transaction</h2>
                        <p className="text-blue-100 text-sm mt-1">Complete transaction details</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedTransaction(null)}
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all flex items-center justify-center group"
                  >
                    <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-300" />
                  </button>
                </div>
                
                {/* Status Badge in Header */}
                <div className="relative mt-4">
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-base font-semibold ${
                    getStatusBadgeVariant(selectedTransaction.status) === 'success' ? 'bg-green-100 text-green-800' :
                    getStatusBadgeVariant(selectedTransaction.status) === 'error' ? 'bg-red-100 text-red-800' :
                    getStatusBadgeVariant(selectedTransaction.status) === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedTransaction.status.toLowerCase() === 'success' || selectedTransaction.status.toLowerCase() === 'completed' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : selectedTransaction.status.toLowerCase() === 'pending' ? (
                      <Clock className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    {normalizeStatus(selectedTransaction.status)}
                  </span>
                </div>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="overflow-y-auto max-h-[calc(85vh-280px)] px-8 py-6 bg-gray-50">
                <div className="space-y-5">
                  {/* Amount Highlight Card */}
                  <div className="bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-24 -mb-24"></div>
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="w-6 h-6" />
                        <span className="text-sm font-medium opacity-90">Transaction Amount</span>
                      </div>
                      <div className="text-5xl font-bold mb-2">
                        {format.money(selectedTransaction.amount)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                          {selectedTransaction.source === 'pos_sale' ? '🛒 POS Sale' :
                           selectedTransaction.source === 'device_payment' ? '🔧 Device Repair' :
                           '📦 Purchase Order'}
                        </span>
                        <span className="text-sm opacity-75">• {new Date(selectedTransaction.date || selectedTransaction.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details Card */}
                  {selectedTransaction.metadata?.details?.payments && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        Payment Details
                      </h3>
                      <div className="space-y-4">
                        {selectedTransaction.metadata.details.payments.map((payment: any, index: number) => (
                          <div key={index} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <CreditCard className="w-4 h-4 text-blue-600" />
                                </div>
                                <span className="font-semibold text-gray-900">{payment.method}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-gray-900">{format.money(payment.amount)}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Hash className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-600">Account ID:</span>
                                <span className="font-mono text-gray-900 break-all">{payment.accountId}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-600">Timestamp:</span>
                                <span className="font-medium text-gray-900">
                                  {new Date(payment.timestamp).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Total Paid Summary */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </div>
                              <span className="font-semibold text-gray-900">Total Paid</span>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold text-green-700">
                                {format.money(selectedTransaction.metadata.details.totalPaid)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Transaction Details Section */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Transaction Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Hash className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-500 mb-1">Transaction ID</div>
                          <div className="font-mono text-sm font-semibold text-gray-900 break-all">
                            {selectedTransaction.transactionId}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-500 mb-1">Payment Method</div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{getProviderIcon(selectedTransaction.method)}</span>
                            <span className="font-semibold text-gray-900">{selectedTransaction.method}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-500 mb-1">Reference</div>
                          <div className="font-mono text-sm font-semibold text-gray-900 break-all">
                            {selectedTransaction.reference || 'N/A'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-500 mb-1">Served By</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {selectedTransaction.cashier || 'N/A'}
                          </div>
                        </div>
                      </div>

                      {selectedTransaction.source === 'device_payment' && selectedTransaction.deviceName && (
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <ShoppingCart className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-500 mb-1">Device</div>
                            <div className="font-semibold text-gray-900">
                              {selectedTransaction.deviceName}
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedTransaction.source === 'purchase_order' && (
                        <>
                          {selectedTransaction.purchaseOrderNumber && (
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 text-orange-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-gray-500 mb-1">Purchase Order</div>
                                <div className="font-mono text-sm font-semibold text-gray-900 break-all">
                                  {selectedTransaction.purchaseOrderNumber}
                                </div>
                              </div>
                            </div>
                          )}
                          {selectedTransaction.supplierName && (
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Building2 className="w-5 h-5 text-indigo-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-gray-500 mb-1">Supplier</div>
                                <div className="font-semibold text-gray-900">
                                  {selectedTransaction.supplierName}
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Customer Information Section */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      Customer Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-500 mb-1">Customer Name</div>
                          <div className="font-semibold text-gray-900">
                            {selectedTransaction.customerName || 'N/A'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                        <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Phone className="w-5 h-5 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-500 mb-1">Phone Number</div>
                          <div className="font-semibold text-gray-900">
                            {selectedTransaction.customerPhone || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline Section */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-blue-600" />
                      Transaction Timeline
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <Clock className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-500 mb-1">Transaction Date</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {new Date(selectedTransaction.date || selectedTransaction.timestamp).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                      
                      {selectedTransaction.createdAt && (
                        <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <RefreshCw className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-500 mb-1">Record Created</div>
                            <div className="text-sm font-semibold text-gray-900">
                              {new Date(selectedTransaction.createdAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {selectedTransaction.status === 'completed' && (
                        <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-500 mb-1">Status</div>
                            <div className="text-sm font-semibold text-green-700">
                              Completed
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metadata */}
                  {selectedTransaction.metadata && Object.keys(selectedTransaction.metadata).length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Additional Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(selectedTransaction.metadata).map(([key, value]) => {
                          // Skip paymentMethod if it's already shown in Payment Details section
                          if (key === 'paymentMethod' && typeof value === 'object' && value !== null) {
                            const paymentData = value as any;
                            
                            // If it's a multiple payment type, show breakdown
                            if (paymentData.type === 'multiple' && paymentData.details?.payments) {
                              return (
                                <div key={key} className="md:col-span-2 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                                  <div className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-blue-600" />
                                    Multiple Payment Methods Breakdown
                                  </div>
                                  <div className="space-y-2">
                                    {paymentData.details.payments.map((payment: any, idx: number) => (
                                      <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg">
                                        <div className="flex items-center gap-2">
                                          <span className="text-lg">{getProviderIcon(payment.method)}</span>
                                          <span className="text-sm font-medium text-gray-700">{payment.method}</span>
                                        </div>
                                        <span className="text-sm font-bold text-gray-900">{format.money(payment.amount)}</span>
                                      </div>
                                    ))}
                                    <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg border-t-2 border-green-200 mt-2">
                                      <span className="text-sm font-bold text-green-800">Total Paid</span>
                                      <span className="text-base font-bold text-green-800">{format.money(paymentData.details.totalPaid)}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            
                            // If it's a single payment, skip showing it (already in Payment Details)
                            return null;
                          }
                          
                          // For other metadata, show as before but with better formatting
                          return (
                            <div key={key} className="flex items-start justify-between gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <span className="text-sm font-medium text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                              <span className="text-sm font-semibold text-gray-900 text-right break-all">
                                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Session Info */}
                  {selectedTransaction.pos_session_id && (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-sm border border-orange-100 p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                          <Banknote className="w-5 h-5 text-orange-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">POS Session</h3>
                      </div>
                      <div className="font-mono text-sm font-semibold text-gray-900 bg-white/50 rounded-lg p-3 break-all">
                        {selectedTransaction.pos_session_id}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer - Action Buttons */}
              <div className="bg-white border-t border-gray-200 px-8 py-6">
                {/* Action Buttons Row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
                  <button
                    onClick={() => handleCopyTransaction(selectedTransaction)}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 text-gray-700 rounded-xl hover:from-gray-100 hover:to-gray-200 hover:border-gray-300 transition-all shadow-sm hover:shadow-md font-medium text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="hidden sm:inline">Copy</span>
                  </button>
                  
                  <button
                    onClick={() => handlePrintTransaction(selectedTransaction)}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 text-gray-700 rounded-xl hover:from-gray-100 hover:to-gray-200 hover:border-gray-300 transition-all shadow-sm hover:shadow-md font-medium text-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span className="hidden sm:inline">Print</span>
                  </button>
                  
                  <button
                    onClick={() => handleShareTransaction(selectedTransaction)}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 text-gray-700 rounded-xl hover:from-gray-100 hover:to-gray-200 hover:border-gray-300 transition-all shadow-sm hover:shadow-md font-medium text-sm"
                  >
                    <Share className="w-4 h-4" />
                    <span className="hidden sm:inline">Share</span>
                  </button>
                  
                  <button
                    onClick={() => handleEditTransaction(selectedTransaction)}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm hover:shadow-md font-medium text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                  
                  {(selectedTransaction.status.toLowerCase() === 'success' || selectedTransaction.status.toLowerCase() === 'completed') && (
                    <button
                      onClick={() => handleRefundTransaction(selectedTransaction)}
                      disabled={isProcessing}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition-all shadow-sm hover:shadow-md font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowDownRight className="w-4 h-4" />
                      <span className="hidden sm:inline">{isProcessing ? 'Processing...' : 'Refund'}</span>
                    </button>
                  )}
                  
                  <button
                    onClick={handleDeleteTransaction}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-sm hover:shadow-md font-medium text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
                
                {/* Transaction ID & Close Button */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Hash className="w-4 h-4" />
                    <span>ID:</span>
                    <span className="font-mono font-semibold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">
                      {selectedTransaction.id}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedTransaction(null)}
                    className="px-6 py-2.5 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-xl hover:from-gray-800 hover:to-gray-900 transition-all shadow-sm hover:shadow-md font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Transaction Modal */}
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="Edit Transaction"
          footer={
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2.5 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isProcessing}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <LoadingSpinner size="sm" color="white" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                type="number"
                value={editForm.amount}
                onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter amount"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                value={editForm.currency}
                onChange={(e) => setEditForm({...editForm, currency: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="TZS">TZS - Tanzanian Shilling</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pending">Pending</option>
                <option value="success">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Enter notes or description"
              />
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Transaction"
          message={`Are you sure you want to delete this transaction? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          loading={isProcessing}
        />

        {/* Add Expense Modal */}
        {showAddExpenseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Expense Management</h3>
                    <p className="text-sm text-gray-600">Track and manage business expenses</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddExpenseModal(false);
                    loadExpenses(); // Refresh expenses when modal closes
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <ExpenseManagement />
              </div>
            </div>
          </div>
        )}

        {/* Recurring Expenses Modal */}
        {showRecurringExpenseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Repeat className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Recurring Expenses</h3>
                    <p className="text-sm text-gray-600">Manage automated recurring expenses</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowRecurringExpenseModal(false);
                    loadExpenses(); // Refresh expenses when modal closes
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <RecurringExpenseManagement />
              </div>
            </div>
          </div>
        )}
    </PageErrorBoundary>
  );
};

export default EnhancedPaymentManagementPage;

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out;
  }
  
  .animate-slideUp {
    animation: slideUp 0.3s ease-out;
  }
`;

if (typeof document !== 'undefined' && !document.getElementById('payment-modal-animations')) {
  style.id = 'payment-modal-animations';
  document.head.appendChild(style);
}
