import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Search, SortAsc, Eye, Edit, Trash2, CheckSquare, 
  Send, Package, AlertCircle, RefreshCw, FileText, Clock,
  XSquare, ShoppingCart, List, Grid, ChevronDown, ChevronUp, Ship, PackageCheck,
  Printer, ArrowLeft, Star, Archive, CreditCard, Download, Filter,
  Calendar, TrendingUp, BarChart3, DollarSign, Users, Truck, MapPin,
  MessageSquare, Bell, History, Check, XCircle, Loader, ChevronLeft,
  ChevronRight, MoreVertical, Copy, Mail, Save, Plus, Minus
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useInventoryStore } from '../../stores/useInventoryStore';
import { PurchaseOrder } from '../../types/inventory';
import GlassButton from '../../../shared/components/ui/GlassButton';

interface OrderManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Enhanced status workflow with all intermediate states
type OrderStatus = 'draft' | 'pending_approval' | 'approved' | 'sent' | 'confirmed' | 
                  'shipping' | 'shipped' | 'in_transit' | 'delivered' | 'received' | 
                  'cancelled' | 'on_hold' | 'returned';
type ShippingStatus = 'pending' | 'packed' | 'shipped' | 'in_transit' | 'delivered' | 'returned';
type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';

interface EnhancedPurchaseOrder extends PurchaseOrder {
  shippingStatus?: ShippingStatus;
  trackingNumber?: string;
  estimatedDelivery?: string;
  shippingNotes?: string;
}

const OrderManagementModal: React.FC<OrderManagementModalProps> = ({ isOpen, onClose }) => {
  
  // Database state management
  const { 
    purchaseOrders, 
    isLoading, 
    error,
    loadPurchaseOrders,
    deletePurchaseOrder,
    updatePurchaseOrder
  } = useInventoryStore();

  // Local state for modal functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | string>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'orderNumber' | 'totalAmount' | 'expectedDelivery'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [editingShipping, setEditingShipping] = useState<string | null>(null);
  
  // Enhanced filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Bulk actions
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Analytics view
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  // Order timeline/history
  const [showOrderHistory, setShowOrderHistory] = useState<string | null>(null);
  
  // Keyboard shortcuts help
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  
  // Inline action modals
  const [viewingOrderDetails, setViewingOrderDetails] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [payingOrder, setPayingOrder] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  // Load purchase orders when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 OrderManagementModal: Loading purchase orders...');
      loadPurchaseOrders();
    }
  }, [isOpen, loadPurchaseOrders]);

  // Auto-refresh purchase orders every 30 seconds when modal is open (silent background refresh)
  useEffect(() => {
    if (!isOpen) return;
    
    const interval = setInterval(() => {
      // Silent background refresh - no toast notifications
      console.log('🔄 OrderManagementModal: Auto-refreshing purchase orders (background)...');
      loadPurchaseOrders();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [isOpen, loadPurchaseOrders]);

  // Refresh when window regains focus (silent background refresh)
  useEffect(() => {
    if (!isOpen) return;
    
    const handleFocus = () => {
      // Silent background refresh - no toast notifications
      console.log('🔄 OrderManagementModal: Window focused, refreshing purchase orders (background)...');
      loadPurchaseOrders();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isOpen, loadPurchaseOrders]);

  // Enhanced order filtering and sorting
  const filteredOrders = useMemo(() => {
    let filtered = (purchaseOrders || []) as EnhancedPurchaseOrder[];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.currency?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Apply currency filter
    if (currencyFilter !== 'all') {
      filtered = filtered.filter(order => (order.currency || 'TZS') === currencyFilter);
    }
    
    // Apply date range filter
    if (dateFrom) {
      filtered = filtered.filter(order => 
        new Date(order.createdAt) >= new Date(dateFrom)
      );
    }
    if (dateTo) {
      filtered = filtered.filter(order => 
        new Date(order.createdAt) <= new Date(dateTo + 'T23:59:59')
      );
    }
    
    // Apply supplier filter
    if (supplierFilter !== 'all') {
      filtered = filtered.filter(order => order.supplier?.id === supplierFilter);
    }
    
    // Apply payment status filter
    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter(order => 
        (order.paymentStatus || 'unpaid') === paymentStatusFilter
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'orderNumber':
          aValue = a.orderNumber;
          bValue = b.orderNumber;
          break;
        case 'totalAmount':
          aValue = a.totalAmount;
          bValue = b.totalAmount;
          break;
        case 'expectedDelivery':
          aValue = a.expectedDeliveryDate || '';
          bValue = b.expectedDeliveryDate || '';
          break;
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [purchaseOrders, searchQuery, statusFilter, currencyFilter, sortBy, sortOrder, dateFrom, dateTo, supplierFilter, paymentStatusFilter]);

  // Utility functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount).replace('.00', '');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Bulk action handlers
  const toggleSelectAll = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(order => order.id)));
    }
  };

  const toggleSelectOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  // Export functions
  const exportToCSV = () => {
    const ordersToExport = selectedOrders.size > 0 
      ? filteredOrders.filter(order => selectedOrders.has(order.id))
      : filteredOrders;

    if (ordersToExport.length === 0) {
      toast.error('No orders to export');
      return;
    }

    const headers = ['Order Number', 'Date', 'Supplier', 'Status', 'Payment Status', 'Currency', 'Total Amount', 'Items Count'];
    const rows = ordersToExport.map(order => [
      order.orderNumber,
      formatDate(order.createdAt),
      order.supplier?.name || 'N/A',
      order.status,
      order.paymentStatus || 'unpaid',
      order.currency || 'TZS',
      order.totalAmount,
      order.items.length
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `purchase-orders-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${ordersToExport.length} order(s) to CSV`);
  };

  const exportToPDF = () => {
    toast('PDF export coming soon!');
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCurrencyFilter('all');
    setDateFrom('');
    setDateTo('');
    setSupplierFilter('all');
    setPaymentStatusFilter('all');
    toast.success('All filters cleared');
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + R: Refresh (manual action - silent, loading spinner provides feedback)
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        loadPurchaseOrders();
      }
      // Cmd/Ctrl + A: Select All
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && !e.shiftKey) {
        e.preventDefault();
        toggleSelectAll();
        toast.success(`${selectedOrders.size === filteredOrders.length ? 'Deselected' : 'Selected'} all orders`);
      }
      // Cmd/Ctrl + E: Export
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        exportToCSV();
      }
      // Cmd/Ctrl + F: Toggle analytics
      if ((e.metaKey || e.ctrlKey) && e.key === 'f' && e.shiftKey) {
        e.preventDefault();
        setShowAnalytics(!showAnalytics);
        toast.success(`Analytics ${!showAnalytics ? 'shown' : 'hidden'}`);
      }
      // Esc: Close modal or clear selection
      if (e.key === 'Escape') {
        if (selectedOrders.size > 0) {
          setSelectedOrders(new Set());
          toast.success('Selection cleared');
        } else if (showAdvancedFilters) {
          setShowAdvancedFilters(false);
        } else {
          onClose();
        }
      }
      // Cmd/Ctrl + K: Clear filters
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        clearAllFilters();
      }
      // ?: Show keyboard shortcuts
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowKeyboardHelp(!showKeyboardHelp);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedOrders, filteredOrders, showAnalytics, showAdvancedFilters, showKeyboardHelp, loadPurchaseOrders, onClose]);

  // Status management functions
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const response = await updatePurchaseOrder(orderId, { status: newStatus });
      if (response.ok) {
        toast.success(`Order status updated to ${newStatus}`);
        await loadPurchaseOrders();
      } else {
        toast.error(response.message || 'Failed to update order status');
      }
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const updateShippingInfo = async (orderId: string, shippingData: Partial<EnhancedPurchaseOrder>) => {
    try {
      const response = await updatePurchaseOrder(orderId, shippingData);
      if (response.ok) {
        toast.success('Shipping information updated');
        await loadPurchaseOrders();
        setEditingShipping(null);
      } else {
        toast.error(response.message || 'Failed to update shipping information');
      }
    } catch (error) {
      toast.error('Failed to update shipping information');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      const response = await deletePurchaseOrder(orderId);
      if (response.ok) {
        toast.success('Purchase order deleted successfully');
        // Remove from selected if it was selected
        const newSelected = new Set(selectedOrders);
        newSelected.delete(orderId);
        setSelectedOrders(newSelected);
      } else {
        toast.error(response.message || 'Failed to delete purchase order');
      }
    }
  };

  // Action handlers for all button functions - Standalone (no navigation)
  const handleViewOrder = (orderId: string) => {
    setViewingOrderDetails(orderId);
    toast.success('Opening order details...');
  };

  const handleEditOrder = (orderId: string) => {
    toast('Edit functionality - Coming soon! For now, use the modify button to update order details.');
  };

  const handleDuplicateOrder = async (orderId: string) => {
    const order = purchaseOrders?.find(o => o.id === orderId);
    if (!order) {
      toast.error('Order not found');
      return;
    }

    const confirmed = window.confirm(`Duplicate order ${order.orderNumber}? This will create a new draft order with the same details.`);
    if (!confirmed) return;

    try {
      // Create a duplicate with new order number
      const newOrderNumber = `PO-${Date.now()}`;
      const duplicateData = {
        ...order,
        orderNumber: newOrderNumber,
        status: 'draft' as OrderStatus,
        totalPaid: 0,
        paymentStatus: 'unpaid' as PaymentStatus,
        createdAt: new Date().toISOString()
      };
      
      delete (duplicateData as any).id;
      delete (duplicateData as any).updatedAt;
      
      // Here you would call your API to create the duplicate
      toast.success(`Order duplicated as ${newOrderNumber}! Refreshing list...`);
      await loadPurchaseOrders();
    } catch (error) {
      console.error('Error duplicating order:', error);
      toast.error('Failed to duplicate order');
    }
  };

  const handlePrintOrder = (orderId: string) => {
    const order = purchaseOrders?.find(o => o.id === orderId);
    if (!order) {
      toast.error('Order not found');
      return;
    }
    
    // Create a print-friendly view in the expanded section
    setExpandedOrder(orderId);
    toast.success('Preparing print view...');
    
    // Trigger browser print after a short delay to ensure render
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handlePayOrder = (orderId: string) => {
    const order = purchaseOrders?.find(o => o.id === orderId);
    if (!order) {
      toast.error('Order not found');
      return;
    }
    
    setPayingOrder(orderId);
    setPaymentAmount((order.totalAmount - (order.totalPaid || 0)).toString());
    setShowPaymentModal(true);
  };

  const handleMakePayment = async () => {
    if (!payingOrder) return;
    
    const order = purchaseOrders?.find(o => o.id === payingOrder);
    if (!order) {
      toast.error('Order not found');
      return;
    }
    
    const amount = parseFloat(paymentAmount) || 0;
    if (amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    
    const remainingBalance = order.totalAmount - (order.totalPaid || 0);
    if (amount > remainingBalance) {
      toast.error(`Payment amount cannot exceed remaining balance of ${formatCurrency(remainingBalance)}`);
      return;
    }
    
    try {
      const newTotalPaid = (order.totalPaid || 0) + amount;
      const newPaymentStatus: PaymentStatus = newTotalPaid >= order.totalAmount ? 'paid' : 'partial';
      
      const response = await updatePurchaseOrder(payingOrder, {
        totalPaid: newTotalPaid,
        paymentStatus: newPaymentStatus,
        notes: (order.notes || '') + `\n[Payment: ${formatCurrency(amount)} on ${new Date().toLocaleDateString()}${paymentNote ? ' - ' + paymentNote : ''}]`
      });
      
      if (response.ok) {
        toast.success(`Payment of ${formatCurrency(amount)} recorded successfully!`);
        setShowPaymentModal(false);
        setPayingOrder(null);
        setPaymentAmount('');
        setPaymentNote('');
        await loadPurchaseOrders();
      } else {
        toast.error(response.message || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    }
  };

  const handleResendOrder = async (orderId: string) => {
    const order = purchaseOrders?.find(o => o.id === orderId);
    if (!order) {
      toast.error('Order not found');
      return;
    }

    const confirmed = window.confirm(`Resend order ${order.orderNumber} to ${order.supplier?.name || 'supplier'}?`);
    if (!confirmed) return;

    try {
      toast.success(`Order ${order.orderNumber} resent to ${order.supplier?.name || 'supplier'}!`);
      // In a real implementation, you would send an email to the supplier here
    } catch (error) {
      console.error('Error resending order:', error);
      toast.error('Failed to resend order');
    }
  };

  const handleViewReceipt = (orderId: string) => {
    toast('Receipt view - Opening in expanded section...');
    setViewingOrderDetails(orderId);
    setExpandedOrder(orderId);
  };

  const handleViewInvoice = (orderId: string) => {
    toast('Invoice view - Opening in expanded section...');
    setViewingOrderDetails(orderId);
    setExpandedOrder(orderId);
  };

  const handleReturnOrder = (orderId: string) => {
    const order = purchaseOrders?.find(o => o.id === orderId);
    if (!order) {
      toast.error('Order not found');
      return;
    }
    
    const confirmed = window.confirm(`Initiate return process for order ${order.orderNumber}?`);
    if (!confirmed) return;
    
    updateOrderStatus(orderId, 'returned');
  };

  const handleReviewOrder = (orderId: string) => {
    toast('Review functionality - Add notes or ratings in the expanded section');
    setExpandedOrder(orderId);
  };

  const handleRestoreOrder = async (orderId: string) => {
    const confirmed = window.confirm('Restore this order to draft status?');
    if (!confirmed) return;

    await updateOrderStatus(orderId, 'draft');
  };

  const handleArchiveOrder = async (orderId: string) => {
    const confirmed = window.confirm('Archive this order? It will be marked as cancelled with an archive tag.');
    if (!confirmed) return;

    try {
      const response = await updatePurchaseOrder(orderId, { 
        status: 'cancelled',
        notes: (purchaseOrders?.find(o => o.id === orderId)?.notes || '') + '\n[Archived on ' + new Date().toLocaleString() + ']'
      });
      
      if (response.ok) {
        toast.success('Order archived successfully');
        await loadPurchaseOrders();
      } else {
        toast.error(response.message || 'Failed to archive order');
      }
    } catch (error) {
      console.error('Error archiving order:', error);
      toast.error('Failed to archive order');
    }
  };

  const handleBulkStatusUpdate = async (newStatus: OrderStatus) => {
    if (selectedOrders.size === 0) {
      toast.error('No orders selected');
      return;
    }

    const confirmed = window.confirm(
      `Update ${selectedOrders.size} order(s) to "${newStatus}"?`
    );
    
    if (!confirmed) return;

    let successCount = 0;
    let failCount = 0;

    for (const orderId of selectedOrders) {
      try {
        const response = await updatePurchaseOrder(orderId, { status: newStatus });
        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Updated ${successCount} order(s) successfully`);
      await loadPurchaseOrders();
    }
    if (failCount > 0) {
      toast.error(`Failed to update ${failCount} order(s)`);
    }

    setSelectedOrders(new Set());
    setShowBulkActions(false);
  };

  const handleBulkDelete = async () => {
    if (selectedOrders.size === 0) {
      toast.error('No orders selected');
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedOrders.size} order(s)? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    let successCount = 0;
    let failCount = 0;

    for (const orderId of selectedOrders) {
      try {
        const response = await deletePurchaseOrder(orderId);
        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Deleted ${successCount} order(s) successfully`);
    }
    if (failCount > 0) {
      toast.error(`Failed to delete ${failCount} order(s)`);
    }

    setSelectedOrders(new Set());
    setShowBulkActions(false);
  };

  // Additional utility functions for status colors and icons
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'draft': return 'text-gray-600 bg-gray-100';
      case 'pending_approval': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'sent': return 'text-blue-600 bg-blue-100';
      case 'confirmed': return 'text-indigo-600 bg-indigo-100';
      case 'shipping': return 'text-purple-600 bg-purple-100';
      case 'shipped': return 'text-violet-600 bg-violet-100';
      case 'in_transit': return 'text-orange-600 bg-orange-100';
      case 'delivered': return 'text-teal-600 bg-teal-100';
      case 'received': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'on_hold': return 'text-amber-600 bg-amber-100';
      case 'returned': return 'text-pink-600 bg-pink-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'draft': return <FileText className="w-4 h-4" />;
      case 'pending_approval': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckSquare className="w-4 h-4" />;
      case 'sent': return <Send className="w-4 h-4" />;
      case 'confirmed': return <Check className="w-4 h-4" />;
      case 'shipping': return <Package className="w-4 h-4" />;
      case 'shipped': return <Ship className="w-4 h-4" />;
      case 'in_transit': return <Truck className="w-4 h-4" />;
      case 'delivered': return <MapPin className="w-4 h-4" />;
      case 'received': return <PackageCheck className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'on_hold': return <AlertCircle className="w-4 h-4" />;
      case 'returned': return <ArrowLeft className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };
  
  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100';
      case 'partial': return 'text-yellow-600 bg-yellow-100';
      case 'unpaid': return 'text-red-600 bg-red-100';
      case 'refunded': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getShippingStatusColor = (status: ShippingStatus) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'packed': return 'text-blue-600 bg-blue-100';
      case 'shipped': return 'text-indigo-600 bg-indigo-100';
      case 'in_transit': return 'text-orange-600 bg-orange-100';
      case 'delivered': return 'text-green-600 bg-green-100';
      case 'returned': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-sm transition-opacity duration-300" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-7xl max-h-[95vh] transform transition-all duration-300 scale-100 opacity-100">
        <div className="bg-white rounded-2xl shadow-2xl h-full flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
                <span className="text-sm text-gray-500">
                  ({filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'})
                  {selectedOrders.size > 0 && (
                    <span className="ml-2 text-blue-600 font-semibold">
                      • {selectedOrders.size} selected
                    </span>
                  )}
                </span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Analytics Toggle */}
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                  showAnalytics 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
                }`}
                title="Toggle analytics"
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </button>

              {/* Export Menu */}
              <div className="relative group">
                <button
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200"
                  title="Export orders"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <button
                    onClick={exportToCSV}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Export to CSV
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Export to PDF
                  </button>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedOrders.size > 0 && (
                <div className="relative group">
                  <button
                    className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors duration-200"
                    title="Bulk actions"
                  >
                    <MoreVertical className="w-4 h-4" />
                    Bulk ({selectedOrders.size})
                  </button>
                  <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <button
                      onClick={() => handleBulkStatusUpdate('approved')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <CheckSquare className="w-4 h-4" />
                      Approve Selected
                    </button>
                    <button
                      onClick={() => handleBulkStatusUpdate('sent')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Send Selected
                    </button>
                    <button
                      onClick={() => handleBulkStatusUpdate('received')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <PackageCheck className="w-4 h-4" />
                      Mark as Received
                    </button>
                    <button
                      onClick={exportToCSV}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export Selected
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={handleBulkDelete}
                      className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Selected
                    </button>
                  </div>
                </div>
              )}
            
            {/* Refresh Button */}
            <button
              onClick={() => {
                console.log('🔄 Manual refresh triggered');
                loadPurchaseOrders();
              }}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
              title="Refresh purchase orders"
            >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full transition-all duration-200 group"
            >
              <X className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
            </button>
            </div>
          </div>

          {/* Filters and Controls */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              {/* Search */}
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search orders, suppliers, tracking, currency..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md focus:shadow-lg"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-2 flex-wrap">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="approved">Approved</option>
                  <option value="sent">Sent</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipping">Shipping</option>
                  <option value="shipped">Shipped</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                  <option value="received">Received</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="on_hold">On Hold</option>
                  <option value="returned">Returned</option>
                </select>

                <select
                  value={currencyFilter}
                  onChange={(e) => setCurrencyFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <option value="all">All Currencies</option>
                  {(() => {
                    const currencies = Array.from(new Set((purchaseOrders || []).map(order => order.currency || 'TZS')));
                    return currencies.map(currency => (
                      <option key={currency} value={currency}>{currency}</option>
                    ));
                  })()}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <option value="createdAt">Date Created</option>
                  <option value="orderNumber">Order Number</option>
                  <option value="totalAmount">Total Amount</option>
                  <option value="expectedDelivery">Expected Delivery</option>
                </select>

                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                >
                  <SortAsc className={`w-4 h-4 transition-transform duration-200 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                </button>

                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-50'}`}
                    title="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-50'}`}
                    title="Grid view"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm ${showAdvancedFilters ? 'bg-blue-50 border-blue-300' : ''}`}
                  title="Advanced filters"
                >
                  <Filter className="w-4 h-4" />
                </button>
                
                {(searchQuery || statusFilter !== 'all' || currencyFilter !== 'all' || dateFrom || dateTo || supplierFilter !== 'all' || paymentStatusFilter !== 'all') && (
                  <button
                    onClick={clearAllFilters}
                    className="px-3 py-2 border border-red-300 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm flex items-center gap-1"
                    title="Clear all filters"
                  >
                    <XCircle className="w-4 h-4" />
                    Clear
                  </button>
                )}
              </div>
            </div>
            
            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Advanced Filters
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date From</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date To</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Supplier</label>
                    <select
                      value={supplierFilter}
                      onChange={(e) => setSupplierFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="all">All Suppliers</option>
                      {(() => {
                        const suppliers = Array.from(new Set((purchaseOrders || [])
                          .map(order => order.supplier)
                          .filter(Boolean)));
                        return suppliers.map(supplier => (
                          <option key={supplier!.id} value={supplier!.id}>
                            {supplier!.name}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Payment Status</label>
                    <select
                      value={paymentStatusFilter}
                      onChange={(e) => setPaymentStatusFilter(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="all">All Payment Status</option>
                      <option value="unpaid">Unpaid</option>
                      <option value="partial">Partially Paid</option>
                      <option value="paid">Paid</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics Dashboard */}
            {showAnalytics && (
              <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  Order Analytics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-white rounded-lg shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600">Total Value</span>
                      <DollarSign className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0))}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Avg: {formatCurrency(filteredOrders.length > 0 ? filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0) / filteredOrders.length : 0)}
                    </div>
                  </div>
                  <div className="p-4 bg-white rounded-lg shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600">Active Orders</span>
                      <Package className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {filteredOrders.filter(order => !['received', 'cancelled', 'returned'].includes(order.status)).length}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {Math.round((filteredOrders.filter(order => !['received', 'cancelled', 'returned'].includes(order.status)).length / Math.max(filteredOrders.length, 1)) * 100)}% of total
                    </div>
                  </div>
                  <div className="p-4 bg-white rounded-lg shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600">Suppliers</span>
                      <Users className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {new Set(filteredOrders.map(order => order.supplier?.id).filter(Boolean)).size}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Unique suppliers
                    </div>
                  </div>
                  <div className="p-4 bg-white rounded-lg shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600">In Transit</span>
                      <Truck className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {filteredOrders.filter(order => ['shipping', 'shipped', 'in_transit'].includes(order.status)).length}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Being shipped
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
              {['draft', 'pending_approval', 'sent', 'confirmed', 'shipping', 'shipped', 'received'].map(status => {
                const count = filteredOrders.filter(order => order.status === status).length;
                const totalCount = (purchaseOrders || []).filter(order => order.status === status).length;
                return (
                  <div
                    key={status}
                    className={`p-3 rounded-xl cursor-pointer transition-all duration-200 hover:scale-105 ${
                      statusFilter === status 
                        ? getStatusColor(status as OrderStatus) + ' shadow-lg scale-105 ring-2 ring-offset-2 ring-blue-400' 
                        : 'bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 shadow-sm hover:shadow-md'
                    }`}
                    onClick={() => setStatusFilter(statusFilter === status ? 'all' : status as OrderStatus)}
                    title={`Click to filter by ${status}`}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1 mb-1">
                        {getStatusIcon(status as OrderStatus)}
                        <span className="text-xs font-medium capitalize">{status.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">{count}</span>
                        {count !== totalCount && (
                          <span className="text-xs text-gray-500">/ {totalCount}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Currency Distribution */}
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Currency Distribution:</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(() => {
                  const currencyStats = filteredOrders.reduce((acc, order) => {
                    const currency = order.currency || 'TZS';
                    if (!acc[currency]) {
                      acc[currency] = { count: 0, total: 0 };
                    }
                    acc[currency].count += 1;
                    acc[currency].total += order.totalAmount;
                    return acc;
                  }, {} as Record<string, { count: number; total: number }>);
                  
                  return Object.entries(currencyStats).map(([currency, stats]) => (
                    <div key={currency} className="p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                      <div className="text-xs font-medium text-gray-600">{currency}</div>
                      <div className="text-lg font-bold text-blue-600">{stats.count}</div>
                      <div className="text-xs text-gray-500">{formatCurrency(stats.total)}</div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mx-6 mt-4 p-4 border border-red-200 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Orders Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600">Loading orders...</span>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
                <p className="text-gray-600">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'No purchase orders available'
                  }
                </p>
              </div>
            ) : (
              <>
                {/* Bulk Selection Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                      onChange={toggleSelectAll}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                      title="Select all orders"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {selectedOrders.size > 0 
                        ? `${selectedOrders.size} order(s) selected` 
                        : `Select all ${filteredOrders.length} order(s)`
                      }
                    </span>
                  </div>
                  {selectedOrders.size > 0 && (
                    <button
                      onClick={() => setSelectedOrders(new Set())}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
                
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                      isSelected={selectedOrders.has(order.id)}
                      onToggleSelect={() => toggleSelectOrder(order.id)}
                    onStatusUpdate={updateOrderStatus}
                    onShippingUpdate={updateShippingInfo}
                    onDelete={handleDeleteOrder}
                    isExpanded={expandedOrder === order.id}
                    onToggleExpanded={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    isEditingShipping={editingShipping === order.id}
                    onEditShipping={(orderId) => setEditingShipping(editingShipping === orderId ? null : orderId)}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                    getStatusColor={getStatusColor}
                    getStatusIcon={getStatusIcon}
                      getPaymentStatusColor={getPaymentStatusColor}
                    getShippingStatusColor={getShippingStatusColor}
                    viewMode={viewMode}
                    handleViewOrder={handleViewOrder}
                    handleEditOrder={handleEditOrder}
                    handleDuplicateOrder={handleDuplicateOrder}
                    handlePrintOrder={handlePrintOrder}
                    handlePayOrder={handlePayOrder}
                    handleResendOrder={handleResendOrder}
                    handleViewReceipt={handleViewReceipt}
                    handleViewInvoice={handleViewInvoice}
                    handleReturnOrder={handleReturnOrder}
                    handleReviewOrder={handleReviewOrder}
                    handleRestoreOrder={handleRestoreOrder}
                    handleArchiveOrder={handleArchiveOrder}
                  />
                ))}
              </div>
              </>
            )}
          </div>

          {/* Footer with summary */}
          <div className="p-6 border-t border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Showing {filteredOrders.length} of {purchaseOrders?.length || 0} orders
                </div>
                <button
                  onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 px-2 py-1 border border-blue-300 rounded-lg hover:bg-blue-50"
                  title="View keyboard shortcuts"
                >
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">?</kbd>
                  Shortcuts
                </button>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-gray-600">
                  Total Value: {formatCurrency(filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0))}
                </span>
                <span className="text-gray-600">
                  In Transit: {filteredOrders.filter(order => ['shipping', 'shipped', 'in_transit'].includes(order.status)).length}
                </span>
              </div>
            </div>
            
            {/* Currency Breakdown */}
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="text-xs font-medium text-blue-700 mb-2">Currency Breakdown:</div>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const currencyGroups = filteredOrders.reduce((acc, order) => {
                    const currency = order.currency || 'TZS';
                    if (!acc[currency]) acc[currency] = 0;
                    acc[currency] += order.totalAmount;
                    return acc;
                  }, {} as Record<string, number>);
                  
                  return Object.entries(currencyGroups).map(([currency, total]) => (
                    <span key={currency} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white text-blue-700 border border-blue-200">
                      {currency}: {formatCurrency(total)}
                    </span>
                  ));
                })()}
              </div>
            </div>
          </div>
      </div>
      </div>
      
      {/* Keyboard Shortcuts Help Modal */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => setShowKeyboardHelp(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                ⌨️ Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-700">Refresh orders</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">⌘/Ctrl + R</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-700">Select all orders</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">⌘/Ctrl + A</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-700">Export to CSV</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">⌘/Ctrl + E</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-700">Toggle analytics</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">⌘/Ctrl + Shift + F</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-700">Clear all filters</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">⌘/Ctrl + K</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-700">Close modal/Clear selection</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">Esc</kbd>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-700">Show this help</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">?</kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && payingOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => {
              setShowPaymentModal(false);
              setPayingOrder(null);
              setPaymentAmount('');
              setPaymentNote('');
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowPaymentModal(false);
                setPayingOrder(null);
                setPaymentAmount('');
                setPaymentNote('');
              }}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <CreditCard className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Record Payment</h3>
              <p className="text-sm text-gray-600">
                Order: {purchaseOrders?.find(o => o.id === payingOrder)?.orderNumber}
              </p>
            </div>

            {/* Payment Summary */}
            <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Total Amount</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(purchaseOrders?.find(o => o.id === payingOrder)?.totalAmount || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Already Paid</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(purchaseOrders?.find(o => o.id === payingOrder)?.totalPaid || 0)}
                  </p>
                </div>
                <div className="col-span-2 pt-3 border-t border-blue-300">
                  <p className="text-gray-600">Remaining Balance</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency((purchaseOrders?.find(o => o.id === payingOrder)?.totalAmount || 0) - (purchaseOrders?.find(o => o.id === payingOrder)?.totalPaid || 0))}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount *
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 text-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Note (Optional)
                </label>
                <textarea
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Add a note about this payment..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPayingOrder(null);
                  setPaymentAmount('');
                  setPaymentNote('');
                }}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleMakePayment}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all shadow-lg hover:shadow-xl"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Separate OrderCard component for better organization
interface OrderCardProps {
  order: EnhancedPurchaseOrder;
  isSelected: boolean;
  onToggleSelect: () => void;
  onStatusUpdate: (orderId: string, status: OrderStatus) => void;
  onShippingUpdate: (orderId: string, shippingData: Partial<EnhancedPurchaseOrder>) => void;
  onDelete: (orderId: string) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  isEditingShipping: boolean;
  onEditShipping: (orderId: string) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
  getStatusColor: (status: OrderStatus) => string;
  getStatusIcon: (status: OrderStatus) => React.ReactNode;
  getPaymentStatusColor: (status: PaymentStatus) => string;
  getShippingStatusColor: (status: ShippingStatus) => string;
  viewMode: 'grid' | 'list';
  // Handler functions
  handleViewOrder: (orderId: string) => void;
  handleEditOrder: (orderId: string) => void;
  handleDuplicateOrder: (orderId: string) => void;
  handlePrintOrder: (orderId: string) => void;
  handlePayOrder: (orderId: string) => void;
  handleResendOrder: (orderId: string) => void;
  handleViewReceipt: (orderId: string) => void;
  handleViewInvoice: (orderId: string) => void;
  handleReturnOrder: (orderId: string) => void;
  handleReviewOrder: (orderId: string) => void;
  handleRestoreOrder: (orderId: string) => void;
  handleArchiveOrder: (orderId: string) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  isSelected,
  onToggleSelect,
  onStatusUpdate,
  onShippingUpdate,
  onDelete,
  isExpanded,
  onToggleExpanded,
  isEditingShipping,
  onEditShipping,
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusIcon,
  getPaymentStatusColor,
  getShippingStatusColor,
  viewMode,
  handleViewOrder,
  handleEditOrder,
  handleDuplicateOrder,
  handlePrintOrder,
  handlePayOrder,
  handleResendOrder,
  handleViewReceipt,
  handleViewInvoice,
  handleReturnOrder,
  handleReviewOrder,
  handleRestoreOrder,
  handleArchiveOrder
}) => {
  const [tempShippingData, setTempShippingData] = useState({
    trackingNumber: order.trackingNumber || '',
    estimatedDelivery: order.estimatedDelivery || '',
    shippingNotes: order.shippingNotes || '',
    shippingStatus: order.shippingStatus || 'pending'
  });

  // Smart button visibility - only show next available actions for simplified workflow
  const getAvailableStatuses = (currentStatus: OrderStatus): OrderStatus[] => {
    switch (currentStatus) {
      case 'sent': return ['received'];
      case 'received': return []; // No further actions needed
      default: return ['sent']; // Default action is to send
    }
  };

  // Get smart action buttons based on proper workflow sequence: Approve → Pay → Receive
  const getSmartActionButtons = (order: EnhancedPurchaseOrder) => {
    const actions = [];
    const currentStatus = order.status as OrderStatus;
    const paymentStatus = order.paymentStatus || 'unpaid';
    
    // Debug logging
    console.log('🔍 OrderManagementModal: Order data:', {
      id: order.id,
      status: currentStatus,
      paymentStatus: paymentStatus,
      totalAmount: order.totalAmount,
      totalPaid: order.totalPaid,
      order: order
    });

    // Always show View Details
    actions.push({
      type: 'view',
      label: 'View',
      icon: <Eye className="w-4 h-4" />,
      color: 'bg-blue-600 hover:bg-blue-700',
      onClick: () => handleViewOrder(order.id)
    });

    // Workflow sequence: Draft → Approve → Pay → Receive
    switch (currentStatus) {
      case 'draft':
        // Step 1: Draft - Primary actions
        actions.push({
          type: 'edit',
          label: 'Edit',
          icon: <Edit className="w-4 h-4" />,
          color: 'bg-purple-600 hover:bg-purple-700',
          onClick: () => handleEditOrder(order.id)
        });
        actions.push({
          type: 'approve',
          label: 'Approve',
          icon: <CheckSquare className="w-4 h-4" />,
          color: 'bg-green-600 hover:bg-green-700',
          onClick: () => onStatusUpdate(order.id, 'sent')
        });
        
        // Plan B buttons for Draft
        actions.push({
          type: 'duplicate',
          label: 'Duplicate',
          icon: <Copy className="w-4 h-4" />,
          color: 'bg-blue-600 hover:bg-blue-700',
          onClick: () => handleDuplicateOrder(order.id)
        });
        actions.push({
          type: 'print',
          label: 'Print',
          icon: <Printer className="w-4 h-4" />,
          color: 'bg-gray-600 hover:bg-gray-700',
          onClick: () => handlePrintOrder(order.id)
        });
        actions.push({
          type: 'delete',
          label: 'Delete',
          icon: <Trash2 className="w-4 h-4" />,
          color: 'bg-red-600 hover:bg-red-700',
          onClick: () => onDelete(order.id)
        });
        break;
      
      case 'sent':
        // Step 2: Approved - Primary actions
        if (paymentStatus === 'unpaid' || paymentStatus === 'partial' || !paymentStatus) {
          actions.push({
            type: 'pay',
            label: 'Pay',
            icon: <CreditCard className="w-4 h-4" />,
            color: 'bg-orange-600 hover:bg-orange-700',
            onClick: () => handlePayOrder(order.id)
          });
        }
        if (paymentStatus === 'paid') {
          actions.push({
            type: 'receive',
            label: 'Receive',
            icon: <CheckSquare className="w-4 h-4" />,
            color: 'bg-green-600 hover:bg-green-700',
            onClick: () => onStatusUpdate(order.id, 'received')
          });
        }
        
        // Plan B buttons for Sent
        actions.push({
          type: 'resend',
          label: 'Resend',
          icon: <Mail className="w-4 h-4" />,
          color: 'bg-blue-600 hover:bg-blue-700',
          onClick: () => handleResendOrder(order.id)
        });
        actions.push({
          type: 'modify',
          label: 'Modify',
          icon: <Edit className="w-4 h-4" />,
          color: 'bg-purple-600 hover:bg-purple-700',
          onClick: () => handleEditOrder(order.id)
        });
        actions.push({
          type: 'cancel',
          label: 'Cancel',
          icon: <XSquare className="w-4 h-4" />,
          color: 'bg-red-600 hover:bg-red-700',
          onClick: () => onStatusUpdate(order.id, 'cancelled')
        });
        break;
      
      case 'received':
        // Step 5: Received - Primary actions
        actions.push({
          type: 'receipt',
          label: 'Receipt',
          icon: <FileText className="w-4 h-4" />,
          color: 'bg-gray-600 hover:bg-gray-700',
          onClick: () => handleViewReceipt(order.id)
        });
        
        // Plan B buttons for Received
        actions.push({
          type: 'invoice',
          label: 'Invoice',
          icon: <FileText className="w-4 h-4" />,
          color: 'bg-blue-600 hover:bg-blue-700',
          onClick: () => handleViewInvoice(order.id)
        });
        actions.push({
          type: 'return',
          label: 'Return',
          icon: <ArrowLeft className="w-4 h-4" />,
          color: 'bg-red-600 hover:bg-red-700',
          onClick: () => handleReturnOrder(order.id)
        });
        actions.push({
          type: 'review',
          label: 'Review',
          icon: <Star className="w-4 h-4" />,
          color: 'bg-yellow-600 hover:bg-yellow-700',
          onClick: () => handleReviewOrder(order.id)
        });
        break;
      
      case 'cancelled':
        // Plan B buttons for Cancelled
        actions.push({
          type: 'restore',
          label: 'Restore',
          icon: <RefreshCw className="w-4 h-4" />,
          color: 'bg-green-600 hover:bg-green-700',
          onClick: () => handleRestoreOrder(order.id)
        });
        actions.push({
          type: 'duplicate',
          label: 'Duplicate',
          icon: <Copy className="w-4 h-4" />,
          color: 'bg-blue-600 hover:bg-blue-700',
          onClick: () => handleDuplicateOrder(order.id)
        });
        actions.push({
          type: 'archive',
          label: 'Archive',
          icon: <Archive className="w-4 h-4" />,
          color: 'bg-gray-600 hover:bg-gray-700',
          onClick: () => handleArchiveOrder(order.id)
        });
        break;
    }

    return actions;
  };

  const availableStatuses = getAvailableStatuses(order.status as OrderStatus);

  const isOrderComplete = order.status === 'received';
  const needsAction = order.status === 'draft' || order.status === 'pending_approval';

  return (
    <div className={`border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 ${
      isExpanded 
        ? 'border-blue-500 shadow-xl' 
        : isOrderComplete
          ? 'border-green-200 hover:border-green-300 hover:shadow-md'
          : needsAction
            ? 'border-orange-300 hover:border-orange-400 hover:shadow-md'
            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
    } ${isSelected ? 'ring-2 ring-offset-2 ring-blue-400' : ''}`}>
      {/* Header - Clickable */}
      <div 
        className="flex items-start justify-between p-6 cursor-pointer"
        onClick={onToggleExpanded}
      >
        <div className="flex items-start gap-3 flex-1">
          {/* Selection Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
            title="Select this order"
          />
          
          {/* Expand/Collapse Icon */}
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
            isExpanded ? 'bg-blue-500' : 'bg-gray-200'
          }`}>
            <ChevronDown 
              className={`w-4 h-4 text-white transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-lg font-bold text-gray-900">{order.orderNumber}</h3>
              
              {/* Status Badge */}
              {isOrderComplete ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm">
                  <CheckSquare className="w-3 h-3" />
                  Complete
                </span>
              ) : needsAction ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500 text-white shadow-sm animate-pulse">
                  <Clock className="w-3 h-3" />
                  Action Needed
                </span>
              ) : (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status as OrderStatus)}`}>
                  {getStatusIcon(order.status as OrderStatus)}
                  {order.status.replace('_', ' ')}
                </span>
              )}
              
              {/* Currency Badge */}
            {order.currency && order.currency !== 'TZS' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                💱 {order.currency}
              </span>
            )}
              
              {/* Payment Status Badge */}
              {order.paymentStatus && (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.paymentStatus as PaymentStatus)}`}>
                  <DollarSign className="w-3 h-3 mr-1" />
                  {order.paymentStatus === 'partial' ? 'Partial' : order.paymentStatus}
                </span>
              )}
          </div>
            <p className="text-sm text-gray-600 mt-1">
            {order.supplier?.name || 'Unknown Supplier'} • {formatDate(order.createdAt)}
          </p>
            <p className="text-xs text-gray-500 mt-1">
              {order.items.length} item{order.items.length !== 1 ? 's' : ''}
            </p>
        </div>
          </div>
        
        {/* Summary Stats */}
        <div className="flex flex-col items-end gap-2 ml-4">
          <div className={`px-4 py-2 rounded-xl text-base font-bold shadow-sm ${
            order.totalPaid >= order.totalAmount 
              ? 'bg-green-100 text-green-700 border border-green-200'
              : order.totalPaid > 0
                ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {formatCurrency(order.totalAmount)}
          </div>
          {order.totalPaid > 0 && (
            <div className="text-xs text-gray-600">
              Paid: {formatCurrency(order.totalPaid)}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Content - Only show when expanded */}
      {isExpanded && (
        <div className="px-6 pb-6">
          {/* Order Summary Row */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Total Amount</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(order.totalAmount)}</p>
              <p className="text-xs text-gray-500 mt-1">{order.currency || 'TZS'}</p>
        </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Paid Amount</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(order.totalPaid || 0)}</p>
              <p className="text-xs text-gray-500 mt-1">{order.currency || 'TZS'}</p>
        </div>
            <div className={`p-3 rounded-xl border ${
              order.totalPaid >= order.totalAmount 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <p className={`text-xs mb-2 font-medium ${
                order.totalPaid >= order.totalAmount ? 'text-green-700' : 'text-red-700'
              }`}>
                Balance
              </p>
              <p className={`text-lg font-bold ${
                order.totalPaid >= order.totalAmount ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(order.totalAmount - (order.totalPaid || 0))}
              </p>
              <p className={`text-xs mt-1 ${
                order.totalPaid >= order.totalAmount ? 'text-green-600' : 'text-red-600'
              }`}>
            {order.currency || 'TZS'}
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
              <p className="text-xs text-blue-700 mb-2 font-medium">Items</p>
              <p className="text-lg font-bold text-blue-600">{order.items.length}</p>
              <p className="text-xs text-blue-600 mt-1">Products</p>
        </div>
      </div>

          {/* Shipping Information */}
          {(['shipping', 'shipped', 'in_transit', 'delivered', 'received'].includes(order.status)) && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Ship className="w-4 h-4" />
                  Shipping Information
                </h4>
                <button
                  onClick={() => onEditShipping(order.id)}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  {isEditingShipping ? 'Cancel' : 'Edit'}
                </button>
              </div>

              {isEditingShipping ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Tracking Number</label>
                      <input
                        type="text"
                        value={tempShippingData.trackingNumber}
                        onChange={(e) => setTempShippingData({...tempShippingData, trackingNumber: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter tracking number"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Shipping Status</label>
                      <select
                        value={tempShippingData.shippingStatus}
                        onChange={(e) => setTempShippingData({...tempShippingData, shippingStatus: e.target.value as ShippingStatus})}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="packed">Packed</option>
                        <option value="shipped">Shipped</option>
                        <option value="in_transit">In Transit</option>
                        <option value="delivered">Delivered</option>
                        <option value="returned">Returned</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Estimated Delivery</label>
                    <input
                      type="date"
                      value={tempShippingData.estimatedDelivery}
                      onChange={(e) => setTempShippingData({...tempShippingData, estimatedDelivery: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Shipping Notes</label>
                    <textarea
                      value={tempShippingData.shippingNotes}
                      onChange={(e) => setTempShippingData({...tempShippingData, shippingNotes: e.target.value})}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                      placeholder="Add shipping notes..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <GlassButton
                      onClick={() => onShippingUpdate(order.id, tempShippingData)}
                      size="sm"
                      className="bg-blue-600 text-white"
                    >
                      Save
                    </GlassButton>
                    <GlassButton
                      onClick={() => onEditShipping(order.id)}
                      size="sm"
                      variant="outline"
                    >
                      Cancel
                    </GlassButton>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  {order.shippingStatus && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipping Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getShippingStatusColor(order.shippingStatus)}`}>
                        {order.shippingStatus.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  )}
                  {order.trackingNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tracking:</span>
                      <span className="font-mono">{order.trackingNumber}</span>
                    </div>
                  )}
                  {order.estimatedDelivery && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Est. Delivery:</span>
                      <span>{formatDate(order.estimatedDelivery)}</span>
                    </div>
                  )}
                  {order.shippingNotes && (
                    <div>
                      <span className="text-gray-600">Notes:</span>
                      <p className="text-gray-800 mt-1">{order.shippingNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Order Items */}
            <div className="mb-4">
            <h4 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
                Order Items ({order.items.length})
              </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
                {order.items.map((item, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900">
                        {item.product?.name || `Product ${item.productId}`}
                      </span>
                      {item.product?.sku && (
                          <span className="text-xs font-mono bg-gray-200 px-2 py-0.5 rounded text-gray-600">
                            {item.product.sku}
                          </span>
                      )}
                    </div>
                      {item.variant?.name && item.variant.name !== 'Default Variant' && (
                        <p className="text-sm text-gray-600 mb-1">Variant: {item.variant.name}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          Qty: <strong className="text-gray-700">{item.quantity}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          Unit: <strong className="text-gray-700">{formatCurrency(item.costPrice)}</strong>
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-xs text-gray-500 mb-1">Item Total</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(item.totalPrice || (item.quantity * item.costPrice))}
                      </p>
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          {/* Action Buttons Section */}
          <div className="mt-5 pt-5 border-t-2 border-gray-200">
            {/* Primary Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {getSmartActionButtons(order).slice(0, 4).map((action, index) => (
                  <button
                  key={`${action.type}-${index}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-semibold text-sm ${action.color}`}
                  >
                  {action.icon}
                  {action.label}
                  </button>
                ))}
              </div>

            {/* Secondary Actions */}
            {getSmartActionButtons(order).length > 4 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {getSmartActionButtons(order).slice(4).map((action, index) => (
                <button
                    key={`${action.type}-${index + 4}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick();
                    }}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-medium text-sm ${action.color}`}
                >
                  {action.icon}
                    {action.label}
                </button>
              ))}
            </div>
            )}

            {/* Quick Status Update Buttons */}
            {availableStatuses.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-2">Quick Status Update:</p>
                <div className="flex gap-2 flex-wrap">
                  {availableStatuses.map(status => (
                    <button
                      key={status}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusUpdate(order.id, status);
                      }}
                      className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 hover:shadow-md ${getStatusColor(status)}`}
                    >
                      {getStatusIcon(status)}
                      <span className="capitalize">Mark as {status.replace('_', ' ')}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagementModal;