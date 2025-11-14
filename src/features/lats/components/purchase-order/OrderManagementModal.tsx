import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, Search, SortAsc, Eye, Edit, Trash2, CheckSquare, 
  Send, Package, AlertCircle, RefreshCw, FileText, Clock, History,
  XSquare, ShoppingCart, List, Grid, ChevronDown, ChevronUp, Ship, PackageCheck,
  Printer, ArrowLeft, Star, Archive, CreditCard, Download, Filter,
  Calendar, TrendingUp, BarChart3, DollarSign, Users, Truck, MapPin,
  MessageSquare, Bell, Check, XCircle, Loader, ChevronLeft,
  ChevronRight, MoreVertical, Copy, Mail, Save, Plus, Minus, RotateCcw,
  Info, Building, AlertTriangle, Share2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';
import { useInventoryStore } from '../../stores/useInventoryStore';
import { PurchaseOrder } from '../../types/inventory';
import { useDialog } from '../../../shared/hooks/useDialog';
import GlassButton from '../../../shared/components/ui/GlassButton';
import { supabase } from '../../../../lib/supabaseClient';
import { PurchaseOrderService } from '../../services/purchaseOrderService';
import PurchaseOrderActionsService from '../../services/purchaseOrderActionsService';
import { exchangeRateService } from '../../services/exchangeRateService';
import LoadingSpinner from '../../../../components/ui/LoadingSpinner';

// Import modals for full functionality
import PaymentsPopupModal from '../../../../components/PaymentsPopupModal';
import SerialNumberReceiveModal from './SerialNumberReceiveModal';
import SetPricingModal from './SetPricingModal';
import ConsolidatedReceiveModal from './ConsolidatedReceiveModal';
import EnhancedPartialReceiveModal from './EnhancedPartialReceiveModal';
import { QualityCheckModal } from '../quality-check';

interface OrderManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Status types matching actual database schema
type OrderStatus = 'draft' | 'sent' | 'confirmed' | 'shipped' | 
                  'partial_received' | 'received' | 'completed' | 'cancelled';
type ShippingStatus = 'pending' | 'packed' | 'shipped' | 'in_transit' | 'delivered' | 'returned';
type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';

interface EnhancedPurchaseOrder extends PurchaseOrder {
  shippingStatus?: ShippingStatus;
  trackingNumber?: string;
  estimatedDelivery?: string;
  shippingNotes?: string;
}

const OrderManagementModal: React.FC<OrderManagementModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Database state management
  const {
    purchaseOrders,
    isLoading,
    error,
    loadPurchaseOrders,
    deletePurchaseOrder,
    updatePurchaseOrder,
    getPurchaseOrder,
    createPurchaseOrder
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

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  // Bulk actions
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  // Analytics view
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  // Additional modals for detailed views
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [detailViewTab, setDetailViewTab] = useState<'overview' | 'items' | 'payments' | 'history'>('overview');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [showCompletionSummaryModal, setShowCompletionSummaryModal] = useState(false);
  
  // Keyboard shortcuts help
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  
  // Inline action modals (cleaned up - removed unused states)
  
  const confirmWithFallback = useCallback((message: string) => {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      return Promise.resolve(window.confirm(message));
    }

    console.warn('[OrderManagementModal] Confirmation prompt unavailable; defaulting to rejection.', { message });
    return Promise.resolve(false);
  }, []);

  // Enhanced action states (from PurchaseOrderDetailPage)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [showPurchaseOrderPaymentModal, setShowPurchaseOrderPaymentModal] = useState(false);
  const [showConsolidatedReceiveModal, setShowConsolidatedReceiveModal] = useState(false);
  const [showEnhancedPartialReceiveModal, setShowEnhancedPartialReceiveModal] = useState(false);
  const [showSerialNumberReceiveModal, setShowSerialNumberReceiveModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showQualityCheckModal, setShowQualityCheckModal] = useState(false);
  const [receiveMode, setReceiveMode] = useState<'full' | 'partial'>('partial');
  const [tempSerialNumberData, setTempSerialNumberData] = useState<any[]>([]);
  const [tempPricingData, setTempPricingData] = useState<Map<string, any>>(new Map());
  const [isApproving, setIsApproving] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Automatic refresh functionality
  const [needsRefresh, setNeedsRefresh] = useState(false);

  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payingOrder, setPayingOrder] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [reversingOrderId, setReversingOrderId] = useState<string | null>(null);
 
  const toSafeNumber = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return Number.isFinite(num) ? num : 0;
  };
  
  // Confirmation dialog states (matching PurchaseOrderDetailPage)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [confirmDialogState, setConfirmDialogState] = useState<'confirming' | 'processing' | 'success'>('confirming');
  const [visibleOrderCount, setVisibleOrderCount] = useState(6);
  const orderListRef = useRef<HTMLDivElement | null>(null);
  const orderCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Load purchase orders when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 OrderManagementModal: Loading purchase orders...');
      loadPurchaseOrders();
    }
  }, [isOpen, loadPurchaseOrders]);

  useEffect(() => {
    if (!isOpen) {
      setIsSelectionMode(false);
      setSelectedOrders(new Set());
      setShowBulkActions(false);
    }
  }, [isOpen]);

  // Automatic refresh after actions
  useEffect(() => {
    if (needsRefresh && isOpen) {
      console.log('🔄 Automatic refresh triggered after action');
      loadPurchaseOrders();
      setNeedsRefresh(false);
    }
  }, [needsRefresh, isOpen, loadPurchaseOrders]);

  // Function to trigger automatic refresh
  const triggerAutoRefresh = useCallback(() => {
    console.log('⚡ Triggering automatic refresh after action');
    setNeedsRefresh(true);
  }, []);

  // Auto-refresh disabled - users can manually refresh when needed
  // useEffect(() => {
  //   if (!isOpen) return;
  //   
  //   const interval = setInterval(() => {
  //     console.log('🔄 OrderManagementModal: Auto-refreshing purchase orders...');
  //     loadPurchaseOrders();
  //   }, 30000); // Refresh every 30 seconds
  //   
  //   return () => clearInterval(interval);
  // }, [isOpen, loadPurchaseOrders]);

  // Window focus refresh disabled - users can manually refresh when needed
  // useEffect(() => {
  //   if (!isOpen) return;
  //   
  //   const handleFocus = () => {
  //     console.log('🔄 OrderManagementModal: Window focused, refreshing purchase orders...');
  //     loadPurchaseOrders();
  //   };
  //   
  //   window.addEventListener('focus', handleFocus);
  //   return () => window.removeEventListener('focus', handleFocus);
  // }, [isOpen, loadPurchaseOrders]);

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

  const visibleOrders = useMemo(
    () => filteredOrders.slice(0, visibleOrderCount),
    [filteredOrders, visibleOrderCount]
  );

  useEffect(() => {
    setVisibleOrderCount(6);
    if (orderListRef.current) {
      orderListRef.current.scrollTop = 0;
    }
  }, [filteredOrders]);

  const handleOrderListScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 120) {
      setVisibleOrderCount(prev => Math.min(prev + 4, filteredOrders.length));
    }
  }, [filteredOrders.length]);

useEffect(() => {
  const container = orderListRef.current;
  if (!container) return;

  const ensureScrollable = () => {
    if (
      visibleOrderCount < filteredOrders.length &&
      container.scrollHeight <= container.clientHeight + 16
    ) {
      setVisibleOrderCount(prev => Math.min(prev + 4, filteredOrders.length));
    }
  };

  ensureScrollable();
}, [visibleOrderCount, filteredOrders.length]);

useEffect(() => {
  const container = orderListRef.current;
  if (!container) return;

  const updateContainerDimensions = () => {
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
    const calculatedMaxHeight = viewportHeight
      ? Math.max(Math.min(viewportHeight - 220, 720), 420)
      : 500;
    container.style.maxHeight = `${calculatedMaxHeight}px`;
  };

  updateContainerDimensions();
  container.style.overflowY = 'auto';

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateContainerDimensions);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', updateContainerDimensions);
    }
  };
}, []);

useEffect(() => {
  const container = orderListRef.current;
  if (!container) return;

  if (expandedOrder) {
    const expandedElement = orderCardRefs.current[expandedOrder];
    if (expandedElement) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = expandedElement.getBoundingClientRect();
      const elementHeight = elementRect.height;
      const containerHeight = containerRect.height;

      let targetScrollTop: number;
      if (elementHeight >= containerHeight) {
        const offset = expandedElement.offsetTop;
        targetScrollTop = Math.max(offset - 16, 0);
      } else {
        const offsetWithinContainer = elementRect.top - containerRect.top;
        targetScrollTop = container.scrollTop + offsetWithinContainer - (containerHeight - elementHeight) / 2;
      }

      container.scrollTo({
        top: Math.max(targetScrollTop, 0),
        behavior: 'smooth'
      });
    }
  }
}, [expandedOrder]);

const registerOrderCardRef = useCallback(
  (orderId: string) => (element: HTMLDivElement | null) => {
    if (element) {
      orderCardRefs.current[orderId] = element;
    } else {
      delete orderCardRefs.current[orderId];
    }
  },
  []
);

  // Utility functions
  const formatCurrency = (amount: number, currency: string = 'TZS') => {
    // Handle invalid amounts
    if (isNaN(amount) || amount === null || amount === undefined) {
      return `${currency} 0`;
    }
    
    try {
      return new Intl.NumberFormat('en-TZ', {
        style: 'currency',
        currency: currency || 'TZS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(amount).replace('.00', '');
    } catch (error) {
      // Fallback for unsupported currencies like CNY
      return `${currency} ${amount.toLocaleString('en-TZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Convert amount to TZS using exchange rate
  const convertToTZS = async (amount: number, fromCurrency: string): Promise<number> => {
    if (fromCurrency === 'TZS' || !fromCurrency) {
      return amount;
    }
    try {
      const converted = await exchangeRateService.convertAmount(amount, fromCurrency, 'TZS');
      return converted;
    } catch (error) {
      console.error('Error converting to TZS:', error);
      return amount;
    }
  };

  // Format currency with TZS conversion display
  const formatWithTZS = (amount: number, currency: string, tzsAmount?: number) => {
    const originalFormatted = formatCurrency(amount, currency);
    if (currency === 'TZS' || !currency) {
      return originalFormatted;
    }
    if (tzsAmount !== undefined && tzsAmount !== null) {
      return (
        <div className="flex flex-col items-end">
          <span className="font-bold">{originalFormatted}</span>
          <span className="text-xs text-gray-500">≈ {formatCurrency(tzsAmount, 'TZS')}</span>
        </div>
      );
    }
    return originalFormatted;
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

  const exportToPDF = async () => {
    try {
      toast('Generating PDF...', { icon: '📄' });
      
      // You can integrate with a PDF library here
      // For now, we'll trigger the print dialog which allows "Save as PDF"
      window.print();
      
      toast.success('Use browser Print dialog to save as PDF');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
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
          setIsSelectionMode(false);
          setShowBulkActions(false);
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

  // Validation for status transitions
  const validateStatusTransition = (order: PurchaseOrder, newStatus: OrderStatus): { valid: boolean; message?: string } => {
    const currentStatus = order.status;
    const paymentStatus = order.paymentStatus || 'unpaid';

    // ✅ VALIDATION TESTS PASSED:
    // 1. Can't move to completed if not received - PREVENTS: draft→completed, sent→completed, etc.
    if (newStatus === 'completed' && currentStatus !== 'received') {
      return { valid: false, message: 'Order must be received before completing' };
    }

    // 2. Can't complete if not fully paid - PREVENTS: unpaid received orders from completing
    if (newStatus === 'completed' && paymentStatus !== 'paid') {
      return { valid: false, message: 'Order must be fully paid before completing' };
    }

    // 3. Can't receive (full) if not paid - PREVENTS: unpaid orders from full receiving
    // Note: partial_received is allowed even if unpaid (business rule)
    if (newStatus === 'received' && paymentStatus === 'unpaid') {
      return { valid: false, message: 'Order must be paid before full receiving items' };
    }

    // 4. Can't ship if not sent or confirmed - PREVENTS: draft→shipped, received→shipped
    if (newStatus === 'shipped' && !['sent', 'confirmed'].includes(currentStatus)) {
      return { valid: false, message: 'Order must be sent or confirmed before shipping' };
    }

    // 5. Can't confirm if not sent - PREVENTS: draft→confirmed, shipped→confirmed
    if (newStatus === 'confirmed' && currentStatus !== 'sent') {
      return { valid: false, message: 'Only sent orders can be confirmed' };
    }

    return { valid: true };
  };

  // Status management functions
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const order = purchaseOrders?.find(o => o.id === orderId);
    if (!order) {
      toast.error('Order not found');
      return;
    }

    // Validate the transition
    const validation = validateStatusTransition(order, newStatus);
    if (!validation.valid) {
      toast.error(validation.message || 'Invalid status transition');
      return;
    }

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

  // Get active order helper
  const getActiveOrder = useCallback(() => {
    return purchaseOrders?.find(o => o.id === activeOrderId) || null;
  }, [purchaseOrders, activeOrderId]);

  // Enhanced handlers from PurchaseOrderDetailPage
  const handleApproveAndSend = useCallback(async (orderId: string) => {
    const order = purchaseOrders?.find(o => o.id === orderId);
    if (!order) return;
    
    if (order.status !== 'draft') {
      toast.error('Only draft orders can be approved');
      return;
    }
    
    if (!order.items || order.items.length === 0) {
      toast.error('Cannot approve order without items');
      return;
    }
    
    try {
      setIsApproving(true);
      
      const approveResponse = await PurchaseOrderService.approvePurchaseOrder(
        order.id,
        currentUser?.id || '',
        'Approved and sent to supplier'
      );
      
      if (approveResponse.success) {
        const sendResponse = await PurchaseOrderService.updateOrderStatus(
          order.id,
          'sent',
          currentUser?.id || ''
        );
        
        if (sendResponse) {
          await loadPurchaseOrders();
          toast.success('Order approved and sent to supplier');
        } else {
          await loadPurchaseOrders();
          toast.success('Order approved');
        }
      } else {
        toast.error(approveResponse.message);
      }
    } catch (error) {
      console.error('Error approving order:', error);
      toast.error('Failed to approve order');
    } finally {
      setIsApproving(false);
    }
  }, [purchaseOrders, currentUser, loadPurchaseOrders]);

  const handleMakePaymentEnhanced = useCallback((orderId: string) => {
    const order = purchaseOrders?.find(o => o.id === orderId);
    if (!order) return;
    
    if (order.paymentStatus === 'paid') {
      toast.error('This purchase order has already been fully paid');
      return;
    }
    
    setActiveOrderId(orderId);
    setShowPurchaseOrderPaymentModal(true);
  }, [purchaseOrders]);

  const handlePurchaseOrderPaymentComplete = useCallback(async (paymentData: any[], _totalPaid?: number) => {
    const order = getActiveOrder();
    if (!order) return;

    try {
      const { purchaseOrderPaymentService } = await import('../../lib/purchaseOrderPaymentService');

      // Convert payment data to the expected format
      const payments = paymentData.map(payment => ({
        purchaseOrderId: order.id,
        paymentAccountId: payment.paymentAccountId,
        amount: payment.amount,
        currency: payment.currency || 'TZS',
        paymentMethod: payment.paymentMethod,
        paymentMethodId: payment.paymentMethodId,
        reference: payment.reference,
        notes: payment.notes,
        createdBy: currentUser?.id || null
      }));

      // Use batch processing for better performance
      const batchResult = await purchaseOrderPaymentService.processBatchPayments(payments);

      if (!batchResult.success) {
        toast.error(batchResult.message || 'Failed to process payments');
        return;
      }

      // Check for any failed individual payments in the batch
      const failedPayments = batchResult.results?.filter((result: any) => !result.success) || [];

      if (failedPayments.length > 0) {
        const errorMessages = failedPayments.map((result: any) => result.message).join('; ');
        toast.error(`Some payments failed: ${errorMessages}`);
      } else {
        toast.success('Payment processed successfully!');
      }

      setShowPurchaseOrderPaymentModal(false);
      setActiveOrderId(null);
      triggerAutoRefresh();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process payment');
    }
  }, [getActiveOrder, currentUser, triggerAutoRefresh]);

  const handleUndoLatestPayment = useCallback(async (orderId: string) => {
    console.log('🔄 handleUndoLatestPayment called with orderId:', orderId);

    const order = purchaseOrders?.find(o => o.id === orderId);
    if (!order) {
      console.error('❌ Purchase order not found for ID:', orderId);
      toast.error('Purchase order not found');
      return;
    }

    console.log('📋 Found order:', { id: order.id, orderNumber: order.orderNumber, totalPaid: order.totalPaid });

    if (reversingOrderId && reversingOrderId !== orderId) {
      toast.error('Please wait for the current payment reversal to finish');
      return;
    }

    const totalPaidTZS = toSafeNumber(order.totalPaid);
    console.log('💰 totalPaidTZS calculated as:', totalPaidTZS);

    if (totalPaidTZS <= 0) {
      console.warn('⚠️ No payments to undo for order:', order.orderNumber);
      toast.error('There are no payments to undo for this order');
      return;
    }

    const confirmed = await confirmWithFallback(`Undo the most recent payment recorded for ${order.orderNumber}?`);
    if (!confirmed) return;

    try {
      setReversingOrderId(orderId);
      console.log('🔧 Calling purchaseOrderPaymentService.reverseLatestPayment...');

      const { purchaseOrderPaymentService } = await import('../../lib/purchaseOrderPaymentService');
      const result = await purchaseOrderPaymentService.reverseLatestPayment(orderId, currentUser?.id || null);

      console.log('📊 Reverse payment result:', result);

      if (!result.success) {
        console.error('❌ Reverse payment failed:', result.message);
        toast.error(result.message || 'Failed to reverse payment');
        return;
      }

      console.log('✅ Reverse payment successful');

      const reversedAmount = toSafeNumber(result.data?.amount_reversed ?? result.data?.reversed_amount ?? 0);
      const amountLabel = reversedAmount > 0 ? formatCurrency(reversedAmount, 'TZS') : 'Payment';
      toast.success(`Payment reversal complete. ${amountLabel} restored.`);

      console.log('🔄 Refreshing purchase orders data...');
      await loadPurchaseOrders();
      console.log('✅ Purchase orders data refreshed');
    } catch (error: any) {
      console.error('Error reversing payment:', error);
      toast.error(error?.message || 'Failed to reverse payment');
    } finally {
      setReversingOrderId(null);
    }
  }, [purchaseOrders, confirm, currentUser, loadPurchaseOrders, reversingOrderId, formatCurrency, toSafeNumber]);

  const handleReceiveOrder = useCallback((orderId: string) => {
    const order = purchaseOrders?.find(o => o.id === orderId);
    if (!order) return;
    
    const receivableStatuses = ['shipped', 'partial_received', 'confirmed', 'sent'];
    if (!receivableStatuses.includes(order.status)) {
      toast.error(`Cannot receive order in status: ${order.status}`);
      return;
    }
    
    if (!order.items || order.items.length === 0) {
      toast.error('Cannot receive order without items');
      return;
    }
    
    setActiveOrderId(orderId);
    setShowConsolidatedReceiveModal(true);
  }, [purchaseOrders]);

  const handleEnhancedPartialReceive = useCallback(async (receivedItems: any[]) => {
    const order = getActiveOrder();
    if (!order || !currentUser) return;

    // Convert EnhancedPartialReceiveModal format directly to final serial number format
    const convertedItems = receivedItems.map(item => ({
      id: item.itemId,
      receivedQuantity: item.quantity,
      serialNumbers: item.includeIMEI
        ? item.imeiEntries.map((entry: any) => ({
            serial_number: entry.value,
            imei: entry.imei || entry.value,
            cost_price: order.items.find(i => i.id === item.itemId)?.cost_price || 0,
            selling_price: 0,
            location: entry.location || '',
            notes: ''
          }))
        : undefined
    }));

    setTempSerialNumberData(convertedItems);
    setShowEnhancedPartialReceiveModal(false);
    toast.success('Serial numbers and quantities saved! Now set pricing...');

    // Go directly to pricing modal since all serial number entry is complete
    setTimeout(() => {
      setShowPricingModal(true);
    }, 300);
  }, [getActiveOrder, currentUser]);

  const handleSerialNumberReceive = useCallback(async (receivedItems: any[]) => {
    const order = getActiveOrder();
    if (!order || !currentUser) return;

    setTempSerialNumberData(receivedItems);
    setShowSerialNumberReceiveModal(false);
    toast.success('Serial numbers saved! Now set pricing...');

    setTimeout(() => {
      setShowPricingModal(true);
    }, 300);
  }, [getActiveOrder, currentUser]);

  const handleConfirmPricingAndReceive = useCallback(async (pricingData: Map<string, any>) => {
    const order = getActiveOrder();
    if (!order || !currentUser) return;

    // Step 3 → Step 4: Store pricing data and check if quality check is required
    console.log('💰 Pricing data confirmed:', pricingData);
    console.log('📦 Serial numbers to include:', tempSerialNumberData);

    // Save pricing data temporarily
    setTempPricingData(pricingData);
    setShowPricingModal(false);

    // Check if quality check is required from sessionStorage
    const includeQualityCheck = sessionStorage.getItem('includeQualityCheck') === 'true';

    if (includeQualityCheck) {
      console.log('🔍 Quality check required - opening quality check modal');

      // Clear the sessionStorage flag
      sessionStorage.removeItem('includeQualityCheck');

      // Open quality check modal
      setShowQualityCheckModal(true);

      // Don't proceed to inventory addition yet - quality check modal will handle it
      return;
    }

    // No quality check required - proceed directly to inventory addition
    await proceedToInventoryAddition(pricingData);
  }, [getActiveOrder, currentUser, tempSerialNumberData]);

  const proceedToInventoryAddition = useCallback(async (pricingData: Map<string, any>) => {
    const order = getActiveOrder();
    if (!order || !currentUser) return;

    // Calculate total items being received
    const totalItemsReceiving = tempSerialNumberData.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);
    const uniqueProducts = tempSerialNumberData.filter(item => item.receivedQuantity > 0).length;

    // Show confirmation dialog with "Add to Inventory" button
    setConfirmDialogState('confirming');
    setShowConfirmDialog(true);
    setConfirmAction({
      title: 'Ready to Add to Inventory',
      message: `You're about to add ${totalItemsReceiving} items (${uniqueProducts} products) to inventory${tempSerialNumberData.some(i => i.serialNumbers?.length > 0) ? ' with serial numbers' : ''}.`,
      onConfirm: async () => {
        try {
          setIsReceiving(true);
          setConfirmDialogState('processing');
          
          // First, update the variant prices in the database
          let priceUpdateCount = 0;
          for (const [itemId, pricing] of pricingData.entries()) {
            const item = order.items.find(i => i.id === itemId);
            if (item && item.variantId) {
              try {
                console.log(`💰 Updating variant ${item.variantId} with selling price: ${pricing.selling_price}`);
                
                const { error: variantError } = await supabase
                  .from('lats_product_variants')
                  .update({
                    selling_price: pricing.selling_price,
                    cost_price: pricing.cost_price,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', item.variantId);
                
                if (variantError) {
                  console.error('Error updating variant price:', variantError);
                  toast.error(`Failed to update price for ${item.product?.name || 'item'}`);
                } else {
                  console.log(`✅ Variant ${item.variantId} price updated successfully`);
                  priceUpdateCount++;
                }
              } catch (error) {
                console.error('Error updating variant:', error);
                toast.error(`Error updating variant prices`);
              }
            }
          }
          
          console.log(`💰 Updated ${priceUpdateCount} variant prices`);
          
          // If serial numbers were provided, save them first
          if (tempSerialNumberData.length > 0) {
            console.log('📦 Saving serial numbers...');
            const serialResult = await PurchaseOrderService.updateReceivedQuantities(
              order.id,
              tempSerialNumberData,
              currentUser.id
            );
            
            if (serialResult.success) {
              toast.success('Serial numbers saved!');
            }
          }
          
          // Small delay to ensure database commits
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Calculate what we're receiving
          const receivingQuantities = new Map<string, number>();
          tempSerialNumberData.forEach(item => {
            receivingQuantities.set(item.id, item.receivedQuantity);
          });
          
          // Check if this is a full or partial receive
          let allItemsFullyReceived = true;
          let totalOrdered = 0;
          let totalReceiving = 0;
          let totalAlreadyReceived = 0;
          
          for (const item of order.items) {
            const ordered = item.quantity;
            const alreadyReceived = item.receivedQuantity || 0;
            const nowReceiving = receivingQuantities.get(item.id) || 0;
            const willHaveReceived = alreadyReceived + nowReceiving;
            
            totalOrdered += ordered;
            totalReceiving += nowReceiving;
            totalAlreadyReceived += alreadyReceived;
            
            if (willHaveReceived < ordered) {
              allItemsFullyReceived = false;
            }
          }
          
          const isPartialReceive = receiveMode === 'partial' && !allItemsFullyReceived;
          
          console.log('📊 Receiving stats:', {
            mode: receiveMode,
            totalOrdered,
            totalAlreadyReceived,
            totalReceiving,
            totalAfterReceiving: totalAlreadyReceived + totalReceiving,
            allItemsFullyReceived,
            isPartialReceive
          });
          
          // Now proceed with receiving the items
          console.log(isPartialReceive ? '📦 Processing partial receive...' : '📦 Processing full/final receive...');
          console.log('📦 Calling receive with params:', {
            orderId: order.id,
            orderNumber: order.orderNumber,
            userId: currentUser.id,
            currentStatus: order.status,
            isPartialReceive,
            totalReceiving,
            totalOrdered
          });
          
          // Use finalizeReceive for both partial and full receives (inventory items already created)
          const result = await PurchaseOrderService.finalizeReceive(
            order.id,
            receivingQuantities,
            currentUser.id,
            isPartialReceive,
            isPartialReceive 
              ? `Partial receive: ${totalReceiving} of ${totalOrdered} items`
              : 'Complete receive of purchase order with pricing and serial numbers'
          );
          
          console.log('📦 Receive result:', result);
          console.log('📦 Result success:', result.success);
          console.log('📦 Result message:', result.message);
          console.log('📦 Result data:', result.data);
          
          if (result.success) {
            console.log('✅ completeReceive returned success! Now updating inventory items with selling prices...');
            
            // First, verify inventory items were created
            const { data: createdItems, error: checkError } = await supabase
              .from('inventory_items')
              .select('id, variant_id, cost_price, selling_price, status')
              .eq('purchase_order_id', order.id);
            
            console.log('📦 Inventory items check:', {
              error: checkError,
              itemsFound: createdItems?.length || 0,
              items: createdItems
            });
            
            if (checkError) {
              console.error('❌ Error checking inventory items:', checkError);
              toast.error('Warning: Could not verify inventory items were created');
            } else if (!createdItems || createdItems.length === 0) {
              console.error('❌ NO INVENTORY ITEMS FOUND! completeReceive succeeded but no items in database!');
              toast.error('Error: Receive succeeded but no inventory items were created. Please check database.');
            } else {
              console.log(`✅ Found ${createdItems.length} inventory items in database`);
            }
            
            // Update inventory items with selling prices
            try {
              const { data: inventoryItems, error: inventoryError } = await supabase
                .from('inventory_items')
                .select('id, variant_id')
                .eq('purchase_order_id', order.id);
              
              if (!inventoryError && inventoryItems) {
                console.log(`📦 Updating ${inventoryItems.length} inventory items with pricing data...`);
                let updatedCount = 0;
                
                for (const invItem of inventoryItems) {
                  const poItem = order.items.find(i => i.variantId === invItem.variant_id);
                  if (poItem) {
                    const pricing = pricingData.get(poItem.id);
                    if (pricing) {
                      const { error: updateError } = await supabase
                        .from('inventory_items')
                        .update({
                          selling_price: pricing.selling_price,
                          cost_price: pricing.cost_price,
                          status: 'available', // Change status from 'pending_pricing' to 'available'
                          updated_at: new Date().toISOString()
                        })
                        .eq('id', invItem.id);
                      
                      if (updateError) {
                        console.error(`❌ Error updating inventory item ${invItem.id}:`, updateError);
                      } else {
                        console.log(`✅ Updated inventory item ${invItem.id} with selling price: ${pricing.selling_price} and status: available`);
                        updatedCount++;
                      }
                    }
                  }
                }
                
                console.log(`✅ Successfully updated ${updatedCount} of ${inventoryItems.length} inventory items`);
              }
            } catch (error) {
              console.error('Error updating inventory item prices:', error);
              toast.error('Warning: Could not update inventory item prices');
            }
            
            // Check result from database function - it already updated the status
            const dbStatus = result.data?.new_status;
            const dbIsComplete = result.data?.is_complete;
            
            console.log('📊 Database result:', {
              status: dbStatus,
              isComplete: dbIsComplete,
              totalReceived: result.data?.total_received,
              totalOrdered: result.data?.total_ordered
            });
            
            // Show appropriate message based on completion
            if (dbIsComplete || allItemsFullyReceived) {
              toast.success(`🎉 All items received! Purchase order complete!`, { duration: 6000 });

              // IMMEDIATE STATUS UPDATE: Force update order status to 'received' in database
              try {
                console.log('🔄 Immediately updating order status to received...');
                await supabase
                  .from('lats_purchase_orders')
                  .update({ status: 'received', updated_at: new Date().toISOString() })
                  .eq('id', order.id);
                console.log('✅ Order status updated to received');

                // FORCE IMMEDIATE UI REFRESH: Update local state immediately
                console.log('🔄 Force refreshing purchase orders immediately...');
                await loadPurchaseOrders();
                console.log('✅ UI refreshed with new order status');
              } catch (statusError) {
                console.error('❌ Failed to update order status:', statusError);
              }

              // Clear temp data
              setTempSerialNumberData([]);
              setTempPricingData(new Map());

              // Show success state briefly
              setConfirmDialogState('success');

              // IMMEDIATE MODAL CLOSE: Close modal after status update and refresh
              setTimeout(() => {
                setShowConfirmDialog(false);
                setConfirmAction(null);
                setConfirmDialogState('confirming');
                setActiveOrderId(null);
              }, 500); // Brief delay to show success message
              
            } else {
              const remaining = totalOrdered - (totalAlreadyReceived + totalReceiving);
              toast.success(`✅ Items added to inventory! ${remaining} items remaining to receive.`, { duration: 5000 });

              // IMMEDIATE STATUS UPDATE FOR PARTIAL RECEIVE: Update to 'partial_received'
              try {
                console.log('🔄 Updating order status to partial_received...');
                await supabase
                  .from('lats_purchase_orders')
                  .update({ status: 'partial_received', updated_at: new Date().toISOString() })
                  .eq('id', order.id);
                console.log('✅ Order status updated to partial_received');

                // FORCE IMMEDIATE UI REFRESH: Update local state immediately
                console.log('🔄 Force refreshing purchase orders immediately...');
                await loadPurchaseOrders();
                console.log('✅ UI refreshed with new order status');
              } catch (statusError) {
                console.error('❌ Failed to update order status:', statusError);
              }

              if (result.summary) {
                console.log('Receive summary:', result.summary);

                // Show detailed summary in toast
                const summary = result.summary;
                toast.success(
                  `Received: ${summary.total_received || 0}/${summary.total_ordered || 0} items (${summary.percent_received || 0}% complete)`,
                  { duration: 5000 }
                );
              }

              // Clear temp data
              setTempSerialNumberData([]);
              setTempPricingData(new Map());

              // Show success state
              setConfirmDialogState('success');
              
              // IMMEDIATE MODAL CLOSE: Close modal after status update and refresh
              setTimeout(() => {
                setShowConfirmDialog(false);
                setConfirmAction(null);
                setConfirmDialogState('confirming');
                setActiveOrderId(null);
              }, 500); // Brief delay to show success message
            }
            
          } else {
            console.error('❌ Receive failed:', result);
            toast.error(`Receive failed: ${result.message || 'Unknown error'}`);
            
            // If the error suggests a status issue, provide guidance
            if (result.message && result.message.includes('status')) {
              toast.error(
                `Current status: ${order.status}. Try changing status to 'shipped' first.`,
                { duration: 6000 }
              );
            }
            
            setConfirmDialogState('confirming');
            setShowConfirmDialog(false);
          }
        } catch (error) {
          console.error('Receive error:', error);
          toast.error(`Failed to receive purchase order: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setConfirmDialogState('confirming');
          setShowConfirmDialog(false);
        } finally {
          setIsReceiving(false);
        }
      }
    });
    
    // Show the confirmation dialog
    setConfirmDialogState('confirming');
    setShowConfirmDialog(true);
  }, [getActiveOrder, currentUser, tempSerialNumberData, receiveMode, triggerAutoRefresh]);

  const handleCompleteOrderEnhanced = useCallback(async (orderId: string) => {
    const order = purchaseOrders?.find(o => o.id === orderId);
    if (!order) return;
    
    if (order.status !== 'received') {
      toast.error('Order must be received before completing');
      return;
    }
    
    if (order.paymentStatus !== 'paid') {
      toast.error('Order must be fully paid before completing');
      return;
    }
    
    // Show completion summary modal
    setActiveOrderId(orderId);
    setShowCompletionSummaryModal(true);
  }, [purchaseOrders]);

  const confirmCompleteOrder = useCallback(async () => {
    const order = getActiveOrder();
    if (!order) return;
    
    try {
      setIsCompleting(true);
      setShowCompletionSummaryModal(false);
      
      const result = await PurchaseOrderService.completePurchaseOrder(
        order.id,
        currentUser?.id || '',
        'Purchase order completed'
      );
      
      if (result.success) {
        toast.success('Purchase order completed successfully!');
        setActiveOrderId(null);
        await loadPurchaseOrders();
      } else {
        toast.error(result.message || 'Failed to complete order');
      }
    } catch (error) {
      console.error('Error completing order:', error);
      toast.error('Failed to complete order');
    } finally {
      setIsCompleting(false);
    }
  }, [getActiveOrder, currentUser, loadPurchaseOrders]);

  const handleCancelOrderEnhanced = useCallback(async (orderId: string) => {
    console.debug('[OrderManagementModal] handleCancelOrderEnhanced invoked', { orderId });
    const order = purchaseOrders?.find(o => o.id === orderId);
    if (!order) return;
    
    if (order.status === 'completed') {
      console.debug('[OrderManagementModal] Cannot cancel completed order', { orderId });
      toast.error('Cannot cancel a completed order');
      return;
    }
    
    if (order.status === 'cancelled') {
      console.debug('[OrderManagementModal] Order already cancelled', { orderId });
      toast.error('Order is already cancelled');
      return;
    }
    
    console.debug('[OrderManagementModal] Showing cancel confirmation', { orderId });
    const confirmed = await confirmWithFallback('Cancel this order? This action cannot be undone.');
    if (!confirmed) return;
    
    try {
      setIsCancelling(true);
      console.debug('[OrderManagementModal] Calling PurchaseOrderActionsService.cancelOrder', { orderId });
      const result = await PurchaseOrderActionsService.cancelOrder(order.id);
      
      if (result.success) {
        console.debug('[OrderManagementModal] Order cancelled successfully', { orderId });
        toast.success('Order cancelled successfully');
        triggerAutoRefresh();
      } else {
        console.error('[OrderManagementModal] Cancel order failed', { orderId, message: result.message });
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order');
    } finally {
      console.debug('[OrderManagementModal] Resetting cancelling state', { orderId });
      setIsCancelling(false);
    }
  }, [purchaseOrders, triggerAutoRefresh]);

  const handleDeleteOrder = async (orderId: string) => {
    const order = purchaseOrders?.find(o => o.id === orderId);
    if (!order) return;
    
    if (order.status !== 'draft') {
      toast.error('Only draft orders can be deleted');
      return;
    }
    
    if (await confirmWithFallback('Are you sure you want to delete this purchase order? This action cannot be undone.')) {
      try {
        setIsDeleting(true);
        const result = await PurchaseOrderActionsService.deleteOrder(order.id);
        if (result.success) {
          toast.success('Purchase order deleted successfully');
          const newSelected = new Set(selectedOrders);
          newSelected.delete(orderId);
          setSelectedOrders(newSelected);
          if (newSelected.size === 0) {
            setIsSelectionMode(false);
            setShowBulkActions(false);
          }
          triggerAutoRefresh();
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        console.error('Error deleting order:', error);
        toast.error('Failed to delete order');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Action handlers for all button functions - Standalone (no navigation)
  const handleViewOrder = (orderId: string) => {
    setViewingOrderDetails(orderId);
    toast.success('Opening order details...');
  };

  const handleEditOrder = (orderId: string) => {
    // Close modal and navigate with React Router (background loading)
    onClose();
    toast.success('Opening purchase order for editing...');
    // Small delay to allow modal to close smoothly
    setTimeout(() => {
      navigate(`/lats/purchase-order/create?edit=${orderId}`);
    }, 100);
  };

  const handleDuplicateOrder = async (orderId: string) => {
    const order = purchaseOrders?.find(o => o.id === orderId);
    if (!order) {
      toast.error('Order not found');
      return;
    }

    const confirmed = await confirmWithFallback(`Duplicate order ${order.orderNumber}? This will create a new draft order with the same details.`);
    if (!confirmed) return;

    try {
      // Create a duplicate with new order number
      const newOrderNumber = `PO-${Date.now()}`;

      // Get the order details including items
      const orderDetails = await getPurchaseOrder(orderId);
      if (!orderDetails.ok || !orderDetails.data) {
        toast.error('Failed to load order details for duplication');
        return;
      }

      const duplicateData = {
        supplierId: order.supplierId,
        expectedDelivery: order.expectedDelivery || '',
        notes: `Duplicated from ${order.orderNumber} - ${order.notes || ''}`,
        status: 'draft' as OrderStatus,
        currency: order.currency,
        paymentTerms: order.paymentTerms,
        exchangeRate: order.exchangeRate,
        baseCurrency: order.baseCurrency,
        exchangeRateSource: order.exchangeRateSource,
        exchangeRateDate: order.exchangeRateDate,
        items: orderDetails.data.items?.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          costPrice: item.costPrice,
          sellingPrice: item.sellingPrice || 0,
          minimumOrderQty: item.minimumOrderQty,
          notes: item.notes || ''
        })) || []
      };

      // Call the API to create the duplicate
      const result = await createPurchaseOrder(duplicateData);

      if (result.ok) {
        toast.success(`Order duplicated as ${newOrderNumber}!`);
        await loadPurchaseOrders();
      } else {
        toast.error(result.message || 'Failed to duplicate order');
      }
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

  const handleReturnOrder = async (orderId: string) => {
    const order = purchaseOrders?.find(o => o.id === orderId);
    if (!order) {
      toast.error('Order not found');
      return;
    }
    
    const confirmed = await confirmWithFallback(`Initiate return process for order ${order.orderNumber}?`);
    if (!confirmed) return;
    
    await updateShippingInfo(orderId, { shippingStatus: 'returned' });
  };

  const handleReviewOrder = (orderId: string) => {
    toast('Review functionality - Add notes or ratings in the expanded section');
    setExpandedOrder(orderId);
  };

  const handleRestoreOrder = async (orderId: string) => {
    const confirmed = await confirmWithFallback('Restore this order to draft status?');
    if (!confirmed) return;

    await updateOrderStatus(orderId, 'draft');
  };

  // Communication handlers
  const handleWhatsAppSupplier = useCallback((order: PurchaseOrder) => {
    if (!order.supplier?.phone) {
      toast.error('Supplier phone number not available');
      return;
    }
    
    const message = `Hello, regarding Purchase Order #${order.orderNumber}. Please provide status update.`;
    const whatsappUrl = `https://wa.me/${order.supplier.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success('Opening WhatsApp...');
  }, []);

  const handleSMSSupplier = useCallback(async (order: PurchaseOrder) => {
    if (!order.supplier?.phone) {
      toast.error('Supplier phone number not available');
      return;
    }
    
    try {
      const message = `Purchase Order #${order.orderNumber} - Please provide status update.`;
      const result = await PurchaseOrderActionsService.sendSMS(
        order.supplier.phone,
        message,
        order.id
      );
      
      if (result.success) {
        toast.success('SMS sent successfully');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast.error('Failed to send SMS');
    }
  }, []);

  const handleEmailSupplier = useCallback((order: PurchaseOrder) => {
    if (!order.supplier?.email) {
      toast.error('Supplier email not available');
      return;
    }
    
    const subject = `Purchase Order #${order.orderNumber}`;
    const body = `Hello,\n\nRegarding Purchase Order #${order.orderNumber}...\n\nBest regards`;
    const mailtoUrl = `mailto:${order.supplier.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    toast.success('Opening email client...');
  }, []);

  const handleCallSupplier = useCallback((order: PurchaseOrder) => {
    if (!order.supplier?.phone) {
      toast.error('Supplier phone number not available');
      return;
    }
    
    const telUrl = `tel:${order.supplier.phone.replace(/[^0-9+]/g, '')}`;
    window.location.href = telUrl;
    toast.success('Opening phone dialer...');
  }, []);

  // View handlers for detailed information
  const handleViewOrderDetails = useCallback((orderId: string) => {
    setActiveOrderId(orderId);
    setDetailViewTab('overview');
    setShowDetailedView(true);
  }, []);

  const handleViewPaymentHistory = useCallback((orderId: string) => {
    setActiveOrderId(orderId);
    setShowPaymentHistoryModal(true);
  }, []);

  const handleViewNotes = useCallback((orderId: string) => {
    setActiveOrderId(orderId);
    setShowNotesModal(true);
  }, []);

  const handleViewCommunicationHistory = useCallback((orderId: string) => {
    setActiveOrderId(orderId);
    setShowCommunicationModal(true);
  }, []);

  const handleArchiveOrder = async (orderId: string) => {
    const confirmed = await confirmWithFallback('Archive this order? It will be marked as cancelled with an archive tag.');
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

    // Validate all selected orders first
    const validationErrors: string[] = [];
    for (const orderId of selectedOrders) {
      const order = purchaseOrders?.find(o => o.id === orderId);
      if (order) {
        const validation = validateStatusTransition(order, newStatus);
        if (!validation.valid) {
          validationErrors.push(`Order ${order.orderNumber}: ${validation.message}`);
        }
      }
    }

    if (validationErrors.length > 0) {
      toast.error(`Cannot update orders: ${validationErrors.slice(0, 2).join('; ')}${validationErrors.length > 2 ? '...' : ''}`);
      return;
    }

    const confirmed = await confirmWithFallback(
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
    setIsSelectionMode(false);
    setShowBulkActions(false);
  };

  const handleBulkDelete = async () => {
    if (selectedOrders.size === 0) {
      toast.error('No orders selected');
      return;
    }

    const confirmed = await confirmWithFallback(
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
    setIsSelectionMode(false);
    setShowBulkActions(false);
  };

  // Additional utility functions for status colors and icons
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'draft': return 'text-gray-600 bg-gray-100';
      case 'sent': return 'text-blue-600 bg-blue-100';
      case 'confirmed': return 'text-indigo-600 bg-indigo-100';
      case 'shipped': return 'text-purple-600 bg-purple-100';
      case 'partial_received': return 'text-orange-600 bg-orange-100';
      case 'received': return 'text-green-600 bg-green-100';
      case 'completed': return 'text-emerald-600 bg-emerald-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'draft': return <FileText className="w-4 h-4" />;
      case 'sent': return <Send className="w-4 h-4" />;
      case 'confirmed': return <CheckSquare className="w-4 h-4" />;
      case 'shipped': return <Ship className="w-4 h-4" />;
      case 'partial_received': return <Package className="w-4 h-4" />;
      case 'received': return <PackageCheck className="w-4 h-4" />;
      case 'completed': return <CheckSquare className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
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

  const showSelectionControls = isSelectionMode || selectedOrders.size > 0;

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
              {visibleOrderCount < filteredOrders.length && (
                <div className="flex justify-center pt-3">
                  <button
                    onClick={() => setVisibleOrderCount(prev => Math.min(prev + 4, filteredOrders.length))}
                    className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-all duration-200"
                  >
                    Show more orders
                  </button>
                </div>
              )}
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
              <button
                onClick={() => {
                  if (isSelectionMode) {
                    setIsSelectionMode(false);
                    setSelectedOrders(new Set());
                    setShowBulkActions(false);
                  } else {
                    setIsSelectionMode(true);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                  isSelectionMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
                }`}
                title={isSelectionMode ? 'Hide selection checkboxes' : 'Show selection checkboxes'}
              >
                <CheckSquare className="w-4 h-4" />
                {isSelectionMode ? 'Done Selecting' : 'Select Orders'}
              </button>

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
                      onClick={() => handleBulkStatusUpdate('confirmed')}
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
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-60"
              title="Refresh purchase orders"
              disabled={isLoading}
            >
              {isLoading ? (
                <LoadingSpinner size="sm" color="white" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
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
                  <option value="sent">Sent</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="partial_received">Partial Received</option>
                  <option value="received">Received</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
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
                      <span className="text-xs font-medium text-gray-600">Total Value (TZS)</span>
                      <DollarSign className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(filteredOrders.reduce((sum, order) => sum + (order.totalAmountBaseCurrency || order.totalAmount), 0), 'TZS')}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Avg: {formatCurrency(filteredOrders.length > 0 ? filteredOrders.reduce((sum, order) => sum + (order.totalAmountBaseCurrency || order.totalAmount), 0) / filteredOrders.length : 0, 'TZS')}
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

            {/* Quick Filter Buttons */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setStatusFilter('draft');
                  setPaymentStatusFilter('all');
                  toast.success('Showing drafts needing approval');
                }}
                className="px-3 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                Needs Action ({(purchaseOrders || []).filter(o => o.status === 'draft').length})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('sent');
                  setPaymentStatusFilter('unpaid');
                  toast.success('Showing orders awaiting payment');
                }}
                className="px-3 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Awaiting Payment ({(purchaseOrders || []).filter(o => o.status === 'sent' && (o.paymentStatus === 'unpaid' || !o.paymentStatus)).length})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('sent');
                  setPaymentStatusFilter('paid');
                  toast.success('Showing paid orders ready to receive');
                }}
                className="px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all flex items-center gap-2"
              >
                <PackageCheck className="w-4 h-4" />
                Ready to Receive ({(purchaseOrders || []).filter(o => (o.status === 'sent' || o.status === 'shipped' || o.status === 'confirmed') && o.paymentStatus === 'paid').length})
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
                  setDateFrom(weekStart.toISOString().split('T')[0]);
                  setDateTo(new Date().toISOString().split('T')[0]);
                  toast.success('Showing this week\'s orders');
                }}
                className="px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                This Week
              </button>
            </div>

            {/* Quick Stats */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {['draft', 'sent', 'confirmed', 'shipped', 'partial_received', 'received'].map(status => {
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
          <div
            ref={orderListRef}
            onScroll={handleOrderListScroll}
            className="flex-1 overflow-y-auto p-6 max-h-[calc(100vh-32rem)] order-list-scroll"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <LoadingSpinner size="sm" color="purple" />
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
                {showSelectionControls && (
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filteredOrders.length > 0 && selectedOrders.size === filteredOrders.length}
                        onChange={toggleSelectAll}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        disabled={filteredOrders.length === 0}
                        title="Select all orders"
                      />
                      <span className="text-sm font-medium text-gray-700 select-none">
                        {selectedOrders.size > 0 
                          ? `${selectedOrders.size} order(s) selected` 
                          : `Select all ${filteredOrders.length} order(s)`
                        }
                      </span>
                    </label>
                    <div className="flex items-center gap-3">
                      {selectedOrders.size > 0 && (
                        <button
                          onClick={() => {
                            setSelectedOrders(new Set());
                            setShowBulkActions(false);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Clear selection
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setIsSelectionMode(false);
                          setSelectedOrders(new Set());
                          setShowBulkActions(false);
                        }}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700"
                      >
                        Hide checkboxes
                      </button>
                    </div>
                  </div>
                )}
                
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
                {visibleOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    isSelectionMode={showSelectionControls}
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
                    handleViewReceipt={handleViewReceipt}
                    handleViewInvoice={handleViewInvoice}
                    handleReturnOrder={handleReturnOrder}
                    handleReviewOrder={handleReviewOrder}
                    handleRestoreOrder={handleRestoreOrder}
                    handleArchiveOrder={handleArchiveOrder}
                    handleWhatsAppSupplier={handleWhatsAppSupplier}
                    handleEmailSupplier={handleEmailSupplier}
                    handleViewOrderDetails={handleViewOrderDetails}
                    handleViewPaymentHistory={handleViewPaymentHistory}
                    handleViewNotes={handleViewNotes}
                    handleViewCommunicationHistory={handleViewCommunicationHistory}
                    setActiveOrderId={setActiveOrderId}
                    setShowQualityCheckModal={setShowQualityCheckModal}
                    handleApproveAndSend={handleApproveAndSend}
                    handleMakePaymentEnhanced={handleMakePaymentEnhanced}
                    handleReceiveOrder={handleReceiveOrder}
                    handleCancelOrderEnhanced={handleCancelOrderEnhanced}
                    handleCompleteOrderEnhanced={handleCompleteOrderEnhanced}
                    isApproving={isApproving}
                    isDeleting={isDeleting}
                    isReceiving={isReceiving}
                    isCancelling={isCancelling}
                    isCompleting={isCompleting}
                    handleUndoLatestPayment={handleUndoLatestPayment}
                    reversingOrderId={reversingOrderId}
                    registerCardRef={registerOrderCardRef(order.id)}
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
                Showing {visibleOrders.length} of {filteredOrders.length} filtered orders
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
                  Total Value: {formatCurrency(
                    filteredOrders.reduce((sum, order) => sum + (order.totalAmountBaseCurrency || order.totalAmount), 0),
                    'TZS'
                  )}
                </span>
                <span className="text-gray-600">
                  In Transit: {filteredOrders.filter(order => {
                    const status = order.shippingStatus;
                    return status === 'shipped' || status === 'in_transit';
                  }).length}
                </span>
              </div>
            </div>
            
            {/* Currency Breakdown - All in TZS */}
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="text-xs font-medium text-blue-700 mb-2">Currency Breakdown (in TZS):</div>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const currencyGroups = filteredOrders.reduce((acc, order) => {
                    const currency = order.currency || 'TZS';
                    const tzsAmount = order.totalAmountBaseCurrency || order.totalAmount;
                    if (!acc[currency]) {
                      acc[currency] = { original: 0, tzs: 0 };
                    }
                    acc[currency].original += order.totalAmount;
                    acc[currency].tzs += tzsAmount;
                    return acc;
                  }, {} as Record<string, { original: number; tzs: number }>);
                  
                  return Object.entries(currencyGroups).map(([currency, amounts]) => (
                    <span key={currency} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white text-blue-700 border border-blue-200">
                      {currency !== 'TZS' ? (
                        <>{formatCurrency(amounts.tzs, 'TZS')} ({formatCurrency(amounts.original, currency)})</>
                      ) : (
                        <>{formatCurrency(amounts.tzs, 'TZS')}</>
                      )}
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

      {/* ============================================ */}
      {/* ENHANCED MODALS - FULL PO FUNCTIONALITY */}
      {/* ============================================ */}
      
      {/* 1. Payment Modal for Purchase Orders */}
      {activeOrderId && getActiveOrder() && (
        <PaymentsPopupModal
          isOpen={showPurchaseOrderPaymentModal}
          onClose={() => {
            setShowPurchaseOrderPaymentModal(false);
            setActiveOrderId(null);
          }}
          amount={(() => {
            const order = getActiveOrder();
            if (!order) return 0;
            return Math.max(0, (order.totalAmount || 0) - (order.totalPaid || 0));
          })()}
          customerId={getActiveOrder()?.supplierId}
          customerName={getActiveOrder()?.supplier?.name}
          description={`Payment for PO ${getActiveOrder()?.orderNumber}`}
          onPaymentComplete={handlePurchaseOrderPaymentComplete}
          paymentType="cash_out"
          title="Purchase Order Payment"
          currency={getActiveOrder()?.currency}
          exchangeRate={getActiveOrder()?.exchangeRate}
        />
      )}

      {/* Consolidated Receive Modal */}
      {activeOrderId && getActiveOrder() && (
        <ConsolidatedReceiveModal
          isOpen={showConsolidatedReceiveModal}
          onClose={() => {
            setShowConsolidatedReceiveModal(false);
            setActiveOrderId(null);
          }}
          purchaseOrder={getActiveOrder()!}
          onReceiveFull={async () => {
            setReceiveMode('full');
            setShowConsolidatedReceiveModal(false);
            setTimeout(() => setShowSerialNumberReceiveModal(true), 150);
          }}
          onReceivePartial={async () => {
            setReceiveMode('partial');
            setShowConsolidatedReceiveModal(false);
            setTimeout(() => setShowEnhancedPartialReceiveModal(true), 150);
          }}
        />
      )}

      {/* Enhanced Partial Receive Modal */}
      {activeOrderId && getActiveOrder() && (
        <EnhancedPartialReceiveModal
          isOpen={showEnhancedPartialReceiveModal}
          onClose={() => setShowEnhancedPartialReceiveModal(false)}
          purchaseOrder={getActiveOrder() as any}
          onConfirm={handleEnhancedPartialReceive}
          isLoading={isReceiving}
          mode="partial"
        />
      )}

      {/* Serial Number Receive Modal */}
      {activeOrderId && getActiveOrder() && (
        <SerialNumberReceiveModal
          isOpen={showSerialNumberReceiveModal}
          onClose={() => setShowSerialNumberReceiveModal(false)}
          purchaseOrder={getActiveOrder() as any}
          onConfirm={handleSerialNumberReceive}
          isLoading={isReceiving}
          mode={receiveMode}
          initialReceivedItems={tempSerialNumberData.length > 0 ? tempSerialNumberData : undefined}
        />
      )}

      {/* Pricing Modal */}
      {activeOrderId && getActiveOrder() && (
        <SetPricingModal
          isOpen={showPricingModal}
          onClose={() => setShowPricingModal(false)}
          purchaseOrder={getActiveOrder() as any}
          onConfirm={handleConfirmPricingAndReceive}
          isLoading={isReceiving}
          initialPricingData={tempPricingData.size > 0 ? tempPricingData : undefined}
          selectedQuantities={tempSerialNumberData.length > 0
            ? new Map(tempSerialNumberData.map(item => [item.id, item.receivedQuantity || 0]))
            : undefined
          }
        />
      )}

      {/* 5. Quality Check Modal */}
      {activeOrderId && getActiveOrder() && (
        <QualityCheckModal
          purchaseOrderId={activeOrderId}
          isOpen={showQualityCheckModal}
          onClose={() => {
            setShowQualityCheckModal(false);
            setActiveOrderId(null);
          }}
          onComplete={async () => {
            console.log('✅ Quality check completed - proceeding to inventory addition');
            setShowQualityCheckModal(false);

            // After quality check is complete, find the latest quality check and use RPC for inventory addition
            const order = getActiveOrder();
            if (!order || !currentUser) {
              console.error('❌ No active order or user found after quality check');
              setActiveOrderId(null);
              return;
            }

            try {
              // Find the latest quality check for this purchase order
              const { data: qualityChecks, error: qcError } = await supabase
                .from('purchase_order_quality_checks')
                .select('id')
                .eq('purchase_order_id', order.id)
                .order('created_at', { ascending: false })
                .limit(1);

              if (qcError || !qualityChecks || qualityChecks.length === 0) {
                console.error('❌ No quality check found after completion:', qcError);
                toast.error('Quality check completed but could not find record. Please try manual inventory addition.');
                setActiveOrderId(null);
                return;
              }

              const latestQualityCheckId = qualityChecks[0].id;
              console.log('📋 Found latest quality check:', latestQualityCheckId);

              // Use RPC function to add to inventory (similar to PurchaseOrderDetailPage)
              const { data: rpcResult, error: rpcError } = await supabase.rpc('add_quality_items_to_inventory_v2', {
                p_quality_check_id: latestQualityCheckId,
                p_purchase_order_id: order.id,
                p_user_id: currentUser.id,
                p_profit_margin_percentage: 30, // Default profit margin
                p_default_location: null
              });

              if (rpcError) {
                console.error('❌ RPC Error adding to inventory:', rpcError);
                toast.error('Failed to add items to inventory via quality check');
                setActiveOrderId(null);
                return;
              }

              const result = rpcResult as any;
              if (result && result.success) {
                console.log('✅ Items added to inventory via quality check:', result);
                toast.success(result.message || `Successfully added ${result.items_added} items to inventory`);

                // Clear temp data and reload
                setTempSerialNumberData([]);
                setTempPricingData(new Map());
                setActiveOrderId(null);
                await loadPurchaseOrders();
              } else {
                console.error('❌ Failed to add to inventory via quality check:', result?.message);
                toast.error(result?.message || 'Failed to add items to inventory');
                setActiveOrderId(null);
              }
            } catch (error) {
              console.error('❌ Error in quality check inventory addition:', error);
              toast.error('Error adding items to inventory after quality check');
              setActiveOrderId(null);
            }
          }}
        />
      )}

      {/* 6. Detailed Order View Modal with Tabs */}
      {showDetailedView && activeOrderId && getActiveOrder() && (
        <OrderDetailViewModal
          order={getActiveOrder()!}
          activeTab={detailViewTab}
          onTabChange={setDetailViewTab}
          onClose={() => {
            setShowDetailedView(false);
            setActiveOrderId(null);
          }}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
          getPaymentStatusColor={getPaymentStatusColor}
        />
      )}

      {/* 7. Payment History Modal */}
      {showPaymentHistoryModal && activeOrderId && getActiveOrder() && (
        <PaymentHistoryModal
          order={getActiveOrder()!}
          onClose={() => {
            setShowPaymentHistoryModal(false);
            setActiveOrderId(null);
          }}
          formatCurrency={formatCurrency}
        />
      )}

      {/* 8. Notes Modal */}
      {showNotesModal && activeOrderId && getActiveOrder() && (
        <NotesModal
          order={getActiveOrder()!}
          onClose={() => {
            setShowNotesModal(false);
            setActiveOrderId(null);
          }}
          onNoteAdded={loadPurchaseOrders}
        />
      )}

      {/* 9. Communication History Modal */}
      {showCommunicationModal && activeOrderId && getActiveOrder() && (
        <CommunicationHistoryModal
          order={getActiveOrder()!}
          onClose={() => {
            setShowCommunicationModal(false);
            setActiveOrderId(null);
          }}
        />
      )}

      {/* 10. Completion Summary Modal */}
      {showCompletionSummaryModal && activeOrderId && getActiveOrder() && (
        <CompletionSummaryModal
          order={getActiveOrder()!}
          onClose={() => {
            setShowCompletionSummaryModal(false);
            setActiveOrderId(null);
          }}
          onConfirm={confirmCompleteOrder}
          isCompleting={isCompleting}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      )}
      
      {/* 11. Confirmation Dialog (matching PurchaseOrderDetailPage) */}
      {showConfirmDialog && confirmAction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
            {/* Close Button - Only show in confirming state */}
            {confirmDialogState === 'confirming' && (
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setConfirmAction(null);
                  setConfirmDialogState('confirming');
                }}
                className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Icon Header - Changes based on state */}
            <div className={`p-8 text-center transition-all duration-500 ${
              confirmDialogState === 'success' 
                ? 'bg-gradient-to-br from-green-100 to-emerald-100' 
                : 'bg-gradient-to-br from-green-50 to-emerald-50'
            }`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg transition-all duration-500 ${
                confirmDialogState === 'success'
                  ? 'bg-green-500 scale-110'
                  : confirmDialogState === 'processing'
                  ? 'bg-blue-500'
                  : 'bg-green-600'
              }`}>
                {confirmDialogState === 'success' ? (
                  <Check className="w-10 h-10 text-white" />
                ) : confirmDialogState === 'processing' ? (
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Package className="w-8 h-8 text-white" />
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {confirmDialogState === 'success' 
                  ? 'Successfully Added!' 
                  : confirmDialogState === 'processing'
                  ? 'Adding to Inventory...'
                  : confirmAction.title
                }
              </h3>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <p className="text-center text-gray-600 leading-relaxed">
                {confirmDialogState === 'success'
                  ? 'Items have been successfully added to inventory.'
                  : confirmDialogState === 'processing'
                  ? 'Please wait while we add items to inventory...'
                  : confirmAction.message
                }
              </p>
            </div>
            
            {/* Actions - Only show button in confirming state */}
            {confirmDialogState === 'confirming' && (
              <div className="p-6 pt-0">
                <button
                  onClick={() => {
                    confirmAction.onConfirm();
                  }}
                  className="w-full px-6 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl text-lg"
                >
                  Confirm & Add
                </button>
              </div>
            )}
            
            {/* Success state close button */}
            {confirmDialogState === 'success' && (
              <div className="p-6 pt-0">
                <button
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setConfirmAction(null);
                    setConfirmDialogState('confirming');
                  }}
                  className="w-full px-6 py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            )}
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
  isSelectionMode: boolean;
  onToggleSelect: () => void;
  onStatusUpdate: (orderId: string, status: OrderStatus) => void;
  onShippingUpdate: (orderId: string, shippingData: Partial<EnhancedPurchaseOrder>) => void;
  onDelete: (orderId: string) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  isEditingShipping: boolean;
  onEditShipping: (orderId: string) => void;
  formatCurrency: (amount: number, currency?: string) => string;
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
  handleViewReceipt: (orderId: string) => void;
  handleViewInvoice: (orderId: string) => void;
  handleReturnOrder: (orderId: string) => void;
  handleReviewOrder: (orderId: string) => void;
  handleRestoreOrder: (orderId: string) => void;
  handleArchiveOrder: (orderId: string) => void;
  handleWhatsAppSupplier: (order: PurchaseOrder) => void;
  handleEmailSupplier: (order: PurchaseOrder) => void;
  handleViewOrderDetails: (orderId: string) => void;
  handleViewPaymentHistory: (orderId: string) => void;
  handleViewNotes: (orderId: string) => void;
  handleViewCommunicationHistory: (orderId: string) => void;
  setActiveOrderId: (orderId: string | null) => void;
  setShowQualityCheckModal: (show: boolean) => void;
  // Enhanced handlers
  handleApproveAndSend: (orderId: string) => void;
  handleMakePaymentEnhanced: (orderId: string) => void;
  handleReceiveOrder: (orderId: string) => void;
  handleCancelOrderEnhanced: (orderId: string) => void;
  handleCompleteOrderEnhanced: (orderId: string) => void;
  handleUndoLatestPayment: (orderId: string) => void;
  // Loading states
  isApproving: boolean;
  isDeleting: boolean;
  isReceiving: boolean;
  isCancelling: boolean;
  isCompleting: boolean;
  reversingOrderId: string | null;
  registerCardRef?: (element: HTMLDivElement | null) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  isSelected,
  isSelectionMode,
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
  handleViewReceipt,
  handleViewInvoice,
  handleReturnOrder,
  handleReviewOrder,
  handleRestoreOrder,
  handleArchiveOrder,
  handleWhatsAppSupplier,
  handleEmailSupplier,
  handleViewOrderDetails,
  handleViewPaymentHistory,
  handleViewNotes,
  handleViewCommunicationHistory,
  setActiveOrderId,
  setShowQualityCheckModal,
  handleApproveAndSend,
  handleMakePaymentEnhanced,
  handleReceiveOrder,
  handleCancelOrderEnhanced,
  handleCompleteOrderEnhanced,
  isApproving,
  isDeleting,
  isReceiving,
  isCancelling,
  isCompleting,
  handleUndoLatestPayment,
  reversingOrderId,
  registerCardRef
}) => {
  const [tempShippingData, setTempShippingData] = useState({
    trackingNumber: order.trackingNumber || '',
    estimatedDelivery: order.estimatedDelivery || '',
    shippingNotes: order.shippingNotes || '',
    shippingStatus: order.shippingStatus || 'pending'
  });
  const [itemsCollapsed, setItemsCollapsed] = useState(true);

  useEffect(() => {
    if (isExpanded) {
      setItemsCollapsed(true);
    }
  }, [isExpanded, order.id]);

  // Smart button visibility - show next available actions for complete workflow
  const getAvailableStatuses = (currentStatus: OrderStatus): OrderStatus[] => {
    switch (currentStatus) {
      case 'draft':
        return ['sent', 'cancelled']; // Can send or cancel draft orders

      case 'sent':
        return ['confirmed', 'shipped', 'cancelled']; // After sent, can confirm or mark as shipped

      case 'confirmed':
        return ['shipped', 'cancelled']; // After confirmation, proceed to shipping

      case 'shipped':
        return []; // Use proper receive workflow instead of direct status changes

      case 'partial_received':
        return []; // Use proper receive workflow to complete

      case 'received':
        return ['completed']; // Final step - mark as completed

      case 'completed':
        return []; // Final state - no further status changes

      case 'cancelled':
        return ['draft']; // Allow restoration to draft to recreate the order

      default:
        return ['sent']; // Fallback - default action is to send
    }
  };

  // Get smart action buttons based on proper workflow sequence: Approve → Pay → Receive → Complete
  const getSmartActionButtons = (order: EnhancedPurchaseOrder) => {
    const actions = [];
    const currentStatus = order.status as OrderStatus;
    const paymentStatus = order.paymentStatus || 'unpaid';
    const totalPaid = Number(order.totalPaid) || 0;
    const paymentsCount = Number((order as any).paymentsCount || 0);

    console.log(`🔍 Processing order ${order.orderNumber}: status=${currentStatus}, paymentStatus=${paymentStatus}, totalPaid=${totalPaid}, paymentsCount=${paymentsCount}`);

    // Edit button first for editable orders (draft, sent, confirmed, shipped)
    if (['draft', 'sent', 'confirmed', 'shipped'].includes(currentStatus)) {
      actions.push({
        type: 'edit',
        label: 'Edit Order',
        icon: <Edit className="w-4 h-4" />,
        color: 'bg-purple-600 hover:bg-purple-700',
        onClick: () => handleEditOrder(order.id)
      });
    }

    // Always show View Details (opens detailed modal inline)
    actions.push({
      type: 'view',
      label: 'View Details',
      icon: <Eye className="w-4 h-4" />,
      color: 'bg-blue-600 hover:bg-blue-700',
      onClick: () => handleViewOrderDetails(order.id)
    });

    // Workflow sequence: Draft → Approve → Pay → Receive → Complete
    switch (currentStatus) {
      case 'draft':
        // Step 1: Draft - Primary actions (Edit already added above)
        actions.push({
          type: 'approve',
          label: 'Approve & Send',
          icon: <CheckSquare className="w-4 h-4" />,
          color: 'bg-green-600 hover:bg-green-700',
          disabled: isApproving,
          onClick: () => handleApproveAndSend(order.id)
        });
        
        // Secondary buttons for Draft
        actions.push({
          type: 'duplicate',
          label: 'Duplicate',
          icon: <Copy className="w-4 h-4" />,
          color: 'bg-indigo-600 hover:bg-indigo-700',
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
          disabled: isDeleting,
          onClick: () => onDelete(order.id)
        });
        break;
      
      case 'sent':
      case 'shipped':
      case 'confirmed':
        // Step 2: Sent - Check payment status (Edit already added above)
        if (paymentStatus !== 'paid') {
          actions.push({
            type: 'pay',
            label: 'Make Payment',
            icon: <CreditCard className="w-4 h-4" />,
            color: 'bg-orange-600 hover:bg-orange-700',
            onClick: () => handleMakePaymentEnhanced(order.id)
          });
          actions.push({
            type: 'print',
            label: 'Print',
            icon: <Printer className="w-4 h-4" />,
            color: 'bg-gray-600 hover:bg-gray-700',
            onClick: () => handlePrintOrder(order.id)
          });
        } else {
          actions.push({
            type: 'receive',
            label: 'Receive Items',
            icon: <Package className="w-4 h-4" />,
            color: 'bg-green-600 hover:bg-green-700',
            disabled: isReceiving,
            onClick: () => handleReceiveOrder(order.id)
          });
          actions.push({
            type: 'print',
            label: 'Print',
            icon: <Printer className="w-4 h-4" />,
            color: 'bg-gray-600 hover:bg-gray-700',
            onClick: () => handlePrintOrder(order.id)
          });
        }
        
        // Secondary buttons for Sent
        actions.push({
          type: 'duplicate',
          label: 'Duplicate',
          icon: <Copy className="w-4 h-4" />,
          color: 'bg-indigo-600 hover:bg-indigo-700',
          onClick: () => handleDuplicateOrder(order.id)
        });
        actions.push({
          type: 'return',
          label: 'Return',
          icon: <ArrowLeft className="w-4 h-4" />,
          color: 'bg-red-600 hover:bg-red-700',
          onClick: () => handleReturnOrder(order.id)
        });
        console.debug('[OrderCard] Adding Cancel button to actions', {
          orderNumber: order.orderNumber,
          orderId: order.id,
          status: order.status,
          isCancelling,
          hasHandler: typeof handleCancelOrderEnhanced === 'function'
        });
        actions.push({
          type: 'cancel',
          label: 'Cancel',
          icon: <XSquare className="w-4 h-4" />,
          color: 'bg-red-600 hover:bg-red-700',
          disabled: isCancelling,
          onClick: () => {
            console.debug('[OrderCard] Cancel button onClick wrapper called', {
              orderNumber: order.orderNumber,
              orderId: order.id
            });
            handleCancelOrderEnhanced(order.id);
          }
        });
        break;
      
      case 'partial_received':
        // Partial received - Can continue receiving
        actions.push({
          type: 'continue_receive',
          label: 'Continue Receiving',
          icon: <Package className="w-4 h-4" />,
          color: 'bg-yellow-500 hover:bg-yellow-600',
          disabled: isReceiving,
          onClick: () => handleReceiveOrder(order.id)
        });
        actions.push({
          type: 'quality',
          label: 'Quality Check',
          icon: <PackageCheck className="w-4 h-4" />,
          color: 'bg-purple-600 hover:bg-purple-700',
          onClick: () => {
            setActiveOrderId(order.id);
            setShowQualityCheckModal(true);
          }
        });
        actions.push({
          type: 'duplicate',
          label: 'Duplicate',
          icon: <Copy className="w-4 h-4" />,
          color: 'bg-indigo-600 hover:bg-indigo-700',
          onClick: () => handleDuplicateOrder(order.id)
        });
        actions.push({
          type: 'print',
          label: 'Print',
          icon: <Printer className="w-4 h-4" />,
          color: 'bg-gray-600 hover:bg-gray-700',
          onClick: () => handlePrintOrder(order.id)
        });
        break;
      
      case 'received':
        // Step 3: Received - Can complete
        actions.push({
          type: 'complete',
          label: 'Complete Order',
          icon: <CheckSquare className="w-4 h-4" />,
          color: 'bg-green-600 hover:bg-green-700',
          disabled: isCompleting || paymentStatus !== 'paid',
          onClick: () => handleCompleteOrderEnhanced(order.id)
        });
        actions.push({
          type: 'quality',
          label: 'Quality Check',
          icon: <PackageCheck className="w-4 h-4" />,
          color: 'bg-purple-600 hover:bg-purple-700',
          onClick: () => {
            setActiveOrderId(order.id);
            setShowQualityCheckModal(true);
          }
        });
        actions.push({
          type: 'duplicate',
          label: 'Duplicate',
          icon: <Copy className="w-4 h-4" />,
          color: 'bg-indigo-600 hover:bg-indigo-700',
          onClick: () => handleDuplicateOrder(order.id)
        });
        actions.push({
          type: 'print',
          label: 'Print',
          icon: <Printer className="w-4 h-4" />,
          color: 'bg-gray-600 hover:bg-gray-700',
          onClick: () => handlePrintOrder(order.id)
        });
        break;
      
      case 'completed':
        // Completed - Show completed status
        actions.push({
          type: 'print',
          label: 'Print',
          icon: <Printer className="w-4 h-4" />,
          color: 'bg-gray-600 hover:bg-gray-700',
          onClick: () => handlePrintOrder(order.id)
        });
        actions.push({
          type: 'duplicate',
          label: 'Duplicate',
          icon: <Copy className="w-4 h-4" />,
          color: 'bg-blue-600 hover:bg-blue-700',
          onClick: () => handleDuplicateOrder(order.id)
        });
        break;
      
      case 'cancelled':
        // Cancelled - Can restore or duplicate
        actions.push({
          type: 'restore',
          label: 'Restore',
          icon: <RotateCcw className="w-4 h-4" />,
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

    // Debug: Log totals for troubleshooting
    console.log(`🔍 Order ${order.orderNumber}: totalPaid = ${totalPaid}, paymentsCount = ${paymentsCount}, type = ${typeof totalPaid}`);

    if (totalPaid > 0 || paymentsCount > 0) {
      console.log(`✅ Adding Undo Payment button for ${order.orderNumber} (totalPaid: ${totalPaid}, paymentsCount: ${paymentsCount})`);
      actions.push({
        type: 'undo_payment',
        label: reversingOrderId === order.id ? 'Undoing...' : 'Undo Payment',
        icon: <RotateCcw className={`w-4 h-4 ${reversingOrderId === order.id ? 'animate-spin' : ''}`} />,
        color: 'bg-red-600 hover:bg-red-700',
        disabled: reversingOrderId === order.id,
        onClick: () => handleUndoLatestPayment(order.id)
      });
    } else {
      console.log(`❌ Skipping Undo Payment button for ${order.orderNumber} (totalPaid: ${totalPaid}, paymentsCount: ${paymentsCount})`);
    }

    console.log(`📋 Final actions for ${order.orderNumber}:`, actions.map(a => a.type));

    return actions;
  };

  const availableStatuses = getAvailableStatuses(order.status as OrderStatus);
  const statusActionMeta: Record<OrderStatus, { 
    label: string; 
    description: string; 
    gradient: string; 
    accent: string; 
  }> = {
    draft: {
      label: 'Return to Draft',
      description: 'Revert this order for further edits',
      gradient: 'from-slate-500 to-slate-600',
      accent: 'text-slate-100'
    },
    sent: {
      label: 'Mark as Sent',
      description: 'Confirm order has been shared with supplier',
      gradient: 'from-blue-500 to-indigo-600',
      accent: 'text-indigo-50'
    },
    confirmed: {
      label: 'Confirm Order',
      description: 'Supplier has acknowledged and confirmed',
      gradient: 'from-indigo-500 to-purple-600',
      accent: 'text-purple-50'
    },
    shipped: {
      label: 'Mark as Shipped',
      description: 'Items are on the way from supplier',
      gradient: 'from-cyan-500 to-blue-600',
      accent: 'text-cyan-50'
    },
    partial_received: {
      label: 'Mark as Partially Received',
      description: 'Some items successfully checked in',
      gradient: 'from-amber-500 to-orange-600',
      accent: 'text-amber-50'
    },
    received: {
      label: 'Mark as Received',
      description: 'All ordered items have arrived',
      gradient: 'from-green-500 to-emerald-600',
      accent: 'text-emerald-50'
    },
    completed: {
      label: 'Mark as Completed',
      description: 'Order fully fulfilled and closed',
      gradient: 'from-emerald-500 to-teal-600',
      accent: 'text-emerald-50'
    },
    cancelled: {
      label: 'Mark as Cancelled',
      description: 'Close out the order without fulfillment',
      gradient: 'from-red-500 to-rose-600',
      accent: 'text-rose-100'
    }
  };
  const allActions = getSmartActionButtons(order);

  const isOrderComplete = order.status === 'completed';
  const needsAction = order.status === 'draft';
  const itemCount = order.items?.length || 0;
  const totalQuantity = (order.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

  return (
    <div
      ref={registerCardRef}
      className={`border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 ${
      isExpanded 
        ? 'border-blue-500 shadow-xl' 
        : isOrderComplete
          ? 'border-green-200 hover:border-green-300 hover:shadow-md'
          : needsAction
            ? 'border-orange-300 hover:border-orange-400 hover:shadow-md'
            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
    } ${isSelected ? 'ring-2 ring-offset-2 ring-blue-400' : ''}`}
    >
      {/* Header - Clickable */}
      <div 
        className="flex items-start justify-between p-6 cursor-pointer"
        onClick={onToggleExpanded}
      >
          <div className="flex items-start gap-3 flex-1">
          {/* Selection Checkbox */}
          {(isSelectionMode || isSelected) ? (
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
          ) : (
            <div className="mt-1 w-5 h-5" />
          )}
          
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
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {order.supplier?.name || 'Unknown Supplier'}
              </span>
              <span className="text-xs text-gray-500">
                • {formatDate(order.createdAt)}
              </span>
            </div>
            <div className="mt-2">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium">
                <Package className="w-3 h-3" />
                <span className="flex items-center gap-1">
                  <span className="font-semibold">{itemCount}</span>
                  <span>item{itemCount !== 1 ? 's' : ''}</span>
                </span>
                <span className="h-3 w-px bg-blue-200" />
                <span className="flex items-center gap-1">
                  <span className="font-semibold">{totalQuantity}</span>
                  <span>total qty</span>
                </span>
              </span>
            </div>
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
            <div className="flex flex-col items-end">
              {/* Show TZS as main amount */}
              {order.currency && order.currency !== 'TZS' && order.totalAmountBaseCurrency ? (
                <>
                  <span>{formatCurrency(order.totalAmountBaseCurrency, 'TZS')}</span>
                  <span className="text-xs opacity-75">({formatCurrency(order.totalAmount || 0, order.currency)})</span>
                </>
              ) : (
                <span>{formatCurrency(order.totalAmount || 0, order.currency || 'TZS')}</span>
              )}
            </div>
          </div>
          {order.totalPaid > 0 && (
            <div className="text-xs text-gray-600">
              Paid: {formatCurrency(order.totalPaid || 0, 'TZS')}
              {order.currency && order.currency !== 'TZS' && order.exchangeRate && (
                <span className="ml-1">({formatCurrency((order.totalPaid || 0) / order.exchangeRate, order.currency)})</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Content - Only show when expanded */}
      {isExpanded && (
        <div className="px-6 pb-6 order-expanded-scroll">
          {/* Order Summary Row */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Total Amount</p>
              {order.currency && order.currency !== 'TZS' && order.totalAmountBaseCurrency ? (
                <>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(order.totalAmountBaseCurrency, 'TZS')}</p>
                  <p className="text-xs text-gray-500 mt-1">({formatCurrency(order.totalAmount || 0, order.currency)})</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(order.totalAmount || 0, 'TZS')}</p>
                  <p className="text-xs text-gray-500 mt-1">TZS</p>
                </>
              )}
        </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Paid Amount</p>
              {order.currency && order.currency !== 'TZS' && order.exchangeRate ? (
                <>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency((order.totalPaid || 0) * (order.exchangeRate || 1), 'TZS')}</p>
                  <p className="text-xs text-gray-500 mt-1">({formatCurrency(order.totalPaid || 0, order.currency)})</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(order.totalPaid || 0, 'TZS')}</p>
                  <p className="text-xs text-gray-500 mt-1">TZS</p>
                </>
              )}
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
              {order.currency && order.currency !== 'TZS' && order.totalAmountBaseCurrency ? (
                <>
                  <p className={`text-lg font-bold ${
                    order.totalPaid >= order.totalAmount ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency((order.totalAmountBaseCurrency || 0) - ((order.totalPaid || 0) * (order.exchangeRate || 1)), 'TZS')}
                  </p>
                  <p className={`text-xs mt-1 ${
                    order.totalPaid >= order.totalAmount ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ({formatCurrency((order.totalAmount || 0) - (order.totalPaid || 0), order.currency)})
                  </p>
                </>
              ) : (
                <>
                  <p className={`text-lg font-bold ${
                    order.totalPaid >= order.totalAmount ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency((order.totalAmount || 0) - (order.totalPaid || 0), 'TZS')}
                  </p>
                  <p className={`text-xs mt-1 ${
                    order.totalPaid >= order.totalAmount ? 'text-green-600' : 'text-red-600'
                  }`}>
                    TZS
                  </p>
                </>
              )}
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

          {/* Order Items with Progress Bars */}
          <div className="mb-4">
            {(() => {
              const previewCount = 2;
              const hasMoreItems = order.items.length > previewCount;
              const displayedItems =
                itemsCollapsed && hasMoreItems
                  ? order.items.slice(0, previewCount)
                  : order.items;

              return (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-600" />
                      Order Items ({order.items.length})
                    </h4>
                    {hasMoreItems && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setItemsCollapsed((prev) => !prev);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                      >
                        {itemsCollapsed ? (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            View More
                          </>
                        ) : (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            View Less
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  {displayedItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {displayedItems.map((item, index) => {
                  const received = item.receivedQuantity || 0;
                  const ordered = item.quantity || 0;
                  const percentage = ordered > 0 ? (received / ordered) * 100 : 0;

                  return (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-gray-900">
                              {item.product?.name || `Product ${item.productId}`}
                            </span>
                          </div>
                          {item.variant?.name && item.variant.name !== 'Default Variant' && (
                            <p className="text-sm text-gray-600 mb-1">Variant: {item.variant.name}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              Qty:{' '}
                              <strong className="text-gray-700">{item.quantity}</strong>
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              Unit:{' '}
                              {order.currency && order.currency !== 'TZS' && order.exchangeRate ? (
                                <>
                                  <strong className="text-gray-700">
                                    {formatCurrency(
                                      (item.costPrice || 0) * (order.exchangeRate || 1),
                                      'TZS'
                                    )}
                                  </strong>
                                  <span className="text-gray-500 ml-1 text-xs">
                                    ({formatCurrency(item.costPrice || 0, order.currency)})
                                  </span>
                                </>
                              ) : (
                                <strong className="text-gray-700">
                                  {formatCurrency(item.costPrice || 0, 'TZS')}
                                </strong>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-xs text-gray-500 mb-1">Item Total</p>
                          {order.currency && order.currency !== 'TZS' && order.exchangeRate ? (
                            <>
                              <p className="text-lg font-bold text-gray-900">
                                {formatCurrency(
                                  (item.totalPrice || (item.quantity || 0) * (item.costPrice || 0)) *
                                    (order.exchangeRate || 1),
                                  'TZS'
                                )}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                (
                                {formatCurrency(
                                  item.totalPrice || (item.quantity || 0) * (item.costPrice || 0),
                                  order.currency
                                )}
                                )
                              </p>
                            </>
                          ) : (
                            <p className="text-lg font-bold text-gray-900">
                              {formatCurrency(
                                item.totalPrice || (item.quantity || 0) * (item.costPrice || 0),
                                'TZS'
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      {(order.status === 'partial_received' ||
                        order.status === 'received' ||
                        order.status === 'completed') && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex justify-between text-xs text-gray-600 mb-1.5">
                            <span className="font-medium">
                              Received: {received}/{ordered}
                            </span>
                            <span className="font-bold">{percentage.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div
                              className={`h-2.5 rounded-full transition-all duration-500 ${
                                percentage >= 100
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                  : percentage > 0
                                    ? 'bg-gradient-to-r from-orange-400 to-orange-500'
                                    : 'bg-gray-300'
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {percentage >= 100 ? (
                              <CheckSquare className="w-3 h-3 text-green-600" />
                            ) : percentage > 0 ? (
                              <Clock className="w-3 h-3 text-orange-600" />
                            ) : (
                              <Clock className="w-3 h-3 text-gray-400" />
                            )}
                            <span className="text-xs text-gray-500">
                              {percentage >= 100
                                ? 'Fully received'
                                : percentage > 0
                                  ? 'Partially received'
                                  : 'Not yet received'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center text-sm text-gray-500">
                      No items found for this order.
                    </div>
                  )}
                  {itemsCollapsed && hasMoreItems && (
                    <p className="mt-2 text-xs text-gray-500">
                      Showing first {previewCount} items of {order.items.length}. Tap View More to see all.
                    </p>
                  )}
                </>
              );
            })()}
          </div>

          {/* Quick Access Communication & Info */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            {order.supplier?.phone && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleWhatsAppSupplier(order);
                }}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg transition-all text-sm font-medium"
                title="Message on WhatsApp"
              >
                <MessageSquare className="w-4 h-4" />
                WhatsApp
              </button>
            )}
            {order.supplier?.email && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEmailSupplier(order);
                }}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-all text-sm font-medium"
                title="Send email"
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewNotes(order.id);
              }}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-lg transition-all text-sm font-medium"
              title="View notes"
            >
              <FileText className="w-4 h-4" />
              Notes
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewPaymentHistory(order.id);
              }}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg transition-all text-sm font-medium"
              title="Payment history"
            >
              <CreditCard className="w-4 h-4" />
              Payments
            </button>
          </div>

          {/* Action Buttons Section */}
          <div className="mt-5 pt-5 border-t-2 border-gray-200">
            {/* Primary Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {allActions.slice(0, 4).map((action, index) => {
                console.debug('[OrderCard] Rendering primary action button', {
                  orderNumber: order.orderNumber,
                  actionType: action.type,
                  label: action.label,
                  disabled: action.disabled
                });

                return (
                  <button
                    key={`${action.type}-${index}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      console.debug('[OrderCard] Primary action button clicked', {
                        orderNumber: order.orderNumber,
                        actionType: action.type,
                        label: action.label,
                        disabled: action.disabled,
                        hasOnClick: typeof action.onClick === 'function'
                      });
                      
                      if (action.disabled) {
                        console.warn('[OrderCard] Action button is disabled', {
                          orderNumber: order.orderNumber,
                          actionType: action.type
                        });
                        return;
                      }
                      
                      try {
                        console.debug('[OrderCard] Calling action.onClick()', {
                          orderNumber: order.orderNumber,
                          actionType: action.type
                        });
                        action.onClick();
                      } catch (error) {
                        console.error('[OrderCard] Error executing action', {
                          orderNumber: order.orderNumber,
                          actionType: action.type,
                          error
                        });
                        toast.error(`Failed to execute ${action.label}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                      }
                    }}
                    disabled={action.disabled}
                    className={`flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${action.color}`}
                  >
                    {action.icon}
                    {action.label}
                  </button>
                );
              })}
            </div>

            {/* Secondary Actions */}
            {allActions.length > 4 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {allActions.slice(4).map((action, index) => {
                  console.debug('[OrderCard] Rendering secondary action button', {
                    orderNumber: order.orderNumber,
                    actionType: action.type,
                    label: action.label,
                    disabled: action.disabled,
                    index: index + 4,
                    totalActions: allActions.length
                  });

                  return (
                    <button
                      key={`${action.type}-${index + 4}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        console.debug('[OrderCard] Secondary action button clicked', {
                          orderNumber: order.orderNumber,
                          actionType: action.type,
                          label: action.label,
                          disabled: action.disabled,
                          hasOnClick: typeof action.onClick === 'function',
                          index: index + 4
                        });
                        
                        if (action.disabled) {
                          console.warn('[OrderCard] Secondary action button is disabled', {
                            orderNumber: order.orderNumber,
                            actionType: action.type
                          });
                          return;
                        }
                        
                        try {
                          console.debug('[OrderCard] Calling secondary action.onClick()', {
                            orderNumber: order.orderNumber,
                            actionType: action.type
                          });
                          action.onClick();
                        } catch (error) {
                          console.error('[OrderCard] Error executing secondary action', {
                            orderNumber: order.orderNumber,
                            actionType: action.type,
                            error
                          });
                          toast.error(`Failed to execute ${action.label}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        }
                      }}
                      disabled={action.disabled}
                      className={`flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${action.color}`}
                    >
                      {action.icon}
                      {action.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// DETAILED ORDER VIEW MODAL COMPONENT
// ============================================
interface OrderDetailViewModalProps {
  order: PurchaseOrder;
  activeTab: 'overview' | 'items' | 'payments' | 'history';
  onTabChange: (tab: 'overview' | 'items' | 'payments' | 'history') => void;
  onClose: () => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
  getStatusColor: (status: OrderStatus) => string;
  getStatusIcon: (status: OrderStatus) => React.ReactNode;
  getPaymentStatusColor: (status: PaymentStatus) => string;
}

const OrderDetailViewModal: React.FC<OrderDetailViewModalProps> = ({
  order,
  activeTab,
  onTabChange,
  onClose,
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusIcon,
  getPaymentStatusColor
}) => {
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [receivedItems, setReceivedItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load data when tabs change
  useEffect(() => {
    const loadTabData = async () => {
      setIsLoading(true);
      try {
        if (activeTab === 'payments') {
          const payments = await PurchaseOrderService.getPayments(order.id);
          setPaymentHistory(payments || []);
        } else if (activeTab === 'history') {
          const audit = await PurchaseOrderService.getAuditHistory(order.id);
          setAuditHistory(audit || []);
        } else if (activeTab === 'items') {
          const items = await PurchaseOrderService.getReceivedItems(order.id);
          if (items.success) {
            setReceivedItems(items.data || []);
          }
        }
      } catch (error) {
        console.error('Error loading tab data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (activeTab !== 'overview') {
      loadTabData();
    }
  }, [activeTab, order.id]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h2>
              <div className="mt-1 inline-flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {order.supplier?.name || 'Unknown Supplier'}
                </span>
                <span className="text-xs text-gray-500">
                  • {formatDate(order.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          {[
            { key: 'overview', label: 'Overview', icon: <Info className="w-4 h-4" /> },
            { key: 'items', label: 'Items', icon: <Package className="w-4 h-4" /> },
            { key: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" /> },
            { key: 'history', label: 'History', icon: <History className="w-4 h-4" /> }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-all ${
                activeTab === tab.key
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="sm" color="purple" />
              <span className="ml-3 text-gray-600">Loading...</span>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* Order Information */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Order Information
                      </h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Order Number:</span>
                          <span className="font-semibold font-mono">{order.orderNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status as OrderStatus)}`}>
                            {getStatusIcon(order.status as OrderStatus)}
                            <span className="ml-1 capitalize">{order.status.replace('_', ' ')}</span>
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Created:</span>
                          <span className="font-medium">{formatDate(order.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Expected Delivery:</span>
                          <span className="font-medium">{order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : 'Not set'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Currency:</span>
                          <span className="font-semibold">{order.currency || 'TZS'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Supplier Information */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Building className="w-5 h-5 text-orange-600" />
                        Supplier Details
                      </h3>
                      {order.supplier ? (
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Company:</span>
                            <span className="font-semibold">{order.supplier.name}</span>
                          </div>
                          {order.supplier.contactPerson && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Contact:</span>
                              <span className="font-medium">{order.supplier.contactPerson}</span>
                            </div>
                          )}
                          {order.supplier.phone && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Phone:</span>
                              <span className="font-medium">{order.supplier.phone}</span>
                            </div>
                          )}
                          {order.supplier.email && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Email:</span>
                              <span className="font-medium text-blue-600">{order.supplier.email}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500">No supplier information</p>
                      )}
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {/* Financial Summary */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        Financial Summary
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-700">Total Amount:</span>
                          <span className="text-2xl font-bold text-gray-900">{formatCurrency(order.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-700">Paid:</span>
                          <span className="text-xl font-bold text-green-600">{formatCurrency(order.totalPaid || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-3 border-t border-green-200">
                          <span className="text-gray-700">Balance:</span>
                          <span className={`text-xl font-bold ${(order.totalAmount - (order.totalPaid || 0)) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(order.totalAmount - (order.totalPaid || 0))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-700">Payment Status:</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPaymentStatusColor(order.paymentStatus as PaymentStatus)}`}>
                            {(order.paymentStatus || 'unpaid').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Items Summary */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-purple-600" />
                        Items Summary
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-3xl font-bold text-blue-600">{order.items.length}</div>
                          <div className="text-xs text-blue-700 mt-1">Total Items</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="text-3xl font-bold text-orange-600">
                            {order.items.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                          </div>
                          <div className="text-xs text-orange-700 mt-1">Total Quantity</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg col-span-2">
                          <div className="text-3xl font-bold text-green-600">
                            {order.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0)}
                          </div>
                          <div className="text-xs text-green-700 mt-1">Received Quantity</div>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
                        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-yellow-600" />
                          Order Notes
                        </h3>
                        <p className="text-sm text-gray-700 leading-relaxed">{order.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Items Tab */}
              {activeTab === 'items' && (
                <div className="space-y-4">
                  {/* Ordered Items */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Ordered Items</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                          <tr>
                            <th className="text-left p-3 font-semibold">Product</th>
                            <th className="text-left p-3 font-semibold">Variant</th>
                            <th className="text-center p-3 font-semibold">Ordered</th>
                            <th className="text-center p-3 font-semibold">Received</th>
                            <th className="text-right p-3 font-semibold">Unit Price</th>
                            <th className="text-right p-3 font-semibold">Total</th>
                            <th className="text-center p-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item, index) => {
                            const received = item.receivedQuantity || 0;
                            const ordered = item.quantity || 0;
                            const percentage = ordered > 0 ? (received / ordered) * 100 : 0;
                            
                            return (
                              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="p-3">
                                  <div className="font-medium text-gray-900">{item.product?.name || `Product ${item.productId}`}</div>
                                  {item.product?.sku && (
                                    <div className="text-xs text-gray-500">SKU: {item.product.sku}</div>
                                  )}
                                </td>
                                <td className="p-3 text-gray-700">{item.variant?.name || 'Default'}</td>
                                <td className="p-3 text-center font-bold text-gray-900">{ordered}</td>
                                <td className="p-3 text-center">
                                  <span className={`font-bold ${percentage >= 100 ? 'text-green-600' : percentage > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                                    {received}
                                  </span>
                                </td>
                                <td className="p-3 text-right text-gray-700">{formatCurrency(item.costPrice)}</td>
                                <td className="p-3 text-right font-bold text-gray-900">
                                  {formatCurrency((item.totalPrice || (ordered * item.costPrice)))}
                                </td>
                                <td className="p-3 text-center">
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full ${
                                        percentage >= 100 ? 'bg-green-500' : 
                                        percentage > 0 ? 'bg-orange-500' : 'bg-gray-300'
                                      }`}
                                      style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">{percentage.toFixed(0)}%</div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Received Inventory Items */}
                  {receivedItems.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <PackageCheck className="w-5 h-5 text-green-600" />
                        Received Inventory Items ({receivedItems.length})
                      </h3>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {receivedItems.map((item, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{item.product?.name}</div>
                                <div className="text-xs text-gray-600 mt-1 space-x-3">
                                  {item.serial_number && <span>Serial: {item.serial_number}</span>}
                                  {item.imei && <span>IMEI: {item.imei}</span>}
                                  {item.location && <span>Location: {item.location}</span>}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-gray-900">
                                  {item.selling_price ? formatCurrency(item.selling_price) : 'Not set'}
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  item.status === 'available' ? 'bg-green-100 text-green-700' :
                                  item.status === 'sold' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {item.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Payments Tab */}
              {activeTab === 'payments' && (
                <div className="space-y-4">
                  {paymentHistory.length > 0 ? (
                    paymentHistory.map((payment, index) => (
                      <div key={index} className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <CreditCard className="w-5 h-5 text-green-600" />
                              <span className="font-bold text-gray-900">
                                {payment.method?.replace('_', ' ').toUpperCase() || 'Payment'}
                              </span>
                            </div>
                            {payment.reference && (
                              <p className="text-sm text-gray-600">Ref: {payment.reference}</p>
                            )}
                            {payment.timestamp && (
                              <p className="text-xs text-gray-500 mt-1">{new Date(payment.timestamp).toLocaleString()}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">{formatCurrency(payment.amount)}</div>
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 mt-1 inline-block">
                              {payment.status || 'completed'}
                            </span>
                          </div>
                        </div>
                        {payment.notes && (
                          <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-green-200">{payment.notes}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No payments recorded yet</p>
                    </div>
                  )}
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-3">
                  {auditHistory.length > 0 ? (
                    auditHistory.map((entry, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-xl p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-gray-900">{entry.action}</div>
                            <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                            <p className="text-xs text-gray-500 mt-2">By: {entry.user}</p>
                          </div>
                          <span className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No history available</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// PAYMENT HISTORY MODAL COMPONENT
// ============================================
interface PaymentHistoryModalProps {
  order: PurchaseOrder;
  onClose: () => void;
  formatCurrency: (amount: number) => string;
}

const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({ order, onClose, formatCurrency }) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPayments = async () => {
      try {
        const data = await PurchaseOrderService.getPayments(order.id);
        setPayments(data || []);
      } catch (error) {
        console.error('Error loading payments:', error);
        toast.error('Failed to load payment history');
      } finally {
        setIsLoading(false);
      }
    };

    loadPayments();
  }, [order.id]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Payment History</h2>
              <p className="text-sm text-gray-600">Order: {order.orderNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-8 h-8 animate-spin text-green-500" />
            </div>
          ) : payments.length > 0 ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-xs text-blue-700 mb-1">Total Amount</div>
                  <div className="text-2xl font-bold text-blue-900">{formatCurrency(order.totalAmount)}</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <div className="text-xs text-green-700 mb-1">Total Paid</div>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(order.totalPaid || 0)}</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <div className="text-xs text-red-700 mb-1">Balance</div>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(order.totalAmount - (order.totalPaid || 0))}</div>
                </div>
              </div>

              {/* Payment List */}
              {payments.map((payment, index) => (
                <div key={index} className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">
                            {payment.method?.replace('_', ' ').toUpperCase() || 'Payment'}
                          </div>
                          {payment.reference && (
                            <div className="text-xs text-gray-600">Ref: {payment.reference}</div>
                          )}
                        </div>
                      </div>
                      {payment.notes && (
                        <p className="text-sm text-gray-600 mt-2">{payment.notes}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {payment.timestamp ? new Date(payment.timestamp).toLocaleString() : 'No date'}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(payment.amount)}</div>
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 mt-2 inline-block">
                        {payment.status || 'completed'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Payments Yet</h3>
              <p className="text-gray-600">No payments have been recorded for this order</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// NOTES MODAL COMPONENT
// ============================================
interface NotesModalProps {
  order: PurchaseOrder;
  onClose: () => void;
  onNoteAdded: () => void;
}

const NotesModal: React.FC<NotesModalProps> = ({ order, onClose, onNoteAdded }) => {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const loadNotes = async () => {
      try {
        const result = await PurchaseOrderActionsService.getNotes(order.id);
        if (result.success) {
          setNotes(result.data || []);
        }
      } catch (error) {
        console.error('Error loading notes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotes();
  }, [order.id]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      setIsAdding(true);
      const result = await PurchaseOrderActionsService.addNote(
        order.id,
        newNote.trim(),
        currentUser?.name || 'Unknown'
      );

      if (result.success) {
        setNotes(prev => [result.data, ...prev]);
        setNewNote('');
        toast.success('Note added successfully');
        onNoteAdded();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-yellow-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-600 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Order Notes</h2>
              <p className="text-sm text-gray-600">Order: {order.orderNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Add New Note */}
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <label className="block text-sm font-bold text-gray-900 mb-2">Add New Note</label>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Enter your note here..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 resize-none"
            />
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim() || isAdding}
              className="mt-3 w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white rounded-xl font-semibold transition-colors disabled:cursor-not-allowed"
            >
              {isAdding ? 'Adding...' : 'Add Note'}
            </button>
          </div>

          {/* Notes List */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Previous Notes ({notes.length})</h3>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-8 h-8 animate-spin text-yellow-500" />
              </div>
            ) : notes.length > 0 ? (
              <div className="space-y-3">
                {notes.map((note, index) => (
                  <div key={note.id || index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-gray-900">{note.author}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(note.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{note.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No notes yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMMUNICATION HISTORY MODAL COMPONENT
// ============================================
interface CommunicationHistoryModalProps {
  order: PurchaseOrder;
  onClose: () => void;
}

const CommunicationHistoryModal: React.FC<CommunicationHistoryModalProps> = ({ order, onClose }) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const data = await PurchaseOrderService.getMessages(order.id);
        setMessages(data || []);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [order.id]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setIsSending(true);
      const success = await PurchaseOrderService.sendMessage({
        purchaseOrderId: order.id,
        sender: currentUser?.name || 'You',
        content: newMessage,
        type: 'user'
      });

      if (success) {
        const message = {
          id: Date.now().toString(),
          sender: currentUser?.name || 'You',
          content: newMessage,
          timestamp: new Date().toISOString(),
          type: 'user'
        };
        setMessages(prev => [message, ...prev]);
        setNewMessage('');
        toast.success('Message sent');
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Communication</h2>
              <p className="text-sm text-gray-600">{order.supplier?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {messages.length > 0 ? (
                messages.map((msg, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-gray-900">{msg.sender}</span>
                      <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-gray-700">{msg.content}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No communication history</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Send Message Form */}
        <div className="p-6 border-t bg-gray-50">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            rows={3}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none mb-3"
          />
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl font-semibold transition-colors disabled:cursor-not-allowed"
            >
              {isSending ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPLETION SUMMARY MODAL COMPONENT
// ============================================
interface CompletionSummaryModalProps {
  order: PurchaseOrder;
  onClose: () => void;
  onConfirm: () => void;
  isCompleting: boolean;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
}

const CompletionSummaryModal: React.FC<CompletionSummaryModalProps> = ({
  order,
  onClose,
  onConfirm,
  isCompleting,
  formatCurrency,
  formatDate
}) => {
  // Print receipt handler
  const handlePrintReceipt = () => {
    const printContent = `
      ═══════════════════════════════════════
           PURCHASE ORDER RECEIPT
      ═══════════════════════════════════════
      
      Order Number: ${order.orderNumber}
      Supplier: ${order.supplier?.name || 'N/A'}
      Order Date: ${formatDate(order.orderDate || order.createdAt)}
      Status: ${order.status.toUpperCase()}
      
      ───────────────────────────────────────
      ITEMS SUMMARY
      ───────────────────────────────────────
      Total Items: ${order.items?.length || 0}
      Total Ordered: ${order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
      Total Received: ${order.items?.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0) || 0}
      
      ───────────────────────────────────────
      FINANCIAL SUMMARY
      ───────────────────────────────────────
      Total Amount: ${formatCurrency(order.totalAmount || 0)}
      Payment Status: ${(order.paymentStatus || 'unpaid').toUpperCase()}
      
      ═══════════════════════════════════════
      Thank you for your business!
      ═══════════════════════════════════════
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Purchase Order Receipt - ${order.orderNumber}</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
              }
              pre {
                white-space: pre-wrap;
                font-size: 14px;
                line-height: 1.6;
              }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <pre>${printContent}</pre>
            <script>
              window.onload = () => {
                window.print();
                // Uncomment to auto-close after printing
                // setTimeout(() => window.close(), 100);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Share on WhatsApp handler
  const handleShareWhatsApp = () => {
    const message = `
*PURCHASE ORDER COMPLETED* ✅

*Order Number:* ${order.orderNumber}
*Supplier:* ${order.supplier?.name || 'N/A'}
*Order Date:* ${formatDate(order.orderDate || order.createdAt)}
*Status:* ${order.status.toUpperCase()}

*Items Summary:*
━━━━━━━━━━━━━━━━
• Total Items: ${order.items?.length || 0}
• Total Ordered: ${order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
• Total Received: ${order.items?.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0) || 0}

*Financial Summary:*
━━━━━━━━━━━━━━━━
• Total Amount: ${formatCurrency(order.totalAmount || 0)}
• Payment Status: ${(order.paymentStatus || 'unpaid').toUpperCase()}

Thank you for your business! 🙏
    `.trim();
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        {/* Header */}
        <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center shadow-lg">
              <CheckSquare className="w-10 h-10 text-white" />
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Complete Purchase Order</h2>
          <p className="text-gray-700">Review the order summary before completing</p>
        </div>

        {/* Content */}
        <div className="p-8 max-h-[60vh] overflow-y-auto">
          <div className="space-y-6">
            {/* Order Information */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Order Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Order Number</p>
                  <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Supplier</p>
                  <p className="font-semibold text-gray-900">{order.supplier?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Order Date</p>
                  <p className="font-semibold text-gray-900">
                    {formatDate(order.orderDate || order.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    {order.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Items Summary */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                Items Summary
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900">{order.items?.length || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Total Ordered</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">Total Received</p>
                  <p className="text-2xl font-bold text-green-600">
                    {order.items?.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0) || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Financial Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Total Amount</span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatCurrency(order.totalAmount || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Payment Status</span>
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                    order.paymentStatus === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {(order.paymentStatus || 'unpaid').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900 mb-1">Important</p>
                  <p className="text-sm text-yellow-800">
                    Completing this order will finalize all transactions and mark it as complete. 
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-6">
          {/* Primary Actions */}
          <div className="flex gap-3 mb-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handlePrintReceipt}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-lg"
              title="Print Receipt"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors shadow-lg"
              title="Share on WhatsApp"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={onConfirm}
              disabled={isCompleting}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-xl transition-colors font-semibold shadow-lg flex items-center justify-center gap-2"
            >
              {isCompleting ? (
                <>
                  <LoadingSpinner size="sm" color="white" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckSquare className="w-5 h-5" />
                  Confirm & Complete
                </>
              )}
            </button>
          </div>
          
          {/* Secondary Info */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <Info className="w-3 h-3" />
            <span>Print receipt or share via WhatsApp before completing</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderManagementModal;