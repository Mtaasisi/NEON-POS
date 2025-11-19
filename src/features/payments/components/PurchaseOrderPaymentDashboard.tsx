import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShoppingCart, CreditCard, DollarSign, Building, 
  Calendar, Filter, Search, Download, Eye, Plus,
  AlertCircle, CheckCircle2, Clock, XCircle, TrendingUp,
  RefreshCw, X, Package, Truck, Users, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus, AlertTriangle, RotateCcw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import GlassSelect from '../../shared/components/ui/GlassSelect';
import PaymentsPopupModal from '../../../components/PaymentsPopupModal';
import { financeAccountService, FinanceAccount } from '../../../lib/financeAccountService';

interface PurchaseOrder {
  id: string;
  po_number: string;
  poNumber: string; // Mapped from po_number
  supplier_id: string;
  supplierId: string; // Mapped from supplier_id
  supplier?: {
    name: string;
    contact_person?: string;
    phone?: string;
  };
  status: string;
  currency: string;
  exchange_rate?: number;
  total_amount: number;
  totalAmount: number; // Mapped from total_amount
  total_amount_base_currency?: number;
  totalAmountBaseCurrency?: number; // Mapped from total_amount_base_currency (TZS)
  total_paid?: number;
  totalPaid?: number; // Mapped from total_paid
  payment_status?: 'unpaid' | 'partial' | 'paid';
  paymentStatus?: 'unpaid' | 'partial' | 'paid'; // Mapped from payment_status
  expected_delivery: string;
  expectedDelivery: string; // Mapped from expected_delivery
  created_at: string;
  createdAt: string; // Mapped from created_at
  updated_at: string;
  updatedAt: string; // Mapped from updated_at
}

interface PurchaseOrderPayment {
  id: string;
  purchase_order_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  payment_date: string;
  reference?: string;
  notes?: string;
}

interface PurchaseOrderPaymentDashboardProps {
  onViewDetails: (payment: PurchaseOrderPayment) => void;
  onMakePayment: (purchaseOrder: PurchaseOrder) => void;
  onExport: () => void;
}

const PurchaseOrderPaymentDashboard: React.FC<PurchaseOrderPaymentDashboardProps> = ({
  onViewDetails,
  onMakePayment,
  onExport
}) => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [recentPayments, setRecentPayments] = useState<PurchaseOrderPayment[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<FinanceAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'partial' | 'paid'>('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [reversingOrderId, setReversingOrderId] = useState<string | null>(null);

  const toSafeNumber = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  // Format currency
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get payment status color
  const getPaymentStatusColor = (status: string, remainingAmount?: number) => {
    // Handle overpayment case
    if (remainingAmount !== undefined && remainingAmount < 0) {
      return 'bg-orange-100 text-orange-700';
    }
    
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'partial': return 'bg-yellow-100 text-yellow-700';
      case 'unpaid': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Calculate summary statistics - USE BASE CURRENCY (TZS) FOR ALL CALCULATIONS
  const summaryStats = React.useMemo(() => {
    const totalOrders = purchaseOrders.length;
    const unpaidOrders = purchaseOrders.filter(order => {
      const totalTZS = toSafeNumber(order.totalAmountBaseCurrency) || toSafeNumber(order.totalAmount);
      const paidTZS = toSafeNumber(order.totalPaid);
      const remaining = totalTZS - paidTZS;
      return remaining > 0 && order.paymentStatus !== 'paid';
    }).length;
    const partialOrders = purchaseOrders.filter(order => {
      const totalTZS = toSafeNumber(order.totalAmountBaseCurrency) || toSafeNumber(order.totalAmount);
      const paidTZS = toSafeNumber(order.totalPaid);
      const remaining = totalTZS - paidTZS;
      return remaining > 0 && order.paymentStatus === 'partial';
    }).length;
    const paidOrders = purchaseOrders.filter(order => {
      const totalTZS = toSafeNumber(order.totalAmountBaseCurrency) || toSafeNumber(order.totalAmount);
      const paidTZS = toSafeNumber(order.totalPaid);
      const remaining = totalTZS - paidTZS;
      return remaining <= 0;
    }).length;
    const overpaidOrders = purchaseOrders.filter(order => {
      const totalTZS = toSafeNumber(order.totalAmountBaseCurrency) || toSafeNumber(order.totalAmount);
      const paidTZS = toSafeNumber(order.totalPaid);
      const remaining = totalTZS - paidTZS;
      return remaining < 0;
    }).length;
    
    // Use base currency (TZS) for all amount calculations
    const totalAmount = purchaseOrders.reduce((sum, order) => {
      const totalTZS = toSafeNumber(order.totalAmountBaseCurrency) || toSafeNumber(order.totalAmount);
      return sum + totalTZS;
    }, 0);
    const totalPaid = purchaseOrders.reduce((sum, order) => {
      return sum + toSafeNumber(order.totalPaid);
    }, 0);
    const totalOutstanding = Math.max(0, totalAmount - totalPaid);
    
    console.log('📊 Summary Stats Calculated:', {
      totalOrders,
      totalAmount,
      totalPaid,
      totalOutstanding,
      unpaidOrders,
      overpaidOrders,
      sampleOrder: purchaseOrders[0] ? {
        poNumber: purchaseOrders[0].poNumber,
        totalAmountBaseCurrency: purchaseOrders[0].totalAmountBaseCurrency,
        totalPaid: purchaseOrders[0].totalPaid
      } : null
    });
    
    return {
      totalOrders,
      unpaidOrders,
      partialOrders,
      paidOrders,
      overpaidOrders,
      totalAmount,
      totalPaid,
      totalOutstanding
    };
  }, [purchaseOrders]);

  // Fetch purchase orders
  const fetchPurchaseOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Cast NUMERIC types to FLOAT to ensure proper number handling
      const { data: ordersData, error: ordersError } = await supabase
        .from('lats_purchase_orders')
        .select(`
          id,
          po_number,
          supplier_id,
          status,
          currency,
          exchange_rate,
          total_amount_base_currency,
          payment_terms,
          total_amount,
          total_paid,
          payment_status,
          expected_delivery,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      console.log('🔍 Raw data from database:', ordersData?.slice(0, 3).map(o => ({
        po_number: o.po_number,
        total_amount: o.total_amount,
        total_amount_type: typeof o.total_amount,
        total_amount_base_currency: o.total_amount_base_currency,
        base_type: typeof o.total_amount_base_currency,
        total_paid: o.total_paid,
        paid_type: typeof o.total_paid
      })));

      if (ordersError) {
        console.error('Error fetching purchase orders:', ordersError);
        throw ordersError;
      }

      if (!ordersData || ordersData.length === 0) {
        setPurchaseOrders([]);
        return;
      }

      // Get unique supplier IDs
      const supplierIds = [...new Set(ordersData.map(order => order.supplier_id).filter(Boolean))];
      
      // Fetch suppliers separately
      let suppliersData: any[] = [];
      if (supplierIds.length > 0) {
        const { data: suppliers, error: suppliersError } = await supabase
          .from('lats_suppliers')
          .select('id, name, contact_person, phone, wechat, country, wechat_qr_code, alipay_qr_code, bank_account_details')
          .in('id', supplierIds);

        if (suppliersError) {
          console.warn('Error fetching suppliers:', suppliersError);
        } else {
          suppliersData = suppliers || [];
        }
      }

      // Combine orders with supplier data - ENSURE NUMERIC TYPES
      const ordersWithSuppliers = ordersData.map(order => {
        const totalAmount = toSafeNumber(order.total_amount);
        const totalAmountBase = toSafeNumber(order.total_amount_base_currency);
        const totalPaid = toSafeNumber(order.total_paid);
        const exchangeRate = toSafeNumber(order.exchange_rate) || 1;
        
        return {
          ...order,
          poNumber: order.po_number,
          supplierId: order.supplier_id,
          supplier: suppliersData.find(s => s.id === order.supplier_id),
          totalAmount: totalAmount,
          totalAmountBaseCurrency: totalAmountBase || totalAmount,
          totalPaid: totalPaid,
          exchange_rate: exchangeRate,
          exchangeRate: exchangeRate,
          paymentStatus: order.payment_status,
          expectedDelivery: order.expected_delivery,
          createdAt: order.created_at,
          updatedAt: order.updated_at
        };
      });

      console.log('✅ Loaded purchase orders with currency data:', ordersWithSuppliers.map(o => ({
        poNumber: o.poNumber,
        currency: o.currency,
        totalAmount: o.totalAmount,
        totalAmountBaseCurrency: o.totalAmountBaseCurrency,
        totalPaid: o.totalPaid
      })));
      
      setPurchaseOrders(ordersWithSuppliers);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      toast.error('Failed to load purchase orders');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch recent payments
  const fetchRecentPayments = useCallback(async () => {
    try {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('purchase_order_payments')
        .select(`
          id,
          purchase_order_id,
          amount,
          currency,
          payment_method,
          status,
          payment_date,
          reference,
          notes
        `)
        .order('payment_date', { ascending: false })
        .limit(10);

      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
        return;
      }

      setRecentPayments(paymentsData || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  }, []);

  // Fetch payment accounts
  const fetchPaymentAccounts = useCallback(async () => {
    try {
      const accounts = await financeAccountService.getPaymentMethods();
      setPaymentAccounts(accounts);
    } catch (error) {
      console.error('Error fetching payment accounts:', error);
    }
  }, []);

  useEffect(() => {
    fetchPurchaseOrders();
    fetchRecentPayments();
    fetchPaymentAccounts();
  }, [fetchPurchaseOrders, fetchRecentPayments, fetchPaymentAccounts]);

  // Real-time subscription for purchase order payments
  useEffect(() => {
    console.log('🔔 Setting up real-time subscriptions for purchase order payments...');

    // Subscribe to purchase order payments table
    const paymentsSubscription = supabase
      .channel('purchase_order_payments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchase_order_payments'
        },
        (payload) => {
          console.log('🔔 Purchase order payment change detected:', payload);
          // Refresh both purchase orders and payments
          fetchPurchaseOrders();
          fetchRecentPayments();
          
          if (payload.eventType === 'INSERT') {
            toast.success('Payment recorded successfully!');
          } else if (payload.eventType === 'UPDATE') {
            toast.success('Payment updated!');
          }
        }
      )
      .subscribe();

    // Subscribe to purchase orders table (for payment_status updates)
    const ordersSubscription = supabase
      .channel('purchase_orders_payment_status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lats_purchase_orders',
          filter: 'payment_status=neq.unpaid' // Only listen to payment status changes
        },
        (payload) => {
          console.log('🔔 Purchase order payment status changed:', payload);
          fetchPurchaseOrders();
          
          const newStatus = payload.new?.payment_status;
          if (newStatus === 'paid') {
            toast.success('Purchase order fully paid!', {
              icon: '✅',
              duration: 3000
            });
          } else if (newStatus === 'partial') {
            toast.success('Partial payment received!', {
              icon: '💰',
              duration: 3000
            });
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      console.log('🔔 Cleaning up purchase order payment subscriptions...');
      paymentsSubscription.unsubscribe();
      ordersSubscription.unsubscribe();
    };
  }, [fetchPurchaseOrders, fetchRecentPayments]);

  // Filter purchase orders
  const filteredOrders = purchaseOrders.filter(order => {
    const matchesSearch = order.poNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.paymentStatus === statusFilter;
    const matchesCurrency = currencyFilter === 'all' || order.currency === currencyFilter;
    return matchesSearch && matchesStatus && matchesCurrency;
  });

  // Handle make payment
  const handleMakePayment = (order: PurchaseOrder) => {
    const totalAmountOriginal = toSafeNumber(order.totalAmount ?? order.total_amount);
    const totalAmountBase = toSafeNumber(order.totalAmountBaseCurrency ?? order.total_amount_base_currency ?? totalAmountOriginal);
    const totalPaidTZS = toSafeNumber(order.totalPaid ?? order.total_paid);
    const exchangeRate = toSafeNumber(order.exchangeRate ?? order.exchange_rate ?? 1) || 1;
    const isForeignCurrency = Boolean(order.currency && order.currency !== 'TZS' && exchangeRate > 0);

    // Validate order has an amount to pay
    if (totalAmountBase <= 0 && totalAmountOriginal <= 0) {
      toast.error('Cannot make payment: Purchase order has no total amount');
      return;
    }

    const remainingBase = totalAmountBase - totalPaidTZS;
    const remainingOriginal = isForeignCurrency
      ? totalAmountOriginal - (totalPaidTZS / exchangeRate)
      : remainingBase;

    if (remainingBase <= 0 || remainingOriginal <= 0) {
      const totalLabel = isForeignCurrency
        ? `${order.currency} ${totalAmountOriginal.toLocaleString()}`
        : formatMoney(totalAmountBase);
      const paidLabel = formatMoney(totalPaidTZS);
      toast.error(`Purchase order is fully paid. Total: ${totalLabel}, Paid: ${paidLabel}`);
      return;
    }

    console.log('💳 Opening payment modal for order:', {
      poNumber: order.poNumber,
      currency: order.currency,
      totalAmountOriginal,
      totalAmountBase,
      totalPaidTZS,
      remainingBase,
      remainingOriginal,
      exchangeRate
    });

    setSelectedOrder(order);
    setShowPaymentModal(true);
  };

  const getModalAmount = (order: PurchaseOrder | null) => {
    if (!order) return 0;

    const totalAmountOriginal = toSafeNumber(order.totalAmount ?? order.total_amount);
    const totalAmountBase = toSafeNumber(order.totalAmountBaseCurrency ?? order.total_amount_base_currency ?? totalAmountOriginal);
    const totalPaidTZS = toSafeNumber(order.totalPaid ?? order.total_paid);
    const exchangeRate = toSafeNumber(order.exchangeRate ?? order.exchange_rate ?? 1) || 1;

    if (order.currency && order.currency !== 'TZS' && exchangeRate > 0) {
      const paidInOriginal = totalPaidTZS / exchangeRate;
      const remainingOriginal = totalAmountOriginal - paidInOriginal;
      return Math.max(0, remainingOriginal);
    }

    const remainingBase = totalAmountBase - totalPaidTZS;
    return Math.max(0, remainingBase);
  };

  // Handle payment completion from PaymentsPopupModal
  const handlePaymentComplete = async (paymentData: any[], totalPaid?: number) => {
    if (!selectedOrder) {
      toast.error('No purchase order selected');
      return;
    }

    try {
      // Import the payment service
      const { purchaseOrderPaymentService } = await import('../../lats/lib/purchaseOrderPaymentService');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Process each payment entry using the service
      const results = await Promise.all(
        paymentData.map(async (payment) => {
          const result = await purchaseOrderPaymentService.processPayment({
            purchaseOrderId: selectedOrder.id,
            paymentAccountId: payment.paymentAccountId,
            amount: payment.amount,
            currency: payment.currency,
            paymentMethod: payment.paymentMethod,
            paymentMethodId: payment.paymentMethodId,
            reference: payment.reference || `${selectedOrder.poNumber}`,
            notes: payment.notes || `Payment via ${payment.paymentMethod}`,
            createdBy: user?.id || ''
          });
          return result;
        })
      );

      // Check if all payments were successful
      const failedPayments = results.filter(result => !result.success);
      
      if (failedPayments.length > 0) {
        const errorMessages = failedPayments.map(result => result.message).join('; ');
        toast.error(`Some payments failed: ${errorMessages}`);
      } else {
        toast.success('All payments processed successfully');
      }
      
      // Close modal and refresh data
      setShowPaymentModal(false);
      setSelectedOrder(null);
      
      // Force immediate refresh of all data
      console.log('💰 Payment completed, refreshing data...');
      await Promise.all([
        fetchPurchaseOrders(),
        fetchRecentPayments(),
        fetchPaymentAccounts()
      ]);
      console.log('✅ Data refreshed after payment');
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast.error(error.message || 'Failed to process payment');
    }
  };

  // Handle reversing the most recent payment
  const handleUndoLastPayment = async (order: PurchaseOrder) => {
    if (!order) {
      toast.error('No purchase order selected');
      return;
    }

    if (reversingOrderId && reversingOrderId !== order.id) {
      toast.error('Please wait for the current reversal to finish');
      return;
    }

    const confirmUndo = window.confirm(`Undo the most recent payment recorded for ${order.poNumber}?`);
    if (!confirmUndo) {
      return;
    }

    try {
      setReversingOrderId(order.id);

      const { purchaseOrderPaymentService } = await import('../../lats/lib/purchaseOrderPaymentService');
      const { data: { user } } = await supabase.auth.getUser();

      const result = await purchaseOrderPaymentService.reverseLatestPayment(order.id, user?.id || null);

      if (!result.success) {
        toast.error(result.message || 'Failed to reverse payment');
        return;
      }

      const reversedAmountRaw = result.data?.amount_reversed ?? result.data?.reversed_amount ?? 0;
      const reversedAmount = typeof reversedAmountRaw === 'number' ? reversedAmountRaw : Number(reversedAmountRaw) || 0;
      toast.success(`Payment reversal complete for ${order.poNumber}: ${formatMoney(reversedAmount)} restored.`);

      await Promise.all([
        fetchPurchaseOrders(),
        fetchRecentPayments(),
        fetchPaymentAccounts()
      ]);
    } catch (error: any) {
      console.error('Error reversing payment:', error);
      toast.error(error?.message || 'Failed to reverse payment');
    } finally {
      setReversingOrderId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading purchase orders...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ backgroundColor: 'transparent' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Purchase Orders</h2>
          <p className="text-gray-600">Manage supplier payments and track purchase orders</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              fetchPurchaseOrders();
              fetchRecentPayments();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <GlassCard className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Orders</p>
              <p className="text-2xl font-bold text-blue-900">{summaryStats.totalOrders}</p>
            </div>
            <div className="p-3 bg-blue-500 rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Value</p>
              <p className="text-2xl font-bold text-green-900">{formatMoney(summaryStats.totalAmount)}</p>
            </div>
            <div className="p-3 bg-green-500 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Outstanding</p>
              <p className="text-2xl font-bold text-yellow-900">{formatMoney(summaryStats.totalOutstanding)}</p>
            </div>
            <div className="p-3 bg-yellow-500 rounded-lg">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Unpaid Orders</p>
              <p className="text-2xl font-bold text-purple-900">{summaryStats.unpaidOrders}</p>
            </div>
            <div className="p-3 bg-purple-500 rounded-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Overpaid Orders</p>
              <p className="text-2xl font-bold text-orange-900">{summaryStats.overpaidOrders}</p>
            </div>
            <div className="p-3 bg-orange-500 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-white" />
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
                placeholder="Search purchase orders or suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <GlassSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="min-w-[140px]"
            >
              <option value="all">All Status</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </GlassSelect>
            <GlassSelect
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              className="min-w-[160px]"
            >
              <option value="all">All Currencies</option>
              <option value="TZS">Tanzanian Shilling (TZS)</option>
              <option value="USD">US Dollar (USD)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="GBP">British Pound (GBP)</option>
            </GlassSelect>
          </div>
        </div>
      </GlassCard>

      {/* Purchase Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredOrders.map((order) => {
          // Use base currency (TZS) for calculations to avoid currency mismatch
          const totalAmountTZS = toSafeNumber(order.totalAmountBaseCurrency) || toSafeNumber(order.totalAmount);
          const totalPaidTZS = toSafeNumber(order.totalPaid);
          const remainingAmount = totalAmountTZS - totalPaidTZS;
          const paymentProgress = totalAmountTZS > 0 ? Math.min((totalPaidTZS / totalAmountTZS) * 100, 100) : 0;
          
          // Check if this is a foreign currency PO
          const isForeignCurrency = order.currency && order.currency !== 'TZS';
          
          return (
            <GlassCard key={order.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{order.poNumber}</h3>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      {order.supplier?.name || 'Unknown Supplier'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.paymentStatus || 'unpaid', remainingAmount)}`}>
                    {order.paymentStatus || 'unpaid'}
                  </span>
                  <div className="flex items-center gap-2">
                    {remainingAmount > 0 ? (
                      <button
                        onClick={() => handleMakePayment(order)}
                        disabled={reversingOrderId === order.id}
                        className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-xs font-medium"
                      >
                        <Plus size={12} />
                        Pay
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-xs font-medium cursor-not-allowed">
                        <CheckCircle2 size={12} />
                        {order.paymentStatus === 'overpaid' ? 'Overpaid' : 'Fully Paid'}
                      </div>
                    )}
                    {totalPaidTZS > 0 && (
                      <button
                        onClick={() => handleUndoLastPayment(order)}
                        disabled={reversingOrderId === order.id}
                        className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-xs font-medium"
                      >
                        <RotateCcw size={12} className={reversingOrderId === order.id ? 'animate-spin' : ''} />
                        {reversingOrderId === order.id ? 'Undoing...' : 'Undo'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Payment Progress</span>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{Math.round(paymentProgress)}%</span>
                    {order.paymentStatus === 'overpaid' && (
                      <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                        Overpaid
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      order.paymentStatus === 'overpaid' 
                        ? 'bg-gradient-to-r from-orange-400 to-orange-600' 
                        : paymentProgress === 100 
                          ? 'bg-gradient-to-r from-green-400 to-green-600'
                          : 'bg-gradient-to-r from-blue-400 to-blue-600'
                    }`}
                    style={{ width: `${Math.min(paymentProgress, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Financial Details */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Amount</span>
                  <div className="text-right">
                    <span className="font-semibold text-gray-900">{formatMoney(totalAmountTZS)}</span>
                    {isForeignCurrency && order.totalAmount && (
                      <div className="text-xs text-gray-500">
                        ({order.currency} {order.totalAmount.toLocaleString()})
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Paid</span>
                  <div className="text-right">
                    <span className="font-medium text-green-600 flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" />
                      {formatMoney(totalPaidTZS)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Remaining</span>
                  <div className="text-right">
                    <span className={`font-medium flex items-center gap-1 ${
                      remainingAmount < 0 
                        ? 'text-orange-600' 
                        : remainingAmount === 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                    }`}>
                      {remainingAmount < 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {formatMoney(Math.abs(remainingAmount))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Expected: {new Date(order.expectedDelivery).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Recent Payments */}
      {recentPayments.length > 0 && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Payments</h3>
            <button
              onClick={() => {/* TODO: Navigate to full payments view */}}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {recentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CreditCard className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {formatMoney(payment.amount)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {payment.payment_method} • {new Date(payment.payment_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                    payment.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {payment.status}
                  </span>
                  <button
                    onClick={() => onViewDetails(payment)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Payment Modal */}
      <PaymentsPopupModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={getModalAmount(selectedOrder)}
        customerId={selectedOrder?.supplierId || selectedOrder?.supplier_id}
        customerName={selectedOrder?.supplier?.name || 'Supplier'}
        description={`Payment for Purchase Order ${selectedOrder?.poNumber}`}
        onPaymentComplete={handlePaymentComplete}
        title="Purchase Order Payment"
        paymentType="cash_out"
        currency={selectedOrder?.currency}
        exchangeRate={toSafeNumber(selectedOrder?.exchangeRate ?? selectedOrder?.exchange_rate ?? 1) || 1}
      />
    </div>
  );
};

export default PurchaseOrderPaymentDashboard;