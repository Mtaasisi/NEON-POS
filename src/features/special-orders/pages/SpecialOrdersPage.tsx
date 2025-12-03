import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../context/AuthContext';
import { useCustomers } from '../../../context/CustomersContext';
import { useBranch } from '../../../context/BranchContext';
import { useDeduplicated } from '../../../hooks/useDeduplicated';
import { specialOrderService } from '../../../lib/specialOrderService';
import {
  SpecialOrder,
  SpecialOrderStatus,
  CreateSpecialOrderInput,
  UpdateSpecialOrderInput,
  RecordSpecialOrderPaymentInput,
  SpecialOrdersStats
} from '../../../types/specialOrders';
import { BackButton } from '../../shared/components/ui/BackButton';
import { 
  Package, 
  Plus, 
  DollarSign,
  Filter,
  Search,
  Edit2,
  Trash2,
  CreditCard,
  Truck,
  CheckCircle,
  Clock,
  X as XIcon,
  Ship,
  PackageCheck,
  AlertCircle,
  MapPin,
  UserCircle,
  Image as ImageIcon,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';
import { financeAccountService } from '../../../lib/financeAccountService';
import { useLoadingJob } from '../../../hooks/useLoadingJob';
import { TableSkeleton } from '../../../components/ui/SkeletonLoaders';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import EnhancedAddSupplierModal from '../../settings/components/EnhancedAddSupplierModal';

const SpecialOrdersPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { customers } = useCustomers();
  const { currentBranch } = useBranch();
  const { startLoading, completeLoading, failLoading } = useLoadingJob();
  
  const [orders, setOrders] = useState<SpecialOrder[]>([]);
  const [stats, setStats] = useState<SpecialOrdersStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SpecialOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Fetch orders and stats
  const fetchOrders = async () => {
    const jobId = startLoading('Loading special orders...');
    setIsLoading(true);
    try {
      const fetchedOrders = await specialOrderService.getAllSpecialOrders(currentBranch?.id);
      setOrders(fetchedOrders);
      
      const fetchedStats = await specialOrderService.getStatistics(currentBranch?.id);
      setStats(fetchedStats);
      completeLoading(jobId);
    } catch (error) {
      console.error('Error fetching special orders:', error);
      failLoading(jobId, 'Failed to load special orders');
      toast.error('Failed to load special orders');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch payment accounts
  const fetchPaymentAccounts = async () => {
    try {
      const accounts = await financeAccountService.getPaymentMethods();
      
      // Filter out invalid entries first
      const validAccounts = accounts.filter(account => {
        if (!account) {
          console.warn('Found null/undefined account in payment methods');
          return false;
        }
        if (!account.id) {
          console.warn('Found account without ID:', account);
          return false;
        }
        if (!account.name) {
          console.warn('Found account without name:', account);
          return false;
        }
        return true;
      });
      
      // Aggressive deduplication using Map to prevent duplicate key warnings
      const accountMap = new Map();
      const duplicateIds = new Set();
      
      validAccounts.forEach(account => {
        if (accountMap.has(account.id)) {
          duplicateIds.add(account.id);
          console.warn(`Duplicate payment account ID found: ${account.id} (${account.name})`);
        } else {
          accountMap.set(account.id, account);
        }
      });
      
      const uniqueAccounts = Array.from(accountMap.values());
      
      // Debug logging
      console.log('[SpecialOrders] Payment accounts summary:', {
        total: accounts.length,
        valid: validAccounts.length,
        unique: uniqueAccounts.length,
        duplicates: duplicateIds.size,
        duplicateIds: Array.from(duplicateIds)
      });
      
      setPaymentAccounts(uniqueAccounts);
    } catch (error) {
      console.error('Error fetching payment accounts:', error);
      setPaymentAccounts([]); // Set empty array on error to prevent undefined issues
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchPaymentAccounts();
  }, [currentBranch]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesSearch = searchQuery === '' || 
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer?.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  // Status badge styling
  const getStatusColor = (status: SpecialOrderStatus) => {
    const colors: Record<SpecialOrderStatus, string> = {
      deposit_received: 'bg-blue-100 text-blue-700',
      ordered: 'bg-purple-100 text-purple-700',
      in_transit: 'bg-yellow-100 text-yellow-700',
      arrived: 'bg-green-100 text-green-700',
      ready_for_pickup: 'bg-emerald-100 text-emerald-700',
      delivered: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  // Status icon
  const getStatusIcon = (status: SpecialOrderStatus) => {
    const icons: Record<SpecialOrderStatus, React.ReactNode> = {
      deposit_received: <DollarSign size={14} />,
      ordered: <Package size={14} />,
      in_transit: <Ship size={14} />,
      arrived: <PackageCheck size={14} />,
      ready_for_pickup: <AlertCircle size={14} />,
      delivered: <CheckCircle size={14} />,
      cancelled: <XIcon size={14} />
    };
    return icons[status];
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Delete order
  const handleDelete = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this special order?')) return;
    
    const result = await specialOrderService.deleteSpecialOrder(orderId);
    if (result.success) {
      toast.success('Special order deleted successfully');
      fetchOrders();
    } else {
      toast.error(result.error || 'Failed to delete order');
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Combined Container - All sections in one */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Fixed Header Section - Enhanced Modal Style */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Left: Icon + Text */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                <Ship className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Special Orders</h1>
                <p className="text-sm text-gray-600">Manage pre-orders and import requests</p>
              </div>
            </div>

            {/* Right: Back Button */}
            <BackButton to="/dashboard" label="" className="!w-12 !h-12 !p-0 !rounded-full !bg-blue-600 hover:!bg-blue-700 !shadow-lg flex items-center justify-center" iconClassName="text-white" />
          </div>
        </div>

        {/* Action Bar - Enhanced Design */}
        <div className="px-8 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/50 flex-shrink-0">
          <div className="flex gap-3 flex-wrap">
            {/* Create Special Order Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:from-blue-600 hover:to-blue-700 hover:shadow-xl"
            >
              <Plus size={18} />
              <span>New Special Order</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={fetchOrders}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-blue-300 disabled:opacity-50 bg-white shadow-sm"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Statistics Section */}
          {stats && (
            <div className="p-6 pb-0 flex-shrink-0">
              <div 
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
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
                      <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 hover:bg-orange-100 hover:border-orange-300 transition-all shadow-sm hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">In Progress</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats.deposit_received + stats.ordered + stats.in_transit}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 hover:bg-green-100 hover:border-green-300 transition-all shadow-sm hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Ready</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats.arrived + stats.ready_for_pickup}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-5 hover:bg-purple-100 hover:border-purple-300 transition-all shadow-sm hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Balance Due</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(stats.total_balance_due)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search and Filters Section - Enhanced */}
          <div className="p-6 pb-0 flex-shrink-0 border-t border-gray-100 bg-white">
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 shadow-sm">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search Bar */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search orders, products, customers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 bg-white font-medium"
                    />
                  </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 bg-white font-medium min-w-[140px]"
                  >
                    <option value="all">All Status</option>
                    <option value="deposit_received">Deposit Received</option>
                    <option value="ordered">Ordered</option>
                    <option value="in_transit">In Transit</option>
                    <option value="arrived">Arrived</option>
                    <option value="ready_for_pickup">Ready for Pickup</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Orders List - Scrollable */}
          <div className="p-6">
            {filteredOrders.length === 0 ? (
              <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-16 text-center border-2 border-dashed border-gray-300">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <Ship className="w-12 h-12 text-white" />
                </div>
                <p className="text-gray-800 text-xl font-bold mb-2">No special orders found</p>
                <p className="text-gray-500 text-sm mb-6">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters' 
                    : 'Create your first special order to get started'}
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-8 py-3.5 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2"
                >
                  <Plus size={20} />
                  Create First Special Order
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;
                  
                  return (
                    <div 
                      key={order.id} 
                      className={`bg-white rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
                        isExpanded 
                          ? 'border-blue-400 shadow-2xl' 
                          : 'border-gray-200 hover:border-blue-300 hover:shadow-xl'
                      }`}
                    >
                      {/* Collapsed View - Always Visible */}
                      <div 
                        className="p-6 cursor-pointer"
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                      >
                        <div className="flex items-start justify-between gap-6">
                          {/* Left: Basic Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-4">
                              <div className={`p-3 rounded-xl shadow-sm flex-shrink-0 transition-all ${
                                isExpanded 
                                  ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                                  : 'bg-gradient-to-br from-blue-100 to-blue-200'
                              }`}>
                                <Ship className={`w-6 h-6 ${isExpanded ? 'text-white' : 'text-blue-700'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 flex-wrap mb-2">
                                  <h3 className="text-lg font-bold text-gray-900">{order.order_number}</h3>
                                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm ${getStatusColor(order.status)}`}>
                                    {getStatusIcon(order.status)}
                                    {order.status.replace(/_/g, ' ').toUpperCase()}
                                  </span>
                                </div>
                                <p className="text-base font-semibold text-gray-800 mb-2 truncate">{order.product_name}</p>
                                {!isExpanded && (
                                  <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                                    <span className="flex items-center gap-1.5">
                                      <UserCircle className="w-4 h-4" />
                                      {order.customer?.name}
                                    </span>
                                    <span>•</span>
                                    <span className="font-medium">Qty: {order.quantity}</span>
                                    <span>•</span>
                                    <span className="font-bold text-orange-600">{formatCurrency(order.balance_due)} due</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Quick Stats & Expand Button */}
                          <div className="flex items-center gap-4">
                            {!isExpanded && (
                              <div className="text-right">
                                <div className="text-sm font-bold text-gray-900">{formatCurrency(order.total_amount)}</div>
                                <div className="text-xs text-gray-500">Total</div>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedOrderId(isExpanded ? null : order.id);
                              }}
                              className={`p-2 rounded-lg transition-all ${
                                isExpanded 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                              }`}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded View - Shows on Click */}
                      {isExpanded && (
                        <div className="border-t-2 border-blue-100 bg-gradient-to-br from-blue-50/30 to-purple-50/30 p-6 space-y-6 animate-in slide-in-from-top">
                          {/* Full Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Customer Details */}
                            <div className="bg-white rounded-xl border-2 border-blue-200 p-4">
                              <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                                <UserCircle className="w-4 h-4" />
                                Customer Details
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Name:</span>
                                  <span className="font-semibold text-gray-900">{order.customer?.name}</span>
                                </div>
                                {order.customer?.phone && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Phone:</span>
                                    <span className="font-medium text-gray-900">{order.customer.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Product Details */}
                            <div className="bg-white rounded-xl border-2 border-purple-200 p-4">
                              <h4 className="text-sm font-bold text-purple-900 mb-3 flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                Product Details
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Name:</span>
                                  <span className="font-semibold text-gray-900 truncate ml-2">{order.product_name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Quantity:</span>
                                  <span className="font-bold text-gray-900">{order.quantity}</span>
                                </div>
                                {order.product_description && (
                                  <div className="pt-2 border-t border-purple-100">
                                    <span className="text-xs text-gray-500">{order.product_description}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Financial Details */}
                            <div className="bg-white rounded-xl border-2 border-green-200 p-4">
                              <h4 className="text-sm font-bold text-green-900 mb-3 flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                Financial Details
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Unit Price:</span>
                                  <span className="font-semibold text-gray-900">{formatCurrency(order.unit_price)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Total Amount:</span>
                                  <span className="font-bold text-gray-900">{formatCurrency(order.total_amount)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-green-600">Paid:</span>
                                  <span className="font-bold text-green-600">{formatCurrency(order.deposit_paid)}</span>
                                </div>
                                {order.balance_due > 0 && (
                                  <div className="flex justify-between pt-2 border-t border-green-100">
                                    <span className="text-orange-600 font-medium">Balance Due:</span>
                                    <span className="text-lg font-bold text-orange-600">{formatCurrency(order.balance_due)}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Shipping & Supplier Details */}
                            <div className="bg-white rounded-xl border-2 border-orange-200 p-4">
                              <h4 className="text-sm font-bold text-orange-900 mb-3 flex items-center gap-2">
                                <Truck className="w-4 h-4" />
                                Shipping & Supplier
                              </h4>
                              <div className="space-y-2 text-sm">
                                {order.supplier_name && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Supplier:</span>
                                    <span className="font-semibold text-gray-900">{order.supplier_name}</span>
                                  </div>
                                )}
                                {order.country_of_origin && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Origin:</span>
                                    <span className="font-medium text-gray-900">{order.country_of_origin}</span>
                                  </div>
                                )}
                                {order.tracking_number && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Tracking:</span>
                                    <span className="font-mono text-xs text-gray-900">{order.tracking_number}</span>
                                  </div>
                                )}
                                {order.expected_arrival_date && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Expected:</span>
                                    <span className="font-medium text-gray-900">
                                      {new Date(order.expected_arrival_date).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Notes Section */}
                          {(order.notes || order.internal_notes) && (
                            <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                              <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Notes
                              </h4>
                              <div className="space-y-3">
                                {order.notes && (
                                  <div>
                                    <div className="text-xs font-medium text-gray-600 mb-1">Customer Notes:</div>
                                    <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{order.notes}</div>
                                  </div>
                                )}
                                {order.internal_notes && (
                                  <div>
                                    <div className="text-xs font-medium text-gray-600 mb-1">Internal Notes:</div>
                                    <div className="text-sm text-gray-700 bg-yellow-50 p-3 rounded-lg border border-yellow-200">{order.internal_notes}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons - Full Width in Expanded View */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {order.balance_due > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrder(order);
                                  setShowPaymentModal(true);
                                }}
                                className="px-6 py-3.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl font-bold flex items-center justify-center gap-2"
                              >
                                <DollarSign className="w-5 h-5" />
                                Record Payment
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrder(order);
                                setShowUpdateModal(true);
                              }}
                              className="px-6 py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl font-bold flex items-center justify-center gap-2"
                            >
                              <Edit2 className="w-5 h-5" />
                              Update Status
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(order.id);
                              }}
                              className="px-6 py-3.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl font-bold flex items-center justify-center gap-2"
                            >
                              <Trash2 className="w-5 h-5" />
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Modals */}
      {showCreateModal && (
        <CreateSpecialOrderModal
          key="create-special-order-modal"
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchOrders();
          }}
          customers={customers}
          paymentAccounts={paymentAccounts}
          currentUser={currentUser}
        />
      )}

      {showPaymentModal && selectedOrder && (
        <RecordPaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedOrder(null);
          }}
          onSuccess={() => {
            setShowPaymentModal(false);
            setSelectedOrder(null);
            fetchOrders();
          }}
          order={selectedOrder}
          paymentAccounts={paymentAccounts}
          currentUser={currentUser}
        />
      )}

      {showUpdateModal && selectedOrder && (
        <UpdateStatusModal
          isOpen={showUpdateModal}
          onClose={() => {
            setShowUpdateModal(false);
            setSelectedOrder(null);
          }}
          onSuccess={() => {
            setShowUpdateModal(false);
            setSelectedOrder(null);
            fetchOrders();
          }}
          order={selectedOrder}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

// ================================================
// CREATE SPECIAL ORDER MODAL
// ================================================

interface CreateSpecialOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customers: any[];
  paymentAccounts: any[];
  currentUser: any;
}

const CreateSpecialOrderModal: React.FC<CreateSpecialOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customers,
  paymentAccounts,
  currentUser
}) => {
  const [formData, setFormData] = useState<Partial<CreateSpecialOrderInput>>({
    customer_id: '',
    product_name: '',
    product_description: '',
    quantity: 1,
    unit_price: 0,
    total_amount: 0,
    deposit_paid: 0,
    supplier_name: '',
    supplier_reference: '',
    country_of_origin: '',
    tracking_number: '',
    expected_arrival_date: '',
    notes: '',
    internal_notes: '',
    payment_method: 'cash',
    account_id: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Use custom hook for safe deduplication and key generation
  // Ensure paymentAccounts is always an array and has no nulls/undefined
  // Additional deduplication layer to prevent any duplicates from reaching the render
  const safePaymentAccounts = useMemo(() => {
    const accounts = (paymentAccounts || []).filter(account => account && account.id);
    
    // Extra deduplication using Map to ensure uniqueness
    const dedupeMap = new Map();
    accounts.forEach(account => {
      if (!dedupeMap.has(account.id)) {
        dedupeMap.set(account.id, account);
      }
    });
    
    return Array.from(dedupeMap.values());
  }, [paymentAccounts]);
  
  const { items: uniquePaymentAccounts, getKey: getAccountKey } = useDeduplicated(safePaymentAccounts);

  // Customer search state
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState(-1);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const customerInputRef = React.useRef<HTMLInputElement>(null);

  // Supplier selection state
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);

  // Product selection state
  const [products, setProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const productInputRef = React.useRef<HTMLInputElement>(null);
  const [productDropdownPosition, setProductDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [customerDropdownPosition, setCustomerDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  
  // Variant selection state
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [productWithVariants, setProductWithVariants] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Update dropdown positions on scroll and resize
  useEffect(() => {
    const updatePositions = () => {
      if (showCustomerDropdown && customerInputRef.current) {
        const rect = customerInputRef.current.getBoundingClientRect();
        // Use viewport coordinates directly for fixed positioning
        setCustomerDropdownPosition({
          top: rect.bottom,
          left: rect.left,
          width: rect.width
        });
      }
      
      if (showProductDropdown && productInputRef.current) {
        const rect = productInputRef.current.getBoundingClientRect();
        // Use viewport coordinates directly for fixed positioning
        setProductDropdownPosition({
          top: rect.bottom,
          left: rect.left,
          width: rect.width
        });
      }
    };

    if (isOpen) {
      // Update on scroll and resize
      window.addEventListener('scroll', updatePositions, true);
      window.addEventListener('resize', updatePositions);
      
      // Initial update
      updatePositions();
      
      return () => {
        window.removeEventListener('scroll', updatePositions, true);
        window.removeEventListener('resize', updatePositions);
      };
    }
  }, [isOpen, showCustomerDropdown, showProductDropdown]);

  // Filter customers based on search
  const filteredCustomers = React.useMemo(() => {
    // Deduplicate customers first
    const customerMap = new Map();
    customers.forEach(customer => {
      if (customer && customer.id && !customerMap.has(customer.id)) {
        customerMap.set(customer.id, customer);
      }
    });
    const uniqueCustomers = Array.from(customerMap.values());
    
    // Show all customers if no search (limited to 50 for performance)
    if (!customerSearch.trim()) return uniqueCustomers.slice(0, 50);
    
    const searchLower = customerSearch.toLowerCase();
    return uniqueCustomers.filter(customer => 
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower)
    );
  }, [customerSearch, customers]);

  // Handle customer selection
  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setFormData(prev => ({ ...prev, customer_id: customer.id }));
    setShowCustomerDropdown(false);
    setSelectedCustomerIndex(-1);
  };

  // Handle customer search input
  const handleCustomerSearchChange = (value: string) => {
    setCustomerSearch(value);
    setShowCustomerDropdown(true);
    setSelectedCustomerIndex(-1);
    
    // Update dropdown position while typing - use viewport coordinates for fixed positioning
    if (customerInputRef.current) {
      const rect = customerInputRef.current.getBoundingClientRect();
      // Use viewport coordinates directly since dropdown is fixed
      setCustomerDropdownPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
    
    // Clear selection if search is empty
    if (!value.trim()) {
      setSelectedCustomer(null);
      setFormData(prev => ({ ...prev, customer_id: '' }));
    }
  };

  // Handle keyboard navigation in customer dropdown
  const handleCustomerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showCustomerDropdown || filteredCustomers.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedCustomerIndex(prev =>
        prev < filteredCustomers.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedCustomerIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedCustomerIndex >= 0) {
      e.preventDefault();
      handleCustomerSelect(filteredCustomers[selectedCustomerIndex]);
    } else if (e.key === 'Escape') {
      setShowCustomerDropdown(false);
      setSelectedCustomerIndex(-1);
    }
  };

  // Load suppliers function
  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('lats_suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  // Load products from inventory
  useEffect(() => {
    const loadProducts = async () => {
      try {
        // Load products with all their variants
        const { data, error } = await supabase
          .from('lats_products')
          .select(`
            *,
            lats_product_variants(
              id,
              product_id,
              variant_name,
              variant_attributes,
              sku,
              selling_price,
              cost_price,
              unit_price,
              quantity,
              is_active,
              is_parent,
              parent_variant_id,
              variant_type
            )
          `)
          .eq('is_active', true)
          .order('name');
        
        if (error) throw error;
        
        const productsData = data || [];
        
        // Debug: Check variant loading
        console.log('=== Product Loading Debug ===');
        console.log('Total products loaded:', productsData.length);
        const productsWithVariants = productsData.filter(p => 
          Array.isArray(p.lats_product_variants) && p.lats_product_variants.length > 0
        );
        console.log('Products with variants:', productsWithVariants.length);
        
        // Sample product with variants
        const sampleWithVariants = productsData.find(p => 
          Array.isArray(p.lats_product_variants) && p.lats_product_variants.length > 1
        );
        if (sampleWithVariants) {
          console.log('Sample product with variants:', sampleWithVariants.name);
          console.log('  - Total variants:', sampleWithVariants.lats_product_variants.length);
          console.log('  - Variants:', sampleWithVariants.lats_product_variants.map((v: any) => ({
            id: v.id,
            variant_name: v.variant_name,
            variant_attributes: v.variant_attributes,
            sku: v.sku
          })));
        } else {
          console.log('⚠️ No products with multiple variants found');
        }
        console.log('=== End Debug ===');
        
        // Fetch product images for all products
        if (productsData.length > 0) {
          const productIds = productsData.map(p => p.id);
          
          const { data: productImages } = await supabase
            .from('product_images')
            .select('id, product_id, image_url, thumbnail_url, is_primary')
            .in('product_id', productIds)
            .order('is_primary', { ascending: false });
          
          // Attach images to products
          if (productImages) {
            let productsWithImages = 0;
            productsData.forEach(product => {
              const images = productImages.filter(img => img.product_id === product.id);
              if (images.length > 0) {
                productsWithImages++;
                // Use primary image or first image
                const primaryImage = images.find(img => img.is_primary) || images[0];
                product.image_url = primaryImage.thumbnail_url || primaryImage.image_url;
                product.images = images.map(img => ({
                  id: img.id,
                  url: img.thumbnail_url || img.image_url,
                  thumbnailUrl: img.thumbnail_url,
                  isPrimary: img.is_primary || false
                }));
              }
            });
            
            console.log(`[SpecialOrders] Loaded ${productsData.length} products, ${productsWithImages} have images`);
          }
        }
        
        setProducts(productsData);
      } catch (error) {
        console.error('Error loading products:', error);
      }
    };

    if (isOpen) {
      loadSuppliers();
      loadProducts();
    }
  }, [isOpen]);

  // Handle supplier created
  const handleSupplierCreated = async (newSupplier: any) => {
    setShowAddSupplierModal(false);
    await loadSuppliers(); // Refresh suppliers list
    // Automatically select the newly created supplier
    handleSupplierSelect(newSupplier);
    toast.success('Supplier created and selected!');
  };

  // Filter products based on search
  const filteredProducts = React.useMemo(() => {
    // Deduplicate products first to avoid duplicate entries
    const productMap = new Map();
    products.forEach(product => {
      if (product && product.id && !productMap.has(product.id)) {
        productMap.set(product.id, product);
      }
    });
    const uniqueProducts = Array.from(productMap.values());
    
    // Show top 30 products if no search
    if (!productSearch.trim()) return uniqueProducts.slice(0, 30);
    
    const searchLower = productSearch.toLowerCase();
    return uniqueProducts.filter(product => 
      product.name?.toLowerCase().includes(searchLower) ||
      product.sku?.toLowerCase().includes(searchLower) ||
      product.description?.toLowerCase().includes(searchLower)
    ).slice(0, 30);
  }, [productSearch, products]);

  // Handle product selection
  const handleProductSelect = (product: any) => {
    // Debug logging
    console.log('=== Product Selection Debug ===');
    console.log('Product:', product.name);
    console.log('Has variants?', !!product.lats_product_variants);
    console.log('Is array?', Array.isArray(product.lats_product_variants));
    console.log('Variants count:', Array.isArray(product.lats_product_variants) ? product.lats_product_variants.length : 0);
    
    // Filter to get actual sellable variants
    // Exclude: parent containers, IMEI children, inactive variants
    const actualVariants = Array.isArray(product.lats_product_variants) 
      ? product.lats_product_variants.filter((v: any) => {
          // Exclude inactive variants
          if (v.is_active === false) return false;
          
          // Exclude parent/container variants
          if (v.is_parent === true) return false;
          
          // Exclude IMEI children (individual tracked items)
          if (v.variant_type === 'imei_child') return false;
          
          // Include standard variants and regular items
          return true;
        }) 
      : [];
    
    console.log('Sellable variants (after filtering):', actualVariants.length);
    if (actualVariants.length > 0) {
      console.log('First variant:', {
        id: actualVariants[0].id,
        name: actualVariants[0].variant_name,
        sku: actualVariants[0].sku,
        price: actualVariants[0].selling_price,
        is_parent: actualVariants[0].is_parent,
        variant_type: actualVariants[0].variant_type
      });
    }
    
    // If product has multiple variants, show variant selection modal
    if (actualVariants.length > 1) {
      console.log('✅ Showing variant modal for', actualVariants.length, 'variants');
      setProductWithVariants(product);
      setShowVariantModal(true);
      setShowProductDropdown(false);
      return;
    }
    
    console.log('→ Single/no variant - selecting directly');
    console.log('=== End Debug ===');
    
    // If single variant or no variants, select directly
    setSelectedProduct(product);
    setProductSearch(product.name);
    
    // Get the first actual variant's pricing if available
    const firstVariant = actualVariants[0];
    const price = firstVariant?.selling_price || firstVariant?.unit_price || 0;
    
    // Build product name with variant details
    let productDisplayName = product.name;
    if (firstVariant) {
      // Extract attributes from variant_attributes JSONB or use variant_name
      const attrs = firstVariant.variant_attributes || {};
      const variantDetails = [
        attrs.color,
        attrs.storage,
        attrs.size
      ].filter(Boolean).join(' / ');
      
      // Use variant details or variant_name
      const displayDetails = variantDetails || firstVariant.variant_name;
      if (displayDetails) {
        productDisplayName = `${product.name} (${displayDetails})`;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      product_name: productDisplayName,
      product_description: product.description || '',
      unit_price: price
    }));
    
    setShowProductDropdown(false);
    setSelectedProductIndex(-1);
  };

  // Handle product search input
  const handleProductSearchChange = (value: string) => {
    setProductSearch(value);
    setShowProductDropdown(true);
    setSelectedProductIndex(-1);
    
    // Update dropdown position while typing - use viewport coordinates for fixed positioning
    if (productInputRef.current) {
      const rect = productInputRef.current.getBoundingClientRect();
      // Use viewport coordinates directly since dropdown is fixed
      setProductDropdownPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
    
    // Clear selection if search is empty
    if (!value.trim()) {
      setSelectedProduct(null);
    }
  };

  // Handle keyboard navigation in product dropdown
  const handleProductKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showProductDropdown || filteredProducts.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedProductIndex(prev =>
        prev < filteredProducts.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedProductIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedProductIndex >= 0) {
      e.preventDefault();
      handleProductSelect(filteredProducts[selectedProductIndex]);
    } else if (e.key === 'Escape') {
      setShowProductDropdown(false);
      setSelectedProductIndex(-1);
    }
  };

  // Filter suppliers based on search
  const filteredSuppliers = React.useMemo(() => {
    if (!supplierSearch.trim()) return suppliers;
    
    const searchLower = supplierSearch.toLowerCase();
    return suppliers.filter(supplier => 
      supplier.name?.toLowerCase().includes(searchLower) ||
      supplier.company_name?.toLowerCase().includes(searchLower) ||
      supplier.city?.toLowerCase().includes(searchLower) ||
      supplier.country?.toLowerCase().includes(searchLower)
    );
  }, [supplierSearch, suppliers]);

  // Handle variant selection
  const handleVariantSelect = (variant: any) => {
    if (!productWithVariants) return;
    
    setSelectedVariant(variant);
    setSelectedProduct(productWithVariants);
    setProductSearch(productWithVariants.name);
    
    // Build product name with variant details
    // Extract attributes from variant_attributes JSONB
    const attrs = variant.variant_attributes || {};
    const variantDetails = [
      attrs.color,
      attrs.storage,
      attrs.size
    ].filter(Boolean).join(' / ');
    
    // Use variant details or variant_name
    const displayDetails = variantDetails || variant.variant_name;
    const productDisplayName = displayDetails 
      ? `${productWithVariants.name} (${displayDetails})`
      : productWithVariants.name;
    
    const price = variant.selling_price || variant.unit_price || 0;
    
    setFormData(prev => ({
      ...prev,
      product_name: productDisplayName,
      product_description: productWithVariants.description || '',
      unit_price: price
    }));
    
    setShowVariantModal(false);
    setProductWithVariants(null);
  };

  // Handle supplier selection
  const handleSupplierSelect = (supplier: any) => {
    setSelectedSupplier(supplier);
    setFormData(prev => ({
      ...prev,
      supplier_name: supplier.name,
      country_of_origin: supplier.country || ''
    }));
    setShowSupplierModal(false);
  };

  // Step navigation
  const goToNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Validate current step
  const isStepValid = () => {
    switch (currentStep) {
      case 1: // Customer & Product
        return !!formData.customer_id && !!formData.product_name;
      case 2: // Pricing
        return formData.quantity > 0 && formData.unit_price > 0;
      case 3: // Payment
        return !!formData.account_id;
      case 4: // Supplier & Notes (optional)
        return true;
      default:
        return false;
    }
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCustomerSearch('');
      setSelectedCustomer(null);
      setShowCustomerDropdown(false);
      setSelectedCustomerIndex(-1);
      setSelectedSupplier(null);
      setSupplierSearch('');
      setProductSearch('');
      setSelectedProduct(null);
      setShowProductDropdown(false);
      setSelectedProductIndex(-1);
      setShowVariantModal(false);
      setProductWithVariants(null);
      setSelectedVariant(null);
      setCurrentStep(1);
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.quantity && formData.unit_price) {
      setFormData(prev => ({
        ...prev,
        total_amount: prev.quantity! * prev.unit_price!
      }));
    }
  }, [formData.quantity, formData.unit_price]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_id || !formData.product_name || !formData.account_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await specialOrderService.createSpecialOrder(
        formData as CreateSpecialOrderInput,
        currentUser?.id
      );

      if (result.success) {
        toast.success('Special order created successfully!');
        onSuccess();
      } else {
        toast.error(result.error || 'Failed to create special order');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Calculate completion stats for progress indicator
  const requiredFields = [
    formData.customer_id,
    formData.product_name,
    formData.account_id
  ];
  const completedRequired = requiredFields.filter(Boolean).length;
  const totalRequired = requiredFields.length;

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-[99999]"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Container */}
      <div 
        className="fixed inset-0 flex items-center justify-center z-[100000] p-4 pointer-events-none"
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden relative pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-special-order-modal-title"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
            disabled={isSubmitting}
          >
            <XIcon className="w-5 h-5" />
          </button>

          {/* Icon Header - Fixed */}
          <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <Package className="w-8 h-8 text-white" />
              </div>
              
              {/* Text and Progress */}
              <div>
                <h3 id="create-special-order-modal-title" className="text-2xl font-bold text-gray-900 mb-3">Create Special Order</h3>
                
                {/* Progress Indicator */}
                <div className="flex items-center gap-4">
                  {completedRequired > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm font-bold text-green-700">{completedRequired}/{totalRequired} Required</span>
                    </div>
                  )}
                  {completedRequired < totalRequired && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg animate-pulse">
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-bold text-orange-700">{totalRequired - completedRequired} Pending</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form Wrapper */}
          <form id="create-special-order-form" onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            {/* Step Indicator */}
            <div className="px-6 pt-4 pb-2 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-center gap-2">
                {/* Step 1 */}
                <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {currentStep > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">Customer & Product</span>
                  <span className="text-sm font-medium sm:hidden">Setup</span>
                </div>
                <div className={`w-8 sm:w-12 h-0.5 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
                
                {/* Step 2 */}
                <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {currentStep > 2 ? <CheckCircle className="w-5 h-5" /> : '2'}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">Pricing</span>
                </div>
                <div className={`w-8 sm:w-12 h-0.5 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`} />
                
                {/* Step 3 */}
                <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {currentStep > 3 ? <CheckCircle className="w-5 h-5" /> : '3'}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">Payment</span>
                </div>
                <div className={`w-8 sm:w-12 h-0.5 ${currentStep >= 4 ? 'bg-blue-600' : 'bg-gray-300'}`} />
                
                {/* Step 4 */}
                <div className={`flex items-center gap-2 ${currentStep >= 4 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentStep >= 4 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    4
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">Details</span>
                </div>
              </div>
            </div>

            {/* Scrollable Form Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Step 1: Customer & Product */}
              {currentStep === 1 && (
                <>
              {/* Customer Information */}
              <div className="mb-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Customer Information</h4>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={customerInputRef}
                      type="text"
                      value={customerSearch}
                      onChange={(e) => handleCustomerSearchChange(e.target.value)}
                      onKeyDown={handleCustomerKeyDown}
                      onFocus={() => {
                        setShowCustomerDropdown(true);
                        if (customerInputRef.current) {
                          const rect = customerInputRef.current.getBoundingClientRect();
                          // Use viewport coordinates for fixed positioning
                          setCustomerDropdownPosition({
                            top: rect.bottom,
                            left: rect.left,
                            width: rect.width
                          });
                        }
                      }}
                      onBlur={() => {
                        // Delay to allow click on dropdown item
                        setTimeout(() => setShowCustomerDropdown(false), 200);
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors text-gray-900"
                      placeholder="Search customer by name or phone..."
                      required
                      disabled={isSubmitting}
                    />
                    {!selectedCustomer && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <Search className="w-4 h-4" />
                      </div>
                    )}
                    {selectedCustomer && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerSearch('');
                          setSelectedCustomer(null);
                          setFormData(prev => ({ ...prev, customer_id: '' }));
                          customerInputRef.current?.focus();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    )}
                    {!selectedCustomer && (
                      <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1">
                        <Search className="w-3 h-3" />
                        Start typing to see suggestions
                      </p>
                    )}
                  </div>

                  {/* Customer Dropdown - Portaled to body for better positioning */}
                  {showCustomerDropdown && filteredCustomers.length > 0 && createPortal(
                    <div 
                      className="fixed bg-white border-2 border-blue-200 rounded-xl shadow-2xl max-h-80 overflow-y-auto"
                      style={{
                        zIndex: 100010,
                        top: `${customerDropdownPosition.top + 4}px`,
                        left: `${customerDropdownPosition.left}px`,
                        width: `${customerDropdownPosition.width}px`,
                        maxWidth: '100vw'
                      }}
                    >
                      {/* Result Counter */}
                      {customerSearch && (
                        <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-2 border-b-2 border-blue-200 flex items-center justify-between rounded-t-xl z-10">
                          <span className="text-xs font-semibold text-blue-700">
                            {filteredCustomers.length} {filteredCustomers.length === 1 ? 'customer' : 'customers'} found
                          </span>
                          <Search className="w-4 h-4 text-blue-500" />
                        </div>
                      )}
                      {filteredCustomers.map((customer, index) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => handleCustomerSelect(customer)}
                          className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                            index === selectedCustomerIndex ? 'bg-blue-50' : ''
                          } ${index === 0 ? 'rounded-t-xl' : ''} ${index === filteredCustomers.length - 1 ? 'rounded-b-xl' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Customer Avatar */}
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
                              {customer.name?.charAt(0).toUpperCase() || <UserCircle className="w-6 h-6" />}
                            </div>
                            {/* Customer Info */}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 text-sm truncate">{customer.name}</div>
                              <div className="text-xs text-gray-500 mt-0.5 truncate">{customer.phone}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>,
                    document.body
                  )}

                  {/* No Results Message - Portaled to body */}
                  {showCustomerDropdown && customerSearch && filteredCustomers.length === 0 && createPortal(
                    <div 
                      className="fixed bg-white border-2 border-gray-300 rounded-xl shadow-2xl p-4 text-center"
                      style={{
                        zIndex: 100010,
                        top: `${customerDropdownPosition.top + 4}px`,
                        left: `${customerDropdownPosition.left}px`,
                        width: `${customerDropdownPosition.width}px`
                      }}
                    >
                      <p className="text-sm text-gray-500">No customers found</p>
                      <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
                    </div>,
                    document.body
                  )}

                  {/* Selected Customer Display */}
                  {selectedCustomer && (
                    <div className="mt-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                      <div className="flex items-center gap-3">
                        {/* Customer Avatar */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                          {selectedCustomer.name?.charAt(0).toUpperCase() || <UserCircle className="w-7 h-7" />}
                        </div>
                        {/* Customer Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-blue-900 truncate">{selectedCustomer.name}</div>
                          <div className="text-xs text-blue-600 mt-0.5 truncate">{selectedCustomer.phone}</div>
                        </div>
                        {/* Check Icon */}
                        <div className="flex items-center gap-1 text-blue-600 flex-shrink-0">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Details */}
              <div className="mb-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Product Details</h4>
                <div className="space-y-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        ref={productInputRef}
                        type="text"
                        value={productSearch}
                        onChange={(e) => handleProductSearchChange(e.target.value)}
                        onKeyDown={handleProductKeyDown}
                         onFocus={() => {
                           setShowProductDropdown(true);
                           if (productInputRef.current) {
                             const rect = productInputRef.current.getBoundingClientRect();
                             // Use viewport coordinates for fixed positioning
                             setProductDropdownPosition({
                               top: rect.bottom,
                               left: rect.left,
                               width: rect.width
                             });
                           }
                         }}
                        onBlur={() => {
                          // Delay to allow click on dropdown item
                          setTimeout(() => setShowProductDropdown(false), 200);
                        }}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors text-gray-900"
                        placeholder="Search product by name or SKU..."
                        required
                        disabled={isSubmitting}
                      />
                      {!selectedProduct && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                          <Search className="w-4 h-4" />
                        </div>
                      )}
                      {selectedProduct && (
                        <button
                          type="button"
                          onClick={() => {
                            setProductSearch('');
                            setSelectedProduct(null);
                            setFormData(prev => ({
                              ...prev,
                              product_name: '',
                              product_description: '',
                              unit_price: 0
                            }));
                            productInputRef.current?.focus();
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      )}
                      {!selectedProduct && (
                        <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1">
                          <Search className="w-3 h-3" />
                          Start typing to see suggestions or click to browse
                        </p>
                      )}
                    </div>

                    {/* Product Dropdown - Portaled to body for better positioning */}
                    {showProductDropdown && filteredProducts.length > 0 && createPortal(
                      <div 
                        className="fixed bg-white border-2 border-purple-200 rounded-xl shadow-2xl max-h-80 overflow-y-auto"
                        style={{
                          zIndex: 100010,
                          top: `${productDropdownPosition.top + 4}px`,
                          left: `${productDropdownPosition.left}px`,
                          width: `${productDropdownPosition.width}px`,
                          maxWidth: '100vw'
                        }}
                      >
                        {/* Result Counter */}
                        {productSearch && (
                          <div className="sticky top-0 bg-gradient-to-r from-purple-50 to-purple-100 px-4 py-2 border-b-2 border-purple-200 flex items-center justify-between rounded-t-xl z-10">
                            <span className="text-xs font-semibold text-purple-700">
                              {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
                            </span>
                            <Search className="w-4 h-4 text-purple-500" />
                          </div>
                        )}
                        {filteredProducts.map((product, index) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => handleProductSelect(product)}
                            className={`w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                              index === selectedProductIndex ? 'bg-purple-50' : ''
                            } ${index === 0 ? 'rounded-t-xl' : ''} ${index === filteredProducts.length - 1 ? 'rounded-b-xl' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Product Thumbnail */}
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center flex-shrink-0 overflow-hidden border border-purple-300">
                                {product.image_url ? (
                                  <img 
                                    src={product.image_url} 
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      // Fallback to icon if image fails to load
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                ) : null}
                                <Package className={`w-6 h-6 text-purple-600 ${product.image_url ? 'hidden' : ''}`} />
                              </div>
                              {/* Product Info */}
                              <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-2">
                                  <div className="font-semibold text-gray-900 text-sm truncate flex-1">{product.name}</div>
                                  {/* Variant Count Badge */}
                                  {(() => {
                                    const variantCount = Array.isArray(product.lats_product_variants) 
                                      ? product.lats_product_variants.filter((v: any) => 
                                          v.is_active !== false && 
                                          v.is_parent !== true && 
                                          v.variant_type !== 'imei_child'
                                        ).length 
                                      : 0;
                                    return variantCount > 1 ? (
                                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold flex-shrink-0">
                                        {variantCount} variants
                                      </span>
                                    ) : null;
                                  })()}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  {product.sku && (
                                    <span className="text-xs text-gray-500">SKU: {product.sku}</span>
                                  )}
                                  {product.lats_product_variants?.[0]?.selling_price && (
                                    <span className="text-xs text-green-600 font-medium">
                                      {new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(product.lats_product_variants[0].selling_price)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>,
                      document.body
                    )}

                      {/* No Results Message - Portaled to body */}
                      {showProductDropdown && productSearch && filteredProducts.length === 0 && createPortal(
                        <div 
                          className="fixed bg-white border-2 border-gray-300 rounded-xl shadow-2xl p-4 text-center"
                          style={{
                            zIndex: 100010,
                            top: `${productDropdownPosition.top + 4}px`,
                            left: `${productDropdownPosition.left}px`,
                            width: `${productDropdownPosition.width}px`
                          }}
                        >
                        <p className="text-sm text-gray-500">No products found</p>
                        <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
                      </div>,
                      document.body
                    )}

                    {/* Selected Product Display */}
                    {selectedProduct && (
                      <div className="mt-3 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
                        <div className="flex items-start gap-3">
                          {/* Product Thumbnail */}
                          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-purple-300 shadow-sm">
                            {selectedProduct.image_url ? (
                              <img 
                                src={selectedProduct.image_url} 
                                alt={selectedProduct.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback to icon if image fails to load
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <Package className={`w-8 h-8 text-purple-600 ${selectedProduct.image_url ? 'hidden' : ''}`} />
                          </div>
                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-purple-900 truncate">{selectedProduct.name}</div>
                            
                            {/* Variant Badge */}
                            {selectedVariant && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {(() => {
                                  const attrs = selectedVariant.variant_attributes || {};
                                  return (
                                    <>
                                      {attrs.color && (
                                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                          {attrs.color}
                                        </span>
                                      )}
                                      {attrs.storage && (
                                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                          {attrs.storage}
                                        </span>
                                      )}
                                      {attrs.size && (
                                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                          {attrs.size}
                                        </span>
                                      )}
                                      {selectedVariant.variant_name && !attrs.color && !attrs.storage && !attrs.size && (
                                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                          {selectedVariant.variant_name}
                                        </span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                            
                            {selectedProduct.sku && (
                              <div className="text-xs text-purple-600 mt-0.5">SKU: {selectedProduct.sku}</div>
                            )}
                            {selectedProduct.lats_product_variants?.[0]?.selling_price && (
                              <div className="text-xs text-green-600 font-medium mt-1">
                                Price: {new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(selectedProduct.lats_product_variants[0].selling_price)}
                              </div>
                            )}
                          </div>
                          {/* Check Icon */}
                          <div className="flex items-center gap-1 text-purple-600 flex-shrink-0">
                            <CheckCircle className="w-5 h-5" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Description
                    </label>
                    <textarea
                      value={formData.product_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, product_description: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors text-gray-900 resize-none"
                      placeholder="Additional details, color, specifications..."
                      rows={2}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
                </>
              )}

              {/* Step 2: Pricing & Quantity */}
              {currentStep === 2 && (
              <div className="mb-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Pricing & Quantity</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors text-gray-900 font-medium"
                      min="1"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit Price <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.unit_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors text-gray-900 font-medium"
                      min="0"
                      step="1000"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deposit Paid <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.deposit_paid}
                      onChange={(e) => setFormData(prev => ({ ...prev, deposit_paid: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors text-gray-900 font-medium"
                      min="0"
                      step="1000"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Total Amount and Balance Due Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="px-4 py-4 bg-green-50 border-2 border-green-200 rounded-xl">
                    <div className="text-xs font-semibold text-green-700 mb-1">Total Amount</div>
                    <div className="text-2xl font-bold text-green-600">
                      {new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(formData.total_amount || 0)}
                    </div>
                  </div>
                  {formData.total_amount > 0 && (
                    <div className="px-4 py-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
                      <div className="text-xs font-semibold text-orange-700 mb-1">Balance Due</div>
                      <div className="text-2xl font-bold text-orange-600">
                        {new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format((formData.total_amount || 0) - (formData.deposit_paid || 0))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Step 3: Payment Details */}
              {currentStep === 3 && (
              <div className="mb-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment Details</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Payment Account <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {uniquePaymentAccounts.map((account, idx) => {
                      const isSelected = formData.account_id === account.id;
                      return (
                        <button
                          key={getAccountKey(account.id, idx)}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, account_id: account.id }))}
                          disabled={isSubmitting}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className={`text-sm font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                                {account.name}
                              </div>
                              {account.account_type && (
                                <div className={`text-xs mt-1 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                                  {account.account_type}
                                </div>
                              )}
                            </div>
                            {isSelected && (
                              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {uniquePaymentAccounts.length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                      <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 font-medium">No payment accounts available</p>
                      <p className="text-xs text-gray-500 mt-1">Please contact administrator</p>
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Step 4: Supplier & Shipping */}
              {currentStep === 4 && (
                <>
              <div className="mb-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Supplier & Shipping (Optional)</h4>
                
                {/* Supplier Selection Button */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier
                  </label>
                  {selectedSupplier ? (
                    <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                            {selectedSupplier.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-orange-900">{selectedSupplier.name}</div>
                            {selectedSupplier.country && (
                              <div className="text-xs text-orange-600">{selectedSupplier.country}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-orange-600">
                            <Truck className="w-4 h-4" />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSupplier(null);
                              setFormData(prev => ({
                                ...prev,
                                supplier_name: '',
                                country_of_origin: ''
                              }));
                            }}
                            className="text-orange-600 hover:text-orange-800"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSupplierModal(true)}
                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors text-sm text-gray-600 hover:text-orange-600 font-medium flex items-center justify-center gap-2"
                    >
                      <Truck className="w-4 h-4" />
                      Choose Supplier
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reference
                    </label>
                    <input
                      type="text"
                      value={formData.supplier_reference}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplier_reference: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors text-gray-900"
                      placeholder="Invoice #"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tracking #
                    </label>
                    <input
                      type="text"
                      value={formData.tracking_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, tracking_number: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors text-gray-900"
                      placeholder="Tracking #"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expected Arrival
                    </label>
                    <input
                      type="date"
                      value={formData.expected_arrival_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, expected_arrival_date: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors text-gray-900"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Notes (Optional)</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors text-gray-900 resize-none"
                      placeholder="Notes visible to customer..."
                      rows={2}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Internal Notes (Staff Only)
                    </label>
                    <textarea
                      value={formData.internal_notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, internal_notes: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-yellow-200 rounded-xl focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 bg-yellow-50 transition-colors text-gray-900 resize-none"
                      placeholder="Private notes..."
                      rows={2}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
                </>
              )}
            </div>

            {/* Fixed Navigation Buttons */}
            <div className="px-6 py-4 border-t border-gray-200 bg-white flex-shrink-0">
              <div className="flex gap-3">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={goToPreviousStep}
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Back
                  </button>
                )}
                
                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={goToNextStep}
                    disabled={!isStepValid()}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting || completedRequired < totalRequired}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating...
                      </span>
                    ) : (
                      '✓ Create Special Order'
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>

        </div>
      </div>

      {/* Supplier Selection Modal */}
      {showSupplierModal && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 z-[100001]"
            onClick={() => setShowSupplierModal(false)}
            aria-hidden="true"
          />
          
          {/* Modal Container */}
          <div 
            className="fixed inset-0 flex items-center justify-center z-[100002] p-4 pointer-events-none"
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowSupplierModal(false)}
                className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
              >
                <XIcon className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
                <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
                  <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center shadow-lg">
                    <Truck className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Select Supplier</h3>
                    <p className="text-sm text-gray-600">Choose a supplier for this order</p>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="p-6 pb-0 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search suppliers by name, company, location..."
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  />
                </div>
                <div className="text-sm text-gray-500 mt-3">
                  {filteredSuppliers.length} of {suppliers.length} suppliers
                </div>
              </div>

              {/* Suppliers Grid */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {filteredSuppliers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSuppliers.map((supplier) => (
                      <div
                        key={supplier.id}
                        onClick={() => handleSupplierSelect(supplier)}
                        className="border-2 border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-lg hover:scale-[1.02] hover:border-orange-300 cursor-pointer transition-all duration-300 p-4"
                      >
                        {/* Avatar and Name */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                            {supplier.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-gray-900 truncate">{supplier.name}</h4>
                            {supplier.company_name && supplier.company_name !== supplier.name && (
                              <p className="text-xs text-gray-600 truncate">{supplier.company_name}</p>
                            )}
                          </div>
                        </div>

                        {/* Location */}
                        {(supplier.city || supplier.country) && (
                          <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                            <MapPin className="w-3 h-3" />
                            <span>
                              {[supplier.city, supplier.country].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        )}

                        {/* Select Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSupplierSelect(supplier);
                          }}
                          className="w-full py-2 px-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg font-semibold text-sm flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Select
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Truck className="w-16 h-16 text-gray-400 mb-4" />
                    <p className="text-gray-600 text-lg font-medium">No suppliers found</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {supplierSearch ? "Try adjusting your search" : "No suppliers available"}
                    </p>
                  </div>
                )}
              </div>

              {/* Fixed Footer with Add New Supplier Button */}
              <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowSupplierModal(false);
                    setShowAddSupplierModal(true);
                  }}
                  className="w-full px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-amber-700 transition-all shadow-lg hover:shadow-xl text-lg flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add New Supplier
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Add Supplier Modal - Highest z-index */}
      <EnhancedAddSupplierModal
        isOpen={showAddSupplierModal}
        onClose={() => {
          setShowAddSupplierModal(false);
          setShowSupplierModal(true);
        }}
        onSupplierCreated={handleSupplierCreated}
      />

      {/* Variant Selection Modal */}
      {showVariantModal && productWithVariants && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/70 z-[100011]"
            onClick={() => {
              setShowVariantModal(false);
              setProductWithVariants(null);
            }}
            aria-hidden="true"
          />
          
          {/* Modal Container */}
          <div 
            className="fixed inset-0 flex items-center justify-center z-[100012] p-4 pointer-events-none"
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden relative pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setShowVariantModal(false);
                  setProductWithVariants(null);
                }}
                className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
              >
                <XIcon className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white flex-shrink-0">
                <div className="flex items-center gap-4">
                  {/* Product Thumbnail */}
                  <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden backdrop-blur">
                    {productWithVariants.image_url ? (
                      <img 
                        src={productWithVariants.image_url} 
                        alt={productWithVariants.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-8 h-8 text-white" />
                    )}
                  </div>
                  {/* Product Info */}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-1">{productWithVariants.name}</h3>
                    <p className="text-purple-100 text-sm">Select a variant to continue</p>
                  </div>
                </div>
              </div>

              {/* Variants Grid */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(Array.isArray(productWithVariants.lats_product_variants) 
                    ? productWithVariants.lats_product_variants 
                    : []
                  )
                    .filter((variant: any) => {
                      // Same filtering as handleProductSelect
                      if (variant.is_active === false) return false;
                      if (variant.is_parent === true) return false;
                      if (variant.variant_type === 'imei_child') return false;
                      return true;
                    })
                    .map((variant: any) => {
                      // Extract attributes from variant_attributes JSONB
                      const attrs = variant.variant_attributes || {};
                      const variantDetails = [
                        attrs.color,
                        attrs.storage,
                        attrs.size
                      ].filter(Boolean).join(' / ');
                      
                      // Use variant details or variant_name
                      const displayName = variantDetails || variant.variant_name || 'Variant';
                      
                      const price = variant.selling_price || variant.unit_price || 0;
                      const stockQuantity = variant.quantity || 0;
                      
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => handleVariantSelect(variant)}
                          className="group p-5 border-2 border-purple-200 rounded-xl hover:border-purple-500 hover:shadow-lg transition-all bg-white hover:bg-purple-50 text-left"
                        >
                          {/* Variant Details */}
                          <div className="space-y-3">
                            {/* Variant Name */}
                            {displayName && (
                              <div className="text-base font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
                                {displayName}
                              </div>
                            )}
                            
                            {/* SKU */}
                            {variant.sku && (
                              <div className="text-xs text-gray-500 font-mono">
                                SKU: {variant.sku}
                              </div>
                            )}
                            
                            {/* Price */}
                            <div className="text-lg font-bold text-green-600">
                              {new Intl.NumberFormat('en-TZ', { 
                                style: 'currency', 
                                currency: 'TZS', 
                                minimumFractionDigits: 0 
                              }).format(price)}
                            </div>
                            
                            {/* Stock Badge */}
                            <div className="flex items-center gap-2">
                              <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                stockQuantity > 10 
                                  ? 'bg-green-100 text-green-700' 
                                  : stockQuantity > 0 
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-red-100 text-red-700'
                              }`}>
                                {stockQuantity > 0 ? `${stockQuantity} in stock` : 'Out of stock'}
                              </div>
                            </div>
                            
                            {/* Select Button */}
                            <div className="pt-2 mt-2 border-t border-purple-100">
                              <div className="flex items-center justify-center gap-2 text-purple-600 group-hover:text-purple-700 font-semibold text-sm">
                                <CheckCircle className="w-4 h-4" />
                                Select This Variant
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                <p className="text-sm text-gray-600 text-center">
                  <Package className="w-4 h-4 inline mr-1" />
                  {Array.isArray(productWithVariants.lats_product_variants) 
                    ? productWithVariants.lats_product_variants.filter((v: any) => 
                        v.is_active !== false && 
                        v.is_parent !== true && 
                        v.variant_type !== 'imei_child'
                      ).length 
                    : 0} variants available for {productWithVariants.name}
                </p>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>,
    document.body
  );
};

// ================================================
// RECORD PAYMENT MODAL
// ================================================

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: SpecialOrder;
  paymentAccounts: any[];
  currentUser: any;
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  order,
  paymentAccounts,
  currentUser
}) => {
  const [formData, setFormData] = useState<Partial<RecordSpecialOrderPaymentInput>>({
    special_order_id: order.id,
    customer_id: order.customer_id,
    amount: order.balance_due,
    payment_method: 'cash',
    account_id: '',
    reference_number: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Use custom hook for safe deduplication and key generation
  // Ensure paymentAccounts is always an array and has no nulls/undefined
  // Additional deduplication layer to prevent any duplicates from reaching the render
  const safePaymentAccounts = useMemo(() => {
    const accounts = (paymentAccounts || []).filter(account => account && account.id);
    
    // Extra deduplication using Map to ensure uniqueness
    const dedupeMap = new Map();
    accounts.forEach(account => {
      if (!dedupeMap.has(account.id)) {
        dedupeMap.set(account.id, account);
      }
    });
    
    return Array.from(dedupeMap.values());
  }, [paymentAccounts]);
  
  const { items: uniquePaymentAccounts, getKey: getAccountKey } = useDeduplicated(safePaymentAccounts);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.account_id) {
      toast.error('Please select a payment account');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await specialOrderService.recordPayment(
        formData as RecordSpecialOrderPaymentInput,
        currentUser?.id
      );

      if (result.success) {
        toast.success('Payment recorded successfully!');
        onSuccess();
      } else {
        toast.error(result.error || 'Failed to record payment');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-[99999]"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center z-[100000] p-4 pointer-events-none">
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden relative pointer-events-auto max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
          >
            <XIcon className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Record Payment</h3>
                <p className="text-sm text-gray-600">{order.order_number}</p>
              </div>
            </div>
          </div>

        {/* Order Info - Enhanced */}
        <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 border-b border-gray-200 flex-shrink-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-gray-600">Product:</span>
              <span className="text-sm font-semibold text-gray-900">{order.product_name}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-gray-600">Customer:</span>
              <span className="text-sm font-semibold text-gray-900">{order.customer?.name}</span>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-gray-600">Total Amount:</span>
              <span className="text-base font-bold text-gray-900">
                {new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(order.total_amount)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-green-700">Paid:</span>
              <span className="text-base font-bold text-green-600">
                {new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(order.deposit_paid)}
              </span>
            </div>
            <div className="bg-orange-100 border-2 border-orange-300 rounded-xl p-4 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-orange-900">Balance Due:</span>
                <span className="text-2xl font-bold text-orange-600">
                  {new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(order.balance_due)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              max={order.balance_due}
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Account <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.account_id}
              onChange={(e) => setFormData(prev => ({ ...prev, account_id: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Account</option>
              {uniquePaymentAccounts.filter(account => account && account.id && account.name).map((account, idx) => (
                <option key={getAccountKey(account.id, idx)} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
            <input
              type="text"
              value={formData.reference_number}
              onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Transaction reference"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Payment notes..."
              rows={2}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>,
    document.body
  );
};

// ================================================
// UPDATE STATUS MODAL
// ================================================

interface UpdateStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: SpecialOrder;
  currentUser: any;
}

const UpdateStatusModal: React.FC<UpdateStatusModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  order,
  currentUser
}) => {
  const [formData, setFormData] = useState<UpdateSpecialOrderInput>({
    status: order.status,
    tracking_number: order.tracking_number || '',
    supplier_reference: order.supplier_reference || '',
    expected_arrival_date: order.expected_arrival_date || '',
    actual_arrival_date: order.actual_arrival_date || '',
    notes: order.notes || '',
    internal_notes: order.internal_notes || ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    try {
      const result = await specialOrderService.updateSpecialOrder(
        order.id,
        formData,
        currentUser?.id
      );

      if (result.success) {
        toast.success('Order updated successfully!');
        onSuccess();
      } else {
        toast.error(result.error || 'Failed to update order');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Edit2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Update Order Status</h3>
              <p className="text-sm text-gray-600">{order.order_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as SpecialOrderStatus }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="deposit_received">Deposit Received</option>
              <option value="ordered">Ordered</option>
              <option value="in_transit">In Transit</option>
              <option value="arrived">Arrived</option>
              <option value="ready_for_pickup">Ready for Pickup</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number</label>
            <input
              type="text"
              value={formData.tracking_number}
              onChange={(e) => setFormData(prev => ({ ...prev, tracking_number: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Shipment tracking number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Reference</label>
            <input
              type="text"
              value={formData.supplier_reference}
              onChange={(e) => setFormData(prev => ({ ...prev, supplier_reference: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Supplier order reference"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Arrival</label>
              <input
                type="date"
                value={formData.expected_arrival_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expected_arrival_date: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Actual Arrival</label>
              <input
                type="date"
                value={formData.actual_arrival_date}
                onChange={(e) => setFormData(prev => ({ ...prev, actual_arrival_date: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Notes visible to customer..."
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
            <textarea
              value={formData.internal_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, internal_notes: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Internal notes (not visible to customer)..."
              rows={2}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Updating...' : 'Update Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SpecialOrdersPage;

