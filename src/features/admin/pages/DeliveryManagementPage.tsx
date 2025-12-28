import React, { useState, useEffect } from 'react';
import { Truck, Search, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle, Package, Filter } from 'lucide-react';
import { deliveryService } from '../../../services/deliveryService';
import toast from 'react-hot-toast';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../features/shared/components/ui/GlassButton';
import { supabase } from '../../../lib/supabaseClient';
import { useBranch } from '../../../context/BranchContext';

interface DeliveryOrder {
  id: string;
  sale_id: string;
  customer_id?: string;
  delivery_method: string;
  delivery_address: string;
  delivery_phone: string;
  delivery_time: string;
  delivery_fee: number;
  status: string;
  tracking_number: string;
  assigned_driver_name?: string;
  driver_phone?: string;
  created_at: string;
  customer?: {
    name: string;
    phone: string;
  };
  sale?: {
    sale_number: string;
    total_amount: number;
  };
}

const DeliveryManagementPage: React.FC = () => {
  const { currentBranch, loading: branchLoading } = useBranch();

  // State management
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryOrder | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAssignDriverModal, setShowAssignDriverModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  // Auto-refresh disabled - manual refresh only
  const [showCreateFromSaleModal, setShowCreateFromSaleModal] = useState(false);

  // Load deliveries on component mount
  useEffect(() => {
    if (!branchLoading && currentBranch) {
      loadDeliveries();
    }
  }, [currentBranch, branchLoading]);


  // Real-time subscription for automatic updates
  useEffect(() => {
    if (!currentBranch?.id) return;

    console.log('🔄 [DeliveryManagementPage] Setting up real-time subscription for branch:', currentBranch.id);

    // Subscribe to delivery orders changes
    const subscription = supabase
      .channel('delivery-orders-realtime')
      .on('postgres_changes', {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'lats_delivery_orders',
        filter: `branch_id=eq.${currentBranch.id}`
      }, (payload) => {
        console.log('📡 [DeliveryManagementPage] Real-time update received:', payload.eventType, payload.new);

        // Auto-refresh disabled - manual refresh only
        // Comment: Previously auto-refreshed deliveries when changes occurred
        // Now users must manually refresh using the refresh button
      })
      .subscribe((status) => {
        console.log('📡 [DeliveryManagementPage] Subscription status:', status);
      });

    // Cleanup subscription on unmount or branch change
    return () => {
      console.log('🧹 [DeliveryManagementPage] Cleaning up real-time subscription');
      subscription.unsubscribe();
    };
  }, [currentBranch?.id, loading]);

  const loadDeliveries = async () => {
    console.log('🎯 [DeliveryManagementPage] Loading deliveries...', {
      currentBranch,
      branchId: currentBranch?.id,
      branchName: currentBranch?.name,
      statusFilter,
      localStorageBranchId: localStorage.getItem('current_branch_id')
    });

    if (!currentBranch?.id) {
      console.warn('⚠️ [DeliveryManagementPage] No current branch available');
      toast.error('No branch selected. Please select a branch first.');
      return;
    }

    try {
      setLoading(true);

      console.log(`🔄 [DeliveryManagementPage] Fetching deliveries for branch ${currentBranch.id}`);

      const result = await deliveryService.getBranchDeliveries(currentBranch.id, statusFilter !== 'all' ? statusFilter : undefined);

      console.log('📦 [DeliveryManagementPage] Delivery service result:', result);

      if (result.success) {
        setDeliveries(result.deliveries || []);
        console.log(`✅ [DeliveryManagementPage] Loaded ${result.deliveries?.length || 0} deliveries`);
      } else {
        console.error('❌ [DeliveryManagementPage] Failed to load deliveries:', result.error);
        toast.error('Failed to load deliveries: ' + result.error);
      }
    } catch (error) {
      console.error('💥 [DeliveryManagementPage] Exception loading deliveries:', error);
      toast.error('Failed to load deliveries: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Filter deliveries based on search and status
  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = searchTerm === '' ||
      delivery.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.sale?.sale_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || delivery.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Status update handler
  const handleStatusUpdate = async (deliveryId: string, newStatus: string, notes?: string) => {
    const result = await deliveryService.updateDeliveryStatus(deliveryId, newStatus, notes);

    if (result.success) {
      toast.success(`Delivery status updated to ${newStatus}`);
      loadDeliveries(); // Refresh the list
      setShowStatusModal(false);
    } else {
      toast.error('Failed to update status: ' + result.error);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-purple-100 text-purple-800';
      case 'picked_up': return 'bg-indigo-100 text-indigo-800';
      case 'in_transit': return 'bg-orange-100 text-orange-800';
      case 'out_for_delivery': return 'bg-pink-100 text-pink-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'returned': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle size={16} className="text-green-600" />;
      case 'failed': return <XCircle size={16} className="text-red-600" />;
      case 'pending':
      case 'confirmed': return <Clock size={16} className="text-blue-600" />;
      default: return <Truck size={16} className="text-gray-600" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Delivery Management</h1>
              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Live Updates
              </div>
            </div>
            <p className="text-gray-600 mt-1">Manage and track all deliveries • Updates automatically</p>
          </div>
          <div className="flex items-center gap-3">
            <GlassButton
              onClick={() => loadDeliveries()}
              className="flex items-center gap-2"
            disabled={loading || branchLoading}
          >
            <RefreshCw size={16} />
            Refresh
            </GlassButton>
            {/* Create from Sale Button */}
            <GlassButton
              onClick={() => setShowCreateFromSaleModal(true)}
              variant="primary"
              className="flex items-center gap-2"
            >
              <Truck size={16} />
              Create from Sale
            </GlassButton>

            {/* Test Delivery Button */}
            <GlassButton
              onClick={async () => {
                if (!currentBranch?.id) {
                  toast.error('No branch selected');
                  return;
                }
                console.log('🧪 Creating test delivery for branch:', currentBranch.id);
                const result = await deliveryService.createTestDelivery(currentBranch.id);
                if (result.success) {
                  toast.success('Test delivery created successfully');
                  loadDeliveries();
                } else {
                  toast.error('Failed to create test delivery: ' + result.error);
                }
              }}
              variant="success"
              className="flex items-center gap-2"
              disabled={branchLoading}
            >
              <Package size={16} />
              Create Test Delivery
            </GlassButton>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <GlassCard className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by tracking number, customer, or sale..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="assigned">Assigned</option>
              <option value="picked_up">Picked Up</option>
              <option value="in_transit">In Transit</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
              <option value="returned">Returned</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Delivery Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Deliveries</p>
              <p className="text-2xl font-bold text-gray-900">{deliveries.length}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Delivered</p>
              <p className="text-2xl font-bold text-gray-900">
                {deliveries.filter(d => d.status === 'delivered').length}
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="text-orange-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">In Transit</p>
              <p className="text-2xl font-bold text-gray-900">
                {deliveries.filter(d => ['assigned', 'picked_up', 'in_transit', 'out_for_delivery'].includes(d.status)).length}
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Issues</p>
              <p className="text-2xl font-bold text-gray-900">
                {deliveries.filter(d => ['failed', 'returned'].includes(d.status)).length}
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Deliveries Table */}
      <GlassCard className="overflow-hidden">
        {loading || branchLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600">
              {branchLoading ? 'Loading branch information...' : 'Loading deliveries...'}
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tracking
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDeliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {delivery.tracking_number}
                        </span>
                        <span className="text-xs text-gray-500">
                          {delivery.sale?.sale_number}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {delivery.customer?.name || 'Walk-in Customer'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {delivery.customer?.phone || delivery.delivery_phone}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 capitalize">
                        {delivery.delivery_method}
                      </span>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(delivery.status)}`}>
                        {getStatusIcon(delivery.status)}
                        {delivery.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-900">
                          {delivery.assigned_driver_name || 'Unassigned'}
                        </span>
                        {delivery.driver_phone && (
                          <span className="text-xs text-gray-500">
                            {delivery.driver_phone}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {new Date(delivery.created_at).toLocaleDateString()}
                      </span>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedDelivery(delivery);
                            setShowStatusModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Update Status
                        </button>
                        {delivery.status !== 'delivered' && delivery.status !== 'cancelled' && (
                          <button
                            onClick={() => {
                              setSelectedDelivery(delivery);
                              setShowAssignDriverModal(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            Assign Driver
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredDeliveries.length === 0 && (
              <div className="text-center py-12">
                <Truck className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No deliveries found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Get started by processing sales with delivery.'}
                </p>
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* Status Update Modal */}
      {showStatusModal && selectedDelivery && (
        <StatusUpdateModal
          delivery={selectedDelivery}
          onClose={() => {
            setShowStatusModal(false);
            setSelectedDelivery(null);
          }}
          onStatusUpdate={handleStatusUpdate}
        />
      )}

      {/* Driver Assignment Modal */}
      {showAssignDriverModal && selectedDelivery && (
        <DriverAssignmentModal
          delivery={selectedDelivery}
          onClose={() => {
            setShowAssignDriverModal(false);
            setSelectedDelivery(null);
          }}
          onDriverAssigned={() => {
            loadDeliveries();
            setShowAssignDriverModal(false);
            setSelectedDelivery(null);
          }}
        />
      )}

      {/* Create Delivery from Sale Modal */}
      <CreateDeliveryFromSaleModal
        isOpen={showCreateFromSaleModal}
        onClose={() => {
          setShowCreateFromSaleModal(false);
        }}
        onDeliveryCreated={() => {
          loadDeliveries();
          setShowCreateFromSaleModal(false);
        }}
        selectedSaleForDelivery={null}
        loadDeliveries={loadDeliveries}
        currentBranch={currentBranch}
      />
    </div>
  );
};

// Status Update Modal Component
const StatusUpdateModal: React.FC<{
  delivery: DeliveryOrder;
  onClose: () => void;
  onStatusUpdate: (deliveryId: string, status: string, notes?: string) => void;
}> = ({ delivery, onClose, onStatusUpdate }) => {
  const [newStatus, setNewStatus] = useState(delivery.status);
  const [notes, setNotes] = useState('');

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'assigned', label: 'Assigned to Driver' },
    { value: 'picked_up', label: 'Picked Up' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'out_for_delivery', label: 'Out for Delivery' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'failed', label: 'Failed' },
    { value: 'returned', label: 'Returned' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const handleSubmit = () => {
    onStatusUpdate(delivery.id, newStatus, notes);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <GlassCard className="max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Update Delivery Status</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tracking Number: {delivery.tracking_number}
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this status change..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <GlassButton onClick={onClose} className="flex-1">
              Cancel
            </GlassButton>
            <GlassButton
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Update Status
            </GlassButton>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

// Driver Assignment Modal Component
const DriverAssignmentModal: React.FC<{
  delivery: DeliveryOrder;
  onClose: () => void;
  onDriverAssigned: () => void;
}> = ({ delivery, onClose, onDriverAssigned }) => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    const result = await deliveryService.getAvailableDrivers(delivery.branch_id || '00000000-0000-0000-0000-000000000001');
    if (result.success) {
      setDrivers(result.drivers || []);
    }
  };

  const handleAssign = async () => {
    if (!selectedDriverId) {
      toast.error('Please select a driver');
      return;
    }

    setLoading(true);
    const result = await deliveryService.assignDriver(delivery.id, selectedDriverId);

    if (result.success) {
      toast.success('Driver assigned successfully');
      onDriverAssigned();
    } else {
      toast.error('Failed to assign driver: ' + result.error);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <GlassCard className="max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Assign Driver</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-3">
              Assign a driver to delivery: {delivery.tracking_number}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Driver
            </label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a driver...</option>
              {drivers.map(driver => (
                <option key={driver.id} value={driver.id}>
                  {driver.name} - {driver.vehicle_type}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <GlassButton onClick={onClose} className="flex-1">
              Cancel
            </GlassButton>
            <GlassButton
              onClick={handleAssign}
              disabled={loading || !selectedDriverId}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
            >
              {loading ? 'Assigning...' : 'Assign Driver'}
            </GlassButton>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

// Create Delivery from Sale Modal Component
const CreateDeliveryFromSaleModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onDeliveryCreated: () => void;
  selectedSaleForDelivery: any;
  loadDeliveries: () => void;
  currentBranch: any;
}> = ({ isOpen, onClose, onDeliveryCreated, currentBranch }) => {
  const [sales, setSales] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMode, setCurrentMode] = useState<'select' | 'create'>('select');

  // Load sales when modal opens
  useEffect(() => {
    if (isOpen && currentMode === 'select') {
      loadSalesForSelection();
    }
  }, [isOpen, currentMode]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedSale(null);
      setCurrentMode('select');
      setSearchTerm('');
    }
  }, [isOpen]);

  const loadSalesForSelection = async () => {
    try {
      setLoadingSales(true);

      // Get recent sales with delivery status using subquery
      const { data: salesData, error } = await supabase
        .from('lats_sales')
        .select(`
          id,
          sale_number,
          customer_name,
          customer_phone,
          total_amount,
          subtotal,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error loading sales:', error);
        toast.error('Failed to load sales');
        return;
      }

      if (!salesData || salesData.length === 0) {
        setSales([]);
        return;
      }

      // Get ANY deliveries for these sales (hide all sales that have ever been sent)
      const saleIds = salesData.map((sale: any) => sale.id);
      const { data: anyDeliveries, error: deliveryError } = await supabase
        .from('lats_delivery_orders')
        .select('sale_id')
        .in('sale_id', saleIds); // ANY delivery status

      if (deliveryError) {
        console.error('Error loading deliveries:', deliveryError);
        // Continue without delivery filtering - show all sales
      }

      // Create a set of sale_ids that have ANY deliveries (ever sent)
      const salesWithAnyDeliveries = new Set();
      if (anyDeliveries) {
        anyDeliveries.forEach((delivery: any) => {
          salesWithAnyDeliveries.add(delivery.sale_id);
        });
      }

      // Get item counts for these sales
      const { data: itemCounts, error: itemError } = await supabase
        .from('lats_sale_items')
        .select('sale_id')
        .in('sale_id', saleIds);

      if (itemError) {
        console.error('Error loading item counts:', itemError);
      }

      // Create a map of sale_id to item count
      const itemCountMap: { [key: string]: number } = {};
      if (itemCounts) {
        itemCounts.forEach((item: any) => {
          itemCountMap[item.sale_id] = (itemCountMap[item.sale_id] || 0) + 1;
        });
      }

      // Filter to only include sales that have NEVER been sent for delivery
      const transformedSales = salesData
        .filter((sale: any) => !salesWithAnyDeliveries.has(sale.id))
        .map((sale: any) => ({
          id: sale.id,
          sale_number: sale.sale_number || `SALE-${sale.id.slice(-8)}`,
          customer_name: sale.customer_name || 'Walk-in Customer',
          customer_phone: sale.customer_phone || '',
          total_amount: sale.total_amount || 0,
          subtotal: sale.subtotal || 0,
          created_at: sale.created_at,
          items_count: itemCountMap[sale.id] || 0,
          has_delivery: false
        }));

      setSales(transformedSales);
    } catch (error) {
      console.error('Error loading sales:', error);
      toast.error('Failed to load sales');
    } finally {
      setLoadingSales(false);
    }
  };

  const handleSaleSelect = (sale: any) => {
    setSelectedSale(sale);
    setCurrentMode('create');
  };

  const handleBackToSelection = () => {
    setSelectedSale(null);
    setCurrentMode('select');
  };

  // Filter sales based on search
  const filteredSales = sales.filter(sale =>
    sale.sale_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customer_phone.includes(searchTerm)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {currentMode === 'create' && (
              <button
                onClick={handleBackToSelection}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800"
                title="Back to sale selection"
              >
                ←
              </button>
            )}
            <h2 className="text-xl font-bold text-gray-900">
              {currentMode === 'select' ? 'Create Delivery from Sale' : 'Create Delivery'}
            </h2>
          </div>
          <button
            onClick={() => {
              onClose();
            }}
              className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center"
            >
              ×
            </button>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
            {currentMode === 'select' ? (
              // Sale Selection Mode
              <div className="space-y-6">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search sales by number, customer, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Sales List */}
                <div className="space-y-3">
                  {loadingSales ? (
                    <div className="text-center py-8">
                      <RefreshCw className="animate-spin h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500">Loading sales...</p>
                    </div>
                  ) : filteredSales.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {searchTerm ? 'No sales found' : 'No sales available'}
                      </h3>
                      <p className="text-gray-500">
                        {searchTerm
                          ? 'Try adjusting your search terms'
                          : 'All sales already have deliveries or no sales exist'
                        }
                      </p>
                    </div>
                  ) : (
                    filteredSales.map((sale) => (
                      <div
                        key={sale.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all"
                        onClick={() => handleSaleSelect(sale)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <Package className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{sale.sale_number}</h3>
                                <p className="text-sm text-gray-600">{sale.customer_name}</p>
                                <p className="text-xs text-gray-500">
                                  {sale.items_count} items • {new Date(sale.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              TZS {sale.total_amount?.toLocaleString()}
                            </p>
                            {sale.customer_phone && (
                              <p className="text-xs text-gray-500">{sale.customer_phone}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : selectedSale ? (
              <div className="space-y-6">
                {/* Sale Information */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Sale Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Sale Number:</span> {selectedSale.sale_number}
                    </div>
                    <div>
                      <span className="font-medium">Customer:</span> {selectedSale.customer_name}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {selectedSale.customer_phone}
                    </div>
                    <div>
                      <span className="font-medium">Total:</span> TZS {selectedSale.total_amount?.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Items Preview */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Items in Sale</h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    <div className="text-sm text-gray-600">
                      <span>{selectedSale.items_count} items</span>
                      <span className="mx-2">•</span>
                      <span>Subtotal: TZS {selectedSale.subtotal?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Creation Form */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Delivery Details</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Delivery Method */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delivery Method *
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        defaultValue=""
                      >
                        <option value="" disabled>Select method</option>
                        <option value="boda">Boda Boda (TZS 2,000)</option>
                        <option value="bus">Bus Delivery (TZS 5,000)</option>
                        <option value="air">Air Freight (TZS 15,000)</option>
                      </select>
                    </div>

                    {/* Delivery Address */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delivery Address *
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter delivery address"
                        defaultValue={selectedSale.customer_name ? `${selectedSale.customer_name}'s location` : ''}
                      />
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="+255..."
                        defaultValue={selectedSale.customer_phone || ''}
                      />
                    </div>

                    {/* Delivery Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delivery Time
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        defaultValue="ASAP"
                      >
                        <option value="ASAP">ASAP</option>
                        <option value="9AM-12PM">9AM - 12PM</option>
                        <option value="12PM-3PM">12PM - 3PM</option>
                        <option value="3PM-6PM">3PM - 6PM</option>
                        <option value="6PM-9PM">6PM - 9PM</option>
                      </select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Notes
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Special delivery instructions..."
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        console.log('🚚 [CreateDeliveryModal] Attempting to create delivery for sale:', {
                          selectedSaleId: selectedSale.id,
                          selectedSaleNumber: selectedSale.sale_number,
                          customerName: selectedSale.customer_name
                        });

                        // Get form data (simplified for now - in real implementation, collect from form)
                        const deliveryData = {
                          deliveryMethod: 'boda', // Default to boda
                          deliveryAddress: `${selectedSale.customer_name}'s location`,
                          deliveryPhone: selectedSale.customer_phone || '',
                          deliveryTime: 'ASAP',
                          deliveryNotes: '',
                          deliveryFee: 2000 // Default boda fee
                        };

                        console.log('🚚 [CreateDeliveryModal] Delivery data:', deliveryData);

                        const result = await deliveryService.createFromSale(selectedSale.id, deliveryData, currentBranch?.id);

                        if (result.success) {
                          toast.success('Delivery created successfully!');
                          onDeliveryCreated(); // This will close the modal and refresh
                        } else {
                          toast.error('Failed to create delivery: ' + result.error);
                        }
                      } catch (error) {
                        console.error('Error creating delivery:', error);
                        toast.error('Failed to create delivery');
                      }
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Truck size={16} />
                    Create Delivery
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Truck size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Sale</h3>
                <p className="text-gray-500">Choose a sale from the list to create a delivery</p>
              </div>
            )}
          </div>
        </div>
      </div>
  );
};

export default DeliveryManagementPage;