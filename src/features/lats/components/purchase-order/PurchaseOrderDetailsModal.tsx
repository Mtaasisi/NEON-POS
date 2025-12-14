import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  FileText,
  Info,
  Package,
  CreditCard,
  History,
  DollarSign,
  Building,
  Calendar,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  ShoppingCart,
  Receipt,
  Send,
  Edit,
  Trash2,
  Copy,
  Eye
} from 'lucide-react';
import LoadingSpinner from '../../../../components/ui/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { useInventoryStore } from '../../stores/useInventoryStore';
import { useDialog } from '../../../shared/hooks/useDialog';
import { useAuth } from '../../../../context/AuthContext';

interface PurchaseOrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any; // Using any for now, should be properly typed
  onOrderUpdate?: () => void; // Callback to refresh parent component
}

type TabType = 'overview' | 'items' | 'payments' | 'history';

const PurchaseOrderDetailsModal: React.FC<PurchaseOrderDetailsModalProps> = ({
  isOpen,
  onClose,
  order,
  onOrderUpdate
}) => {
  const navigate = useNavigate();
  const { confirm } = useDialog();
  const { currentUser } = useAuth();
  const {
    approvePurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    loadPurchaseOrders
  } = useInventoryStore();
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLoading, setIsLoading] = useState(false);
  
  // Action loading states
  const [isApproving, setIsApproving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('overview');
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: order.currency || 'TZS'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      sent: 'bg-blue-100 text-blue-800 border-blue-200',
      confirmed: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      shipped: 'bg-purple-100 text-purple-800 border-purple-200',
      received: 'bg-green-100 text-green-800 border-green-200',
      completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      draft: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status as keyof typeof colors] || colors.draft;
  };

  const getPaymentStatusColor = (status: string) => {
    const colors = {
      paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      partial: 'bg-amber-100 text-amber-800 border-amber-200',
      unpaid: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status as keyof typeof colors] || colors.unpaid;
  };

  const tabs = [
    { key: 'overview' as TabType, label: 'Overview', icon: Info },
    { key: 'items' as TabType, label: 'Items', icon: Package },
    { key: 'payments' as TabType, label: 'Payments', icon: CreditCard },
    { key: 'history' as TabType, label: 'History', icon: History }
  ];

  // Action handlers - matching PurchaseOrdersPage functionality
  const handleApproveAndSend = async () => {
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
      const response = await approvePurchaseOrder(order.id);
      if (response.ok) {
        const sendResponse = await updatePurchaseOrder(order.id, { status: 'sent' });
        if (sendResponse.ok) {
          toast.success('Order approved and sent to supplier');
          await loadPurchaseOrders();
          onOrderUpdate?.();
        } else {
          toast.success('Order approved (send manually from details)');
          await loadPurchaseOrders();
          onOrderUpdate?.();
        }
      } else {
        toast.error(response.message || 'Failed to approve order');
      }
    } catch (error) {
      console.error('Error approving and sending order:', error);
      toast.error('Failed to process order');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReceiveOrder = () => {
    if (!order) return;
    navigate(`/lats/purchase-orders/${order.id}?action=receive`);
    onClose();
  };

  const handleCompleteOrder = async () => {
    if (!order) return;
    
    if (order.status !== 'received') {
      toast.error('Order must be received before completing');
      return;
    }
    
    const confirmed = await confirm('Are you sure you want to complete this purchase order?');
    if (!confirmed) return;
    
    try {
      setIsCompleting(true);
      const response = await updatePurchaseOrder(order.id, { status: 'completed' });
      if (response.ok) {
        toast.success('Purchase order completed successfully');
        await loadPurchaseOrders();
        onOrderUpdate?.();
      } else {
        toast.error(response.message || 'Failed to complete purchase order');
      }
    } catch (error) {
      console.error('Error completing purchase order:', error);
      toast.error('Failed to complete purchase order');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!order) return;
    
    if (order.status !== 'draft') {
      toast.error('Only draft orders can be deleted');
      return;
    }
    
    const confirmed = await confirm('Are you sure you want to delete this purchase order? This action cannot be undone.');
    if (!confirmed) return;
    
    try {
      setIsDeleting(true);
      const response = await deletePurchaseOrder(order.id);
      if (response.ok) {
        toast.success('Purchase order deleted successfully');
        await loadPurchaseOrders();
        onOrderUpdate?.();
        onClose();
      } else {
        toast.error(response.message || 'Failed to delete purchase order');
      }
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      toast.error('Failed to delete purchase order');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditOrder = () => {
    if (!order) return;
    navigate(`/lats/purchase-order/create?edit=${order.id}`);
    onClose();
  };

  const handleDuplicateOrder = () => {
    if (!order) return;
    navigate(`/lats/purchase-order/create?duplicate=${order.id}`);
    onClose();
  };

  const handleViewDetails = () => {
    if (!order) return;
    navigate(`/lats/purchase-orders/${order.id}`);
    onClose();
  };

  // Get smart action buttons based on order status - matching PurchaseOrdersPage
  const getSmartActionButtons = () => {
    const actions = [];
    const validStatuses = ['draft', 'sent', 'confirmed', 'partial_received', 'received', 'completed', 'cancelled'];
    const orderStatus = validStatuses.includes(order.status) ? order.status : 'draft';
    
    switch (orderStatus) {
      case 'draft':
        actions.push({
          type: 'send',
          label: 'Send to Supplier',
          icon: <Send className="w-4 h-4" />,
          color: 'bg-green-600 hover:bg-green-700',
          onClick: handleApproveAndSend,
          loading: isApproving
        });
        actions.push({
          type: 'delete',
          label: 'Delete',
          icon: <Trash2 className="w-4 h-4" />,
          color: 'bg-red-600 hover:bg-red-700',
          onClick: handleDeleteOrder,
          loading: isDeleting
        });
        break;
      
      case 'sent':
      case 'confirmed':
        actions.push({
          type: 'receive',
          label: 'Receive Items',
          icon: <Package className="w-4 h-4" />,
          color: 'bg-green-600 hover:bg-green-700',
          onClick: handleReceiveOrder
        });
        break;
      
      case 'partial_received':
        const totalOrdered = order.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
        const totalReceived = order.items?.reduce((sum: number, item: any) => sum + (item.receivedQuantity || 0), 0) || 0;
        const remaining = totalOrdered - totalReceived;
        
        actions.push({
          type: 'receive',
          label: `Continue (${remaining} left)`,
          icon: <Package className="w-4 h-4" />,
          color: 'bg-orange-600 hover:bg-orange-700',
          onClick: handleReceiveOrder
        });
        break;
      
      case 'received':
        actions.push({
          type: 'complete',
          label: 'Complete',
          icon: <CheckCircle className="w-4 h-4" />,
          color: 'bg-green-600 hover:bg-green-700',
          onClick: handleCompleteOrder,
          loading: isCompleting
        });
        break;

      case 'completed':
        actions.push({
          type: 'duplicate',
          label: 'Duplicate',
          icon: <Copy className="w-4 h-4" />,
          color: 'bg-blue-600 hover:bg-blue-700',
          onClick: handleDuplicateOrder
        });
        break;
    }
    
    // Always add secondary actions
    if (['draft', 'sent', 'confirmed', 'shipped'].includes(orderStatus)) {
      actions.push({
        type: 'edit',
        label: 'Edit',
        icon: <Edit className="w-4 h-4" />,
        color: 'bg-purple-600 hover:bg-purple-700',
        onClick: handleEditOrder
      });
    }
    
    actions.push({
      type: 'view',
      label: 'View Details',
      icon: <Eye className="w-4 h-4" />,
      color: 'bg-blue-600 hover:bg-blue-700',
      onClick: handleViewDetails
    });
    
    actions.push({
      type: 'duplicate',
      label: 'Duplicate',
      icon: <Copy className="w-4 h-4" />,
      color: 'bg-indigo-600 hover:bg-indigo-700',
      onClick: handleDuplicateOrder
    });
    
    return actions;
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[36px] shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">

        {/* Enhanced Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-t-[36px]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/20">
              <Receipt className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{order.orderNumber}</h2>
              <p className="text-sm text-gray-600 font-medium">{order.supplier?.name || 'Unknown Supplier'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-red-50 hover:text-red-600 rounded-2xl transition-all duration-200 hover:scale-105 group"
          >
            <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-200" />
          </button>
        </div>

        {/* Enhanced Tabs */}
        <div className="flex border-b bg-gradient-to-r from-gray-50 to-gray-100/50">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'text-blue-600 border-b-3 border-blue-600 bg-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <Icon className={`w-5 h-5 transition-all duration-200 ${
                  isActive ? 'scale-110' : 'group-hover:scale-105'
                }`} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden text-xs">{tab.label.slice(0, 4)}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" color="blue" />
              <span className="ml-3 text-gray-600 font-medium">Loading...</span>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="p-6 space-y-6">

                  {/* Order Information Card */}
                  <div className="bg-white border border-gray-200/60 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      Order Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">Order Number:</span>
                          <span className="font-bold font-mono text-gray-900 bg-gray-50 px-3 py-1 rounded-lg">
                            {order.orderNumber}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">Status:</span>
                          <span className={`px-4 py-2 rounded-2xl text-xs font-bold border ${getStatusColor(order.status)}`}>
                            <div className="flex items-center gap-2">
                              {order.status === 'sent' && <AlertCircle className="w-4 h-4" />}
                              {order.status === 'received' && <CheckCircle className="w-4 h-4" />}
                              {order.status === 'completed' && <CheckCircle className="w-4 h-4" />}
                              <span className="capitalize">{order.status.replace('_', ' ')}</span>
                            </div>
                          </span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">Created:</span>
                          <span className="font-semibold text-gray-900 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {formatDate(order.createdAt)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">Expected Delivery:</span>
                          <span className="font-semibold text-gray-900 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : 'Not set'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">Currency:</span>
                          <span className="font-bold text-gray-900 bg-indigo-50 px-3 py-1 rounded-2xl">
                            {order.currency || 'TZS'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Supplier & Financial Cards */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Supplier Details */}
                    <div className="bg-white border border-gray-200/60 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center">
                          <Building className="w-5 h-5 text-orange-600" />
                        </div>
                        Supplier Details
                      </h3>
                      {order.supplier ? (
                        <div className="space-y-4 text-sm">
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-600 font-medium">Company:</span>
                            <span className="font-bold text-gray-900">{order.supplier.name}</span>
                          </div>
                          {order.supplier.contactPerson && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-gray-600 font-medium">Contact:</span>
                              <span className="font-semibold text-gray-900">{order.supplier.contactPerson}</span>
                            </div>
                          )}
                          {order.supplier.phone && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-gray-600 font-medium">Phone:</span>
                              <span className="font-semibold text-blue-600 hover:text-blue-700 cursor-pointer">
                                {order.supplier.phone}
                              </span>
                            </div>
                          )}
                          {order.supplier.email && (
                            <div className="flex justify-between items-center py-2">
                              <span className="text-gray-600 font-medium">Email:</span>
                              <span className="font-semibold text-blue-600 hover:text-blue-700 cursor-pointer">
                                {order.supplier.email}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No supplier information available</p>
                      )}
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border border-emerald-200/60 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-emerald-600" />
                        </div>
                        Financial Summary
                      </h3>
                      <div className="space-y-5">
                        <div className="flex justify-between items-center py-3 bg-white/60 rounded-2xl px-4">
                          <span className="text-gray-700 font-semibold">Total Amount:</span>
                          <span className="text-3xl font-bold text-gray-900">{formatCurrency(order.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 bg-white/60 rounded-2xl px-4">
                          <span className="text-gray-700 font-semibold">Paid:</span>
                          <span className="text-2xl font-bold text-emerald-600">{formatCurrency(order.totalPaid || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 bg-white/80 rounded-2xl px-4 border-2 border-emerald-200">
                          <span className="text-gray-700 font-semibold">Balance:</span>
                          <span className={`text-2xl font-bold ${
                            (order.totalAmount - (order.totalPaid || 0)) > 0 ? 'text-red-600' : 'text-emerald-600'
                          }`}>
                            {formatCurrency(order.totalAmount - (order.totalPaid || 0))}
                          </span>
                        </div>
                        <div className="flex justify-center pt-2">
                          <span className={`px-6 py-3 rounded-2xl text-sm font-bold border-2 ${getPaymentStatusColor(order.paymentStatus || 'unpaid')}`}>
                            {order.paymentStatus?.toUpperCase() || 'UNPAID'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items Summary */}
                  <div className="bg-white border border-gray-200/60 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-2xl flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5 text-purple-600" />
                      </div>
                      Items Summary
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-3xl hover:bg-blue-100 transition-colors duration-200">
                        <div className="text-4xl font-bold text-blue-600 mb-2">{order.items?.length || 0}</div>
                        <div className="text-sm text-blue-700 font-semibold">Total Items</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-3xl hover:bg-orange-100 transition-colors duration-200">
                        <div className="text-4xl font-bold text-orange-600 mb-2">
                          {order.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0}
                        </div>
                        <div className="text-sm text-orange-700 font-semibold">Ordered Qty</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-3xl hover:bg-green-100 transition-colors duration-200 md:col-span-2">
                        <div className="text-4xl font-bold text-green-600 mb-2">
                          {order.items?.reduce((sum: number, item: any) => sum + (item.receivedQuantity || 0), 0) || 0}
                        </div>
                        <div className="text-sm text-green-700 font-semibold">Received Quantity</div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {order.notes && (
                    <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center">
                          <FileText className="w-5 h-5 text-amber-600" />
                        </div>
                        Order Notes
                      </h3>
                      <p className="text-gray-700 leading-relaxed text-sm">{order.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Items Tab - Placeholder for now */}
              {activeTab === 'items' && (
                <div className="p-6">
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">Items Tab</h3>
                    <p className="text-gray-500">Detailed items view coming soon...</p>
                  </div>
                </div>
              )}

              {/* Payments Tab - Placeholder for now */}
              {activeTab === 'payments' && (
                <div className="p-6">
                  <div className="text-center py-12">
                    <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">Payments Tab</h3>
                    <p className="text-gray-500">Payment history view coming soon...</p>
                  </div>
                </div>
              )}

              {/* History Tab - Placeholder for now */}
              {activeTab === 'history' && (
                <div className="p-6">
                  <div className="text-center py-12">
                    <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">History Tab</h3>
                    <p className="text-gray-500">Order history view coming soon...</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Enhanced Footer with Action Buttons */}
        <div className="p-6 border-t bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-b-[36px]">
          {/* Action Buttons Section */}
          <div className="mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {getSmartActionButtons().slice(0, 4).map((action, index) => (
                <button
                  key={`${action.type}-${index}`}
                  onClick={action.onClick}
                  disabled={action.loading}
                  className={`flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${action.color}`}
                >
                  {action.loading ? (
                    <LoadingSpinner size="sm" color="white" />
                  ) : (
                    action.icon
                  )}
                  {action.label}
                </button>
              ))}
            </div>
            
            {/* Secondary Actions */}
            {getSmartActionButtons().length > 4 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                {getSmartActionButtons().slice(4).map((action, index) => (
                  <button
                    key={`${action.type}-${index + 4}`}
                    onClick={action.onClick}
                    disabled={action.loading}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${action.color}`}
                  >
                    {action.loading ? (
                      <LoadingSpinner size="sm" color="white" />
                    ) : (
                      action.icon
                    )}
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Close Button */}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-2xl font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg shadow-gray-600/20"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderDetailsModal;
