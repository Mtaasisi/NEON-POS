import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useCustomers } from '../../../context/CustomersContext';
import { useBranch } from '../../../context/BranchContext';
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
  MapPin
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';
import { financeAccountService } from '../../../lib/financeAccountService';
import { useLoadingJob } from '../../../hooks/useLoadingJob';
import { TableSkeleton } from '../../../components/ui/SkeletonLoaders';

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
      setPaymentAccounts(accounts);
    } catch (error) {
      console.error('Error fetching payment accounts:', error);
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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <BackButton to="/dashboard" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Special Orders</h1>
            <p className="text-gray-600 mt-1">Manage pre-orders and import requests</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus size={18} />
          New Special Order
        </button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-600">Total Orders</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">
              {stats.deposit_received + stats.ordered + stats.in_transit}
            </div>
            <div className="text-xs text-blue-600">In Progress</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-2xl font-bold text-green-600">
              {stats.arrived + stats.ready_for_pickup}
            </div>
            <div className="text-xs text-green-600">Ready</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(stats.total_balance_due)}
            </div>
            <div className="text-xs text-purple-600">Balance Due</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search orders, products, customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg font-medium">No special orders found</p>
            <p className="text-gray-500 text-sm mt-2">Create your first special order to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-5 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm inline-flex items-center gap-2"
            >
              <Plus size={18} />
              New Special Order
            </button>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg p-5 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Order Info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-gray-900">{order.order_number}</h3>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          {order.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-700 font-medium mt-1">{order.product_name}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span>Customer: {order.customer?.name}</span>
                        <span>•</span>
                        <span>Qty: {order.quantity}</span>
                        {order.country_of_origin && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin size={14} />
                              {order.country_of_origin}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Actions */}
                <div className="flex flex-col lg:items-end gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-gray-600">Total: <span className="font-bold text-gray-900">{formatCurrency(order.total_amount)}</span></div>
                    <div className="text-xs text-green-600">Paid: <span className="font-bold">{formatCurrency(order.deposit_paid)}</span></div>
                    {order.balance_due > 0 && (
                      <div className="text-xs text-red-600">Balance: <span className="font-bold">{formatCurrency(order.balance_due)}</span></div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {order.balance_due > 0 && (
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowPaymentModal(true);
                        }}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium flex items-center gap-1"
                      >
                        <DollarSign size={14} />
                        Record Payment
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowUpdateModal(true);
                      }}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium flex items-center gap-1"
                    >
                      <Edit2 size={14} />
                      Update
                    </button>
                    <button
                      onClick={() => handleDelete(order.id)}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateSpecialOrderModal
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Create Special Order</h3>
              <p className="text-sm text-gray-600">Pre-order or import request</p>
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
          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.customer_id}
              onChange={(e) => setFormData(prev => ({ ...prev, customer_id: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Customer</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.phone}
                </option>
              ))}
            </select>
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.product_name}
              onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., iPhone 15 Pro Max"
              required
            />
          </div>

          {/* Product Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Description</label>
            <textarea
              value={formData.product_description}
              onChange={(e) => setFormData(prev => ({ ...prev, product_description: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Specifications, color, etc."
              rows={2}
            />
          </div>

          {/* Quantity and Unit Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Price <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.unit_price}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          {/* Total and Deposit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
              <input
                type="number"
                value={formData.total_amount}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deposit Paid <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.deposit_paid}
                onChange={(e) => setFormData(prev => ({ ...prev, deposit_paid: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          {/* Payment Method and Account */}
          <div className="grid grid-cols-2 gap-4">
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
                {paymentAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Supplier and Country */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
              <input
                type="text"
                value={formData.supplier_name}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Supplier or store name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Reference</label>
              <input
                type="text"
                value={formData.supplier_reference}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier_reference: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Invoice/Order number"
              />
            </div>
          </div>

          {/* Country and Tracking */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country of Origin</label>
              <input
                type="text"
                value={formData.country_of_origin}
                onChange={(e) => setFormData(prev => ({ ...prev, country_of_origin: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Dubai, China"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number</label>
              <input
                type="text"
                value={formData.tracking_number}
                onChange={(e) => setFormData(prev => ({ ...prev, tracking_number: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Shipping tracking number"
              />
            </div>
          </div>

          {/* Expected Arrival Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Arrival Date</label>
            <input
              type="date"
              value={formData.expected_arrival_date}
              onChange={(e) => setFormData(prev => ({ ...prev, expected_arrival_date: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Customer-facing notes..."
              rows={2}
            />
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
            <textarea
              value={formData.internal_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, internal_notes: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-yellow-50 border-yellow-200"
              placeholder="Staff-only notes (not visible to customer)..."
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
              {isSubmitting ? 'Creating...' : 'Create Special Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
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

        {/* Order Info */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Product:</span>
              <span className="font-medium text-gray-900">{order.product_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Customer:</span>
              <span className="font-medium text-gray-900">{order.customer?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-bold text-gray-900">
                {new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(order.total_amount)}
              </span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Paid:</span>
              <span className="font-bold">
                {new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(order.deposit_paid)}
              </span>
            </div>
            <div className="flex justify-between text-red-600 text-base">
              <span>Balance Due:</span>
              <span className="font-bold">
                {new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(order.balance_due)}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              {paymentAccounts.map(account => (
                <option key={account.id} value={account.id}>
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

