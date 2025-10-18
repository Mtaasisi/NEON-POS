import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { PageErrorBoundary } from '../../shared/components/PageErrorBoundary';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import GlassButton from '../../shared/components/ui/GlassButton';
import GlassSelect from '../../shared/components/ui/GlassSelect';
import GlassBadge from '../../shared/components/ui/GlassBadge';
import GlassCard from '../../shared/components/ui/GlassCard';
import SearchBar from '../../shared/components/ui/SearchBar';
import { BackButton } from '../../shared/components/ui/BackButton';
import { 
  CreditCard, RefreshCw, Download, Settings, ShoppingCart, Search, Filter, 
  Calendar, ChevronLeft, ChevronRight, CheckSquare, Square, MoreHorizontal,
  AlertTriangle, CheckCircle, Clock, XCircle, TrendingUp, TrendingDown, Eye,
  History, Copy, Printer, Share, Edit, Trash2, ArrowDownRight, X, User, Mail,
  Phone, Hash, DollarSign, Building2, FileText, CalendarDays, Banknote, LayoutDashboard,
  Wallet, Repeat
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';
import Modal from '../../shared/components/ui/Modal';
import ConfirmationDialog from '../../shared/components/ui/ConfirmationDialog';
import PaymentTrackingDashboard from '../components/PaymentTrackingDashboard';
import PurchaseOrderPaymentDashboard from '../components/PurchaseOrderPaymentDashboard';
import PaymentAccountManagement from '../components/PaymentAccountManagement';
import ExpenseManagement from '../components/ExpenseManagement';
import RecurringExpenseManagement from '../components/RecurringExpenseManagement';
import { PaymentTrackingService } from '../../lats/payments/PaymentTrackingService';
import type { PaymentTransaction as PaymentHistoryTransaction } from '../../lats/payments/types';
import { paymentTrackingService } from '../../../lib/paymentTrackingService';
import type { PaymentTransaction as ComprehensivePaymentTransaction } from '../../../lib/paymentTrackingService';
import { format } from '../../lats/lib/format';

const EnhancedPaymentManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'tracking' | 'providers' | 'purchase-orders' | 'history' | 'expenses' | 'recurring'>('tracking');
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

  // Payment History State
  const [historyTransactions, setHistoryTransactions] = useState<ComprehensivePaymentTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
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

  // Load payment history
  useEffect(() => {
    if (activeTab === 'history') {
      loadPaymentHistory();
    }
  }, [activeTab, historyFilter]);

  const loadPaymentHistory = async () => {
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
        toast.success(`Loaded ${data.length} transactions from all payment sources`);
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
  };

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

  const filteredHistoryTransactions = historyTransactions
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
          transaction.amount?.toString()
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
      
      // Source filter (POS, Device Payment, Purchase Order)
      if (historyFilter.source !== 'all' && transaction.source !== historyFilter.source) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort by date descending (most recent first)
      const dateA = new Date(a.date || a.timestamp).getTime();
      const dateB = new Date(b.date || b.timestamp).getTime();
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

  return (
    <PageErrorBoundary pageName="Payment Management" showDetails={true}>
      <div className="min-h-screen p-6" style={{ backgroundColor: 'transparent' }}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Management</h1>
            <p className="text-gray-600">Manage payments, providers, and purchase orders</p>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('tracking')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === 'tracking'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <LayoutDashboard size={16} />
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('providers')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === 'providers'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Wallet size={16} />
                  Payment Accounts
                </button>
                <button
                  onClick={() => setActiveTab('purchase-orders')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === 'purchase-orders'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <ShoppingCart size={16} />
                  Purchase Orders
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === 'history'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <History size={16} />
                  Transactions
                </button>
                <button
                  onClick={() => setActiveTab('expenses')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === 'expenses'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <TrendingDown size={16} />
                  Expenses
                </button>
                <button
                  onClick={() => setActiveTab('recurring')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === 'recurring'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Repeat size={16} />
                  Recurring
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {activeTab === 'tracking' && (
              <PaymentTrackingDashboard
                key={refreshTrigger} // Force re-render when refreshTrigger changes
                onViewDetails={(payment) => {
                  console.log('View payment details:', payment);
                }}
                onRefund={(payment) => {
                  console.log('Refund payment:', payment);
                }}
                onExport={() => {
                  console.log('Export data');
                }}
                onNavigateToTab={(tab) => {
                  setActiveTab(tab as 'tracking' | 'providers' | 'purchase-orders' | 'history');
                }}
              />
            )}
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
                  // Trigger refresh of Overview tab data when payment is made
                  handleDataRefresh();
                }}
                onExport={() => {
                  console.log('Export purchase order data');
                }}
              />
            )}
            {activeTab === 'expenses' && (
              <ExpenseManagement />
            )}
            {activeTab === 'recurring' && (
              <RecurringExpenseManagement />
            )}
            {activeTab === 'history' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Transactions</h2>
                  <p className="text-gray-600">Track all payment transactions and their status</p>
                </div>

                {/* Search and Filter Toggle */}
                <GlassCard className="p-4 mb-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search Bar */}
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by transaction ID, customer, amount, reference..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
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
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                        showFilters
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Filter className="w-4 h-4" />
                      Filters
                      {(historyFilter.status !== 'all' || historyFilter.provider !== 'all' || historyFilter.source !== 'all' || historyFilter.dateRange !== '30') && (
                        <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                          Active
                        </span>
                      )}
                    </button>
                  </div>
                </GlassCard>

                {/* Filters - Collapsible */}
                {showFilters && (
                  <GlassCard className="p-5 mb-6">
                  <div className="space-y-4">
                    {/* Source Filter */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-medium text-gray-600 min-w-[100px]">Source:</span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'all', label: 'All' },
                          { value: 'pos_sale', label: 'POS Sales' },
                          { value: 'device_payment', label: 'Device Repairs' },
                          { value: 'purchase_order', label: 'Purchase Orders' }
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
                </GlassCard>
                )}

                {/* Transactions List */}
                <GlassCard className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Transactions ({filteredHistoryTransactions.length})</h3>
                    <GlassButton onClick={loadPaymentHistory} disabled={historyLoading}>
                      {historyLoading ? 'Loading...' : 'Refresh'}
                    </GlassButton>
                  </div>

                  {historyLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading transactions...</p>
                    </div>
                  ) : filteredHistoryTransactions.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">💳</div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Transactions Found</h3>
                      <p className="text-gray-600 mb-4">
                        {historyTransactions.length === 0 
                          ? 'No payment transactions have been recorded yet.'
                          : 'No transactions match your current filters.'}
                      </p>
                      {historyTransactions.length === 0 && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-gray-700 max-w-md mx-auto">
                          <p className="font-medium mb-2">💡 To see payment history:</p>
                          <ul className="text-left space-y-1">
                            <li>• Process payments through the POS</li>
                            <li>• Record purchase order payments</li>
                            <li>• Complete device repair payments</li>
                          </ul>
                        </div>
                      )}
                      {historyTransactions.length > 0 && (
                        <GlassButton 
                          onClick={() => setHistoryFilter({ status: 'all', provider: 'all', dateRange: '30', source: 'all' })}
                          className="mt-4"
                        >
                          Clear Filters
                        </GlassButton>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
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
                          {filteredHistoryTransactions.map((transaction) => (
                            <tr 
                              key={transaction.id} 
                              className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                              onClick={() => setSelectedTransaction(transaction)}
                            >
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
                                  'bg-orange-100 text-orange-800'
                                }`}>
                                  {transaction.source === 'pos_sale' ? '🛒 POS' :
                                   transaction.source === 'device_payment' ? '🔧 Repair' :
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
                                <GlassBadge variant={getStatusBadgeVariant(transaction.status)} size="sm">
                                  {normalizeStatus(transaction.status)}
                                </GlassBadge>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-sm text-gray-600 font-mono">
                                  {transaction.reference || 'N/A'}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </GlassCard>
              </div>
            )}
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
                  <GlassBadge variant={getStatusBadgeVariant(selectedTransaction.status)} size="lg">
                    <span className="text-base font-semibold px-3 py-1 flex items-center gap-2">
                      {selectedTransaction.status.toLowerCase() === 'success' || selectedTransaction.status.toLowerCase() === 'completed' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : selectedTransaction.status.toLowerCase() === 'pending' ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      {normalizeStatus(selectedTransaction.status)}
                    </span>
                  </GlassBadge>
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
            <div className="flex justify-end gap-2">
              <GlassButton variant="secondary" onClick={() => setEditModalOpen(false)}>
                Cancel
              </GlassButton>
              <GlassButton onClick={handleSaveEdit} disabled={isProcessing}>
                {isProcessing ? 'Saving...' : 'Save Changes'}
              </GlassButton>
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
      </div>
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
