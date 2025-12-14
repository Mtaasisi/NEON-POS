import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  Package, Search, Plus, RefreshCw,
  AlertCircle, Edit, Eye, Trash2, DollarSign, FileText,
  Clock, CheckSquare, Send, CheckCircle, CreditCard, Copy, PackageCheck, Calculator, XCircle, MoreVertical, Zap, Truck, BarChart3, Users, X,
  ChevronDown, ChevronUp, MessageSquare, Mail, MapPin, ShoppingCart, Calendar, Building, Printer
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useInventoryStore } from '../stores/useInventoryStore';
import { useDialog } from '../../shared/hooks/useDialog';
import { BackButton } from '../../shared/components/ui/BackButton';
import GlassCard from '../../shared/components/ui/GlassCard';
import CBMCalculatorModal from '../../calculator/components/CBMCalculatorModal';
import { supabase } from '../../../lib/supabaseClient';
import StyledActionMenu, { ActionMenuItem } from '../components/purchase-order/StyledActionMenu';
import { useLoadingJob } from '../../../hooks/useLoadingJob';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';

// Enhanced PO components
import { POAnalyticsWidget } from '../components/purchase-order/POAnalyticsWidget';
import { POCollaborationWidget } from '../components/purchase-order/POCollaborationWidget';
import { POApprovalWorkflow } from '../components/purchase-order/POApprovalWorkflow';
import { POReportingAnalytics } from '../components/purchase-order/POReportingAnalytics';
import ComprehensivePaymentModal from '../components/pos/ComprehensivePaymentModal';
import PurchaseOrderDetailsModal from '../components/purchase-order/PurchaseOrderDetailsModal';
import ManageSuppliersModal from '../components/purchase-order/ManageSuppliersModal';

const PurchaseOrdersPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { confirm } = useDialog();
  const { startLoading, completeLoading, failLoading } = useLoadingJob();
  
  // Database state management
  const { 
    purchaseOrders, 
    isLoading, 
    error,
    loadPurchaseOrders,
    deletePurchaseOrder,
    approvePurchaseOrder,
    updatePurchaseOrder,
  } = useInventoryStore();


  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'received'>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'orderNumber' | 'totalAmount'>('createdAt');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showCbmCalculator, setShowCbmCalculator] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const moreButtonRefs = React.useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [itemsCollapsed, setItemsCollapsed] = useState<{ [key: string]: boolean }>({});

  // Enhanced feature states
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [showApprovalWorkflow, setShowApprovalWorkflow] = useState(false);
  const [showReporting, setShowReporting] = useState(false);
  const [showComprehensivePayment, setShowComprehensivePayment] = useState(false);
  const [selectedPOForPayment, setSelectedPOForPayment] = useState<any>(null);
  
  // Purchase Order Details Modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<any>(null);
  
  // Manage Suppliers Modal state
  const [showManageSuppliersModal, setShowManageSuppliersModal] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const PAGE_SCALE = 0.6; // Scale down page similar to inventory

  // Close dropdown when clicking outside or on escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openDropdownId) {
        setOpenDropdownId(null);
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [openDropdownId]);

  // Load suppliers function
  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('lats_suppliers')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error loading suppliers:', error);
        return;
      }
      
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  // Enhanced load function with timestamp
  const handleLoadPurchaseOrders = async () => {
    console.log('🔄 [PurchaseOrdersPage] Loading purchase orders...');
    const jobId = startLoading('Loading purchase orders...');
    const startTime = Date.now();
    try {
      await loadPurchaseOrders();
      await loadSuppliers(); // Load suppliers as well
      const endTime = Date.now();
      setLastUpdated(new Date());
      completeLoading(jobId);
      console.log(`✅ [PurchaseOrdersPage] Purchase orders loaded in ${endTime - startTime}ms`);
      console.log('📊 [PurchaseOrdersPage] Total orders:', purchaseOrders?.length || 0);
    } catch (error) {
      console.error('❌ [PurchaseOrdersPage] Error loading purchase orders:', error);
      failLoading(jobId, 'Failed to load purchase orders');
    }
  };

  // Load purchase orders on component mount
  useEffect(() => {
    handleLoadPurchaseOrders();
  }, []);

  // Log purchase orders data when loaded
  useEffect(() => {
    if (purchaseOrders && purchaseOrders.length > 0 && !isLoading) {
      console.log('🔍 [PurchaseOrdersPage] Purchase orders data:', purchaseOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        currency: order.currency,
        exchangeRate: order.exchangeRate,
        totalAmountBaseCurrency: order.totalAmountBaseCurrency,
        itemsCount: order.items?.length || 0,
        items: order.items?.map(item => ({
          id: item.id,
          quantity: item.quantity,
          costPrice: item.costPrice,
          totalPrice: item.totalPrice,
          productName: item.product?.name,
          variantName: item.variant?.name
        })),
        supplier: order.supplier ? {
          id: order.supplier.id,
          name: order.supplier.name,
          country: order.supplier.country
        } : null
      })));
    }
  }, [purchaseOrders, isLoading]);

  // Filter and sort purchase orders
  const filteredOrders = useMemo(() => {
    console.log('🔍 [PurchaseOrdersPage] Filtering orders:', {
      totalOrders: purchaseOrders?.length || 0,
      searchQuery,
      statusFilter,
      sortBy,
      sortOrder
    });
    
    let filtered = purchaseOrders || [];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      console.log(`🔎 [PurchaseOrdersPage] Search filtered: ${filtered.length} orders match "${searchQuery}"`);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
      console.log(`📋 [PurchaseOrdersPage] Status filtered: ${filtered.length} orders with status "${statusFilter}"`);
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

    console.log(`✅ [PurchaseOrdersPage] Final filtered result: ${filtered.length} orders`);
    return filtered;
  }, [purchaseOrders, searchQuery, statusFilter, sortBy, sortOrder]);

  // Handle order actions
  const handleDeleteOrder = async (orderId: string) => {
    const order = purchaseOrders?.find(o => o.id === orderId);
    if (!order) {
      toast.error('Order not found');
      return;
    }
    
    if (order.status !== 'draft') {
      toast.error('Only draft orders can be deleted');
      return;
    }
    
    console.log('🗑️ [PurchaseOrdersPage] Delete order requested:', orderId);
    const confirmed = await confirm('Are you sure you want to delete this purchase order? This action cannot be undone.');
    if (!confirmed) return;
    
    try {
      console.log('✅ [PurchaseOrdersPage] Delete confirmed, proceeding...');
      const response = await deletePurchaseOrder(orderId);
      if (response.ok) {
        console.log('✅ [PurchaseOrdersPage] Order deleted successfully');
        toast.success('Purchase order deleted successfully');
        await loadPurchaseOrders(); // Refresh data - matching PurchaseOrderDetailsModal
      } else {
        console.error('❌ [PurchaseOrdersPage] Failed to delete order:', response.message);
        toast.error(response.message || 'Failed to delete purchase order');
      }
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      toast.error('Failed to delete purchase order');
    }
  };

  const getStatusColor = (status: string) => {
    // Option B Workflow colors
    switch (status) {
      case 'draft': return 'bg-gray-500 text-white shadow-sm';
      case 'sent': return 'bg-blue-600 text-white shadow-sm';
      case 'confirmed': return 'bg-indigo-600 text-white shadow-sm';
      case 'partial_received': return 'bg-orange-500 text-white shadow-sm';
      case 'received': return 'bg-sky-500 text-white shadow-sm';
      case 'completed': return 'bg-green-600 text-white shadow-sm';
      case 'cancelled': return 'bg-red-600 text-white shadow-sm';
      default: return 'bg-gray-400 text-white shadow-sm';
    }
  };

  const getStatusIcon = (status: string) => {
    // Option B Workflow icons
    switch (status) {
      case 'draft': return <FileText className="w-3 h-3" />;
      case 'sent': return <Send className="w-3 h-3" />;
      case 'confirmed': return <CheckCircle className="w-3 h-3" />;
      case 'partial_received': return <PackageCheck className="w-3 h-3" />;
      case 'received': return <CheckSquare className="w-3 h-3" />;
      case 'completed': return <CheckCircle className="w-3 h-3" />;
      case 'cancelled': return <XCircle className="w-3 h-3" />;
      default: return <Package className="w-3 h-3" />;
    }
  };

  const formatCurrency = (amount: number | string, currencyCode: string = 'TSh') => {
    console.log('🔍 [formatCurrency] Input:', { amount, currencyCode, type: typeof amount });
    
    // Ensure amount is a number
    const numAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : (amount || 0);
    
    if (!numAmount || numAmount === 0) return 'TSh 0';
    
    // Handle different currencies
    if (currencyCode === 'TSh' || currencyCode === 'TZS' || !currencyCode) {
      const formatted = `TSh ${numAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      console.log('🔍 [formatCurrency] TSh result:', formatted);
      return formatted;
    }
    
    try {
      const formatted = new Intl.NumberFormat('en-TZ', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(numAmount);
      console.log('🔍 [formatCurrency] Intl result:', formatted);
      return formatted;
    } catch (error) {
      // Fallback for unsupported currencies
      const formatted = `${currencyCode} ${numAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      console.log('🔍 [formatCurrency] Fallback result:', formatted);
      return formatted;
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not set';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Not set';
    
    return date.toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  /**
   * Action Buttons Workflow
   * 
   * Purchase Order Status Flow:
   * ┌─────────┐     ┌─────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐     ┌───────────┐
   * │  Draft  │ --> │   Sent  │ --> │Confirmed │ --> │Partial_Recvd │ --> │ Received │ --> │ Completed │
   * └─────────┘     └─────────┘     └──────────┘     └──────────────┘     └──────────┘     └───────────┘
   *     │                │                 │                    │                    │                  │
   *     │                │                 │                    │                    │                  │
   *     ▼                ▼                 ▼                    ▼                    ▼                  ▼
   * [Send]          [Pay First]        [Pay First]        [Pay First]          [Complete]        [Duplicate]
   * [Delete]        [Receive]*         [Receive]*         [Continue]*          [Quality]         [Print]
   * [Edit]          [Print]            [Print]            [Print]              [Duplicate]       [View]
   * [View]          [Edit]             [Edit]             [Edit]              [Print]           
   *                 [View]             [View]             [View]              [Edit]
   *                                                                             [View]
   * 
   * * Receive actions are ONLY enabled if payment is complete (totalPaid >= totalAmount)
   * 
   * Payment Requirement:
   * - Items CANNOT be received until payment is fully completed
   * - "Receive Items" button is disabled (gray) if payment is not complete
   * - User must click "Make Payment" first to process payment
   * 
   * Common Actions (available for most statuses):
   * - Edit: Available for draft, sent, confirmed, shipped
   * - View Details: Always available
   * - Duplicate: Available for all except cancelled (handled separately)
   * - Print: Available for sent, confirmed, partial_received, received, completed
   * - Make Payment: Available for all statuses except completed/cancelled (if not fully paid)
   * 
   * Special Cases:
   * - Cancelled: Can be restored to draft or duplicated
   * - Partial_Received: Shows remaining quantity in button label
   */
  const getSmartActionButtons = (order: any) => {
    const actions = [];
    
    // Validate status - Option B workflow only
    const validStatuses = ['draft', 'sent', 'confirmed', 'partial_received', 'received', 'completed', 'cancelled'];
    const orderStatus = validStatuses.includes(order.status) ? order.status : 'draft';
    
    if (orderStatus !== order.status) {
      console.warn(`⚠️ Invalid PO status detected: "${order.status}" for order ${order.id} - using "draft" as fallback`);
    }
    
    // Option B Workflow: Draft → Sent → Confirmed → Partial_Received → Received → Completed
    switch (orderStatus) {
      case 'draft':
        // Draft - Send to supplier
        actions.push({
          type: 'send',
          label: 'Send to Supplier',
          icon: <Send className="w-4 h-4" />,
          color: 'bg-green-600 hover:bg-green-700',
          onClick: () => handleApproveAndSend(order.id)
        });
        if (hasPermission('delete')) {
          actions.push({
            type: 'delete',
            label: 'Delete',
            icon: <Trash2 className="w-4 h-4" />,
            color: 'bg-red-600 hover:bg-red-700',
            onClick: () => handleDeleteOrder(order.id)
          });
        }
        break;
      
      case 'sent':
        // Sent - Check payment status before allowing receive
        const sentTotalAmount = order.totalAmountBaseCurrency || order.totalAmount || 0;
        const sentTotalPaid = order.totalPaidBaseCurrency || order.totalPaid || 0;
        const sentIsPaid = sentTotalPaid >= sentTotalAmount;
        
        if (sentIsPaid) {
          // Payment complete - allow receiving
        actions.push({
          type: 'receive',
          label: 'Receive Items',
          icon: <Package className="w-4 h-4" />,
          color: 'bg-green-600 hover:bg-green-700',
            onClick: () => handleReceiveItems(order)
          });
        } else {
          // Payment not complete - show message
          actions.push({
            type: 'receive',
            label: 'Receive Items',
            icon: <Package className="w-4 h-4" />,
            color: 'bg-gray-400 hover:bg-gray-500',
            disabled: true,
            onClick: () => {
              toast.error('Payment required before receiving items. Please make payment first.');
            }
          });
        }
        // Add Print
        actions.push({
          type: 'print',
          label: 'Print',
          icon: <Printer className="w-4 h-4" />,
          color: 'bg-gray-600 hover:bg-gray-700',
          onClick: () => {
            window.print();
            toast.success('Preparing print view...');
          }
        });
        break;
      
      case 'confirmed':
        // Confirmed - Check payment status before allowing receive
        const confirmedTotalAmount = order.totalAmountBaseCurrency || order.totalAmount || 0;
        const confirmedTotalPaid = order.totalPaidBaseCurrency || order.totalPaid || 0;
        const confirmedIsPaid = confirmedTotalPaid >= confirmedTotalAmount;
        
        if (confirmedIsPaid) {
          // Payment complete - allow receiving
        actions.push({
          type: 'receive',
          label: 'Receive Items',
          icon: <Package className="w-4 h-4" />,
          color: 'bg-green-600 hover:bg-green-700',
            onClick: () => handleReceiveItems(order)
          });
        } else {
          // Payment not complete - show message
          actions.push({
            type: 'receive',
            label: 'Receive Items',
            icon: <Package className="w-4 h-4" />,
            color: 'bg-gray-400 hover:bg-gray-500',
            disabled: true,
            onClick: () => {
              toast.error('Payment required before receiving items. Please make payment first.');
            }
          });
        }
        // Add Print
        actions.push({
          type: 'print',
          label: 'Print',
          icon: <Printer className="w-4 h-4" />,
          color: 'bg-gray-600 hover:bg-gray-700',
          onClick: () => {
            window.print();
            toast.success('Preparing print view...');
          }
        });
        break;
      
      case 'partial_received':
        // Partial Received - Check payment status before allowing continue
        const partialTotalAmount = order.totalAmountBaseCurrency || order.totalAmount || 0;
        const partialTotalPaid = order.totalPaidBaseCurrency || order.totalPaid || 0;
        const partialIsPaid = partialTotalPaid >= partialTotalAmount;
        const totalOrdered = order.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
        const totalReceived = order.items?.reduce((sum: number, item: any) => sum + (item.receivedQuantity || 0), 0) || 0;
        const remaining = totalOrdered - totalReceived;
        
        if (partialIsPaid) {
          // Payment complete - allow continuing to receive
        actions.push({
          type: 'receive',
          label: `Continue (${remaining} left)`,
          icon: <Package className="w-4 h-4" />,
          color: 'bg-orange-600 hover:bg-orange-700',
            onClick: () => handleReceiveItems(order)
          });
        } else {
          // Payment not complete - show message
          actions.push({
            type: 'receive',
            label: `Continue (${remaining} left)`,
            icon: <Package className="w-4 h-4" />,
            color: 'bg-gray-400 hover:bg-gray-500',
            disabled: true,
            onClick: () => {
              toast.error('Payment required before receiving remaining items. Please make payment first.');
            }
          });
        }
        // Add Print
        actions.push({
          type: 'print',
          label: 'Print',
          icon: <Printer className="w-4 h-4" />,
          color: 'bg-gray-600 hover:bg-gray-700',
          onClick: () => {
            window.print();
            toast.success('Preparing print view...');
          }
        });
        break;
      
      case 'received':
        // Received - Complete order (matching OrderManagementModal)
        actions.push({
          type: 'complete',
          label: 'Complete Order',
          icon: <CheckSquare className="w-4 h-4" />,
          color: 'bg-green-600 hover:bg-green-700',
          onClick: () => handleCompleteOrder(order.id)
        });
        // Quality Check - Open in new tab to avoid navigation
        actions.push({
          type: 'quality',
          label: 'Quality Check',
          icon: <PackageCheck className="w-4 h-4" />,
          color: 'bg-purple-600 hover:bg-purple-700',
          onClick: () => {
            window.open(`/lats/purchase-orders/${order.id}?tab=quality`, '_blank');
            toast.success('Opening quality check in new tab...');
          }
        });
        // Duplicate
        actions.push({
          type: 'duplicate',
          label: 'Duplicate',
          icon: <Copy className="w-4 h-4" />,
          color: 'bg-indigo-600 hover:bg-indigo-700',
          onClick: () => navigate(`/lats/purchase-order/create?duplicate=${order.id}`)
        });
        // Print
        actions.push({
          type: 'print',
          label: 'Print',
          icon: <Printer className="w-4 h-4" />,
          color: 'bg-gray-600 hover:bg-gray-700',
          onClick: () => {
            window.print();
            toast.success('Preparing print view...');
          }
        });
        break;

      case 'completed':
        // Completed - Duplicate option
        actions.push({
          type: 'duplicate',
          label: 'Duplicate',
          icon: <Copy className="w-4 h-4" />,
          color: 'bg-blue-600 hover:bg-blue-700',
          onClick: () => navigate(`/lats/purchase-order/create?duplicate=${order.id}`)
        });
        // Add Print
        actions.push({
          type: 'print',
          label: 'Print',
          icon: <Printer className="w-4 h-4" />,
          color: 'bg-gray-600 hover:bg-gray-700',
          onClick: () => {
            window.print();
            toast.success('Preparing print view...');
          }
        });
        // View Details - Details already visible in expanded view, so skip
        // If user wants full page view, they can navigate manually
        break;
      
      case 'cancelled':
        // Cancelled - Restore and Duplicate
        actions.push({
          type: 'restore',
          label: 'Restore',
          icon: <RefreshCw className="w-4 h-4" />,
          color: 'bg-green-600 hover:bg-green-700',
          onClick: async () => {
            const confirmed = await confirm('Are you sure you want to restore this order to draft?');
            if (!confirmed) return;
            
            try {
              const response = await updatePurchaseOrder(order.id, { status: 'draft' });
              if (response.ok) {
                toast.success('Order restored to draft');
                await loadPurchaseOrders(); // Refresh data - matching PurchaseOrderDetailsModal
              } else {
                toast.error(response.message || 'Failed to restore order');
              }
            } catch (error) {
              console.error('Error restoring order:', error);
              toast.error('Failed to restore order');
            }
          }
        });
        actions.push({
          type: 'duplicate',
          label: 'Duplicate',
          icon: <Copy className="w-4 h-4" />,
          color: 'bg-blue-600 hover:bg-blue-700',
          onClick: () => navigate(`/lats/purchase-order/create?duplicate=${order.id}`)
        });
        break;
        
      default:
        // Should never reach here due to validation above
        console.warn(`⚠️ Unexpected PO status after validation: ${orderStatus}`);
        break;
    }
    
    // Add payment button for orders that can receive payments (not completed/cancelled and not fully paid)
    if (orderStatus !== 'completed' && orderStatus !== 'cancelled') {
      const totalAmount = order.totalAmountBaseCurrency || order.totalAmount || 0;
      const totalPaid = order.totalPaidBaseCurrency || order.totalPaid || 0;
      const isFullyPaid = totalPaid >= totalAmount;
      
      if (!isFullyPaid && totalAmount > 0) {
        // Add payment button before other secondary actions
    actions.push({
          type: 'payment',
          label: 'Make Payment',
          icon: <CreditCard className="w-4 h-4" />,
          color: 'bg-orange-600 hover:bg-orange-700',
          onClick: () => handleMakePayment(order)
        });
      }
    }
    
    // Add common secondary actions for all statuses (matching OrderManagementModal pattern)
    // Edit button for editable orders (draft, sent, confirmed, shipped)
    if (['draft', 'sent', 'confirmed', 'shipped'].includes(orderStatus)) {
      // Check if edit is not already added
      if (!actions.find(a => a.type === 'edit')) {
    actions.push({
          type: 'edit',
          label: 'Edit Order',
          icon: <Edit className="w-4 h-4" />,
          color: 'bg-purple-600 hover:bg-purple-700',
          onClick: () => navigate(`/lats/purchase-order/create?edit=${order.id}`)
        });
      }
    }
    
    // View Details - Since we're already in expanded view, just show a message or do nothing
    // Only add if not already added and not in expanded view context
    // For expanded view, details are already visible, so we skip this action
    // if (!actions.find(a => a.type === 'view')) {
    //   actions.push({
    //     type: 'view',
    //     label: 'View Details',
    //     icon: <Eye className="w-4 h-4" />,
    //     color: 'bg-blue-600 hover:bg-blue-700',
    //     onClick: () => {
    //       toast.success('Details are already visible in the expanded view');
    //     }
    //   });
    // }
    
    // Duplicate (if not already added and not cancelled)
    if (!actions.find(a => a.type === 'duplicate') && orderStatus !== 'cancelled') {
      actions.push({
        type: 'duplicate',
        label: 'Duplicate',
        icon: <Copy className="w-4 h-4" />,
        color: 'bg-indigo-600 hover:bg-indigo-700',
        onClick: () => navigate(`/lats/purchase-order/create?duplicate=${order.id}`)
      });
    }

    return actions;
  };

  // Get all dropdown actions for the More button in styled format
  const getStyledMenuActions = (order: any): ActionMenuItem[] => {
    const actions: ActionMenuItem[] = [];

    // View Details (always available)
    actions.push({
      id: 'view',
      label: 'View Details',
      description: 'See complete order information',
      icon: <Eye className="w-5 h-5" />,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-50',
      onClick: () => navigate(`/lats/purchase-orders/${order.id}`)
    });

    // Edit (for draft, sent, confirmed, and shipped orders - before receiving)
    if (['draft', 'sent', 'confirmed', 'shipped'].includes(order.status)) {
      actions.push({
        id: 'edit',
        label: 'Edit Order',
        description: 'Modify order details and items',
        icon: <Edit className="w-5 h-5" />,
        color: 'bg-green-500',
        hoverColor: 'hover:bg-green-50',
        onClick: () => navigate(`/lats/purchase-order/create?edit=${order.id}`)
      });
    }

    // Duplicate (always available)
    actions.push({
      id: 'duplicate',
      label: 'Duplicate Order',
      description: 'Create a copy of this order',
      icon: <Copy className="w-5 h-5" />,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-50',
      onClick: () => navigate(`/lats/purchase-order/create?duplicate=${order.id}`)
    });

    // Generate Documents
    actions.push({
      id: 'pdf',
      label: 'Generate PDF',
      description: 'Download order as PDF document',
      icon: <FileText className="w-5 h-5" />,
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-50',
      onClick: () => {
        toast.success('Generating PDF...');
        navigate(`/lats/purchase-orders/${order.id}?action=print`);
      }
    });

    // Payment (if not completed)
    if (order.status !== 'completed' && order.status !== 'cancelled') {
      actions.push({
        id: 'payment',
        label: 'Manage Payment',
        description: 'Record or update payment status',
        icon: <CreditCard className="w-5 h-5" />,
        color: 'bg-indigo-500',
        hoverColor: 'hover:bg-indigo-50',
        onClick: () => navigate(`/lats/purchase-orders/${order.id}?tab=payment`)
      });
    }

    // Quality Check (for received orders)
    if (order.status === 'received' || order.status === 'partial_received') {
      actions.push({
        id: 'quality',
        label: 'Quality Check',
        description: 'Mark items as quality verified',
        icon: <PackageCheck className="w-5 h-5" />,
        color: 'bg-teal-500',
        hoverColor: 'hover:bg-teal-50',
        onClick: () => navigate(`/lats/purchase-orders/${order.id}?tab=quality`)
      });
    }

    // Delete (always available - add divider for separation)
    actions.push({
      id: 'delete',
      label: 'Delete Order',
      description: 'Permanently remove this order from database',
      icon: <Trash2 className="w-5 h-5" />,
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-50',
      onClick: () => handleDeleteOrder(order.id),
      divider: true // Add visual separation before destructive action
    });

    return actions;
  };
  
  // Combined approve and send handler - matching PurchaseOrderDetailsModal
  const handleApproveAndSend = async (orderId: string) => {
    try {
      const response = await approvePurchaseOrder(orderId);
      if (response.ok) {
        // After approval, automatically update to sent
        const sendResponse = await updatePurchaseOrder(orderId, { status: 'sent' });
        if (sendResponse.ok) {
          toast.success('Order approved and sent to supplier');
          await loadPurchaseOrders(); // Refresh data
        } else {
          toast.success('Order approved (send manually from details)');
          await loadPurchaseOrders(); // Refresh data
        }
      } else {
        toast.error(response.message || 'Failed to approve order');
      }
    } catch (error) {
      console.error('Error approving and sending order:', error);
      toast.error('Failed to process order');
    }
  };
  
  // Permission check helper
  const hasPermission = (_action: string) => {
    // This is a simplified check - adjust based on your auth context
    return true; // Placeholder
  };

  // Complete order handler - matching PurchaseOrderDetailsModal
  const handleCompleteOrder = async (orderId: string) => {
    const order = purchaseOrders?.find(o => o.id === orderId);
    if (!order) {
      toast.error('Order not found');
      return;
    }
    
    if (order.status !== 'received') {
      toast.error('Order must be received before completing');
      return;
    }
    
    const confirmed = await confirm('Are you sure you want to complete this purchase order?');
    if (!confirmed) return;
    
    try {
      const response = await updatePurchaseOrder(orderId, { status: 'completed' });
      if (response.ok) {
        toast.success('Purchase order completed successfully');
        await loadPurchaseOrders(); // Refresh data
      } else {
        toast.error(response.message || 'Failed to complete purchase order');
      }
    } catch (error) {
      console.error('Error completing purchase order:', error);
      toast.error('Failed to complete purchase order');
    }
  };

  // Make payment handler
  const handleMakePayment = (order: any) => {
    // Prevent payment if order is already fully paid
    const totalAmount = order.totalAmountBaseCurrency || order.totalAmount || 0;
    const totalPaid = order.totalPaidBaseCurrency || order.totalPaid || 0;
    
    if (totalPaid >= totalAmount) {
      toast.error('This purchase order has already been fully paid');
      return;
    }
    
    // Check if there's nothing left to pay
    if (totalAmount === 0) {
      toast.error('Cannot make payment: Purchase order has no total amount. Please add items to the order first.');
      return;
    }
    
    // Set the selected order and open payment modal
    setSelectedPOForPayment(order);
    setShowComprehensivePayment(true);
  };

  // Handle receive items with payment validation
  const handleReceiveItems = (order: any) => {
    // Check payment status before allowing receive
    const totalAmount = order.totalAmountBaseCurrency || order.totalAmount || 0;
    const totalPaid = order.totalPaidBaseCurrency || order.totalPaid || 0;
    const isPaid = totalPaid >= totalAmount;
    
    if (!isPaid) {
      toast.error('Payment required before receiving items. Please make payment first.');
      return;
    }
    
    // Payment is complete - allow receiving
    navigate(`/lats/purchase-orders/${order.id}?action=receive`);
  };

  // Auto-create PO for iPhone 14 Pro 256GB Deep Purple
  const handleAutoCreateiPhonePO = async () => {
    try {
      toast.loading('Creating automatic PO for iPhone 14 Pro 256GB Deep Purple...', { id: 'auto-po' });

      // Find the product and variant by SKU
      const { data: variants, error: variantError } = await supabase
        .from('lats_product_variants')
        .select(`
          id,
          product_id,
          variant_name,
          sku,
          cost_price,
          selling_price
        `)
        .eq('variant_name', 'iPhone 14 Pro 256GB Deep Purple')
        .limit(1);

      if (variantError || !variants || variants.length === 0) {
        toast.error('Could not find iPhone 14 Pro 256GB Deep Purple variant', { id: 'auto-po' });
        return;
      }

      const variant = variants[0];

      // Get the first active supplier
      const { data: suppliers, error: supplierError } = await supabase
        .from('lats_suppliers')
        .select('id, name')
        .eq('is_active', true)
        .limit(1);

      if (supplierError || !suppliers || suppliers.length === 0) {
        toast.error('No active suppliers found', { id: 'auto-po' });
        return;
      }

      const supplier = suppliers[0];

      // Prepare PO data
      const poData = {
        supplierId: supplier.id,
        expectedDelivery: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        notes: `Auto-created PO for iPhone 14 Pro 256GB Deep Purple - Quantity: 2 | Status: Approved & Sent to Supplier`,
        status: 'sent', // Already approved and sent to supplier
        currency: 'USD',
        paymentTerms: 'Net 30',
        exchangeRate: 1.0,
        baseCurrency: 'TZS',
        exchangeRateSource: 'manual',
        exchangeRateDate: new Date().toISOString(),
        items: [
          {
            productId: variant.product_id,
            variantId: variant.id,
            quantity: 2,
            costPrice: 1000, // As specified
            sellingPrice: variant.selling_price || 1200,
            minimumOrderQty: 1,
            notes: 'iPhone 14 Pro 256GB Deep Purple - Auto-generated'
          }
        ]
      };

      // Create the purchase order
      const result = await useInventoryStore.getState().createPurchaseOrder(poData);

      if (result.ok) {
        toast.success(`✅ PO Created & Sent to Supplier! Total: $2000 | Ready for Payment`, { id: 'auto-po', duration: 4000 });
        await handleLoadPurchaseOrders();
        
        // Navigate to the newly created PO with payment tab
        if (result.data?.id) {
          setTimeout(() => {
            navigate(`/lats/purchase-orders/${result.data.id}?tab=payment`);
          }, 1500);
        }
      } else {
        toast.error(result.message || 'Failed to create purchase order', { id: 'auto-po' });
      }
    } catch (error) {
      console.error('Error creating automatic PO:', error);
      toast.error('Failed to create automatic purchase order', { id: 'auto-po' });
    }
  };

  return (
    <div className="p-4 sm:p-6 flex justify-center">
      <div
        className="max-w-7xl w-full"
        style={{
          transform: `scale(${PAGE_SCALE})`,
          transformOrigin: 'top center',
          width: `${100 / PAGE_SCALE}%`,
          imageRendering: 'crisp-edges',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          textRendering: 'optimizeLegibility'
        }}
      >
      {/* Combined Container - All sections in one */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-visible flex flex-col">
        {/* Fixed Header Section - Enhanced Modal Style */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Left: Icon + Text */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Purchase Orders</h1>
                <p className="text-sm text-gray-600">Manage your purchase orders and inventory</p>
              </div>
            </div>

            {/* Right: Back Button */}
            <BackButton to="/lats" label="" className="!w-12 !h-12 !p-0 !rounded-full !bg-blue-600 hover:!bg-blue-700 !shadow-lg flex items-center justify-center" iconClassName="text-white" />
          </div>
      </div>

        {/* Action Bar - Enhanced Design */}
        <div className="px-8 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/50 flex-shrink-0">
          <div className="flex gap-3 flex-wrap">
            {/* Create PO Button */}
            <button
              onClick={() => navigate('/lats/purchase-order/create')}
              className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg hover:from-orange-600 hover:to-amber-700"
            >
              <Plus size={18} />
              <span>Create PO</span>
            </button>

            {/* CBM Calculator Button */}
            <button
              onClick={() => setShowCbmCalculator(true)}
              className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:from-green-600 hover:to-emerald-700"
              title="CBM Calculator"
            >
              <Calculator size={18} />
              <span>CBM Calculator</span>
            </button>

            {/* Manage Suppliers Button */}
            <button
              onClick={() => setShowManageSuppliersModal(true)}
              className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:from-blue-600 hover:to-blue-700"
            >
              <Building size={18} />
              <span>Manage Suppliers</span>
            </button>
          </div>
        </div>

        {/* Main Content - flows with page scroll */}
        <div className="flex-1">
            {/* Fixed Statistics Section */}
            <div className="p-6 pb-0 flex-shrink-0">
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
                  gap: '1rem'
              }}
            >
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm hover:shadow-md">
          <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <Package className="w-6 h-6 text-white" />
                    </div>
            <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{filteredOrders.length}</p>
            </div>
          </div>
        </div>
        
                <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 hover:bg-green-100 hover:border-green-300 transition-all shadow-sm hover:shadow-md">
          <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
            <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(filteredOrders.reduce((sum: number, order: any) => {
                  // Use totalAmountBaseCurrency (TZS) first - this is the correct value for multi-currency orders
                  if (order.totalAmountBaseCurrency && order.totalAmountBaseCurrency > 0) {
                    return sum + order.totalAmountBaseCurrency;
                  }
                  
                  // Fallback: If base currency not available, use totalAmount and convert if needed
                  if (order.totalAmount && order.totalAmount > 0) {
                    // If currency is not TZS, convert using exchange rate
                    if (order.currency && order.currency !== 'TZS' && order.exchangeRate && order.exchangeRate > 0) {
                      return sum + (order.totalAmount * order.exchangeRate);
                    }
                    // If already TZS or no currency specified, use as-is
                    return sum + order.totalAmount;
                  }
                  
                  // Calculate from items as last resort
                  if (order.items && order.items.length > 0) {
                    const totalFromItems = order.items.reduce((itemSum: number, item: any) => {
                      return itemSum + (item.totalPrice || (item.quantity * item.costPrice));
                    }, 0);
                    
                    // Convert to TZS if needed
                    if (order.currency && order.currency !== 'TZS' && order.exchangeRate && order.exchangeRate > 0) {
                      return sum + (totalFromItems * order.exchangeRate);
                    }
                    return sum + totalFromItems;
                  }
                  
                  return sum;
                }, 0), 'TSh')}
              </p>
            </div>
          </div>
        </div>
        
                <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 hover:bg-orange-100 hover:border-orange-300 transition-all shadow-sm hover:shadow-md">
          <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
            <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{filteredOrders.filter((order: any) => order.status === 'draft' || order.status === 'sent' || order.status === 'partial_received').length}</p>
            </div>
          </div>
        </div>
        
                <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-5 hover:bg-purple-100 hover:border-purple-300 transition-all shadow-sm hover:shadow-md">
          <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
            <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{filteredOrders.filter((order: any) => order.status === 'received').length}</p>
            </div>
          </div>
        </div>
      </div>
      </div>

            {/* Fixed Search and Filters Section - Enhanced */}
            <div className="p-6 pb-0 flex-shrink-0 border-t border-gray-100 bg-white">
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search orders, suppliers, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-gray-900 bg-white font-medium"
              />
            </div>
          </div>

                  {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-gray-900 bg-white font-medium min-w-[140px]"
            >
              <option value="all">All Status</option>
              <option value="sent">Sent</option>
              <option value="received">Received</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-gray-900 bg-white font-medium min-w-[160px]"
            >
              <option value="createdAt">Date Created</option>
              <option value="orderNumber">Order Number</option>
              <option value="totalAmount">Total Amount</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={handleLoadPurchaseOrders}
              disabled={isLoading}
                      className="flex items-center gap-2 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-orange-300 transition-all disabled:opacity-50 bg-white font-medium"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" color="blue" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Refresh</span>
            </button>
                  </div>
                </div>
            
                {/* Enhanced Feature Buttons Row */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAnalytics(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all shadow-sm hover:shadow-md font-medium text-sm"
                title="PO Analytics"
              >
                <BarChart3 className="w-4 h-4" />
                      <span className="hidden sm:inline">Analytics</span>
              </button>
              <button
                onClick={() => setShowCollaboration(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all shadow-sm hover:shadow-md font-medium text-sm"
                title="Team Collaboration"
              >
                <Users className="w-4 h-4" />
                      <span className="hidden sm:inline">Collaboration</span>
              </button>
              <button
                onClick={() => setShowApprovalWorkflow(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-all shadow-sm hover:shadow-md font-medium text-sm"
                title="Approval Workflow"
              >
                <CheckSquare className="w-4 h-4" />
                      <span className="hidden sm:inline">Approval</span>
              </button>
              <button
                onClick={() => setShowReporting(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-all shadow-sm hover:shadow-md font-medium text-sm"
                title="Advanced Reporting"
              >
                <FileText className="w-4 h-4" />
                      <span className="hidden sm:inline">Reporting</span>
              </button>
            </div>

            {/* Last Updated Timestamp */}
            {lastUpdated && (
                    <div className="text-xs text-gray-600 bg-gray-100 px-3 py-2 rounded-xl font-medium">
                Last: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
            </div>

            {/* Scrollable Purchase Orders List */}
            <div className="flex-1 overflow-y-auto px-6 py-6 border-t border-gray-100">
      {/* Error Display */}
      {error && (
                <div className="mb-4 bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3 text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold">Error</h4>
              <p className="text-sm">{error}</p>
            </div>
          </div>
                </div>
      )}

      {isLoading ? (
                <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="sm" color="purple" />
          </div>
      ) : filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No purchase orders found</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first purchase order'
            }
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <button
              onClick={() => navigate('/lats/purchase-order/create')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              <Plus className="w-4 h-4" />
              <span>Create Purchase Order</span>
            </button>
          )}
            </div>
              ) : (
                <>
                  {/* Purchase Orders List - Enhanced Modal Style */}
                  <div className="space-y-3 mb-4">
            {filteredOrders.map((order) => {
              const orderActions = getSmartActionButtons(order);
                      const isLinSupplier = order.supplier?.name?.toLowerCase() === 'lin';
                      
              return (
                        <div
                          key={order.id}
                          className={`border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 hover:shadow-lg cursor-pointer relative ${
                            expandedOrder === order.id
                              ? 'border-blue-500 shadow-xl' 
                              : isLinSupplier 
                                ? 'border-orange-400 shadow-lg' 
                                : 'border-gray-200 hover:border-orange-400'
                          }`}
                        >
                  {/* Mobile Card View - shown on small screens */}
                          <div className="md:hidden p-4">
                  <div className="space-y-3">
                    {/* Order Number and Status */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                                    <Package className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-sm">{order.orderNumber}</h3>
                          <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                        </div>
                      </div>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="capitalize">{order.status.replace('_', ' ')}</span>
                      </span>
                    </div>
                    
                    {/* Supplier */}
                    {order.supplier && (
                      <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
                          <span className="text-white text-xs font-bold">
                            {order.supplier.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                                  <span className="text-sm font-medium text-gray-900">{order.supplier.name}</span>
                      </div>
                    )}
                    
                    {/* Financial Info */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">
                        {(() => {
                          if (order.totalAmount && order.totalAmount > 0) {
                            return formatCurrency(order.totalAmount, order.currency);
                          }
                          if (order.items && order.items.length > 0) {
                            const totalFromItems = order.items.reduce((sum, item) => {
                              return sum + (item.totalPrice || (item.quantity * item.costPrice));
                            }, 0);
                            if (totalFromItems > 0) {
                              return formatCurrency(totalFromItems, order.currency);
                            }
                          }
                          return formatCurrency(0, order.currency || 'TSh');
                        })()}
                      </span>
                      <span className="text-xs text-gray-600">
                        {order.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0} items
                      </span>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      {orderActions.map((action, index) => (
                        <div key={`${action.type}-${index}`} className="relative flex-1">
                          <button
                            ref={action.type === 'more' ? (el) => { moreButtonRefs.current[order.id] = el; } : undefined}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              action.onClick(e);
                            }}
                                      className={`w-full flex items-center justify-center gap-1.5 px-2 py-2.5 text-white rounded-xl transition-all shadow-md hover:shadow-lg text-xs font-semibold ${action.color}`}
                            title={action.label}
                          >
                            {action.icon}
                            <span>{action.label}</span>
                          </button>

                          {/* Styled Action Menu for More button */}
                          {action.type === 'more' && (
                            <StyledActionMenu
                              isOpen={openDropdownId === order.id}
                              onClose={() => setOpenDropdownId(null)}
                              position="right"
                              items={getStyledMenuActions(order)}
                              triggerRef={{ current: moreButtonRefs.current[order.id] }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                          {/* Desktop List View - Expandable - shown on md+ screens */}
                          <div className="hidden md:block w-full">
                            {/* Header - Clickable */}
                            <div 
                              className="flex items-start justify-between p-6 cursor-pointer"
                              onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                            >
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                {/* Expand/Collapse Icon */}
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                                  expandedOrder === order.id ? 'bg-orange-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                                }`}>
                                  <ChevronDown 
                                    className={`w-5 h-5 transition-transform duration-200 ${
                                      expandedOrder === order.id ? 'rotate-180' : ''
                                    }`}
                                  />
                        </div>
                                
                                {/* Main Content */}
                                <div className="flex-1 min-w-0">
                                  {/* Order Number and Status Row */}
                                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                                    <h3 className="text-2xl font-bold text-gray-900 truncate">{order.orderNumber}</h3>
                                    
                                    {/* Status Badge */}
                                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-base font-bold ${getStatusColor(order.status)} flex items-center gap-2 flex-shrink-0`}>
                                      {getStatusIcon(order.status)}
                                      <span>{order.status.replace('_', ' ').split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
                                    </span>
                        </div>
                                  
                                  {/* Info Badges Row */}
                                  <div className="flex items-center gap-3 flex-wrap">
                                    {/* Supplier Badge */}
                                    {order.supplier && (
                                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0">
                                        <Building className="w-5 h-5" />
                                        <span className="text-base font-semibold truncate max-w-[140px]">{order.supplier.name}</span>
                      </div>
                                    )}

                                    {/* Items & Quantity & Date Combined Card */}
                                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200">
                        <div className="flex items-center gap-2">
                                        <Package className="w-5 h-5 text-teal-600" />
                                        <span className="text-base font-semibold text-teal-700">{order.items?.length || 0}</span>
                                        <span className="text-sm text-teal-600 font-medium">{(order.items?.length || 0) !== 1 ? 'items' : 'item'}</span>
                          </div>
                                      <div className="w-px h-5 bg-gray-300"></div>
                                      <div className="flex items-center gap-2">
                                        <ShoppingCart className="w-5 h-5 text-pink-600" />
                                        <span className="text-base font-semibold text-pink-700">{order.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0}</span>
                                        <span className="text-sm text-pink-600 font-medium">qty</span>
                          </div>
                                      <div className="w-px h-5 bg-gray-300"></div>
                                      <div className="flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-gray-600" />
                                        <span className="text-base font-medium text-gray-600">{formatDate(order.createdAt)}</span>
                        </div>
                                    </div>

                                    {/* Expected Delivery Date */}
                                    {order.expectedDeliveryDate && (
                                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                                        <Clock className="w-5 h-5" />
                                        <span className="text-sm font-medium">ETA:</span>
                                        <span className="text-base font-semibold">{formatDate(order.expectedDeliveryDate)}</span>
                                      </div>
                                    )}

                                    {/* Currency Info for foreign orders */}
                                    {order.currency && order.currency !== 'TZS' && (
                                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                                        <span className="text-base font-bold">{order.currency}</span>
                                        {order.exchangeRate && (
                                          <>
                                            <span className="text-sm">•</span>
                                            <span className="text-sm font-medium">1 = {order.exchangeRate} TZS</span>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Payment & Pricing Card */}
                              {(order.totalAmount || 0) > 0 && (
                                <div className="ml-4 flex-shrink-0">
                                  <div className="flex items-center justify-between gap-4">
                                    {/* Total Amount */}
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <DollarSign className="w-5 h-5 text-gray-400" />
                                        <span className="text-sm text-gray-500 font-medium uppercase tracking-wide">Total Amount</span>
                                      </div>
                                      <div className="flex flex-col">
                                        {order.currency && order.currency !== 'TZS' && order.totalAmountBaseCurrency ? (
                                          <>
                                            <span className="text-4xl font-bold text-gray-900 leading-tight">{formatCurrency(order.totalAmountBaseCurrency, 'TZS')}</span>
                                            <span className="text-sm text-gray-500 mt-0.5 font-medium">({formatCurrency(order.totalAmount || 0, order.currency)})</span>
                                          </>
                                        ) : (
                                          <span className="text-4xl font-bold text-gray-900 leading-tight">{formatCurrency(order.totalAmount || 0, order.currency || 'TZS')}</span>
                                        )}
                                      </div>
                    </div>

                                    {/* Payment Status Badge */}
                                    <div className="flex-shrink-0">
                                      <span className={`inline-flex items-center gap-1.5 px-5 py-3 rounded-xl text-base font-bold shadow-sm ${
                                        (order.totalPaid || 0) >= order.totalAmount 
                                          ? 'bg-green-500 text-white'
                                          : (order.totalPaid || 0) > 0
                                            ? 'bg-yellow-500 text-white'
                                            : 'bg-red-500 text-white'
                                      }`}>
                                        {(order.totalPaid || 0) >= order.totalAmount ? (
                                          <CheckCircle className="w-5 h-5" />
                                        ) : (order.totalPaid || 0) > 0 ? (
                                          <Clock className="w-5 h-5" />
                                        ) : (
                                          <AlertCircle className="w-5 h-5" />
                                        )}
                                        {(order.totalPaid || 0) >= order.totalAmount 
                                          ? 'Paid'
                                          : (order.totalPaid || 0) > 0
                                            ? 'Partial'
                                            : 'Unpaid'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Separator Line - Enhanced Design - Only show when expanded */}
                            {expandedOrder === order.id && (
                              <div className="mt-5 pt-5 border-t-2 border-gray-200 relative">
                                <div className="absolute top-0 left-0 right-0 flex items-center justify-center -mt-3">
                                  <span className="bg-white px-5 py-1.5 text-xs text-gray-500 font-semibold uppercase tracking-wider rounded-full border border-gray-200 shadow-sm">Order Details</span>
                                </div>
                              </div>
                            )}

                            {/* Expanded Content - Only show when expanded */}
                            {expandedOrder === order.id && (
                              <div className="px-6 pb-6 pt-2">
                                {/* Order Items with Progress Bars */}
                                <div className="mb-4">
                            {(() => {
                                    const previewCount = 2;
                                    const hasMoreItems = (order.items?.length || 0) > previewCount;
                                    const isCollapsed = itemsCollapsed[order.id] !== false;
                                    const displayedItems =
                                      isCollapsed && hasMoreItems
                                        ? order.items?.slice(0, previewCount) || []
                                        : order.items || [];

                                    return (
                                      <>
                                        <div className="flex items-center justify-between mb-3">
                                          <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                            <Package className="w-5 h-5 text-blue-600" />
                                            Order Items ({order.items?.length || 0})
                                          </h4>
                                          {hasMoreItems && (
                                            <button
                                              type="button"
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                setItemsCollapsed(prev => ({
                                                  ...prev,
                                                  [order.id]: !prev[order.id]
                                                }));
                                              }}
                                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                                            >
                                              {isCollapsed ? (
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
                                            {displayedItems.map((item: any, index: number) => {
                                              const received = item.receivedQuantity || 0;
                                              const ordered = item.quantity || 0;
                                              const percentage = ordered > 0 ? (received / ordered) * 100 : 0;

                                              return (
                                                <div
                                                  key={index}
                                                  className="p-3 sm:p-4 md:p-6 cursor-pointer flex flex-col h-full bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all duration-200 shadow-sm relative"
                                                >
                                                  {/* Quantity Badge */}
                                                  <div className={`absolute -top-2 -right-2 sm:-top-3 sm:-right-3 p-1.5 sm:p-2 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-20 min-w-[2rem] min-h-[2rem] sm:min-w-[2.5rem] sm:min-h-[2.5rem] transition-all duration-300 ${
                                                    percentage >= 100
                                                      ? 'bg-gradient-to-r from-green-500 to-green-600'
                                                      : percentage > 0
                                                        ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                                                        : 'bg-gradient-to-r from-red-500 to-red-600'
                                                  }`}>
                                                    <span className="text-xs sm:text-sm font-bold text-white whitespace-nowrap px-1">
                                                      {received > 0 ? `${received}/${ordered}` : ordered}
                                                    </span>
                                                  </div>
                                                  
                                                  <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                                                    {/* Thumbnail */}
                                                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl flex items-center justify-center flex-shrink-0">
                                                      {(() => {
                                                        const primaryImage = item.product?.images?.find((img: any) => img.isPrimary) || item.product?.images?.[0];
                                                        const imageUrl = primaryImage?.url;
                                                        
                                                        if (imageUrl) {
                                                          return (
                                                            <img
                                                              src={imageUrl}
                                                              alt={item.product?.name || 'Product'}
                                                              className="w-full h-full object-cover rounded-xl"
                                                              onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                              }}
                                                            />
                                                          );
                                                        }
                                                        
                                                        return (
                                                          <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center w-full h-full rounded-xl">
                                                            <Package className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
                                                          </div>
                                                        );
                            })()}
                                                    </div>
                                                    
                                                    <div className="flex-1 min-w-0 flex flex-col h-16 sm:h-20 md:h-24 justify-between">
                                                      <div>
                                                        <div className="font-medium text-gray-800 truncate text-sm sm:text-base md:text-lg lg:text-xl leading-tight" title={item.product?.name || `Product ${item.productId}`}>
                                                          {item.product?.name || `Product ${item.productId}`}
                                                        </div>
                                                        {item.variant?.name && item.variant.name !== 'Default Variant' && (
                                                          <p className="text-xs text-gray-500 mt-0.5 sm:mt-1 font-medium">Variant: {item.variant.name}</p>
                                                        )}
                                                      </div>
                                                      <div>
                                                        <div className="text-lg sm:text-xl md:text-2xl text-gray-700 mt-0.5 sm:mt-1 font-bold">
                                                          {order.currency && order.currency !== 'TZS' && order.exchangeRate ? (
                                                            <>
                                                              {formatCurrency(
                                                                (item.totalPrice || (item.quantity || 0) * (item.costPrice || 0)) *
                                                                  (order.exchangeRate || 1),
                                                                'TZS'
                                                              )}
                                                              {order.currency && order.currency !== 'TZS' && (
                                                                <span className="text-sm sm:text-base text-gray-500 ml-2">
                                                                  ({formatCurrency(
                                                                    item.totalPrice || (item.quantity || 0) * (item.costPrice || 0),
                                                                    order.currency
                                                                  )})
                          </span>
                                                              )}
                                                            </>
                                                          ) : (
                                                            formatCurrency(
                                                              item.totalPrice || (item.quantity || 0) * (item.costPrice || 0),
                                                              'TZS'
                                                            )
                                                          )}
                        </div>
                                                        <div className="text-xs sm:text-sm text-gray-500 mt-1">
                                                          Unit: {formatCurrency(item.costPrice || 0, 'TZS')}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>

                                                  <div className="mt-3 flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-4">
                                                      {(order.status === 'partial_received' ||
                                                        order.status === 'received' ||
                                                        order.status === 'completed') && (
                        <div className="flex items-center gap-2">
                                                          <span className="text-xs font-semibold text-gray-700">
                                                            Received: <span className="text-gray-900">{received}/{ordered}</span>
                          </span>
                                                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                            percentage >= 100
                                                              ? 'bg-green-100 text-green-900'
                                                              : percentage > 0
                                                                ? 'bg-orange-100 text-orange-900'
                                                                : 'bg-gray-100 text-gray-900'
                                                          }`}>
                                                            {percentage.toFixed(0)}%
                            </span>
                                                        </div>
                          )}
                        </div>
                                                    <div className="flex items-center gap-2">
                                                      {item.product?.category && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-xs font-medium">
                                                          📦 {String(typeof item.product.category === 'string' ? item.product.category : (item.product.category as any)?.name || 'Category')}
                                                        </span>
                                                      )}
                      </div>
                    </div>

                                                  {(order.status === 'partial_received' ||
                                                    order.status === 'received' ||
                                                    order.status === 'completed') && (
                                                    <div className="mt-2">
                                                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner">
                                                        <div
                                                          className={`h-2 rounded-full transition-all duration-500 ${
                                                            percentage >= 100
                                                              ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                                              : percentage > 0
                                                                ? 'bg-gradient-to-r from-orange-400 to-orange-500'
                                                                : 'bg-gray-300'
                                                          }`}
                                                          style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
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
                                        {isCollapsed && hasMoreItems && (
                                          <p className="mt-2 text-xs text-gray-500">
                                            Showing first {previewCount} items of {order.items?.length || 0}. Tap View More to see all.
                                          </p>
                                        )}
                                      </>
                                    );
                                  })()}
                    </div>


                                {/* Financial Summary Section */}
                                {(order.totalAmount || 0) > 0 && (
                                  <div className="mt-4 mb-4 bg-green-50 rounded-xl p-4 border border-green-200">
                                    <h4 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                                      <DollarSign className="w-5 h-5 text-green-600" />
                                      Financial Summary
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                      <div className="flex justify-between items-center py-2 border-b border-green-200">
                                        <span className="text-gray-600 font-medium">Total Paid:</span>
                                        <span className="text-xl font-bold text-emerald-600">
                                          {(() => {
                                            const totalPaid = order.totalPaid || 0;
                                            // If order has foreign currency and exchange rate, convert paid amount to TZS
                                            if (order.currency && order.currency !== 'TZS' && order.exchangeRate && order.totalPaidBaseCurrency) {
                                              return formatCurrency(order.totalPaidBaseCurrency, 'TZS');
                                            }
                                            // If already in TZS or no conversion needed
                                            return formatCurrency(totalPaid, 'TZS');
                                          })()}
                                        </span>
                      </div>
                                      <div className="flex justify-between items-center py-2">
                                        <span className="text-gray-600 font-medium">Remaining:</span>
                                        <span className="text-lg font-bold text-orange-600">
                                          {(() => {
                                            const totalAmount = order.totalAmountBaseCurrency || order.totalAmount || 0;
                                            const totalPaid = order.totalPaidBaseCurrency || order.totalPaid || 0;
                                            const remaining = totalAmount - totalPaid;
                                            
                                            // Always show in TZS
                                            if (order.currency && order.currency !== 'TZS' && order.exchangeRate) {
                                              // Show TZS with original currency in parentheses if applicable
                                              const remainingInOriginalCurrency = remaining / (order.exchangeRate || 1);
                                              return (
                                                <>
                                                  {formatCurrency(remaining, 'TZS')}
                                                  {remainingInOriginalCurrency > 0 && (
                                                    <span className="text-sm text-gray-500 ml-2">
                                                      ({formatCurrency(remainingInOriginalCurrency, order.currency)})
                                                    </span>
                                                  )}
                                                </>
                                              );
                                            }
                                            return formatCurrency(remaining, 'TZS');
                                          })()}
                                        </span>
                    </div>
                                    </div>
                                  </div>
                                )}

                                {/* Shipping Information Section */}
                                {(order.trackingNumber || order.shippingStatus || order.shippingNotes) && (
                                  <div className="mt-4 mb-4 bg-purple-50 rounded-xl p-4 border border-purple-200">
                                    <h4 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                                      <Truck className="w-5 h-5 text-purple-600" />
                                      Shipping Information
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                      {order.trackingNumber && (
                                        <div className="flex justify-between items-center py-2 border-b border-purple-200">
                                          <span className="text-gray-600 font-medium">Tracking Number:</span>
                                          <span className="font-bold font-mono text-gray-900">{order.trackingNumber}</span>
                                        </div>
                                      )}
                                      {order.shippingStatus && (
                                        <div className="flex justify-between items-center py-2 border-b border-purple-200">
                                          <span className="text-gray-600 font-medium">Shipping Status:</span>
                                          <span className="font-semibold text-purple-700 capitalize">
                                            {order.shippingStatus.replace('_', ' ')}
                                          </span>
                                        </div>
                                      )}
                                      {order.shippingNotes && (
                                        <div className="md:col-span-2 py-2">
                                          <span className="text-gray-600 font-medium block mb-1">Shipping Notes:</span>
                                          <p className="text-gray-700 text-sm">{order.shippingNotes}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Order Notes Section */}
                                {order.notes && (
                                  <div className="mt-4 mb-4 bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                                    <h4 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                                      <FileText className="w-5 h-5 text-yellow-600" />
                                      Order Notes
                                    </h4>
                                    <p className="text-gray-700 leading-relaxed text-sm">{order.notes}</p>
                                  </div>
                                )}

                                {/* Quick Access Communication & Info */}
                                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {order.supplier?.phone && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                        const message = `Hello, regarding Purchase Order #${order.orderNumber}. Please provide status update.`;
                                        const whatsappUrl = `https://wa.me/${order.supplier.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
                                        window.open(whatsappUrl, '_blank');
                                        toast.success('Opening WhatsApp...');
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
                                        const subject = `Purchase Order #${order.orderNumber}`;
                                        const body = `Hello,\n\nRegarding Purchase Order #${order.orderNumber}...\n\nBest regards`;
                                        const mailtoUrl = `mailto:${order.supplier.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                        window.location.href = mailtoUrl;
                                        toast.success('Opening email client...');
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
                                      // Open notes in new tab to avoid navigation
                                      window.open(`/lats/purchase-orders/${order.id}?tab=notes`, '_blank');
                                      toast.success('Opening notes in new tab...');
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
                                      // Open payments in new tab to avoid navigation
                                      window.open(`/lats/purchase-orders/${order.id}?tab=payment`, '_blank');
                                      toast.success('Opening payments in new tab...');
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
                                  {orderActions.length > 0 && (
                                    <>
                                      {/* Primary Actions */}
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                        {orderActions.slice(0, 4).map((action, index) => (
                                          <button
                                            key={`${action.type}-${index}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (typeof action.onClick === 'function') {
                                                action.onClick(e);
                                              }
                                            }}
                                            className={`flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-semibold text-sm ${action.color}`}
                                          >
                                            {action.icon}
                                            {action.label}
                                          </button>
                                        ))}
                                      </div>

                                      {/* Secondary Actions */}
                                      {orderActions.length > 4 && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                          {orderActions.slice(4).map((action, index) => (
                                            <button
                                              key={`${action.type}-${index + 4}`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (typeof action.onClick === 'function') {
                                                  action.onClick(e);
                                                }
                                              }}
                                              className={`flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-medium text-sm ${action.color}`}
                                            >
                                              {action.icon}
                                              {action.label}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </>
                                  )}
                                  
                                  {/* View Details Button - Always visible in actions */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedOrderForDetails(order);
                                        setShowDetailsModal(true);
                                      }}
                                      className="flex items-center justify-center gap-2 px-4 py-2.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all hover:scale-105 hover:shadow-lg font-medium text-sm"
                                      title="View Order Details"
                                    >
                                      <Eye className="w-4 h-4" />
                                      View Details
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                  </div>
                </div>
              );
            })}
          </div>
                </>
              )}
            </div>
          </div>
        </div>

      {/* CBM Calculator Modal */}
      <CBMCalculatorModal
        isOpen={showCbmCalculator}
        onClose={() => setShowCbmCalculator(false)}
      />

      {/* Enhanced PO Analytics Modal */}
      {showAnalytics && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative">
                <button
                  onClick={() => setShowAnalytics(false)}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
                >
              <X className="w-5 h-5" />
                </button>
            <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
              <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <BarChart3 className="w-8 h-8 text-white" />
              </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">PO Analytics</h2>
                  <p className="text-sm text-gray-600">View purchase order analytics and insights</p>
            </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <POAnalyticsWidget />
            </div>
          </div>
        </div>
      )}

      {/* PO Collaboration Modal */}
      {showCollaboration && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative">
                <button
                  onClick={() => setShowCollaboration(false)}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
                >
              <X className="w-5 h-5" />
                </button>
            <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
              <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center shadow-lg">
                  <Users className="w-8 h-8 text-white" />
              </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Collaboration</h2>
                  <p className="text-sm text-gray-600">Collaborate with your team on purchase orders</p>
            </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <POCollaborationWidget
                onInviteUser={(email, role) => console.log('Invite user:', email, role)}
                onSendMessage={(message) => console.log('Send message:', message)}
                onRequestApproval={() => console.log('Request approval')}
              />
            </div>
          </div>
        </div>
      )}

      {/* PO Approval Workflow Modal */}
      {showApprovalWorkflow && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative">
                <button
                  onClick={() => setShowApprovalWorkflow(false)}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
                >
              <X className="w-5 h-5" />
                </button>
            <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
              <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <CheckSquare className="w-8 h-8 text-white" />
              </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Approval Workflow</h2>
                  <p className="text-sm text-gray-600">Manage purchase order approval processes</p>
            </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <POApprovalWorkflow
                onApprove={(stepId, comments) => console.log('Approve step:', stepId, comments)}
                onReject={(stepId, comments) => console.log('Reject step:', stepId, comments)}
                onRequestChanges={(stepId, comments) => console.log('Request changes:', stepId, comments)}
                onSubmitForApproval={() => console.log('Submit for approval')}
              />
            </div>
          </div>
        </div>
      )}

      {/* PO Reporting Analytics Modal */}
      {showReporting && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden relative">
                <button
                  onClick={() => setShowReporting(false)}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
                >
              <X className="w-5 h-5" />
                </button>
            <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
              <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
                <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center shadow-lg">
                  <FileText className="w-8 h-8 text-white" />
              </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Advanced PO Reporting</h2>
                  <p className="text-sm text-gray-600">Generate comprehensive purchase order reports</p>
            </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <POReportingAnalytics
                onExport={(format) => console.log('Export report as:', format)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Payment Modal */}
      {showComprehensivePayment && selectedPOForPayment && (
        <ComprehensivePaymentModal
          isOpen={showComprehensivePayment}
          onClose={() => {
            setShowComprehensivePayment(false);
            setSelectedPOForPayment(null);
          }}
          totalAmount={(() => {
            // Calculate remaining amount in TZS
            const totalAmount = selectedPOForPayment.totalAmountBaseCurrency || selectedPOForPayment.totalAmount || 0;
            const totalPaid = selectedPOForPayment.totalPaidBaseCurrency || selectedPOForPayment.totalPaid || 0;
            return totalAmount - totalPaid;
          })()}
          discountAmount={0}
          onProcessPayment={async (paymentData) => {
            try {
              // Import the payment service
              const { purchaseOrderPaymentService } = await import('../lib/purchaseOrderPaymentService');
              
              // Convert payment data format to match purchase order payment service
              let payments: any[] = [];
              
              if (paymentData.method === 'split') {
                // Handle split payments
                payments = paymentData.splitPayments.map((split: any) => ({
                  purchaseOrderId: selectedPOForPayment.id,
                  paymentAccountId: split.paymentAccountId || split.accountId,
                  amount: split.amount,
                  currency: 'TZS', // Always TZS after conversion
                  paymentMethod: split.method || split.paymentMethod,
                  paymentMethodId: split.methodId || split.paymentMethodId,
                  reference: split.reference || null,
                  notes: split.notes || null,
                  createdBy: currentUser?.id || null
                }));
              } else {
                // Handle single payment
                payments = [{
                  purchaseOrderId: selectedPOForPayment.id,
                  paymentAccountId: paymentData.paymentAccountId || paymentData.accountId,
                  amount: paymentData.amount,
                  currency: 'TZS', // Always TZS after conversion
                  paymentMethod: paymentData.method || paymentData.paymentMethod,
                  paymentMethodId: paymentData.methodId || paymentData.paymentMethodId,
                  reference: paymentData.reference || null,
                  notes: paymentData.notes || null,
                  createdBy: currentUser?.id || null
                }];
              }
              
              // Process each payment
              const results = await Promise.all(
                payments.map(async (payment) => {
                  const result = await purchaseOrderPaymentService.processPayment(payment);
                  return result;
                })
              );
              
              // Check if all payments were successful
              const failedPayments = results.filter(result => !result.success);
              
              if (failedPayments.length > 0) {
                const errorMessages = failedPayments.map(result => result.message).join('; ');
                toast.error(`Some payments failed: ${errorMessages}`);
              } else {
                toast.success('Payment processed successfully');
                
                // Update payment status and reload purchase orders - matching PurchaseOrderDetailsModal pattern
                try {
                  const { PurchaseOrderService } = await import('../services/purchaseOrderService');
                  await PurchaseOrderService.updatePaymentStatus(selectedPOForPayment.id);
                  console.log('✅ Purchase order payment status updated');
                } catch (updateError) {
                  console.warn('⚠️ Failed to update payment status:', updateError);
                  // Don't block the success flow for this non-critical update
                }
                
                // Reload purchase orders to reflect payment changes
                await loadPurchaseOrders();
              }
              
              setShowComprehensivePayment(false);
              setSelectedPOForPayment(null);
            } catch (error) {
              console.error('Error processing payment:', error);
              toast.error('Failed to process payment. Please try again.');
            }
          }}
        />
      )}
      
       {/* Purchase Order Details Modal */}
       {showDetailsModal && selectedOrderForDetails && (
         <PurchaseOrderDetailsModal
           isOpen={showDetailsModal}
           onClose={() => {
             setShowDetailsModal(false);
             setSelectedOrderForDetails(null);
           }}
           order={selectedOrderForDetails}
           onOrderUpdate={async () => {
             // Reload purchase orders when the order is updated in the modal
             await handleLoadPurchaseOrders();
           }}
         />
       )}
       
       {/* Manage Suppliers Modal */}
       {showManageSuppliersModal && (
         <ManageSuppliersModal
           isOpen={showManageSuppliersModal}
           onClose={() => setShowManageSuppliersModal(false)}
           suppliers={suppliers || []}
           onSupplierUpdate={async () => {
             // Reload suppliers when updated
             await loadSuppliers();
           }}
         />
       )}
      </div>
    </div>
    );
  };

export default PurchaseOrdersPage;
