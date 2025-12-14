import React, { useEffect, useState, useMemo, useRef } from 'react';
import GlassCard from '../../../shared/components/ui/GlassCard';
import GlassButton from '../../../shared/components/ui/GlassButton';
import CircularProgress from '../../../../components/ui/CircularProgress';
import ModernLoadingOverlay from '../../../../components/ui/ModernLoadingOverlay';
import { useLoadingJob } from '../../../../hooks/useLoadingJob';
import { TableSkeleton } from '../../../../components/ui/SkeletonLoaders';
import { 
  ShoppingCart, Plus, CheckCircle, FileText, Send, Truck, Eye,
  Package, Search, RefreshCw, AlertCircle, Edit, Trash2, 
  DollarSign, Clock, CheckSquare, CreditCard, Copy, PackageCheck,
  XCircle, Filter, ChevronDown, ChevronUp, ChevronLeft, 
  ChevronRight, MoreHorizontal, X, Calendar, Download, 
  Phone, Tag, MessageCircle, Grid, List, Mail, Printer, ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useDialog } from '../../../shared/hooks/useDialog';

interface PurchaseOrdersTabProps {
  navigate: (path: string) => void;
  useInventoryStore: any;
}

const PurchaseOrdersTab: React.FC<PurchaseOrdersTabProps> = ({
  navigate,
  useInventoryStore
}) => {
  const { confirm } = useDialog();
  
  // Database state management
  const { 
    purchaseOrders, 
    isLoading,
    error,
    loadPurchaseOrders,
    deletePurchaseOrder,
    receivePurchaseOrder,
    approvePurchaseOrder,
    updatePurchaseOrder,
    suppliers,
    loadSuppliers,
  } = useInventoryStore();

  // Local state - Basic
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'orderNumber' | 'totalAmount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // View mode state (NEW!)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Pagination state (now for infinite scroll)
  const [displayCount, setDisplayCount] = useState(25); // For infinite scroll
  const [pageSize, setPageSize] = useState(25);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Bulk selection state
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Advanced filters state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Communication modal state (NEW!)
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [selectedOrderForComm, setSelectedOrderForComm] = useState<any>(null);

  // Enhanced load function with timestamp
  const handleLoadPurchaseOrders = async () => {
    console.log('🔄 [PurchaseOrdersTab] Loading purchase orders...');
    const startTime = Date.now();
    try {
      await loadPurchaseOrders();
      await loadSuppliers(); // Load suppliers for filtering
      const endTime = Date.now();
      setLastUpdated(new Date());
      console.log(`✅ [PurchaseOrdersTab] Purchase orders loaded in ${endTime - startTime}ms`);
    } catch (error) {
      console.error('❌ [PurchaseOrdersTab] Error loading purchase orders:', error);
    }
  };

  // Load purchase orders on component mount
  useEffect(() => {
    handleLoadPurchaseOrders();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      handleLoadPurchaseOrders();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Filter and sort purchase orders
  const filteredOrders = useMemo(() => {
    let filtered = purchaseOrders || [];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Apply supplier filter
    if (supplierFilter !== 'all') {
      filtered = filtered.filter(order => order.supplierId === supplierFilter);
    }

    // Apply payment status filter
    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter(order => {
        const paymentStatus = order.payment_status || order.paymentStatus || 'unpaid';
        return paymentStatus === paymentStatusFilter;
      });
    }

    // Apply date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter(order => new Date(order.createdAt) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59);
      filtered = filtered.filter(order => new Date(order.createdAt) <= toDate);
    }

    // Apply amount range filter
    if (minAmount) {
      const min = parseFloat(minAmount);
      filtered = filtered.filter(order => (order.totalAmount || 0) >= min);
    }
    if (maxAmount) {
      const max = parseFloat(maxAmount);
      filtered = filtered.filter(order => (order.totalAmount || 0) <= max);
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
          aValue = a.totalAmount || 0;
          bValue = b.totalAmount || 0;
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
  }, [purchaseOrders, searchQuery, statusFilter, sortBy, sortOrder, supplierFilter, paymentStatusFilter, dateFrom, dateTo, minAmount, maxAmount]);

  // Infinite scroll - show items up to displayCount
  const displayedOrders = filteredOrders.slice(0, displayCount);
  const hasMore = displayCount < filteredOrders.length;

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(25);
  }, [searchQuery, statusFilter, supplierFilter, paymentStatusFilter, dateFrom, dateTo, minAmount, maxAmount, pageSize]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          setDisplayCount(prev => prev + pageSize);
        }
      },
      { threshold: 0.1 }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [hasMore, isLoading, pageSize]);

  // Bulk selection handlers
  const toggleOrderSelection = (orderId: string) => {
    const newSelection = new Set(selectedOrders);
    if (newSelection.has(orderId)) {
      newSelection.delete(orderId);
    } else {
      newSelection.add(orderId);
    }
    setSelectedOrders(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === displayedOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(displayedOrders.map(order => order.id)));
    }
  };

  const clearSelection = () => {
    setSelectedOrders(new Set());
    setShowBulkActions(false);
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    const confirmed = await confirm(`Are you sure you want to delete ${selectedOrders.size} purchase orders?`);
    if (confirmed) {
      let successCount = 0;
      for (const orderId of selectedOrders) {
        const response = await deletePurchaseOrder(orderId);
        if (response.ok) successCount++;
      }
      toast.success(`Deleted ${successCount} purchase orders successfully`);
      clearSelection();
    }
  };

  const handleBulkApprove = async () => {
    const confirmed = await confirm(`Are you sure you want to approve ${selectedOrders.size} purchase orders?`);
    if (confirmed) {
      let successCount = 0;
      for (const orderId of selectedOrders) {
        const response = await approvePurchaseOrder(orderId);
        if (response.ok) successCount++;
      }
      toast.success(`Approved ${successCount} purchase orders successfully`);
      clearSelection();
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    const confirmed = await confirm(`Are you sure you want to change status of ${selectedOrders.size} orders to "${newStatus}"?`);
    if (confirmed) {
      let successCount = 0;
      for (const orderId of selectedOrders) {
        const response = await updatePurchaseOrder(orderId, { status: newStatus });
        if (response.ok) successCount++;
      }
      toast.success(`Updated ${successCount} purchase orders successfully`);
      clearSelection();
    }
  };

  // Export functionality
  const handleExportToExcel = () => {
    try {
      const headers = ['Order Number', 'Supplier', 'Status', 'Total Amount', 'Currency', 'Payment Status', 'Total Quantity', 'Created Date'];
      const rows = filteredOrders.map(order => [
        order.orderNumber,
        order.supplier?.name || 'N/A',
        order.status,
        order.totalAmount || 0,
        order.currency || 'TZS',
        order.payment_status || order.paymentStatus || 'unpaid',
        order.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0,
        formatDate(order.createdAt)
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `purchase-orders-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast.success('Purchase orders exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export purchase orders');
    }
  };

  // Print Purchase Order (NEW!)
  const handlePrintOrder = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Purchase Order - ${order.orderNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
              .header h1 { margin: 0; color: #333; }
              .header p { margin: 5px 0; color: #666; }
              .section { margin: 20px 0; }
              .section-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; color: #333; }
              .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
              .info-label { font-weight: bold; color: #666; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
              th { background-color: #f5f5f5; font-weight: bold; }
              .total-row { font-weight: bold; background-color: #f9f9f9; }
              .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; }
              .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
              .status-${order.status} { background-color: #e3f2fd; color: #1976d2; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>PURCHASE ORDER</h1>
              <p>LATS CHANCE - Purchase Management</p>
              <p>Date: ${new Date().toLocaleDateString()}</p>
            </div>

            <div class="section">
              <div class="section-title">Order Information</div>
              <div class="info-row">
                <span class="info-label">Order Number:</span>
                <span>${order.orderNumber}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Order Date:</span>
                <span>${formatDate(order.createdAt)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status:</span>
                <span class="status-badge status-${order.status}">${order.status.replace('_', ' ').toUpperCase()}</span>
              </div>
              ${order.expectedDeliveryDate ? `
              <div class="info-row">
                <span class="info-label">Expected Delivery:</span>
                <span>${formatDate(order.expectedDeliveryDate)}</span>
              </div>
              ` : ''}
            </div>

            <div class="section">
              <div class="section-title">Supplier Information</div>
              <div class="info-row">
                <span class="info-label">Supplier Name:</span>
                <span>${order.supplier?.name || 'N/A'}</span>
              </div>
              ${order.supplier?.email ? `
              <div class="info-row">
                <span class="info-label">Email:</span>
                <span>${order.supplier.email}</span>
              </div>
              ` : ''}
              ${order.supplier?.phone ? `
              <div class="info-row">
                <span class="info-label">Phone:</span>
                <span>${order.supplier.phone}</span>
              </div>
              ` : ''}
              ${order.supplier?.country ? `
              <div class="info-row">
                <span class="info-label">Country:</span>
                <span>${order.supplier.country}</span>
              </div>
              ` : ''}
            </div>

            <div class="section">
              <div class="section-title">Order Items</div>
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${order.items?.map((item: any) => `
                    <tr>
                      <td>${item.product?.name || 'Product'} ${item.variant?.name ? `(${item.variant.name})` : ''}</td>
                      <td>${item.quantity}</td>
                      <td>${formatCurrency(item.costPrice, order.currency)}</td>
                      <td>${formatCurrency(item.totalPrice || (item.quantity * item.costPrice), order.currency)}</td>
                    </tr>
                  `).join('') || '<tr><td colspan="4">No items</td></tr>'}
                  <tr class="total-row">
                    <td colspan="3" style="text-align: right;">TOTAL:</td>
                    <td>${formatCurrency(order.totalAmount || 0, order.currency)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            ${order.notes ? `
            <div class="section">
              <div class="section-title">Notes</div>
              <p>${order.notes}</p>
            </div>
            ` : ''}

            ${order.paymentTerms ? `
            <div class="section">
              <div class="section-title">Payment Terms</div>
              <p>${order.paymentTerms}</p>
            </div>
            ` : ''}

            <div class="footer">
              <p>This is a computer-generated document. No signature required.</p>
              <p>LATS CHANCE - Inventory Management System</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      toast.success('Print dialog opened');
    }
  };

  // Communication handlers (NEW!)
  const handleWhatsAppSupplier = (order: any) => {
    if (!order.supplier?.phone) {
      toast.error('Supplier phone number not available');
      return;
    }
    
    const message = `Hello! Regarding Purchase Order ${order.orderNumber}. `;
    const phoneNumber = order.supplier.phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success('Opening WhatsApp...');
  };

  const handleEmailSupplier = (order: any) => {
    if (!order.supplier?.email) {
      toast.error('Supplier email not available');
      return;
    }
    
    const subject = `Purchase Order ${order.orderNumber}`;
    const body = `Dear ${order.supplier.name},\n\nRegarding Purchase Order: ${order.orderNumber}\nTotal Amount: ${formatCurrency(order.totalAmount, order.currency)}\n\nPlease confirm receipt of this order.\n\nBest regards`;
    const mailtoLink = `mailto:${order.supplier.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink);
    toast.success('Opening email client...');
  };

  const handleSMSSupplier = (order: any) => {
    if (!order.supplier?.phone) {
      toast.error('Supplier phone number not available');
      return;
    }
    
    const message = `PO ${order.orderNumber}: ${formatCurrency(order.totalAmount, order.currency)}`;
    const smsUrl = `sms:${order.supplier.phone}?body=${encodeURIComponent(message)}`;
    window.open(smsUrl);
    toast.success('Opening SMS...');
  };

  // Handle order actions
  const handleDeleteOrder = async (orderId: string) => {
    const confirmed = await confirm('Are you sure you want to delete this purchase order?');
    if (confirmed) {
      const response = await deletePurchaseOrder(orderId);
      if (response.ok) {
        toast.success('Purchase order deleted successfully');
      } else {
        toast.error(response.message || 'Failed to delete purchase order');
      }
    }
  };

  const handleReceiveOrder = async (orderId: string) => {
    const response = await receivePurchaseOrder(orderId);
    if (response.ok) {
      toast.success('Purchase order received successfully');
    } else {
      toast.error(response.message || 'Failed to receive purchase order');
    }
  };

  const handleApproveOrder = async (orderId: string) => {
    try {
      const response = await approvePurchaseOrder(orderId);
      if (response.ok) {
        toast.success('Purchase order approved successfully');
      } else {
        toast.error(response.message || 'Failed to approve purchase order');
      }
    } catch (error) {
      console.error('Error approving purchase order:', error);
      toast.error('Failed to approve purchase order');
    }
  };

  const handleSendOrder = async (orderId: string) => {
    try {
      const response = await updatePurchaseOrder(orderId, { status: 'sent' });
      if (response.ok) {
        toast.success('Purchase order sent to supplier successfully');
      } else {
        toast.error(response.message || 'Failed to send purchase order');
      }
    } catch (error) {
      console.error('Error sending purchase order:', error);
      toast.error('Failed to send purchase order');
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    try {
      const response = await updatePurchaseOrder(orderId, { status: 'completed' });
      if (response.ok) {
        toast.success('Purchase order completed successfully');
      } else {
        toast.error(response.message || 'Failed to complete purchase order');
      }
    } catch (error) {
      console.error('Error completing purchase order:', error);
      toast.error('Failed to complete purchase order');
    }
  };

  const getStatusColor = (status: string) => {
    // Option B Workflow colors
    switch (status) {
      case 'draft': return 'bg-gray-500 text-white shadow-sm';
      case 'sent': return 'bg-blue-600 text-white shadow-sm';
      case 'partial_received': return 'bg-orange-500 text-white shadow-sm';
      case 'received': return 'bg-sky-500 text-white shadow-sm';
      case 'completed': return 'bg-green-600 text-white shadow-sm';
      case 'cancelled': return 'bg-red-500 text-white shadow-sm';
      default: return 'bg-gray-400 text-white shadow-sm';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-blue-500 text-white shadow-sm';
      case 'partial': return 'bg-orange-500 text-white shadow-sm';
      case 'unpaid': return 'bg-red-500 text-white shadow-sm';
      case 'overpaid': return 'bg-purple-500 text-white shadow-sm';
      default: return 'bg-gray-500 text-white shadow-sm';
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-3 h-3" />;
      case 'partial': return <AlertCircle className="w-3 h-3" />;
      case 'unpaid': return <XCircle className="w-3 h-3" />;
      case 'overpaid': return <DollarSign className="w-3 h-3" />;
      default: return null;
    }
  };

  const formatCurrency = (amount: number | string, currencyCode: string = 'TZS') => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : (amount || 0);
    
    if (!numAmount || numAmount === 0) return 'TSh 0';
    
    if (currencyCode === 'TZS' || !currencyCode) {
      return `TSh ${numAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    
    try {
      return new Intl.NumberFormat('en-TZ', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(numAmount);
    } catch (error) {
      return `${currencyCode} ${numAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not set';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Not set';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSupplierFilter('all');
    setPaymentStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('createdAt');
    setSortOrder('desc');
  };

  const activeFiltersCount = [
    searchQuery,
    statusFilter !== 'all',
    supplierFilter !== 'all',
    paymentStatusFilter !== 'all',
    dateFrom,
    dateTo,
    minAmount,
    maxAmount
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header with Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Orders</p>
              <p className="text-2xl font-bold text-blue-900">{purchaseOrders?.length || 0}</p>
            </div>
            <div className="p-3 bg-blue-50/20 rounded-full">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="bg-gradient-to-br from-yellow-50 to-yellow-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-900">
                {purchaseOrders?.filter((order: any) => 
                  order.status === 'draft' || order.status === 'sent' || order.status === 'partial_received'
                ).length || 0}
              </p>
            </div>
            <div className="p-3 bg-yellow-50/20 rounded-full">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">In Transit</p>
              <p className="text-2xl font-bold text-purple-900">
                {purchaseOrders?.filter((order: any) => 
                  order.status === 'sent' || order.status === 'shipped'
                ).length || 0}
              </p>
            </div>
            <div className="p-3 bg-purple-50/20 rounded-full">
              <Truck className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Completed</p>
              <p className="text-2xl font-bold text-green-900">
                {purchaseOrders?.filter((order: any) => 
                  order.status === 'received' || order.status === 'completed'
                ).length || 0}
              </p>
            </div>
            <div className="p-3 bg-green-50/20 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Search, Filters, and Actions Bar */}
      <GlassCard className="p-6">
        <div className="space-y-4">
          {/* Top Row: Search and Main Actions */}
          <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center">
            {/* Search Bar */}
            <div className="flex-1 min-w-0 w-full">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search orders, suppliers, or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all"
                />
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex items-center gap-2 px-4 py-3 border rounded-xl transition-all ${
                  showAdvancedFilters 
                    ? 'bg-blue-50 border-blue-300 text-blue-700' 
                    : 'bg-white/60 border-gray-200 text-gray-700 hover:bg-white/80'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* View Mode Toggle (NEW!) */}
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  title="List View"
                >
                  <List size={16} />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  title="Grid View"
                >
                  <Grid size={16} />
                </button>
              </div>

              <button
                onClick={handleLoadPurchaseOrders}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-3 bg-white/60 border border-gray-200 rounded-xl hover:bg-white/80 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={handleExportToExcel}
                className="flex items-center gap-2 px-4 py-3 bg-white/60 border border-gray-200 rounded-xl hover:bg-white/80 transition-all"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>

              <GlassButton
                onClick={() => navigate('/lats/purchase-order/create')}
                icon={<Plus size={18} />}
                className="bg-gradient-to-r from-orange-500 to-amber-600 text-white font-semibold"
              >
                Create PO
              </GlassButton>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-white/60 border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="sent">Sent</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="shipped">Shipped</option>
                    <option value="partial_received">Partial Received</option>
                    <option value="received">Received</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Supplier Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
                  <select
                    value={supplierFilter}
                    onChange={(e) => setSupplierFilter(e.target.value)}
                    className="w-full bg-white/60 border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Suppliers</option>
                    {suppliers?.map((supplier: any) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                  <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    className="w-full bg-white/60 border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Payment Status</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partially Paid</option>
                    <option value="paid">Paid</option>
                    <option value="overpaid">Overpaid</option>
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <div className="flex gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="flex-1 bg-white/60 border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="createdAt">Date</option>
                      <option value="orderNumber">Order #</option>
                      <option value="totalAmount">Amount</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-3 bg-white/60 border border-gray-200 rounded-xl hover:bg-white/80 transition-all"
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>

                {/* Date From */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Date To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Min Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Amount</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    className="w-full bg-white/60 border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Max Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Amount</label>
                  <input
                    type="number"
                    placeholder="∞"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    className="w-full bg-white/60 border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              {activeFiltersCount > 0 && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <X className="w-4 h-4" />
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Last Updated Timestamp */}
          {lastUpdated && (
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>
      </GlassCard>

      {/* Bulk Actions Bar */}
      {selectedOrders.size > 0 && (
        <GlassCard className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkApprove}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
              >
                <CheckSquare className="w-4 h-4" />
                Approve Selected
              </button>
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
              >
                <MoreHorizontal className="w-4 h-4" />
                More Actions
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </button>
            </div>
          </div>

          {/* Bulk Actions Menu */}
          {showBulkActions && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-sm font-medium text-blue-900 mb-3">Change status to:</p>
              <div className="flex flex-wrap gap-2">
                {['approved', 'sent', 'confirmed', 'shipped', 'received', 'completed', 'cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleBulkStatusChange(status)}
                    className="px-3 py-1 text-sm bg-white border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors capitalize"
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {/* Error Display */}
      {error && (
        <GlassCard className="p-6 bg-red-50 border-red-200">
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <div>
              <h4 className="font-semibold">Error</h4>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Purchase Orders Display - LIST OR GRID */}
      {isLoading ? (
        <ModernLoadingOverlay />
      ) : filteredOrders.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Package className="w-20 h-20 text-gray-300 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No purchase orders found</h3>
          <p className="text-gray-600 mb-8">
            {searchQuery || activeFiltersCount > 0
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first purchase order'
            }
          </p>
          {!searchQuery && activeFiltersCount === 0 && (
            <GlassButton
              onClick={() => navigate('/lats/purchase-order/create')}
              icon={<Plus size={20} />}
              className="bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-lg px-8 py-4"
            >
              Create Purchase Order
            </GlassButton>
          )}
        </GlassCard>
      ) : viewMode === 'list' ? (
        /* LIST VIEW (TABLE) */
        <GlassCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200/50">
                  <th className="text-left py-4 px-4 font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedOrders.size === displayedOrders.length && displayedOrders.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="text-left py-4 px-4 font-medium text-gray-700">Order</th>
                  <th className="text-left py-4 px-4 font-medium text-gray-700">Supplier</th>
                  <th className="text-left py-4 px-4 font-medium text-gray-700">Items</th>
                  <th className="text-right py-4 px-4 font-medium text-gray-700">Total Amount</th>
                  <th className="text-center py-4 px-4 font-medium text-gray-700">Payment</th>
                  <th className="text-center py-4 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-center py-4 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedOrders.map(order => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-200/30 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/lats/purchase-orders/${order.id}`)}
                  >
                    {/* Checkbox */}
                    <td className="py-4 px-4">
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order.id)}
                        onChange={e => { e.stopPropagation(); toggleOrderSelection(order.id); }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>

                    {/* Order Details */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{order.orderNumber}</p>
                          <p className="text-sm text-gray-600">{formatDate(order.createdAt)}</p>
                        </div>
                      </div>
                    </td>

                    {/* Supplier */}
                    <td className="py-4 px-4">
                      {order.supplier ? (
                        <div>
                          <p className="font-medium text-gray-900">{order.supplier.name}</p>
                          <p className="text-sm text-gray-600">{order.supplier.country || 'Tanzania'}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-sm">No supplier</span>
                      )}
                    </td>

                    {/* Items */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <p className="text-gray-900 font-semibold">
                          {order.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0} qty
                        </p>
                        {order.paymentTerms && (
                          <p className="text-sm text-gray-600">{order.paymentTerms}</p>
                        )}
                      </div>
                    </td>

                    {/* Total Amount */}
                    <td className="py-4 px-4 text-right">
                      <p className="text-gray-900 font-semibold">
                        {formatCurrency(order.totalAmount || 0, order.currency)}
                      </p>
                      {order.currency && order.currency !== 'TZS' && (
                        <p className="text-sm text-gray-600">{order.currency}</p>
                      )}
                    </td>

                    {/* Payment Status */}
                    <td className="py-4 px-4">
                      <div className="flex justify-center">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-semibold ${getPaymentStatusColor(order.payment_status || order.paymentStatus || 'unpaid')}`}>
                          {getPaymentStatusIcon(order.payment_status || order.paymentStatus || 'unpaid')}
                          <span className="capitalize">{(order.payment_status || order.paymentStatus || 'unpaid').replace('_', ' ')}</span>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <div className="flex justify-center">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                          <span className="capitalize">{order.status.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/lats/purchase-orders/${order.id}`); }}
                          className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handlePrintOrder(order); }}
                          className="p-1 text-gray-500 hover:text-green-600 transition-colors"
                          title="Print Order"
                        >
                          <Printer size={16} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleWhatsAppSupplier(order); }}
                          className="p-1 text-gray-500 hover:text-green-600 transition-colors"
                          title="WhatsApp Supplier"
                        >
                          <MessageCircle size={16} />
                        </button>
                        {order.status === 'draft' && (
                          <button
                            onClick={e => { e.stopPropagation(); handleApproveOrder(order.id); }}
                            className="p-1 text-gray-500 hover:text-purple-600 transition-colors"
                            title="Approve Order"
                          >
                            <CheckSquare size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      ) : (
        /* GRID VIEW (NEW!) */
        <div className="w-full max-w-full mx-auto px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(350px, 100%), 1fr))',
              gap: 'clamp(1rem, 2vw, 1.5rem)',
              gridAutoRows: '1fr'
            }}
          >
          {displayedOrders.map(order => (
            <GlassCard key={order.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/lats/purchase-orders/${order.id}`)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{order.orderNumber}</h3>
                    <p className="text-sm text-gray-600">{formatDate(order.createdAt)}</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={selectedOrders.has(order.id)}
                  onChange={e => { e.stopPropagation(); toggleOrderSelection(order.id); }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              {/* Supplier */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Supplier</p>
                {order.supplier ? (
                  <p className="font-medium text-gray-900">{order.supplier.name}</p>
                ) : (
                  <p className="text-gray-400 italic">No supplier</p>
                )}
              </div>

              {/* Amount */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(order.totalAmount || 0, order.currency)}
                </p>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                  <span className="capitalize">{order.status.replace('_', ' ')}</span>
                </div>
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getPaymentStatusColor(order.payment_status || order.paymentStatus || 'unpaid')}`}>
                  {getPaymentStatusIcon(order.payment_status || order.paymentStatus || 'unpaid')}
                  <span className="capitalize">{(order.payment_status || order.paymentStatus || 'unpaid').replace('_', ' ')}</span>
                </div>
              </div>

              {/* Total Quantity */}
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Quantity: <span className="font-semibold">{order.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0}</span>
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/lats/purchase-orders/${order.id}`); }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                >
                  <Eye size={14} />
                  <span>View</span>
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handlePrintOrder(order); }}
                  className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  title="Print"
                >
                  <Printer size={14} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handleWhatsAppSupplier(order); }}
                  className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                  title="WhatsApp"
                >
                  <MessageCircle size={14} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handleEmailSupplier(order); }}
                  className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors"
                  title="Email"
                >
                  <Mail size={14} />
                </button>
              </div>
            </GlassCard>
          ))}
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {filteredOrders.length > 0 && (
        <GlassCard className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setDisplayCount(Number(e.target.value));
                }}
                className="bg-white border border-gray-200 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-600">per page</span>
            </div>

            {/* Infinite Scroll Info */}
            <div className="text-sm text-gray-600">
              Showing {displayedOrders.length} of {filteredOrders.length} orders
            </div>

            {/* Infinite Scroll Loading Indicator */}
            <div ref={loaderRef} className="py-2">
              {hasMore && !isLoading && (
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading more orders...</span>
                </div>
              )}
              {!hasMore && displayedOrders.length > 0 && (
                <div className="text-gray-500 text-sm">
                  ✓ All orders loaded
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Summary */}
      {filteredOrders.length > 0 && (
        <GlassCard className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Showing {filteredOrders.length} of {purchaseOrders?.length || 0} purchase orders
                </h3>
                <p className="text-sm text-gray-600">
                  {activeFiltersCount > 0 ? `${activeFiltersCount} filter${activeFiltersCount !== 1 ? 's' : ''} applied` : 'All orders'} • {viewMode === 'grid' ? 'Grid View' : 'List View'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(filteredOrders.reduce((sum, order) => {
                    // Use totalAmountBaseCurrency for accurate multi-currency calculation
                    const amount = order.totalAmountBaseCurrency || order.totalAmount || 0;
                    return sum + amount;
                  }, 0), 'TZS')}
                </div>
                <div className="text-sm text-gray-600">Total Value (TZS)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredOrders.reduce((sum, order) => 
                    sum + (order.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0), 0
                  )}
                </div>
                <div className="text-sm text-gray-600">Total Quantity</div>
              </div>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default PurchaseOrdersTab;
