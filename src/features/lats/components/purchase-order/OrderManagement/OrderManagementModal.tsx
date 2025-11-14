import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, RefreshCw, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../../../context/AuthContext';
import { useInventoryStore } from '../../../../stores/useInventoryStore';
import { PurchaseOrder } from '../../../../types/inventory';
import GlassButton from '../../../../shared/components/ui/GlassButton';
import LoadingSpinner from '../../../../../components/ui/LoadingSpinner';

// Import sub-components using React.lazy for code splitting
const OrderCard = React.lazy(() => import('./components/OrderCard'));
const OrderDetailViewModal = React.lazy(() => import('./components/OrderDetailViewModal'));
const PaymentHistoryModal = React.lazy(() => import('./components/PaymentHistoryModal'));
const NotesModal = React.lazy(() => import('./components/NotesModal'));
const CommunicationHistoryModal = React.lazy(() => import('./components/CommunicationHistoryModal'));
const CompletionSummaryModal = React.lazy(() => import('./components/CompletionSummaryModal'));

// Enhanced components
const OrderAnalyticsWidget = React.lazy(() => import('./components/OrderAnalyticsWidget'));
const OrderCollaborationWidget = React.lazy(() => import('./components/OrderCollaborationWidget'));
const OrderApprovalWorkflow = React.lazy(() => import('./components/OrderApprovalWorkflow'));
const OrderReportingAnalytics = React.lazy(() => import('./components/OrderReportingAnalytics'));

interface OrderManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
  const { purchaseOrders, loadPurchaseOrders } = useInventoryStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'total' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'payments' | 'history'>('overview');

  // Enhanced features state
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [showApprovalWorkflow, setShowApprovalWorkflow] = useState(false);
  const [showReporting, setShowReporting] = useState(false);
  const [showEnhancedView, setShowEnhancedView] = useState(false);
  
  // Load purchase orders when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPurchaseOrders();
      setIsLoading(false);
    }
  }, [isOpen, loadPurchaseOrders]);

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    let filtered = [...(purchaseOrders || [])] as EnhancedPurchaseOrder[];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.orderNumber?.toLowerCase().includes(query) ||
        order.notes?.toLowerCase().includes(query) ||
        order.supplier?.name?.toLowerCase().includes(query) ||
        order.trackingNumber?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Sort orders
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'total':
          comparison = (a.totalAmount || 0) - (b.totalAmount || 0);
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [purchaseOrders, searchQuery, statusFilter, sortBy, sortOrder]);

  // Handle order selection
  const handleSelectOrder = useCallback((orderId: string) => {
    setActiveOrderId(orderId);
  }, []);

  // Close modal handler
  const handleClose = useCallback(() => {
    setActiveOrderId(null);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full sm:p-6">
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Purchase Orders Management
                </h3>
                <button
                  type="button"
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                  onClick={handleClose}
                >
                  <span className="sr-only">Close</span>
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Search and Filter Section */}
              <div className="mb-4 flex flex-wrap gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <select
                  className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="partial_received">Partially Received</option>
                  <option value="received">Received</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => loadPurchaseOrders()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </button>

                {/* Enhanced Feature Buttons */}
                <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-300">
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => setShowEnhancedView(!showEnhancedView)}
                    title={showEnhancedView ? 'Standard View' : 'Enhanced View'}
                  >
                    {showEnhancedView ? 'Standard' : 'Enhanced'}
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => setShowAnalytics(true)}
                    title="Order Analytics"
                  >
                    📊
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => setShowCollaboration(true)}
                    title="Team Collaboration"
                  >
                    👥
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => setShowApprovalWorkflow(true)}
                    title="Approval Workflow"
                  >
                    ✅
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => setShowReporting(true)}
                    title="Advanced Reporting"
                  >
                    📈
                  </button>
                </div>
              </div>

              {/* Orders List */}
              <div className="mt-4">
                {showEnhancedView ? (
                  /* Enhanced View Layout */
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Orders List */}
                    <div className="lg:col-span-2">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Orders ({filteredOrders.length})</h4>
                        {isLoading ? (
                          <div className="flex justify-center items-center h-64">
                            <LoadingSpinner />
                          </div>
                        ) : filteredOrders.length === 0 ? (
                          <div className="text-center py-12">
                            <p className="text-gray-500">No orders found</p>
                          </div>
                        ) : (
                          <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4 max-h-96 overflow-y-auto'}`}>
                            {filteredOrders.map((order) => (
                              <React.Suspense key={order.id} fallback={<div>Loading order...</div>}>
                                <OrderCard
                                  order={order}
                                  isSelected={activeOrderId === order.id}
                                  onSelect={handleSelectOrder}
                                  viewMode={viewMode}
                                />
                              </React.Suspense>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Enhanced Sidebar */}
                    <div className="space-y-4">
                      {/* Order Analytics */}
                      <React.Suspense fallback={<div>Loading analytics...</div>}>
                        <OrderAnalyticsWidget
                          orders={filteredOrders}
                          selectedOrder={activeOrderId ? purchaseOrders?.find(o => o.id === activeOrderId) : undefined}
                        />
                      </React.Suspense>

                      {/* Team Collaboration */}
                      <React.Suspense fallback={<div>Loading collaboration...</div>}>
                        <OrderCollaborationWidget
                          currentOrder={activeOrderId ? purchaseOrders?.find(o => o.id === activeOrderId) : undefined}
                          onInviteUser={(email, role) => console.log('Invite user:', email, role)}
                          onSendMessage={(message, orderId) => console.log('Send message:', message, orderId)}
                          onStartCall={(userId) => console.log('Start call:', userId)}
                          onStartVideo={(userId) => console.log('Start video:', userId)}
                          onRequestApproval={() => console.log('Request approval')}
                        />
                      </React.Suspense>

                      {/* Quick Actions */}
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h4>
                        <div className="space-y-2">
                          <button
                            onClick={() => setShowApprovalWorkflow(true)}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                          >
                            View Approval Workflow
                          </button>
                          <button
                            onClick={() => setShowReporting(true)}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                          >
                            Advanced Reports
                          </button>
                          <button
                            onClick={() => {/* Export functionality */}}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                          >
                            Export Orders
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard View */
                  <>
                    {isLoading ? (
                      <div className="flex justify-center items-center h-64">
                        <LoadingSpinner />
                      </div>
                    ) : filteredOrders.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-gray-500">No orders found</p>
                      </div>
                    ) : (
                      <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}`}>
                        {filteredOrders.map((order) => (
                          <React.Suspense key={order.id} fallback={<div>Loading order...</div>}>
                            <OrderCard
                              order={order}
                              isSelected={activeOrderId === order.id}
                              onSelect={handleSelectOrder}
                              viewMode={viewMode}
                            />
                          </React.Suspense>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {activeOrderId && (
        <React.Suspense fallback={<div>Loading order details...</div>}>
          <OrderDetailViewModal
            order={purchaseOrders?.find(o => o.id === activeOrderId)!}
            onClose={() => setActiveOrderId(null)}
            onStatusUpdate={async () => {
              await loadPurchaseOrders();
            }}
          />
        </React.Suspense>
      )}

      {/* Enhanced Order Analytics Modal */}
      {showAnalytics && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Order Analytics</h2>
                <button
                  onClick={() => setShowAnalytics(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <React.Suspense fallback={<div>Loading analytics...</div>}>
                <OrderAnalyticsWidget
                  orders={filteredOrders}
                  selectedOrder={activeOrderId ? purchaseOrders?.find(o => o.id === activeOrderId) : undefined}
                />
              </React.Suspense>
            </div>
          </div>
        </div>
      )}

      {/* Order Collaboration Modal */}
      {showCollaboration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Team Collaboration</h2>
                <button
                  onClick={() => setShowCollaboration(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <React.Suspense fallback={<div>Loading collaboration...</div>}>
                <OrderCollaborationWidget
                  currentOrder={activeOrderId ? purchaseOrders?.find(o => o.id === activeOrderId) : undefined}
                  onInviteUser={(email, role) => console.log('Invite user:', email, role)}
                  onSendMessage={(message, orderId) => console.log('Send message:', message, orderId)}
                  onStartCall={(userId) => console.log('Start call:', userId)}
                  onStartVideo={(userId) => console.log('Start video:', userId)}
                  onRequestApproval={() => console.log('Request approval')}
                />
              </React.Suspense>
            </div>
          </div>
        </div>
      )}

      {/* Order Approval Workflow Modal */}
      {showApprovalWorkflow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Approval Workflow</h2>
                <button
                  onClick={() => setShowApprovalWorkflow(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <React.Suspense fallback={<div>Loading approval workflow...</div>}>
                <OrderApprovalWorkflow
                  orderValue={activeOrderId ? purchaseOrders?.find(o => o.id === activeOrderId)?.totalAmount || 0 : 0}
                  onApprove={(stepId, comments) => console.log('Approve step:', stepId, comments)}
                  onReject={(stepId, comments) => console.log('Reject step:', stepId, comments)}
                  onRequestChanges={(stepId, comments) => console.log('Request changes:', stepId, comments)}
                  onSubmitForApproval={() => console.log('Submit for approval')}
                  onEscalate={(stepId, reason) => console.log('Escalate step:', stepId, reason)}
                />
              </React.Suspense>
            </div>
          </div>
        </div>
      )}

      {/* Order Reporting Analytics Modal */}
      {showReporting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Advanced Order Reporting</h2>
                <button
                  onClick={() => setShowReporting(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <React.Suspense fallback={<div>Loading reports...</div>}>
                <OrderReportingAnalytics
                  onExport={(format, reportType) => console.log('Export report:', reportType, 'as', format)}
                />
              </React.Suspense>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagementModal;
