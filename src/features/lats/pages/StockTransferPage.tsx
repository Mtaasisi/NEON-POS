import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import toast from 'react-hot-toast';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import { BackButton } from '../../shared/components/ui/BackButton';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
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
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  Calendar,
  FileText,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  MapPin
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
import { useLoadingJob } from '../../../hooks/useLoadingJob';

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
  const [expandedTransfer, setExpandedTransfer] = useState<string | null>(null);
  const PAGE_SCALE = 0.8; // Scale down the entire page for small screens

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

  // 🚀 OPTIMIZED: Load transfers and stats in parallel
  const loadTransfers = useCallback(async () => {
    console.log('🏪 [StockTransferPage] Current Branch ID:', currentBranchId);
    console.log('🏪 [StockTransferPage] Status Filter:', statusFilter);
    console.log('🏪 [StockTransferPage] Direction Filter:', directionFilter);

    setLoading(true);
    const startTime = Date.now();

    try {
      if (import.meta.env.MODE === 'development') {
        console.log('🔄 [StockTransferPage] Starting parallel data loading...');
      }

      await Promise.allSettled([
        getStockTransfers(currentBranchId, statusFilter === 'all' ? undefined : statusFilter)
          .then((data) => {
            console.log('🏪 [StockTransferPage] Received transfers:', data.length);
            setTransfers(data);
            return data;
          })
          .catch((err) => {
            console.error('❌ Failed to load transfers:', err);
            toast.error('Failed to load transfers');
            return [];
          }),
        currentBranchId
          ? getTransferStats(currentBranchId)
              .then((data) => {
                console.log('🏪 [StockTransferPage] Received stats:', data);
                setStats(data);
                return data;
              })
              .catch((err) => {
                console.error('❌ Failed to load stats:', err);
                return null;
              })
          : Promise.resolve(null)
      ]);

      const endTime = Date.now();
      if (import.meta.env.MODE === 'development') {
        console.log(`✅ [StockTransferPage] Optimized parallel loading completed in ${endTime - startTime}ms`);
      }
    } catch (error) {
      console.error('❌ [StockTransferPage] Error in optimized loading:', error);
      toast.error('Failed to load stock transfer data');
    } finally {
      setLoading(false);
    }
  }, [currentBranchId, statusFilter, directionFilter]);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

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
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                <Truck className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Stock Transfer Management</h1>
                <p className="text-sm text-gray-600">Manage inventory transfers between branches</p>
              </div>
            </div>

            {/* Right: Back Button */}
            <BackButton to="/lats" label="" className="!w-12 !h-12 !p-0 !rounded-full !bg-blue-600 hover:!bg-blue-700 !shadow-lg flex items-center justify-center" iconClassName="text-white" />
          </div>
        </div>

        {/* Action Bar - Enhanced Design */}
        <div className="px-8 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/50 flex-shrink-0">
          <div className="flex gap-3 flex-wrap">
            {/* Create Transfer Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:from-blue-600 hover:to-blue-700"
            >
              <Plus size={18} />
              <span>New Transfer</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => loadTransfers()}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg hover:from-gray-600 hover:to-gray-700 disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Main Content - flows with page scroll */}
        <div className="flex-1">
          {/* Sticky top controls (stats + filters) */}
          <div className="sticky top-0 z-20 space-y-4 bg-white/95 backdrop-blur-sm shadow-sm">
            {/* Fixed Statistics Section */}
        {stats && (
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
                        <p className="text-xs font-medium text-gray-600 mb-1">Total</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            </div>
            </div>
                  
                  <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-5 hover:bg-yellow-100 hover:border-yellow-300 transition-all shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-yellow-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <Clock className="w-6 h-6 text-white" />
            </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Pending</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
            </div>
                  </div>
                  
                  <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 hover:bg-green-100 hover:border-green-300 transition-all shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Approved</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <Truck className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">In Transit</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.in_transit}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 hover:bg-green-100 hover:border-green-300 transition-all shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Completed</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 hover:bg-red-100 hover:border-red-300 transition-all shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <XCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Rejected</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-5 hover:bg-gray-100 hover:border-gray-300 transition-all shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <XCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Cancelled</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.cancelled}</p>
                      </div>
                    </div>
                  </div>
                </div>
          </div>
        )}

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
                  placeholder="Search by branch, product, or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                    className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 bg-white font-medium min-w-[160px]"
          >
            <option value="all">All Transfers</option>
            <option value="sent">Sent Only</option>
            <option value="received">Received Only</option>
          </select>
        </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Transfers List */}
          <div className="flex-1 overflow-y-auto px-6 py-6 border-t border-gray-100">
        {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredTransfers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No transfers found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== 'all' || directionFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating your first stock transfer'}
            </p>
            {!searchTerm && statusFilter === 'all' && directionFilter === 'all' && (
                  <button
                onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
              >
                    <Plus className="w-4 h-4" />
                    <span>Create Transfer</span>
                  </button>
            )}
          </div>
        ) : (
              <div className="space-y-3">
            {filteredTransfers.map((transfer) => (
              <TransferCard
                key={transfer.id}
                transfer={transfer}
                currentBranchId={currentBranchId}
                currentUserId={currentUser?.id || ''}
                isExpanded={expandedTransfer === transfer.id}
                onToggleExpanded={() => setExpandedTransfer(expandedTransfer === transfer.id ? null : transfer.id)}
                onView={() => setSelectedTransfer(transfer)}
                onUpdate={loadTransfers}
                getStatusIcon={getStatusIcon}
                getStatusBadge={getStatusBadge}
              />
            ))}
          </div>
        )}
          </div>
        </div>
      </div>
    </div>

      {/* Create Transfer Modal */}
      {showCreateModal && (
        <CreateTransferModal
          currentBranchId={currentBranchId}
          currentUserId={currentUser?.id || ''}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            // Data will reload automatically via useEffect
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
          onUpdate={loadTransfers}
        />
      )}
    </div>
  );
};

// Transfer Card Component
interface TransferCardProps {
  transfer: StockTransfer;
  currentBranchId: string;
  currentUserId: string;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onView: () => void;
  onUpdate: () => void;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusBadge: (status: string) => React.ReactNode;
}

const TransferCard: React.FC<TransferCardProps> = ({
  transfer,
  currentBranchId,
  currentUserId,
  isExpanded,
  onToggleExpanded,
  onView,
  onUpdate,
  getStatusIcon,
  getStatusBadge
}) => {
  const isSent = transfer.from_branch_id === currentBranchId;
  const [processing, setProcessing] = useState(false);
  
  // Extract batch info
  const batchId = transfer.notes?.match(/\[BATCH:(.*?)\]/)?.[1];
  const batchInfo = transfer.notes?.match(/\[BATCH:.*?\]\s*(\d+)\s*products/);
  const batchProductCount = batchInfo ? parseInt(batchInfo[1]) : 0;
  const isBatch = batchProductCount > 1;

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      in_transit: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status] || colors.pending;
  };

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

  const getActionButtons = () => {
    const actions = [];
    
    // View Details button (always available)
    actions.push({
      type: 'view',
      label: 'View Details',
      icon: <Eye className="w-4 h-4" />,
      color: 'bg-blue-600 hover:bg-blue-700',
      onClick: onView
    });

    // Action buttons based on status and direction
    if (!isSent && transfer.status === 'pending') {
      actions.push({
        type: 'approve',
        label: 'Approve',
        icon: <Check className="w-4 h-4" />,
        color: 'bg-green-600 hover:bg-green-700',
        onClick: handleApprove,
        disabled: processing
      });
      actions.push({
        type: 'reject',
        label: 'Reject',
        icon: <X className="w-4 h-4" />,
        color: 'bg-red-600 hover:bg-red-700',
        onClick: handleReject,
        disabled: processing
      });
    }

    if (isSent && transfer.status === 'approved') {
      actions.push({
        type: 'ship',
        label: 'Mark In Transit',
        icon: <Truck className="w-4 h-4" />,
        color: 'bg-blue-600 hover:bg-blue-700',
        onClick: handleMarkInTransit,
        disabled: processing
      });
    }

    if (!isSent && transfer.status === 'in_transit') {
      actions.push({
        type: 'receive',
        label: 'Receive',
        icon: <CheckCircle className="w-4 h-4" />,
        color: 'bg-green-600 hover:bg-green-700',
        onClick: handleComplete,
        disabled: processing
      });
    }

    if ((transfer.status === 'pending' || transfer.status === 'approved') && isSent) {
      actions.push({
        type: 'cancel',
        label: 'Cancel',
        icon: <XCircle className="w-4 h-4" />,
        color: 'bg-gray-600 hover:bg-gray-700',
        onClick: handleCancel,
        disabled: processing
      });
    }

    return actions;
  };

  const actionButtons = getActionButtons();

  return (
    <div
      className={`border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 hover:shadow-lg cursor-pointer relative ${
        isExpanded
          ? 'border-blue-500 shadow-xl' 
          : 'border-gray-200 hover:border-orange-400'
      }`}
    >
      {/* Mobile Card View - shown on small screens */}
      <div className="md:hidden p-4">
        <div className="space-y-3">
          {/* Direction and Status */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${
                isSent ? 'bg-gradient-to-br from-orange-500 to-orange-600' : 'bg-gradient-to-br from-green-500 to-green-600'
              }`}>
                {isSent ? <Send className="w-6 h-6 text-white" /> : <Inbox className="w-6 h-6 text-white" />}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">
                  {isSent ? `To: ${transfer.to_branch?.name}` : `From: ${transfer.from_branch?.name}`}
                </h3>
                <p className="text-xs text-gray-500">{formatDate(transfer.created_at)}</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm ${getStatusColor(transfer.status)}`}>
              {getStatusIcon(transfer.status)}
              <span className="capitalize">{transfer.status.replace('_', ' ')}</span>
            </span>
          </div>
          
          {/* Product Info */}
          <div>
            <div className="font-medium text-gray-900 text-sm">
              {(transfer.variant?.product as any)?.name || 'N/A'}
              {isBatch && (
                <span className="ml-1 text-xs font-normal text-blue-600">
                  and {batchProductCount - 1} more
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {isBatch ? (
                <span className="text-blue-600 font-medium">
                  Batch Transfer • {batchProductCount} products
                </span>
              ) : (
                <>
                  {transfer.variant?.name && transfer.variant.name !== 'Default Variant' && (
                    <span>{transfer.variant.name} • </span>
                  )}
                  {!transfer.variant?.name && transfer.variant?.variant_name && transfer.variant.variant_name !== 'Default Variant' && (
                    <span>{transfer.variant.variant_name} • </span>
                  )}
                  SKU: {transfer.variant?.sku || 'N/A'}
                </>
              )}
            </div>
          </div>
          
          {/* Quantity */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900">
              {isBatch ? (
                <>
                  {transfer.quantity}
                  <span className="ml-1 text-xs font-normal text-gray-500">(batch)</span>
                </>
              ) : (
                `${transfer.quantity} units`
              )}
            </span>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            {actionButtons.map((action, index) => (
              <button
                key={`${action.type}-${index}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!action.disabled && action.onClick) {
                    action.onClick();
                  }
                }}
                disabled={action.disabled}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-white rounded-xl transition-all shadow-md hover:shadow-lg text-xs font-semibold ${action.color} disabled:opacity-50`}
                title={action.label}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Desktop List View - Expandable - shown on md+ screens */}
      <div className="hidden md:block w-full">
        {/* Header - Clickable */}
        <div 
          className="flex items-start justify-between p-6 cursor-pointer"
          onClick={onToggleExpanded}
        >
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Expand/Collapse Icon */}
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
              isExpanded ? 'bg-orange-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
            }`}>
              <ChevronDown 
                className={`w-5 h-5 transition-transform duration-200 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </div>
            
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Direction and Status Row */}
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg flex-shrink-0 ${
                  isSent ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  {isSent ? <Send className="w-5 h-5" /> : <Inbox className="w-5 h-5" />}
                  <span className="text-base font-semibold">
                    {isSent ? `To: ${transfer.to_branch?.name}` : `From: ${transfer.from_branch?.name}`}
                  </span>
                </div>
                
                {/* Status Badge */}
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-base font-bold ${getStatusColor(transfer.status)} flex items-center gap-2 flex-shrink-0`}>
                  {getStatusIcon(transfer.status)}
                  <span>{transfer.status.replace('_', ' ').split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
                </span>
              </div>
              
              {/* Info Badges Row */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Product Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0">
                  <Package className="w-5 h-5" />
                  <span className="text-base font-semibold truncate max-w-[200px]">
                    {(transfer.variant?.product as any)?.name || 'N/A'}
                    {isBatch && (
                      <span className="ml-1 text-xs font-normal">
                        +{batchProductCount - 1} more
                      </span>
                    )}
                  </span>
                </div>

                {/* Quantity & Date Combined Card */}
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-teal-600" />
                    <span className="text-base font-semibold text-teal-700">{transfer.quantity}</span>
                    <span className="text-sm text-teal-600 font-medium">units</span>
                  </div>
                  <div className="w-px h-5 bg-gray-300"></div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <span className="text-base font-medium text-gray-600">{formatDate(transfer.created_at)}</span>
                  </div>
                </div>

                {/* Batch Badge */}
                {isBatch && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                    <Package className="w-5 h-5" />
                    <span className="text-sm font-medium">Batch: {batchProductCount} products</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Separator Line - Only show when expanded */}
        {isExpanded && (
          <div className="mt-5 pt-5 border-t-2 border-gray-200 relative">
            <div className="absolute top-0 left-0 right-0 flex items-center justify-center -mt-3">
              <span className="bg-white px-5 py-1.5 text-xs text-gray-500 font-semibold uppercase tracking-wider rounded-full border border-gray-200 shadow-sm">Transfer Details</span>
            </div>
          </div>
        )}

        {/* Expanded Content - Only show when expanded */}
        {isExpanded && (
          <div className="px-6 pb-6 pt-2">
            {/* Product Details */}
            <div className="mb-4">
              <h4 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-blue-600" />
                Product Information
              </h4>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="font-medium text-gray-900 mb-1">
                  {(transfer.variant?.product as any)?.name || 'N/A'}
                </div>
                <div className="text-sm text-gray-600">
                  {isBatch ? (
                    <span className="text-blue-600 font-medium">
                      Batch Transfer • {batchProductCount} products
                    </span>
                  ) : (
                    <>
                      {transfer.variant?.name && transfer.variant.name !== 'Default Variant' && (
                        <span>{transfer.variant.name} • </span>
                      )}
                      {!transfer.variant?.name && transfer.variant?.variant_name && transfer.variant.variant_name !== 'Default Variant' && (
                        <span>{transfer.variant.variant_name} • </span>
                      )}
                      SKU: {transfer.variant?.sku || 'N/A'}
                    </>
                  )}
                </div>
                <div className="text-lg font-bold text-blue-600 mt-2">
                  Quantity: {transfer.quantity} units
                </div>
              </div>
            </div>

            {/* Branch Information */}
            <div className="mb-4 bg-blue-50 rounded-xl p-4 border border-blue-200">
              <h4 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Branch Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-blue-200">
                  <span className="text-gray-600 font-medium">From Branch:</span>
                  <span className="font-bold text-gray-900">{transfer.from_branch?.name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-blue-200">
                  <span className="text-gray-600 font-medium">To Branch:</span>
                  <span className="font-bold text-gray-900">{transfer.to_branch?.name}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 font-medium">City:</span>
                  <span className="font-semibold text-gray-700">{transfer.to_branch?.city}</span>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {transfer.notes && (
              <div className="mb-4 bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                <h4 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-yellow-600" />
                  Notes
                </h4>
                <p className="text-gray-700 leading-relaxed text-sm">{transfer.notes}</p>
              </div>
            )}

            {/* Action Buttons Section */}
            <div className="mt-5 pt-5 border-t-2 border-gray-200">
              {actionButtons.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {actionButtons.map((action, index) => (
                    <button
                      key={`${action.type}-${index}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!action.disabled && action.onClick) {
                          action.onClick();
                        }
                      }}
                      disabled={action.disabled}
                      className={`flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-semibold text-sm ${action.color} disabled:opacity-50`}
                    >
                      {action.icon}
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
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
  const [currentStep, setCurrentStep] = useState(1);
  
  // Prevent body scroll when modal is open
  useBodyScrollLock(true);

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

      // DEBUG: Log current branch information
      console.log('🏪 [CreateTransferModal] Loading variants for branch:', currentBranchId);
      console.log('🏪 [CreateTransferModal] Current branch type:', typeof currentBranchId);

      // First, let's check if we have any variants at all for this branch (including those with 0 quantity)
      const { data: allVariants, error: debugError } = await supabase
        .from('lats_product_variants')
        .select(`
          id,
          product_id,
          name,
          variant_name,
          sku,
          quantity,
          reserved_quantity,
          branch_id,
          product:lats_products!product_id(name)
        `)
        .eq('branch_id', currentBranchId);

      if (debugError) {
        console.error('❌ Debug query failed:', debugError);
      } else {
        console.log('📊 [CreateTransferModal] All variants for branch:', allVariants?.length || 0);
        if (allVariants && allVariants.length > 0) {
          console.log('📦 [CreateTransferModal] Sample variants:', allVariants.slice(0, 3).map(v => ({
            id: v.id,
            name: v.name || v.variant_name,
            quantity: v.quantity,
            reserved: v.reserved_quantity || 0,
            available: (v.quantity || 0) - (v.reserved_quantity || 0),
            branch_id: v.branch_id
          })));

          // Check how many have quantity > 0
          const withStock = allVariants.filter(v => (v.quantity || 0) > 0);
          console.log('✅ [CreateTransferModal] Variants with stock (quantity > 0):', withStock.length);

          // Check available stock (quantity - reserved)
          const withAvailableStock = allVariants.filter(v => ((v.quantity || 0) - (v.reserved_quantity || 0)) > 0);
          console.log('✅ [CreateTransferModal] Variants with available stock:', withAvailableStock.length);
        }
      }

      const { data, error } = await supabase
        .from('lats_product_variants')
        .select(`
          id,
          product_id,
          name,
          variant_name,
          sku,
          quantity,
          reserved_quantity,
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

      console.log('✅ [CreateTransferModal] Final variants loaded:', data?.length || 0);
      setVariants(data || []);

      if (data && data.length > 0) {
        toast.success(`${data.length} products available for transfer`);
      } else {
        console.warn('⚠️ [CreateTransferModal] No products available for transfer');
        toast.error('No products available for transfer. Check if products exist and have stock.', {
          duration: 5000
        });
      }
    } catch (error: any) {
      console.error('❌ Failed to load variants:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      toast.error('Failed to load products for transfer');
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

  // Step validation
  const canProceedToStep2 = formData.to_branch_id !== '';
  const canProceedToStep3 = selectedItems.length > 0;
  const canSubmit = canProceedToStep2 && canProceedToStep3;

  const handleNext = () => {
    if (currentStep === 1 && canProceedToStep2) {
      setCurrentStep(2);
    } else if (currentStep === 2 && canProceedToStep3) {
      setCurrentStep(3);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return createPortal(
    <>
      <div 
        className="fixed bg-black/60 flex items-center justify-center p-4 z-[99999]" 
        style={{
          top: 0, 
          left: 0, 
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          overscrollBehavior: 'none'
        }}
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="transfer-form-title"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
              <button
            type="button"
                onClick={onClose}
            disabled={loading}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
              >
            <X className="w-5 h-5" />
              </button>

          {/* Icon Header - Fixed */}
          <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <Truck className="w-8 h-8 text-white" />
            </div>

              {/* Text */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2" id="transfer-form-title">
                  Create Stock Transfer
                </h3>
                <p className="text-sm text-gray-600">
                  {currentStep === 1 && 'Select destination branch'}
                  {currentStep === 2 && 'Add products to transfer'}
                  {currentStep === 3 && 'Review and confirm transfer'}
                </p>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="mt-6 flex items-center justify-center gap-2">
              {/* Step 1 */}
              <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all ${
                  currentStep > 1 ? 'bg-green-500 text-white' : currentStep === 1 ? 'bg-blue-600 text-white ring-4 ring-blue-200' : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
                </div>
                <span className="text-sm font-medium hidden sm:inline">Branch</span>
              </div>
              <div className={`w-8 sm:w-12 h-0.5 transition-colors ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              
              {/* Step 2 */}
              <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all ${
                  currentStep > 2 ? 'bg-green-500 text-white' : currentStep === 2 ? 'bg-blue-600 text-white ring-4 ring-blue-200' : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > 2 ? <CheckCircle className="w-5 h-5" /> : '2'}
                </div>
                <span className="text-sm font-medium hidden sm:inline">Products</span>
              </div>
              <div className={`w-8 sm:w-12 h-0.5 transition-colors ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              
              {/* Step 3 */}
              <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all ${
                  currentStep === 3 ? 'bg-blue-600 text-white ring-4 ring-blue-200' : 'bg-gray-200 text-gray-500'
                }`}>
                  3
                </div>
                <span className="text-sm font-medium hidden sm:inline">Review</span>
              </div>
            </div>
          </div>

          {/* Form - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            <form id="transfer-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Select Destination Branch */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-base font-semibold text-gray-900 mb-3">
                      Select Destination Branch
                </label>
                <select
                  value={formData.to_branch_id}
                  onChange={(e) => setFormData({ ...formData, to_branch_id: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 bg-white font-medium"
                  required
                >
                      <option value="">Choose a branch...</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code}) - {branch.city}
                    </option>
                  ))}
                </select>
              </div>

                  {formData.to_branch_id && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-blue-600" />
              <div>
                          <p className="font-semibold text-gray-900">
                            {branches.find(b => b.id === formData.to_branch_id)?.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {branches.find(b => b.id === formData.to_branch_id)?.city}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Select Products */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  {/* Search */}
                  <div>
                    <label className="block text-base font-semibold text-gray-900 mb-3">
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
                        className="w-full pl-10 pr-10 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 bg-white font-medium"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                          <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Product List and Selected Items */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Available Products */}
                <div>
                      <label className="block text-base font-semibold text-gray-900 mb-3">
                    Available Products
                    {!loadingProducts && filteredProducts.length > 0 && (
                          <span className="ml-2 text-sm text-gray-500 font-normal">
                        ({filteredProducts.length})
                      </span>
                    )}
                  </label>
                      <div className="border-2 border-gray-300 rounded-xl h-96 overflow-y-auto bg-gray-50 p-4">
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
                            className="bg-white border border-gray-300 rounded-lg p-3 hover:border-blue-500 hover:shadow-sm transition-all mb-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-gray-900 truncate">
                                  {group.product.name}
                                </p>
                                <p className="text-xs text-gray-500">
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
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-base font-semibold text-gray-900">
                          Selected Products
                          {selectedItems.length > 0 && (
                            <span className="ml-2 text-sm text-gray-500 font-normal">
                              ({selectedItems.length})
                            </span>
                          )}
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
                  
                      <div className="border-2 border-gray-300 rounded-xl h-96 overflow-y-auto bg-gray-50 p-4">
                    {selectedItems.length > 0 ? (
                      <div className="space-y-2">
                        {selectedItems.map((item) => (
                          <div 
                            key={item.variant.id} 
                            className="bg-white border border-gray-300 rounded-lg p-3 mb-2"
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-gray-900 truncate">
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
                                className="flex-1 px-2 py-1 text-center border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 font-semibold text-gray-900"
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

                  {/* Variant Selection */}
              {selectedProduct && selectedProduct.variants.filter(v => !selectedItems.some(item => item.variant.id === v.id)).length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-sm text-gray-900">
                      {selectedProduct.product.name} - Select Variant
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(null)}
                      className="text-xs text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedProduct.variants.filter(v => !selectedItems.some(item => item.variant.id === v.id)).map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => {
                          handleQuickAdd(variant);
                          setSelectedProduct(null);
                        }}
                        className="w-full text-left px-3 py-2 bg-white border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-sm text-gray-900">{variant.variant_name}</p>
                            <p className="text-xs text-gray-500">SKU: {variant.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">{variant.quantity} in stock</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
                </div>
              )}

              {/* Step 3: Review & Confirm */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  {/* Destination Branch */}
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Destination Branch</label>
                    <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-semibold text-gray-900">
                            {branches.find(b => b.id === formData.to_branch_id)?.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {branches.find(b => b.id === formData.to_branch_id)?.city}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Selected Products Summary */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Products to Transfer ({selectedItems.length})
                    </label>
                    <div className="border border-gray-300 rounded-lg divide-y divide-gray-200 max-h-64 overflow-y-auto">
                      {selectedItems.map((item) => (
                        <div key={item.variant.id} className="p-3 bg-white">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-sm text-gray-900">
                                {(item.variant.product as any)?.name || item.variant.variant_name}
                              </p>
                              <p className="text-xs text-gray-500">{item.variant.sku}</p>
                    </div>
                    <div className="text-right">
                              <p className="font-bold text-gray-900">{item.quantity} units</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Total Products</p>
                        <p className="text-2xl font-bold text-blue-700">{selectedItems.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Total Units</p>
                        <p className="text-2xl font-bold text-blue-700">
                        {selectedItems.reduce((sum, item) => sum + item.quantity, 0)}
                      </p>
                    </div>
                  </div>
                </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none text-gray-900 bg-white"
                  placeholder="Add any notes about this transfer..."
                />
                  </div>
                </div>
              )}
            </form>
              </div>

          {/* Action Buttons - Fixed Footer */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 flex-shrink-0 bg-white px-6 pb-6">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevious}
                disabled={loading}
                className="px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>
            )}
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
              className={`px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${currentStep === 1 ? 'flex-1' : ''}`}
                >
                  Cancel
                </button>
            {currentStep < 3 ? (
                <button
                type="button"
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && !canProceedToStep2) ||
                  (currentStep === 2 && !canProceedToStep3) ||
                  loading
                }
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Next
                <ChevronRight className="w-5 h-5" />
                </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  const form = document.getElementById('transfer-form') as HTMLFormElement;
                  if (form) {
                    form.requestSubmit();
                  } else {
                    handleSubmit(e as any);
                  }
                }}
                disabled={loading || !canSubmit}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Truck className="w-5 h-5" />
                    Create Transfer
                  </>
                )}
              </button>
            )}
              </div>
          </div>
        </div>
    </>,
    document.body
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

