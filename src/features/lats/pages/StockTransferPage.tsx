import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
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
  selling_price: number;
  branch_id: string;
  product?: {
    name: string;
  };
}

const StockTransferPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
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

  // Check for auto-open parameter
  useEffect(() => {
    const autoOpen = searchParams.get('autoOpen');
    if (autoOpen === 'true') {
      setShowCreateModal(true);
      // Clean up the URL
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    console.log('🏪 [StockTransferPage] Current Branch ID:', currentBranchId);
    console.log('🏪 [StockTransferPage] Status Filter:', statusFilter);
    console.log('🏪 [StockTransferPage] Direction Filter:', directionFilter);
    loadTransfers();
    loadStats();
  }, [currentBranchId, statusFilter, directionFilter]);

  const loadTransfers = async () => {
    try {
      setLoading(true);
      console.log('🏪 [StockTransferPage] Loading transfers for branch:', currentBranchId);
      const data = await getStockTransfers(currentBranchId, statusFilter === 'all' ? undefined : statusFilter);
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

  const filteredTransfers = (transfers || []).filter((transfer) => {
    // Direction filter
    if (directionFilter === 'sent' && transfer.from_branch_id !== currentBranchId) return false;
    if (directionFilter === 'received' && transfer.to_branch_id !== currentBranchId) return false;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        transfer.from_branch?.name?.toLowerCase().includes(search) ||
        transfer.to_branch?.name?.toLowerCase().includes(search) ||
        transfer.variant?.variant_name?.toLowerCase().includes(search) ||
        transfer.variant?.sku?.toLowerCase().includes(search)
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
        actions={[
          {
            label: 'Refresh',
            onClick: loadTransfers,
            variant: 'secondary' as const,
            icon: <RefreshCw size={18} />,
            disabled: loading
          },
          {
            label: 'New Transfer',
            onClick: () => setShowCreateModal(true),
            variant: 'primary' as const,
            icon: <Plus size={18} />
          }
        ]}
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
  
  // Extract batch info
  const batchId = transfer.notes?.match(/\[BATCH:(.*?)\]/)?.[1];
  const batchInfo = transfer.notes?.match(/\[BATCH:.*?\]\s*(\d+)\s*products/);
  const batchProductCount = batchInfo ? parseInt(batchInfo[1]) : 0;
  const isBatch = batchProductCount > 1;

  const handleApprove = async () => {
    const message = `Approve transfer of ${transfer.quantity} units of ${transfer.variant?.variant_name} to ${transfer.to_branch?.name}? Stock will remain reserved until completion.`;
    if (!confirm(message)) return;
    setProcessing(true);
    try {
      await approveStockTransfer(transfer.id, currentUserId);
      toast.success(`✅ Transfer approved! ${transfer.quantity} units reserved for shipping.`);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve transfer');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    const message = `Reject transfer of ${transfer.quantity} units of ${transfer.variant?.variant_name} from ${transfer.from_branch?.name}? Reserved stock will be released and made available again.`;
    if (!confirm(message)) return;
    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return; // User cancelled
    setProcessing(true);
    try {
      await rejectStockTransfer(transfer.id, currentUserId, reason);
      toast.success(`❌ Transfer rejected. ${transfer.quantity} units released back to available stock.`);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject transfer');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkInTransit = async () => {
    const message = `Mark ${transfer.quantity} units of ${transfer.variant?.variant_name} as shipped to ${transfer.to_branch?.name}? The receiving branch will be notified.`;
    if (!confirm(message)) return;
    setProcessing(true);
    try {
      await markTransferInTransit(transfer.id);
      toast.success(`🚚 Shipment dispatched! ${transfer.to_branch?.name} will be notified.`);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update transfer');
    } finally {
      setProcessing(false);
    }
  };

  const handleComplete = async () => {
    // Check if already completed
    if (transfer.status === 'completed') {
      toast.error('This transfer has already been completed');
      onUpdate(); // Refresh to get latest status
      return;
    }
    
    // Verify status is valid for completion
    if (transfer.status !== 'in_transit' && transfer.status !== 'approved') {
      toast.error(`Cannot complete transfer with status: ${transfer.status}`);
      onUpdate(); // Refresh to get latest status
      return;
    }
    
    const message = `Confirm receipt of ${transfer.quantity} units of ${transfer.variant?.variant_name} from ${transfer.from_branch?.name}? This will move inventory from ${transfer.from_branch?.name} to your branch.`;
    if (!confirm(message)) return;
    setProcessing(true);
    try {
      await completeStockTransfer(transfer.id);
      toast.success(`✅ Transfer completed! ${transfer.quantity} units added to your inventory from ${transfer.from_branch?.name}.`);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete transfer');
      onUpdate(); // Refresh on error to get latest status
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    const message = `Cancel transfer of ${transfer.quantity} units of ${transfer.variant?.variant_name} to ${transfer.to_branch?.name}? Reserved stock will be released and made available again.`;
    if (!confirm(message)) return;
    const reason = prompt('Reason for cancellation (optional):');
    if (reason === null) return; // User cancelled
    setProcessing(true);
    try {
      await cancelStockTransfer(transfer.id, reason);
      toast.success(`❌ Transfer cancelled. ${transfer.quantity} units released back to available stock.`);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel transfer');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <tr className="hover:bg-gray-50">
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
          <div className="font-medium text-gray-900">
            {(transfer.variant?.product as any)?.name || 'N/A'}
            {isBatch && (
              <span className="ml-1 text-xs font-normal text-blue-600">
                and {batchProductCount - 1} more
              </span>
            )}
          </div>
          <div className="text-gray-500">
            {isBatch ? (
              <span className="text-blue-600 font-medium">
                Batch Transfer • {batchProductCount} products
              </span>
            ) : (
              <>
                {/* Display user-defined variant name if it's not just "Default Variant" */}
                {transfer.variant?.name && transfer.variant.name !== 'Default Variant' && (
                  <span>{transfer.variant.name} • </span>
                )}
                {/* Fall back to variant_name for trade-ins */}
                {!transfer.variant?.name && transfer.variant?.variant_name && transfer.variant.variant_name !== 'Default Variant' && (
                  <span>{transfer.variant.variant_name} • </span>
                )}
                SKU: {transfer.variant?.sku || 'N/A'}
              </>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-semibold text-gray-900">
          {isBatch ? (
            <>
              {transfer.quantity}
              <span className="ml-1 text-xs font-normal text-gray-500">
                (batch)
              </span>
            </>
          ) : (
            `${transfer.quantity} units`
          )}
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
                title="Approve this transfer request - stock will remain reserved"
              >
                {processing ? (
                  <div className="flex items-center gap-1.5">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </div>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Approve
                  </>
                )}
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                title="Reject this transfer - reserved stock will be released"
              >
                {processing ? (
                  <div className="flex items-center gap-1.5">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </div>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    Reject
                  </>
                )}
              </button>
            </>
          )}

          {isSent && transfer.status === 'approved' && (
            <button
              onClick={handleMarkInTransit}
              disabled={processing}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
              title="Mark as shipped - notify receiving branch"
            >
              {processing ? (
                <div className="flex items-center gap-1.5">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Shipping...
                </div>
              ) : (
                <>
                  <Truck className="w-4 h-4" />
                  Ship
                </>
              )}
            </button>
          )}

          {/* Show In Transit status for receiver */}
          {!isSent && transfer.status === 'in_transit' && (
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg border border-blue-200 flex items-center gap-1.5">
                <Truck className="w-4 h-4" />
                In Transit
              </div>
              <button
                onClick={handleComplete}
                disabled={processing}
                className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                title="Click when items arrive"
              >
                {processing ? (
                  <div className="flex items-center gap-1.5">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Receiving...
                  </div>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Receive
                  </>
                )}
              </button>
            </div>
          )}

          {/* Show waiting message if only approved (not shipped yet) */}
          {!isSent && transfer.status === 'approved' && (
            <div className="px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 rounded-lg border border-amber-200 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Not Shipped Yet
            </div>
          )}

          {/* Cancel button for senders */}
          {(transfer.status === 'pending' || transfer.status === 'approved') && isSent && (
            <button
              onClick={handleCancel}
              disabled={processing}
              className="px-3 py-1.5 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
              title="Cancel this transfer and release reserved stock"
            >
              {processing ? (
                <div className="flex items-center gap-1.5">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Cancelling...
                </div>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Cancel
                </>
              )}
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

interface TransferItem {
  variant: ProductVariant;
  quantity: number;
}

const CreateTransferModal: React.FC<CreateTransferModalProps> = ({
  currentBranchId,
  currentUserId,
  onClose,
  onSuccess
}) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedItems, setSelectedItems] = useState<TransferItem[]>([]);
  const [formData, setFormData] = useState({
    to_branch_id: '',
    notes: ''
  });
  const [selectedProduct, setSelectedProduct] = useState<{product: any, variants: ProductVariant[]} | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentlyAdded, setRecentlyAdded] = useState<string[]>([]);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [tempSelection, setTempSelection] = useState({ entity_id: '', quantity: 1 });

  useEffect(() => {
    loadBranches();
    loadVariants();
  }, [currentBranchId]);
  
  // Separate effect to handle auto-selection after variants are loaded
  useEffect(() => {
    if (loadingProducts || variants.length === 0) return;
    
    // Check for preselected product from ProductModal (using localStorage)
    const quickAddData = localStorage.getItem('stock_transfer_quick_add');
    if (quickAddData) {
      try {
        const productData = JSON.parse(quickAddData);
        // Clear the storage immediately
        localStorage.removeItem('stock_transfer_quick_add');
        
        // Add all variants from the preselected product that have stock
        if (productData.variants && productData.variants.length > 0) {
          const variantsWithStock = productData.variants.filter((v: any) => (v.quantity || 0) > 0);
          if (variantsWithStock.length > 0) {
            const items: TransferItem[] = variantsWithStock.map((variant: any) => ({
              variant: variant,
              quantity: 1 // Default quantity, user can adjust
            }));
            setSelectedItems(items);
            toast.success(`✅ ${productData.productName} ready to transfer!`, {
              duration: 3000
            });
          } else {
            toast.error('Product has no stock available for transfer');
          }
        }
      } catch (error) {
        console.error('Failed to load quick add product:', error);
      }
      return; // Don't check sessionStorage if we used localStorage
    }
    
    // Also check for preselected product from inventory (using sessionStorage)
    const preselectedData = sessionStorage.getItem('preselectedTransferProduct');
    if (preselectedData) {
      try {
        const productData = JSON.parse(preselectedData);
        // Clear the storage immediately
        sessionStorage.removeItem('preselectedTransferProduct');
        
        // Add all variants from the preselected product
        if (productData.variants && productData.variants.length > 0) {
          const items: TransferItem[] = productData.variants.map((variant: any) => ({
            variant: variant,
            quantity: 1 // Default quantity, user can adjust
          }));
          setSelectedItems(items);
          toast.success(`Added ${productData.productName} to transfer`, {
            duration: 3000,
            icon: '✅'
          });
        }
      } catch (error) {
        console.error('Failed to load preselected product:', error);
      }
      return; // Don't focus search if we had a preselected product
    }
    
    // Auto-focus search input when modal opens (only if no preselected product)
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, [loadingProducts, variants]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to close
      if (e.key === 'Escape') {
        if (selectedProduct) {
          setSelectedProduct(null);
        } else {
          onClose();
        }
      }
      
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, selectedProduct]);

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
      setLoadingProducts(true);
      const { data, error } = await supabase
        .from('lats_product_variants')
        .select(`
          id,
          product_id,
          name,
          variant_name,
          sku,
          quantity,
          selling_price,
          branch_id,
          product:lats_products!product_id(name)
        `)
        .eq('branch_id', currentBranchId)
        .gt('quantity', 0)
        .order('name');  // 🔧 FIX: Order by 'name' (user-defined)

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
      if (data && data.length > 0) {
        toast.success(`${data.length} products available`);
      }
    } catch (error: any) {
      console.error('Failed to load variants:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      toast.error('Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleClearAll = () => {
    if (selectedItems.length === 0) return;
    
    if (confirm(`Remove all ${selectedItems.length} products from transfer?`)) {
      setSelectedItems([]);
      toast.success('All products removed');
    }
  };

  const handleAddItem = () => {
    if (!tempSelection.entity_id) {
      toast.error('Please select a product');
      return;
    }

    const selectedVariant = variants.find(v => v.id === tempSelection.entity_id);
    if (!selectedVariant) {
      toast.error('Product not found');
      return;
    }

    // Check if already added
    if (selectedItems.some(item => item.variant.id === selectedVariant.id)) {
      toast.error('Product already added');
      return;
    }

    if (tempSelection.quantity > selectedVariant.quantity) {
      toast.error(`Only ${selectedVariant.quantity} units available`);
      return;
    }

    setSelectedItems([...selectedItems, {
      variant: selectedVariant,
      quantity: tempSelection.quantity
    }]);
    
    // Reset temp selection and selected product
    setTempSelection({ entity_id: '', quantity: 1 });
    setSelectedProduct(null);
    setSearchTerm('');
    toast.success('Product added to transfer');
  };

  const handleRemoveItem = (variantId: string) => {
    setSelectedItems(selectedItems.filter(item => item.variant.id !== variantId));
    toast.success('Product removed');
  };

  const handleUpdateItemQuantity = (variantId: string, newQuantity: number) => {
    const item = selectedItems.find(i => i.variant.id === variantId);
    if (!item) return;

    if (newQuantity < 1) {
      handleRemoveItem(variantId);
      return;
    }

    if (newQuantity > item.variant.quantity) {
      toast.error(`Only ${item.variant.quantity} units available`);
      return;
    }

    setSelectedItems(selectedItems.map(i => 
      i.variant.id === variantId ? { ...i, quantity: newQuantity } : i
    ));
  };

  // Quick add with quantity 1
  const handleQuickAdd = (variant: ProductVariant) => {
    if (selectedItems.some(item => item.variant.id === variant.id)) {
      toast.error('Product already added');
      return;
    }

    if (variant.quantity <= 0) {
      toast.error('Product out of stock');
      return;
    }

    setSelectedItems([...selectedItems, {
      variant: variant,
      quantity: 1
    }]);
    
    // Track recently added for animation
    setRecentlyAdded([...recentlyAdded, variant.id]);
    setTimeout(() => {
      setRecentlyAdded(prev => prev.filter(id => id !== variant.id));
    }, 1000);
    
    toast.success(`${(variant.product as any)?.name || variant.variant_name} added!`, {
      icon: '✅',
      duration: 2000
    });
  };

  // Quick quantity presets
  const setQuickQuantity = (quantity: number) => {
    setTempSelection({ ...tempSelection, quantity });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.to_branch_id) {
      toast.error('Please select a destination branch');
      return;
    }

    if (selectedItems.length === 0) {
      toast.error('Please add at least one product to transfer');
      return;
    }

    setLoading(true);
    try {
      // Generate a batch ID to link all transfers together
      const batchId = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Add batch info to notes
      const batchNotes = `[BATCH:${batchId}] ${selectedItems.length} products | ${formData.notes || ''}`.trim();
      
      // Create transfers for all selected items with batch ID
      const promises = selectedItems.map((item, index) => {
        const request: CreateTransferRequest = {
          from_branch_id: currentBranchId,
          to_branch_id: formData.to_branch_id,
          entity_type: 'variant',
          entity_id: item.variant.id,
          quantity: item.quantity,
          notes: batchNotes
        };
        return createStockTransfer(request, currentUserId);
      });

      const results = await Promise.all(promises);
      
      toast.success(
        `✅ Transfer created with ${selectedItems.length} products!`,
        {
          duration: 3000,
          icon: '📦'
        }
      );
      
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create transfer');
    } finally {
      setLoading(false);
    }
  };

  // Group variants by product
  const groupedProducts = React.useMemo(() => {
    const productMap = new Map<string, {product: any, variants: ProductVariant[]}>();
    
    variants.forEach(v => {
      const productId = v.product_id;
      const productName = (v.product as any)?.name || 'Unknown Product';
      
      if (!productMap.has(productId)) {
        productMap.set(productId, {
          product: { id: productId, name: productName },
          variants: []
        });
      }
      productMap.get(productId)!.variants.push(v);
    });
    
    return Array.from(productMap.values());
  }, [variants]);

  // Filter grouped products
  const filteredProducts = groupedProducts.filter(group => {
    // Exclude if all variants are already selected
    const allVariantsSelected = group.variants.every(v => 
      selectedItems.some(item => item.variant.id === v.id)
    );
    if (allVariantsSelected) return false;
    
    // Apply search filter
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      group.product.name?.toLowerCase().includes(search) ||
      group.variants.some(v => 
        v.variant_name?.toLowerCase().includes(search) ||
        v.sku?.toLowerCase().includes(search)
      )
    );
  });

  const tempSelectedVariant = variants.find(v => v.id === tempSelection.entity_id);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
        <div 
          className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto"
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Create Stock Transfer</h3>
                  <p className="text-xs text-gray-500">Transfer products to another branch</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Destination Branch Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destination Branch
                </label>
                <select
                  value={formData.to_branch_id}
                  onChange={(e) => setFormData({ ...formData, to_branch_id: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                  required
                >
                  <option value="">Select destination branch...</option>
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
                  Search Products
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Type product name or scan barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Product List and Selected Items */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Available Products */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Available Products
                    {!loadingProducts && filteredProducts.length > 0 && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({filteredProducts.length})
                      </span>
                    )}
                  </label>
                  <div className="border-2 border-gray-200 rounded-lg h-96 overflow-y-auto bg-gray-50 p-3">
                    {loadingProducts ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                          <p className="text-sm text-gray-600">Loading...</p>
                        </div>
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-sm text-gray-600">
                            {selectedItems.length > 0 ? 'All products added' : searchTerm ? 'No products found' : 'No products available'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                      {filteredProducts.map((group) => {
                        // Filter out already selected variants
                        const availableVariants = group.variants.filter(v => 
                          !selectedItems.some(item => item.variant.id === v.id)
                        );
                        
                        if (availableVariants.length === 0) return null;
                        
                        const hasMultipleVariants = availableVariants.length > 1;
                        const totalStock = availableVariants.reduce((sum, v) => sum + v.quantity, 0);
                        const singleVariant = availableVariants.length === 1 ? availableVariants[0] : null;
                        
                        return (
                          <div
                            key={group.product.id}
                            className="bg-white border border-gray-300 rounded-lg p-3 hover:border-blue-500 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-gray-900 truncate">
                                  {group.product.name}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {hasMultipleVariants ? `${availableVariants.length} variants` : availableVariants[0].sku} • {totalStock} in stock
                                </p>
                              </div>
                              
                              {!hasMultipleVariants && singleVariant ? (
                                <button
                                  type="button"
                                  onClick={() => handleQuickAdd(singleVariant)}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  Add
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setSelectedProduct(group)}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                                >
                                  Select
                                </button>
                              )}
                            </div>
                          </div>
                        );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Selected Products ({selectedItems.length})
                    </label>
                    {selectedItems.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  
                  <div className="border-2 border-gray-200 rounded-lg h-96 overflow-y-auto bg-gray-50 p-3">
                    {selectedItems.length > 0 ? (
                      <div className="space-y-2">
                        {selectedItems.map((item) => (
                          <div 
                            key={item.variant.id} 
                            className="bg-white border border-gray-300 rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-gray-900 truncate">
                                  {(item.variant.product as any)?.name || item.variant.variant_name}
                                </p>
                                <p className="text-xs text-gray-500">{item.variant.sku}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.variant.id)}
                                className="text-gray-400 hover:text-red-600 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQuantity(item.variant.id, Math.max(1, item.quantity - 1))}
                                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors"
                              >
                                −
                              </button>
                              
                              <input
                                type="number"
                                min="1"
                                max={item.variant.quantity}
                                value={item.quantity}
                                onChange={(e) => handleUpdateItemQuantity(item.variant.id, parseInt(e.target.value) || 1)}
                                className="flex-1 px-2 py-1 text-center border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 font-semibold"
                              />
                              
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQuantity(item.variant.id, Math.min(item.variant.quantity, item.quantity + 1))}
                                disabled={item.quantity >= item.variant.quantity}
                                className="w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg font-bold transition-colors"
                              >
                                +
                              </button>
                            </div>
                            
                            <p className="text-xs text-gray-500 text-right mt-1">
                              Max: {item.variant.quantity}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-sm text-gray-600">No products selected</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Variant Selection Modal */}
              {selectedProduct && selectedProduct.variants.filter(v => !selectedItems.some(item => item.variant.id === v.id)).length > 0 && (
                <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-900">
                      <span className="font-bold">{selectedProduct.product.name}</span> - Select Variant
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(null)}
                      className="text-xs text-gray-600 hover:text-gray-900 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedProduct.variants.filter(v => !selectedItems.some(item => item.variant.id === v.id)).map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => {
                          handleQuickAdd(variant);
                          setSelectedProduct(null);
                        }}
                        className="w-full text-left px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex justify-between items-center gap-3">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900 mb-1">{variant.variant_name}</p>
                            <p className="text-xs text-gray-500">SKU: {variant.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">{variant.quantity} in stock</p>
                            <p className="text-xs text-gray-500">TSh {Number(variant.selling_price || 0).toLocaleString()}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    Click any variant to add it to your transfer
                  </p>
                </div>
              )}

              {/* Summary Display */}
              {selectedItems.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Products</p>
                      <p className="text-4xl font-bold text-blue-600">{selectedItems.length}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">Total Units</p>
                      <p className="text-3xl font-bold text-green-600">
                        {selectedItems.reduce((sum, item) => sum + item.quantity, 0)}
                      </p>
                    </div>
                  </div>
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
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors resize-none text-gray-900"
                  placeholder="Add any notes about this transfer..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.to_branch_id || selectedItems.length === 0}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
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
  const [batchTransfers, setBatchTransfers] = useState<StockTransfer[]>([]);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const isSent = transfer.from_branch_id === currentBranchId;

  // Extract batch ID from notes
  const batchId = transfer.notes?.match(/\[BATCH:(.*?)\]/)?.[1];
  
  // Load all transfers in the batch
  useEffect(() => {
    const loadBatchTransfers = async () => {
      if (!batchId) {
        setBatchTransfers([transfer]);
        return;
      }
      
      try {
        setLoadingBatch(true);
        const allTransfers = await getStockTransfers(currentBranchId, 'all');
        const batch = allTransfers.filter(t => t.notes?.includes(`[BATCH:${batchId}]`));
        setBatchTransfers(batch.length > 0 ? batch : [transfer]);
        
        // Auto-select all items for batch operations
        setSelectedItems(batch.map(t => t.id));
      } catch (error) {
        console.error('Failed to load batch transfers:', error);
        setBatchTransfers([transfer]);
      } finally {
        setLoadingBatch(false);
      }
    };
    
    loadBatchTransfers();
  }, [batchId, transfer, currentBranchId]);
  
  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  
  const isBatchTransfer = batchTransfers.length > 1;

  const handleApprove = async () => {
    const itemCount = isBatchTransfer ? selectedItems.length : 1;
    const message = isBatchTransfer 
      ? `Approve ${itemCount} of ${batchTransfers.length} transfer requests? Stock will remain reserved until completion.`
      : `Approve transfer of ${transfer.quantity} units of ${transfer.variant?.variant_name} to ${transfer.to_branch?.name}? Stock will remain reserved until completion.`;
      
    if (!confirm(message)) return;
    
    setProcessing(true);
    try {
      const transfersToApprove = isBatchTransfer 
        ? batchTransfers.filter(t => selectedItems.includes(t.id))
        : [transfer];
      
      await Promise.all(
        transfersToApprove.map(t => approveStockTransfer(t.id, currentUserId))
      );
      
      toast.success(`✅ ${itemCount} ${itemCount === 1 ? 'product' : 'products'} approved`);
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve transfer');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    const message = `Reject transfer of ${transfer.quantity} units of ${transfer.variant?.variant_name} from ${transfer.from_branch?.name}? Reserved stock will be released and made available again.`;
    if (!confirm(message)) return;
    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return;
    setProcessing(true);
    try {
      await rejectStockTransfer(transfer.id, currentUserId, reason);
      toast.success(`❌ Transfer rejected. ${transfer.quantity} units released back to available stock.`);
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject transfer');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkInTransit = async () => {
    const message = `Mark ${transfer.quantity} units of ${transfer.variant?.variant_name} as shipped to ${transfer.to_branch?.name}? The receiving branch will be notified.`;
    if (!confirm(message)) return;
    setProcessing(true);
    try {
      await markTransferInTransit(transfer.id);
      toast.success(`🚚 Shipment dispatched! ${transfer.to_branch?.name} will be notified.`);
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update transfer');
    } finally {
      setProcessing(false);
    }
  };

  const handleComplete = async () => {
    // Check if already completed
    if (transfer.status === 'completed') {
      toast.error('This transfer has already been completed');
      onUpdate(); // Refresh to get latest status
      onClose();
      return;
    }
    
    // Verify status is valid for completion
    if (transfer.status !== 'in_transit' && transfer.status !== 'approved') {
      toast.error(`Cannot complete transfer with status: ${transfer.status}`);
      onUpdate(); // Refresh to get latest status
      onClose();
      return;
    }
    
    const itemCount = isBatchTransfer ? selectedItems.length : 1;
    const message = isBatchTransfer 
      ? `Receive ${itemCount} of ${batchTransfers.length} products from ${transfer.from_branch?.name}? This will move inventory to your branch.`
      : `Confirm receipt of ${transfer.quantity} units of ${transfer.variant?.variant_name} from ${transfer.from_branch?.name}? This will move inventory to your branch.`;
      
    if (!confirm(message)) return;
    
    setProcessing(true);
    try {
      const transfersToComplete = isBatchTransfer 
        ? batchTransfers.filter(t => selectedItems.includes(t.id) && t.status !== 'completed')
        : [transfer];
      
      // Filter out already completed transfers
      const pendingTransfers = transfersToComplete.filter(t => 
        t.status === 'in_transit' || t.status === 'approved'
      );
      
      if (pendingTransfers.length === 0) {
        toast.error('All selected transfers are already completed');
        onUpdate();
        onClose();
        return;
      }
      
      await Promise.all(
        pendingTransfers.map(t => completeStockTransfer(t.id))
      );
      
      toast.success(`✅ ${pendingTransfers.length} ${pendingTransfers.length === 1 ? 'product' : 'products'} received!`, {
        icon: '📦',
        duration: 3000
      });
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete transfer');
      onUpdate(); // Refresh on error to get latest status
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    const message = `Cancel transfer of ${transfer.quantity} units of ${transfer.variant?.variant_name} to ${transfer.to_branch?.name}? Reserved stock will be released and made available again.`;
    if (!confirm(message)) return;
    const reason = prompt('Reason for cancellation (optional):');
    if (reason === null) return;
    setProcessing(true);
    try {
      await cancelStockTransfer(transfer.id, reason);
      toast.success(`❌ Transfer cancelled. ${transfer.quantity} units released back to available stock.`);
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel transfer');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <GlassCard className="max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Transfer Details</h2>
              <p className="text-xs text-gray-500 mt-0.5 font-mono">
                {transfer.id.slice(0, 24)}...
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Batch Info Banner */}
          {isBatchTransfer && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Batch Transfer</div>
                  <div className="text-sm text-gray-600">
                    {batchTransfers.length} products in this transfer
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-600">Total Units</div>
                  <div className="text-lg font-bold text-blue-900">
                    {batchTransfers.reduce((sum, t) => sum + t.quantity, 0)}
                  </div>
                </div>
              </div>
            </div>
          )}

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

          {/* Product Details or Batch Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {isBatchTransfer ? 'Products in Transfer' : 'Product'}
                {isBatchTransfer && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                    {batchTransfers.length}
                  </span>
                )}
              </label>
              {isBatchTransfer && (!isSent && (transfer.status === 'pending' || transfer.status === 'in_transit')) && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedItems(batchTransfers.map(t => t.id))}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedItems([])}
                    className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                  >
                    Deselect All
                  </button>
                </div>
              )}
            </div>
            
            {loadingBatch ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading items...</p>
              </div>
            ) : isBatchTransfer ? (
              <>
                {!isSent && (transfer.status === 'pending' || transfer.status === 'in_transit') && (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-blue-900">
                        <span className="font-medium">
                          {transfer.status === 'pending' ? 'Select products to approve:' : 'Select products to receive:'}
                        </span>
                        {' '}Check items below to process them individually, or select all for batch processing.
                      </div>
                    </div>
                  </div>
                )}
                <div className="border border-gray-200 rounded-lg bg-white max-h-80 overflow-y-auto">
                {batchTransfers.map((item, index) => (
                  <div
                    key={item.id}
                    className={`group flex items-center gap-3 p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${
                      !isSent && (transfer.status === 'pending' || transfer.status === 'in_transit') ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => {
                      if (!isSent && (transfer.status === 'pending' || transfer.status === 'in_transit')) {
                        toggleItemSelection(item.id);
                      }
                    }}
                  >
                    {/* Checkbox for approval/receiving */}
                    {!isSent && (transfer.status === 'pending' || transfer.status === 'in_transit') && (
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => toggleItemSelection(item.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400">{index + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {(item.variant?.product as any)?.name || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {/* Display user-defined variant name first */}
                            {item.variant?.name && item.variant.name !== 'Default Variant' && (
                              <span>{item.variant.name} • </span>
                            )}
                            {/* Fall back to variant_name for trade-ins */}
                            {!item.variant?.name && item.variant?.variant_name && item.variant.variant_name !== 'Default Variant' && (
                              <span>{item.variant.variant_name} • </span>
                            )}
                            SKU: {item.variant?.sku || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-semibold text-blue-900">
                        {item.quantity} units
                      </div>
                      <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        item.status === 'completed' ? 'bg-green-100 text-green-700' :
                        item.status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                        item.status === 'approved' ? 'bg-green-100 text-green-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {item.status === 'completed' ? '✓ Received' :
                         item.status === 'in_transit' ? 'In Transit' :
                         item.status === 'approved' ? 'Approved' :
                         'Pending'}
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              </>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-900 mb-1">
                  {(transfer.variant?.product as any)?.name || transfer.variant?.variant_name || 'N/A'}
                </div>
                <div className="text-sm text-gray-600">
                  {transfer.variant?.variant_name && transfer.variant.variant_name !== 'Default Variant' && (
                    <span>{transfer.variant.variant_name} • </span>
                  )}
                  SKU: {transfer.variant?.sku || 'N/A'}
                </div>
                <div className="text-lg font-bold text-blue-600 mt-2">
                  Quantity: {transfer.quantity} units
                </div>
              </div>
            )}
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

        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-100 p-6 bg-gray-50">
          <div className="flex gap-3">
            <GlassButton
              onClick={onClose}
              variant="secondary"
              className="flex-1"
              disabled={processing}
            >
              Close
            </GlassButton>

            {/* Show action buttons based on status and direction */}
            {!isSent && transfer.status === 'pending' && (
              <>
                {isBatchTransfer && selectedItems.length < batchTransfers.length && (
                  <div className="flex-1 text-center">
                    <div className="text-xs text-gray-600 mb-1">
                      {selectedItems.length} of {batchTransfers.length} selected
                    </div>
                  </div>
                )}
                <GlassButton
                  onClick={handleApprove}
                  disabled={processing || (isBatchTransfer && selectedItems.length === 0)}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white"
                  icon={<Check size={18} />}
                >
                  {processing ? 'Processing...' : 
                   isBatchTransfer 
                     ? `Approve ${selectedItems.length === batchTransfers.length ? 'All' : selectedItems.length} Product${selectedItems.length !== 1 ? 's' : ''}`
                     : 'Approve'
                  }
                </GlassButton>
                <GlassButton
                  onClick={handleReject}
                  disabled={processing}
                  className="bg-gradient-to-r from-red-500 to-red-600 text-white"
                  icon={<X size={18} />}
                >
                  {processing ? 'Processing...' : 'Reject'}
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
                {processing ? 'Processing...' : 'Mark In Transit'}
              </GlassButton>
            )}

            {/* Show In Transit status for receiver (modal view) */}
            {!isSent && transfer.status === 'in_transit' && (
              <>
                <div className="flex-1 px-4 py-3 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-center gap-2">
                  <Truck size={18} />
                  In Transit
                </div>
                {isBatchTransfer && selectedItems.length < batchTransfers.length && (
                  <div className="flex-1 text-center">
                    <div className="text-xs text-gray-600 mb-1">
                      {selectedItems.length} of {batchTransfers.length} selected
                    </div>
                  </div>
                )}
                <GlassButton
                  onClick={handleComplete}
                  disabled={processing || (isBatchTransfer && selectedItems.length === 0)}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white"
                  icon={<CheckCircle size={18} />}
                >
                  {processing ? 'Processing...' : 
                   isBatchTransfer 
                     ? `Receive ${selectedItems.length === batchTransfers.length ? 'All' : selectedItems.length}`
                     : 'Receive'
                  }
                </GlassButton>
              </>
            )}

            {/* Show waiting message if only approved (not shipped yet) */}
            {!isSent && transfer.status === 'approved' && (
              <div className="flex-1 px-4 py-3 text-sm font-medium text-amber-700 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-center gap-2">
                <Clock size={18} />
                Not Shipped Yet
              </div>
            )}

            {(transfer.status === 'pending' || transfer.status === 'approved') && isSent && (
              <GlassButton
                onClick={handleCancel}
                disabled={processing}
                className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white"
                icon={<XCircle size={18} />}
              >
                {processing ? 'Processing...' : 'Cancel Transfer'}
              </GlassButton>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default StockTransferPage;

