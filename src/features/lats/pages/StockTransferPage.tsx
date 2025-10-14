import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabaseClient';
import toast from 'react-hot-toast';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import PageHeader from '../components/ui/PageHeader';
import {
  Package,
  Plus,
  Send,
  Inbox,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  ArrowRight,
  Filter,
  Search,
  Building2,
  AlertCircle,
  Eye,
  Check,
  X,
  RefreshCw
} from 'lucide-react';
import {
  getStockTransfers,
  createStockTransfer,
  approveStockTransfer,
  rejectStockTransfer,
  markTransferInTransit,
  completeStockTransfer,
  cancelStockTransfer,
  getTransferStats,
  StockTransfer,
  CreateTransferRequest
} from '../../../lib/stockTransferApi';

interface Branch {
  id: string;
  name: string;
  code: string;
  city: string;
  is_main: boolean;
}

interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  branch_id: string;
  product?: {
    name: string;
  };
}

const StockTransferPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all'); // all, sent, received
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);
  const [stats, setStats] = useState<any>(null);

  // Get current branch
  const currentBranchId = localStorage.getItem('current_branch_id') || '';

  useEffect(() => {
    console.log('🏪 [StockTransferPage] Current Branch ID:', currentBranchId);
    console.log('🏪 [StockTransferPage] Status Filter:', statusFilter);
    loadTransfers();
    loadStats();
  }, [currentBranchId, statusFilter]);

  const loadTransfers = async () => {
    try {
      setLoading(true);
      console.log('🏪 [StockTransferPage] Loading transfers for branch:', currentBranchId);
      const data = await getStockTransfers(currentBranchId, statusFilter);
      console.log('🏪 [StockTransferPage] Received transfers:', data.length);
      setTransfers(data);
    } catch (error) {
      console.error('Failed to load transfers:', error);
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!currentBranchId) {
      console.warn('⚠️ [StockTransferPage] No branch ID - skipping stats');
      return;
    }
    try {
      console.log('🏪 [StockTransferPage] Loading stats for branch:', currentBranchId);
      const data = await getTransferStats(currentBranchId);
      console.log('🏪 [StockTransferPage] Received stats:', data);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const filteredTransfers = transfers.filter((transfer) => {
    // Direction filter
    if (directionFilter === 'sent' && transfer.from_branch_id !== currentBranchId) return false;
    if (directionFilter === 'received' && transfer.to_branch_id !== currentBranchId) return false;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        transfer.from_branch?.name.toLowerCase().includes(search) ||
        transfer.to_branch?.name.toLowerCase().includes(search) ||
        transfer.variant?.variant_name.toLowerCase().includes(search) ||
        transfer.variant?.sku.toLowerCase().includes(search)
      );
    }

    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'approved': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_transit': return <Truck className="w-5 h-5 text-blue-500" />;
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'cancelled': return <XCircle className="w-5 h-5 text-gray-500" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      in_transit: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${badges[status] || badges.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        title="Stock Transfer Management"
        subtitle="Manage inventory transfers between branches"
        actions={
          <div className="flex gap-3">
            <GlassButton
              onClick={loadTransfers}
              variant="secondary"
              icon={<RefreshCw size={18} />}
              disabled={loading}
            >
              Refresh
            </GlassButton>
            <GlassButton
              onClick={() => setShowCreateModal(true)}
              icon={<Plus size={18} />}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
            >
              New Transfer
            </GlassButton>
          </div>
        }
      />

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <GlassCard className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-600 mt-1">Total</div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-xs text-gray-600 mt-1">Pending</div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              <div className="text-xs text-gray-600 mt-1">Approved</div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.in_transit}</div>
              <div className="text-xs text-gray-600 mt-1">In Transit</div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{stats.completed}</div>
              <div className="text-xs text-gray-600 mt-1">Completed</div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-xs text-gray-600 mt-1">Rejected</div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.cancelled}</div>
              <div className="text-xs text-gray-600 mt-1">Cancelled</div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by branch, product, or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="in_transit">In Transit</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Direction Filter */}
          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Transfers</option>
            <option value="sent">Sent Only</option>
            <option value="received">Received Only</option>
          </select>
        </div>
      </GlassCard>

      {/* Transfers List */}
      <GlassCard className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading transfers...</p>
          </div>
        ) : filteredTransfers.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transfers found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== 'all' || directionFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first stock transfer to get started'}
            </p>
            {!searchTerm && statusFilter === 'all' && directionFilter === 'all' && (
              <GlassButton
                onClick={() => setShowCreateModal(true)}
                icon={<Plus size={18} />}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
              >
                Create Transfer
              </GlassButton>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transfer ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Direction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransfers.map((transfer) => (
                  <TransferRow
                    key={transfer.id}
                    transfer={transfer}
                    currentBranchId={currentBranchId}
                    currentUserId={currentUser?.id || ''}
                    onView={() => setSelectedTransfer(transfer)}
                    onUpdate={loadTransfers}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Create Transfer Modal */}
      {showCreateModal && (
        <CreateTransferModal
          currentBranchId={currentBranchId}
          currentUserId={currentUser?.id || ''}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadTransfers();
            loadStats();
          }}
        />
      )}

      {/* Transfer Details Modal */}
      {selectedTransfer && (
        <TransferDetailsModal
          transfer={selectedTransfer}
          currentBranchId={currentBranchId}
          currentUserId={currentUser?.id || ''}
          onClose={() => setSelectedTransfer(null)}
          onUpdate={() => {
            loadTransfers();
            loadStats();
          }}
        />
      )}
    </div>
  );
};

// Transfer Row Component
interface TransferRowProps {
  transfer: StockTransfer;
  currentBranchId: string;
  currentUserId: string;
  onView: () => void;
  onUpdate: () => void;
}

const TransferRow: React.FC<TransferRowProps> = ({
  transfer,
  currentBranchId,
  currentUserId,
  onView,
  onUpdate
}) => {
  const isSent = transfer.from_branch_id === currentBranchId;
  const [processing, setProcessing] = useState(false);

  const handleApprove = async () => {
    if (!confirm('Approve this transfer?')) return;
    setProcessing(true);
    try {
      await approveStockTransfer(transfer.id, currentUserId);
      toast.success('Transfer approved');
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve transfer');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return; // User cancelled
    setProcessing(true);
    try {
      await rejectStockTransfer(transfer.id, currentUserId, reason);
      toast.success('Transfer rejected');
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject transfer');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkInTransit = async () => {
    if (!confirm('Mark this transfer as in transit?')) return;
    setProcessing(true);
    try {
      await markTransferInTransit(transfer.id);
      toast.success('Transfer marked as in transit');
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update transfer');
    } finally {
      setProcessing(false);
    }
  };

  const handleComplete = async () => {
    if (!confirm('Complete this transfer? This will update inventory levels.')) return;
    setProcessing(true);
    try {
      await completeStockTransfer(transfer.id);
      toast.success('Transfer completed');
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete transfer');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-mono text-gray-900">
          {transfer.id.slice(0, 8)}...
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          {isSent ? (
            <>
              <Send className="w-4 h-4 text-orange-500" />
              <div className="text-sm">
                <div className="font-medium text-gray-900">To: {transfer.to_branch?.name}</div>
                <div className="text-gray-500">{transfer.to_branch?.city}</div>
              </div>
            </>
          ) : (
            <>
              <Inbox className="w-4 h-4 text-green-500" />
              <div className="text-sm">
                <div className="font-medium text-gray-900">From: {transfer.from_branch?.name}</div>
                <div className="text-gray-500">{transfer.from_branch?.city}</div>
              </div>
            </>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm">
          <div className="font-medium text-gray-900">{transfer.variant?.variant_name || 'N/A'}</div>
          <div className="text-gray-500">SKU: {transfer.variant?.sku || 'N/A'}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-semibold text-gray-900">
          {transfer.quantity} units
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
          transfer.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
          transfer.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
          transfer.status === 'in_transit' ? 'bg-blue-100 text-blue-800 border-blue-200' :
          transfer.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
          transfer.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
          'bg-gray-100 text-gray-800 border-gray-200'
        }`}>
          {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1).replace('_', ' ')}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(transfer.created_at).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <button
            onClick={onView}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Action buttons based on status and direction */}
          {!isSent && transfer.status === 'pending' && (
            <>
              <button
                onClick={handleApprove}
                disabled={processing}
                className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                title="Approve this transfer"
              >
                <Check className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                title="Reject this transfer"
              >
                <X className="w-4 h-4" />
                Reject
              </button>
            </>
          )}

          {isSent && transfer.status === 'approved' && (
            <button
              onClick={handleMarkInTransit}
              disabled={processing}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              title="Mark In Transit"
            >
              <Truck className="w-4 h-4" />
            </button>
          )}

          {!isSent && transfer.status === 'in_transit' && (
            <button
              onClick={handleComplete}
              disabled={processing}
              className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
              title="Receive and complete this transfer"
            >
              <CheckCircle className="w-4 h-4" />
              Receive
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

// Create Transfer Modal Component
interface CreateTransferModalProps {
  currentBranchId: string;
  currentUserId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateTransferModal: React.FC<CreateTransferModalProps> = ({
  currentBranchId,
  currentUserId,
  onClose,
  onSuccess
}) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [formData, setFormData] = useState({
    to_branch_id: '',
    entity_id: '',
    quantity: 1,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadBranches();
    loadVariants();
  }, [currentBranchId]);

  const loadBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('store_locations')
        .select('id, name, code, city, is_main')
        .eq('is_active', true)
        .neq('id', currentBranchId);

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Failed to load branches:', error);
      toast.error('Failed to load branches');
    }
  };

  const loadVariants = async () => {
    try {
      const { data, error } = await supabase
        .from('lats_product_variants')
        .select(`
          id,
          product_id,
          variant_name,
          sku,
          quantity,
          unit_price,
          branch_id,
          product:lats_products(name)
        `)
        .eq('branch_id', currentBranchId)
        .gt('quantity', 0)
        .order('variant_name');

      if (error) {
        console.error('❌ Variants query error:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      setVariants(data || []);
    } catch (error: any) {
      console.error('Failed to load variants:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      toast.error('Failed to load products');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.to_branch_id || !formData.entity_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    const selectedVariant = variants.find(v => v.id === formData.entity_id);
    if (!selectedVariant) {
      toast.error('Please select a product');
      return;
    }

    if (formData.quantity > selectedVariant.quantity) {
      toast.error(`Only ${selectedVariant.quantity} units available`);
      return;
    }

    setLoading(true);
    try {
      const request: CreateTransferRequest = {
        from_branch_id: currentBranchId,
        to_branch_id: formData.to_branch_id,
        entity_type: 'variant',
        entity_id: formData.entity_id,
        quantity: formData.quantity,
        notes: formData.notes || undefined
      };

      await createStockTransfer(request, currentUserId);
      toast.success('Transfer request created successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create transfer');
    } finally {
      setLoading(false);
    }
  };

  const filteredVariants = variants.filter(v =>
    !searchTerm ||
    v.variant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.product as any)?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedVariant = variants.find(v => v.id === formData.entity_id);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <h2 className="text-2xl font-bold text-gray-900">Create Stock Transfer</h2>
          <p className="text-sm text-gray-600 mt-1">Transfer inventory to another branch</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Destination Branch */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destination Branch <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.to_branch_id}
              onChange={(e) => setFormData({ ...formData, to_branch_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select destination branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} ({branch.code}) - {branch.city}
                </option>
              ))}
            </select>
          </div>

          {/* Product Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Product <span className="text-red-500">*</span>
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Product List */}
            <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
              {filteredVariants.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No products available for transfer</p>
                </div>
              ) : (
                filteredVariants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, entity_id: variant.id })}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition-colors ${
                      formData.entity_id === variant.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900">{variant.variant_name}</div>
                        <div className="text-sm text-gray-600">
                          SKU: {variant.sku} • {(variant.product as any)?.name || 'N/A'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {variant.quantity} in stock
                        </div>
                        <div className="text-xs text-gray-500">
                          ${Number(variant.unit_price || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Quantity */}
          {selectedVariant && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max={selectedVariant.quantity}
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="mt-1 text-sm text-gray-600">
                Available: {selectedVariant.quantity} units
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add any notes about this transfer..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <GlassButton
              type="button"
              onClick={onClose}
              variant="secondary"
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </GlassButton>
            <GlassButton
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white"
              icon={<Send size={18} />}
              disabled={loading || !formData.to_branch_id || !formData.entity_id}
            >
              {loading ? 'Creating...' : 'Create Transfer'}
            </GlassButton>
          </div>
        </form>
      </div>
    </div>
  );
};

// Transfer Details Modal Component
interface TransferDetailsModalProps {
  transfer: StockTransfer;
  currentBranchId: string;
  currentUserId: string;
  onClose: () => void;
  onUpdate: () => void;
}

const TransferDetailsModal: React.FC<TransferDetailsModalProps> = ({
  transfer,
  currentBranchId,
  currentUserId,
  onClose,
  onUpdate
}) => {
  const [processing, setProcessing] = useState(false);
  const isSent = transfer.from_branch_id === currentBranchId;

  const handleApprove = async () => {
    if (!confirm('Approve this transfer?')) return;
    setProcessing(true);
    try {
      await approveStockTransfer(transfer.id, currentUserId);
      toast.success('Transfer approved');
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve transfer');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return;
    setProcessing(true);
    try {
      await rejectStockTransfer(transfer.id, currentUserId, reason);
      toast.success('Transfer rejected');
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject transfer');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkInTransit = async () => {
    if (!confirm('Mark this transfer as in transit?')) return;
    setProcessing(true);
    try {
      await markTransferInTransit(transfer.id);
      toast.success('Transfer marked as in transit');
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update transfer');
    } finally {
      setProcessing(false);
    }
  };

  const handleComplete = async () => {
    if (!confirm('Complete this transfer? This will update inventory levels.')) return;
    setProcessing(true);
    try {
      await completeStockTransfer(transfer.id);
      toast.success('Transfer completed');
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete transfer');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    const reason = prompt('Reason for cancellation (optional):');
    if (reason === null) return;
    setProcessing(true);
    try {
      await cancelStockTransfer(transfer.id, reason);
      toast.success('Transfer cancelled');
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel transfer');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <h2 className="text-2xl font-bold text-gray-900">Transfer Details</h2>
          <p className="text-sm text-gray-600 mt-1">
            ID: {transfer.id}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${
              transfer.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
              transfer.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
              transfer.status === 'in_transit' ? 'bg-blue-100 text-blue-800 border-blue-200' :
              transfer.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
              transfer.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
              'bg-gray-100 text-gray-800 border-gray-200'
            }`}>
              {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1).replace('_', ' ')}
            </span>
          </div>

          {/* Direction */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Branch</label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Building2 className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="font-medium text-gray-900">{transfer.from_branch?.name}</div>
                  <div className="text-sm text-gray-600">{transfer.from_branch?.city}</div>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Branch</label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Building2 className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="font-medium text-gray-900">{transfer.to_branch?.name}</div>
                  <div className="text-sm text-gray-600">{transfer.to_branch?.city}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900 mb-1">
                {transfer.variant?.variant_name || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">SKU: {transfer.variant?.sku || 'N/A'}</div>
              <div className="text-lg font-bold text-blue-600 mt-2">
                Quantity: {transfer.quantity} units
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Requested</label>
              <div className="text-sm text-gray-900">
                {transfer.requested_at ? new Date(transfer.requested_at).toLocaleString() : 'N/A'}
              </div>
            </div>
            {transfer.approved_at && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {transfer.status === 'rejected' ? 'Rejected' : 'Approved'}
                </label>
                <div className="text-sm text-gray-900">
                  {new Date(transfer.approved_at).toLocaleString()}
                </div>
              </div>
            )}
            {transfer.completed_at && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Completed</label>
                <div className="text-sm text-gray-900">
                  {new Date(transfer.completed_at).toLocaleString()}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {transfer.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                {transfer.notes}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <GlassButton
              onClick={onClose}
              variant="secondary"
              className="flex-1"
            >
              Close
            </GlassButton>

            {/* Show action buttons based on status and direction */}
            {!isSent && transfer.status === 'pending' && (
              <>
                <GlassButton
                  onClick={handleApprove}
                  disabled={processing}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white"
                  icon={<Check size={18} />}
                >
                  Approve
                </GlassButton>
                <GlassButton
                  onClick={handleReject}
                  disabled={processing}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white"
                  icon={<X size={18} />}
                >
                  Reject
                </GlassButton>
              </>
            )}

            {isSent && transfer.status === 'approved' && (
              <GlassButton
                onClick={handleMarkInTransit}
                disabled={processing}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                icon={<Truck size={18} />}
              >
                Mark In Transit
              </GlassButton>
            )}

            {!isSent && transfer.status === 'in_transit' && (
              <GlassButton
                onClick={handleComplete}
                disabled={processing}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white"
                icon={<CheckCircle size={18} />}
              >
                Complete Transfer
              </GlassButton>
            )}

            {(transfer.status === 'pending' || transfer.status === 'approved') && isSent && (
              <GlassButton
                onClick={handleCancel}
                disabled={processing}
                className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white"
                icon={<XCircle size={18} />}
              >
                Cancel
              </GlassButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockTransferPage;

