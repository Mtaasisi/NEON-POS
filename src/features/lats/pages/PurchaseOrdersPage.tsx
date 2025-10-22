import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { 
  Package, Search, Plus, RefreshCw,
  AlertCircle, Edit, Eye, Trash2, DollarSign, FileText, 
  Clock, CheckSquare, Send, CheckCircle, CreditCard, Copy, PackageCheck, Calculator, XCircle, MoreVertical
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useInventoryStore } from '../stores/useInventoryStore';
import { useDialog } from '../../shared/hooks/useDialog';
import { BackButton } from '../../shared/components/ui/BackButton';
import GlassCard from '../../shared/components/ui/GlassCard';
import CBMCalculatorModal from '../../calculator/components/CBMCalculatorModal';

const PurchaseOrdersPage: React.FC = () => {
  const {} = useAuth(); // Destructure to avoid unused variable warning
  const navigate = useNavigate();
  const { confirm } = useDialog();
  
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

  // Enhanced load function with timestamp
  const handleLoadPurchaseOrders = async () => {
    console.log('🔄 [PurchaseOrdersPage] Loading purchase orders...');
    const startTime = Date.now();
    try {
      await loadPurchaseOrders();
      const endTime = Date.now();
      setLastUpdated(new Date());
      console.log(`✅ [PurchaseOrdersPage] Purchase orders loaded in ${endTime - startTime}ms`);
      console.log('📊 [PurchaseOrdersPage] Total orders:', purchaseOrders?.length || 0);
    } catch (error) {
      console.error('❌ [PurchaseOrdersPage] Error loading purchase orders:', error);
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
    console.log('🗑️ [PurchaseOrdersPage] Delete order requested:', orderId);
    const confirmed = await confirm('Are you sure you want to delete this purchase order?');
    if (confirmed) {
      console.log('✅ [PurchaseOrdersPage] Delete confirmed, proceeding...');
      const response = await deletePurchaseOrder(orderId);
      if (response.ok) {
        console.log('✅ [PurchaseOrdersPage] Order deleted successfully');
        toast.success('Purchase order deleted successfully');
      } else {
        console.error('❌ [PurchaseOrdersPage] Failed to delete order:', response.message);
        toast.error(response.message || 'Failed to delete purchase order');
      }
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
      case 'cancelled': return 'bg-red-600 text-white shadow-sm';
      default: return 'bg-gray-400 text-white shadow-sm';
    }
  };

  const getStatusIcon = (status: string) => {
    // Option B Workflow icons
    switch (status) {
      case 'draft': return <FileText className="w-3 h-3" />;
      case 'sent': return <Send className="w-3 h-3" />;
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

  // Simplified action buttons - Option B workflow
  const getSmartActionButtons = (order: any) => {
    const actions = [];
    
    // Validate status - Option B workflow only
    const validStatuses = ['draft', 'sent', 'partial_received', 'received', 'completed', 'cancelled'];
    const orderStatus = validStatuses.includes(order.status) ? order.status : 'draft';
    
    if (orderStatus !== order.status) {
      console.warn(`⚠️ Invalid PO status detected: "${order.status}" for order ${order.id} - using "draft" as fallback`);
    }
    
    // Option B Workflow: Draft → Sent → Partial_Received → Received → Completed
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
        // Sent - Allow receiving (payment not required)
        actions.push({
          type: 'receive',
          label: 'Receive Items',
          icon: <Package className="w-4 h-4" />,
          color: 'bg-green-600 hover:bg-green-700',
          onClick: () => navigate(`/lats/purchase-orders/${order.id}?action=receive`)
        });
        break;
      
      case 'partial_received':
        // Partial Received - Continue receiving
        const totalOrdered = order.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
        const totalReceived = order.items?.reduce((sum: number, item: any) => sum + (item.receivedQuantity || 0), 0) || 0;
        const remaining = totalOrdered - totalReceived;
        
        actions.push({
          type: 'receive',
          label: `Continue (${remaining} left)`,
          icon: <Package className="w-4 h-4" />,
          color: 'bg-orange-600 hover:bg-orange-700',
          onClick: () => navigate(`/lats/purchase-orders/${order.id}?action=receive`)
        });
        break;
      
      case 'received':
        // Received - Complete order
        actions.push({
          type: 'complete',
          label: 'Complete',
          icon: <CheckCircle className="w-4 h-4" />,
          color: 'bg-green-600 hover:bg-green-700',
          onClick: () => handleCompleteOrder(order.id)
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
        break;
      
      case 'cancelled':
        // Cancelled - No primary actions
        break;
        
      default:
        // Should never reach here due to validation above
        console.warn(`⚠️ Unexpected PO status after validation: ${orderStatus}`);
        break;
    }
    
    // Always add "More" dropdown for secondary actions
    actions.push({
      type: 'more',
      label: 'More',
      icon: <MoreVertical className="w-4 h-4" />,
      color: 'bg-gray-600 hover:bg-gray-700',
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        setOpenDropdownId(openDropdownId === order.id ? null : order.id);
      }
    });

    return actions;
  };

  // Get all dropdown actions for the More button
  const getMoreDropdownActions = (order: any) => {
    const dropdownActions = [];

    // View Details (always available)
    dropdownActions.push({
      label: 'View Details',
      icon: <Eye className="w-4 h-4" />,
      onClick: () => navigate(`/lats/purchase-orders/${order.id}`),
      color: 'text-blue-600 hover:bg-blue-50'
    });

    // Edit (for draft orders)
    if (order.status === 'draft') {
      dropdownActions.push({
        label: 'Edit Order',
        icon: <Edit className="w-4 h-4" />,
        onClick: () => navigate(`/lats/purchase-orders/${order.id}?edit=true`),
        color: 'text-green-600 hover:bg-green-50'
      });
    }

    // Duplicate (always available)
    dropdownActions.push({
      label: 'Duplicate Order',
      icon: <Copy className="w-4 h-4" />,
      onClick: () => navigate(`/lats/purchase-order/create?duplicate=${order.id}`),
      color: 'text-purple-600 hover:bg-purple-50'
    });

    // Generate Documents
    dropdownActions.push({
      label: 'Generate PDF',
      icon: <FileText className="w-4 h-4" />,
      onClick: () => {
        toast.success('Generating PDF...');
        navigate(`/lats/purchase-orders/${order.id}?action=print`);
      },
      color: 'text-orange-600 hover:bg-orange-50'
    });

    // Payment (if not completed)
    if (order.status !== 'completed' && order.status !== 'cancelled') {
      dropdownActions.push({
        label: 'Manage Payment',
        icon: <CreditCard className="w-4 h-4" />,
        onClick: () => navigate(`/lats/purchase-orders/${order.id}?tab=payment`),
        color: 'text-indigo-600 hover:bg-indigo-50'
      });
    }

    // Quality Check (for received orders)
    if (order.status === 'received' || order.status === 'partial_received') {
      dropdownActions.push({
        label: 'Quality Check',
        icon: <PackageCheck className="w-4 h-4" />,
        onClick: () => navigate(`/lats/purchase-orders/${order.id}?tab=quality`),
        color: 'text-teal-600 hover:bg-teal-50'
      });
    }

    // Delete (for draft orders only)
    if (order.status === 'draft' && hasPermission('delete')) {
      dropdownActions.push({
        label: 'Delete Order',
        icon: <Trash2 className="w-4 h-4" />,
        onClick: () => handleDeleteOrder(order.id),
        color: 'text-red-600 hover:bg-red-50',
        divider: true
      });
    }

    return dropdownActions;
  };
  
  // Combined approve and send handler
  const handleApproveAndSend = async (orderId: string) => {
    try {
      const response = await approvePurchaseOrder(orderId);
      if (response.ok) {
        // After approval, automatically update to sent
        const sendResponse = await updatePurchaseOrder(orderId, { status: 'sent' });
        if (sendResponse.ok) {
          toast.success('Order approved and sent to supplier');
        } else {
          toast.success('Order approved (send manually from details)');
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

  // Complete order handler
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

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header - Flat Design with Back Button */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <BackButton to="/lats" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
            <p className="text-gray-600 mt-1">Manage your purchase orders and inventory</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowCbmCalculator(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors text-sm"
            title="CBM Calculator"
          >
            <Calculator size={18} />
            CBM
          </button>
          
          <button
            onClick={() => navigate('/lats/purchase-order/create')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-orange-600 text-white hover:bg-orange-700 transition-colors text-sm"
          >
            <Plus size={18} />
            Create PO
          </button>
        </div>
      </div>

      {/* Statistics - Flat Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-lg p-5 hover:bg-blue-100 transition-colors">
          <div className="flex items-center gap-3">
            <Package className="w-7 h-7 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{filteredOrders.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-5 hover:bg-green-100 transition-colors">
          <div className="flex items-center gap-3">
            <DollarSign className="w-7 h-7 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(filteredOrders.reduce((sum: number, order: any) => {
                  // Use totalAmount if available
                  if (order.totalAmount && order.totalAmount > 0) {
                    return sum + order.totalAmount;
                  }
                  
                  // Calculate from items
                  if (order.items && order.items.length > 0) {
                    const totalFromItems = order.items.reduce((itemSum: number, item: any) => {
                      return itemSum + (item.totalPrice || (item.quantity * item.costPrice));
                    }, 0);
                    return sum + totalFromItems;
                  }
                  
                  return sum;
                }, 0), 'TSh')}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-5 hover:bg-orange-100 transition-colors">
          <div className="flex items-center gap-3">
            <Clock className="w-7 h-7 text-orange-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{filteredOrders.filter((order: any) => order.status === 'draft' || order.status === 'sent' || order.status === 'partial_received').length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-5 hover:bg-purple-100 transition-colors">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-7 h-7 text-purple-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{filteredOrders.filter((order: any) => order.status === 'received').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <GlassCard className="p-6">
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
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-900"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-900 bg-white"
            >
              <option value="all">All Status</option>
              <option value="sent">Sent</option>
              <option value="received">Received</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-900 bg-white"
            >
              <option value="createdAt">Date Created</option>
              <option value="orderNumber">Order Number</option>
              <option value="totalAmount">Total Amount</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={handleLoadPurchaseOrders}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 bg-white"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            
            {/* Last Updated Timestamp */}
            {lastUpdated && (
              <div className="text-xs text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
                Last: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Error Display */}
      {error && (
        <GlassCard className="bg-red-50 border-red-200 p-4">
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <div>
              <h4 className="font-semibold">Error</h4>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Purchase Orders List - Flat Style */}
      {isLoading ? (
        <GlassCard className="p-12">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-4 text-gray-700 font-medium">Loading purchase orders...</span>
          </div>
        </GlassCard>
      ) : filteredOrders.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
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
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Purchase Order</span>
            </button>
          )}
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden">
          {/* Table Header - Flat Style */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
            <div className="grid grid-cols-12 gap-4 items-center text-xs font-semibold text-gray-700 uppercase">
              <div className="col-span-2">Order Details</div>
              <div className="col-span-2">Supplier</div>
              <div className="col-span-2">Financial</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1 text-center">Items</div>
              <div className="col-span-2">Created Date</div>
              <div className="col-span-1 text-center">Actions</div>
            </div>
          </div>

          {/* Table Body - Flat Style */}
          <div className="divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <div key={order.id} className="hover:bg-gray-50 transition-colors">
                <div className="grid grid-cols-12 gap-4 items-center px-6 py-4">
                    {/* Order Details */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">
                            {order.orderNumber}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {order.paymentTerms || 'Net 30'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Supplier */}
                    <div className="col-span-2">
                      {order.supplier ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                            <span className="text-white text-sm font-bold">
                              {order.supplier.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{order.supplier.name}</p>
                            <p className="text-xs text-gray-500">{order.supplier.country || 'Tanzania'}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No supplier</span>
                      )}
                    </div>

                    {/* Financial */}
                    <div className="col-span-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="font-bold text-gray-900">
                            {(() => {
                              // Use totalAmount if available
                              if (order.totalAmount && order.totalAmount > 0) {
                                return formatCurrency(order.totalAmount, order.currency);
                              }
                              
                              // Calculate from items totalPrice if available
                              if (order.items && order.items.length > 0) {
                                const totalFromItems = order.items.reduce((sum, item) => {
                                  // Use totalPrice if available, otherwise calculate from quantity * costPrice
                                  const itemTotal = item.totalPrice || (item.quantity * item.costPrice);
                                  return sum + itemTotal;
                                }, 0);
                                
                                if (totalFromItems > 0) {
                                  return formatCurrency(totalFromItems, order.currency);
                                }
                              }
                              
                              return formatCurrency(0, order.currency || 'TSh');
                            })()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {order.currency === 'TZS' ? 'TSh' : order.currency || 'TSh'}
                          </span>
                          {order.exchangeRate && order.exchangeRate !== 1.0 && order.totalAmountBaseCurrency && (
                            <span className="text-xs text-blue-600">
                              {formatCurrency(order.totalAmountBaseCurrency, 'TSh')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          <span className="capitalize">{order.status.replace('_', ' ')}</span>
                        </span>
                        
                        {/* Progress indicator for partial_received status */}
                        {order.status === 'partial_received' && order.items && order.items.length > 0 && (
                          (() => {
                            const totalOrdered = order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
                            const totalReceived = order.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);
                            const percentage = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;
                            const remaining = totalOrdered - totalReceived;
                            
                            return (
                              <div className="mt-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div 
                                      className="bg-orange-500 h-full transition-all duration-300"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="text-orange-700 font-semibold whitespace-nowrap">
                                    {percentage}%
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-0.5">
                                  {totalReceived}/{totalOrdered} items • {remaining} remaining
                                </p>
                              </div>
                            );
                          })()
                        )}
                      </div>
                    </div>

                    {/* Items */}
                    <div className="col-span-1 text-center">
                      <div className="flex items-center justify-center gap-1 text-sm font-medium text-gray-900">
                        <Package className="w-4 h-4 text-gray-600" />
                        <span>{order.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0}</span>
                      </div>
                    </div>

                    {/* Created Date */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                    </div>

                  {/* Smart Actions - Simplified */}
                  <div className="col-span-1">
                    <div className="flex items-center justify-end gap-2 relative">
                      {getSmartActionButtons(order).map((action, index) => (
                        <div key={`${action.type}-${index}`} className="relative">
                          <button
                            onClick={action.onClick}
                            className={`flex items-center gap-1.5 px-3 py-2 text-white rounded-lg transition-colors text-xs font-medium ${action.color}`}
                            title={action.label}
                          >
                            {action.icon}
                            <span className="hidden lg:inline">{action.label}</span>
                          </button>

                          {/* Dropdown Menu for More button */}
                          {action.type === 'more' && openDropdownId === order.id && (
                            <>
                              {/* Backdrop to close dropdown when clicking outside */}
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setOpenDropdownId(null)}
                              />
                              
                              {/* Dropdown Content */}
                              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 z-20 overflow-hidden">
                                <div className="py-2">
                                  {getMoreDropdownActions(order).map((dropdownAction, idx) => (
                                    <React.Fragment key={idx}>
                                      {dropdownAction.divider && (
                                        <div className="my-2 border-t border-gray-200" />
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          dropdownAction.onClick();
                                          setOpenDropdownId(null);
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${dropdownAction.color}`}
                                      >
                                        {dropdownAction.icon}
                                        <span className="font-medium text-sm">{dropdownAction.label}</span>
                                      </button>
                                    </React.Fragment>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* CBM Calculator Modal */}
      <CBMCalculatorModal
        isOpen={showCbmCalculator}
        onClose={() => setShowCbmCalculator(false)}
      />
    </div>
  );
};

export default PurchaseOrdersPage;
