import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Search,
  Filter,
  Download,
  Eye,
  Smartphone,
  Calendar,
  DollarSign,
  MapPin,
  Package
} from 'lucide-react';
import GlassCard from '../../../shared/components/ui/GlassCard';
import GlassButton from '../../../shared/components/ui/GlassButton';
import GlassBadge from '../../../shared/components/ui/GlassBadge';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../../lib/supabaseClient';
import { useAuth } from '../../../../context/AuthContext';

interface InventoryItem {
  id: string;
  product_id: string;
  variant_id?: string;
  serial_number: string;
  imei?: string;
  mac_address?: string;
  barcode?: string;
  status: string;
  location?: string;
  warranty_start?: string;
  warranty_end?: string;
  cost_price: number;
  selling_price?: number;
  notes?: string;
  metadata?: any;
  created_at: string;
  // Joined data
  product?: {
    name: string;
    sku: string;
  };
  variant?: {
    name: string;
    sku: string;
  };
}

interface QualityCheckData {
  status: 'passed' | 'failed' | 'pending';
  notes: string;
}

interface QualityCheckTabProps {
  purchaseOrderId: string;
}

const QualityCheckTab: React.FC<QualityCheckTabProps> = ({ purchaseOrderId }) => {
  const { currentUser } = useAuth();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [qcData, setQcData] = useState<Map<string, QualityCheckData>>(new Map());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadInventoryItems();
  }, [purchaseOrderId]);

  const loadInventoryItems = async () => {
    try {
      setLoading(true);
      
      // Get inventory items for this purchase order
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          product:product_id (
            name,
            sku
          ),
          variant:variant_id (
            name,
            sku
          )
        `)
        .contains('metadata', { purchase_order_id: purchaseOrderId })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading inventory items:', error);
        toast.error('Failed to load inventory items');
        return;
      }

      setInventoryItems(data || []);
      
      // Initialize QC data
      const initialQcData = new Map();
      data?.forEach(item => {
        initialQcData.set(item.id, {
          status: (item.status === 'available' ? 'pending' : item.status) as 'passed' | 'failed' | 'pending',
          notes: item.notes || ''
        });
      });
      setQcData(initialQcData);
      
    } catch (error) {
      console.error('Error loading inventory items:', error);
      toast.error('Failed to load inventory items');
    } finally {
      setLoading(false);
    }
  };

  const updateQcData = (itemId: string, field: keyof QualityCheckData, value: any) => {
    setQcData(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId) || { status: 'pending', notes: '' };
      newMap.set(itemId, {
        ...current,
        [field]: value
      });
      return newMap;
    });
  };

  const handleBulkQc = async (status: 'passed' | 'failed') => {
    if (selectedItems.size === 0) {
      toast.error('Please select items to quality check');
      return;
    }

    try {
      const updates = Array.from(selectedItems).map(itemId => ({
        id: itemId,
        status: status === 'passed' ? 'available' : 'damaged',
        notes: qcData.get(itemId)?.notes || `Quality check: ${status}`,
        metadata: {
          ...inventoryItems.find(i => i.id === itemId)?.metadata,
          quality_check_status: status,
          quality_checked_by: currentUser?.id,
          quality_checked_at: new Date().toISOString()
        }
      }));

      const { error } = await supabase
        .from('inventory_items')
        .upsert(updates);

      if (error) {
        console.error('Error updating items:', error);
        toast.error('Failed to update items');
        return;
      }

      toast.success(`${selectedItems.size} items marked as ${status}`);
      setSelectedItems(new Set());
      await loadInventoryItems();
      
    } catch (error) {
      console.error('Error bulk updating:', error);
      toast.error('Failed to perform bulk quality check');
    }
  };

  const handleSingleQc = async (itemId: string) => {
    const qc = qcData.get(itemId);
    if (!qc) return;

    try {
      const item = inventoryItems.find(i => i.id === itemId);
      if (!item) return;

      const { error } = await supabase
        .from('inventory_items')
        .update({
          status: qc.status === 'passed' ? 'available' : qc.status === 'failed' ? 'damaged' : 'available',
          notes: qc.notes || `Quality check: ${qc.status}`,
          metadata: {
            ...item.metadata,
            quality_check_status: qc.status,
            quality_checked_by: currentUser?.id,
            quality_checked_at: new Date().toISOString()
          }
        })
        .eq('id', itemId);

      if (error) {
        console.error('Error updating item:', error);
        toast.error('Failed to update item');
        return;
      }

      toast.success(`Item ${qc.status === 'passed' ? 'approved' : 'rejected'}`);
      await loadInventoryItems();
      
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to perform quality check');
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedItems(new Set(filteredItems.map(item => item.id)));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  // Filter items
  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.imei?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const qc = qcData.get(item.id);
    const matchesStatus = statusFilter === 'all' || qc?.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: inventoryItems.length,
    pending: Array.from(qcData.values()).filter(qc => qc.status === 'pending').length,
    passed: Array.from(qcData.values()).filter(qc => qc.status === 'passed').length,
    failed: Array.from(qcData.values()).filter(qc => qc.status === 'failed').length
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending QC</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Passed</p>
              <p className="text-2xl font-bold text-green-600">{stats.passed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </GlassCard>
      </div>

      {/* Controls */}
      <GlassCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by serial, IMEI, or product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedItems.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{selectedItems.size} selected</span>
              <GlassButton
                size="sm"
                variant="outline"
                onClick={() => handleBulkQc('passed')}
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Pass All
              </GlassButton>
              <GlassButton
                size="sm"
                variant="outline"
                onClick={() => handleBulkQc('failed')}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Fail All
              </GlassButton>
              <GlassButton
                size="sm"
                variant="ghost"
                onClick={deselectAll}
              >
                Clear
              </GlassButton>
            </div>
          )}

          {selectedItems.size === 0 && filteredItems.length > 0 && (
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={selectAll}
            >
              Select All
            </GlassButton>
          )}
        </div>
      </GlassCard>

      {/* Items List */}
      <div className="space-y-3">
        {loading ? (
          <GlassCard className="p-8 text-center">
            <p className="text-gray-600">Loading inventory items...</p>
          </GlassCard>
        ) : filteredItems.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No inventory items found</p>
          </GlassCard>
        ) : (
          filteredItems.map((item) => {
            const qc = qcData.get(item.id) || { status: 'pending', notes: '' };
            const isExpanded = expandedItems.has(item.id);
            const isSelected = selectedItems.has(item.id);

            return (
              <GlassCard key={item.id} className={`p-4 ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleItemSelection(item.id)}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />

                  {/* Main Content */}
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Smartphone className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-900">{item.serial_number}</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {item.product?.name} {item.variant && `- ${item.variant.name}`}
                        </p>
                      </div>

                      {/* QC Status Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQcData(item.id, 'status', 'passed')}
                          className={`p-2 rounded-lg transition-colors ${
                            qc.status === 'passed'
                              ? 'bg-green-100 text-green-600'
                              : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-600'
                          }`}
                          title="Pass"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => updateQcData(item.id, 'status', 'failed')}
                          className={`p-2 rounded-lg transition-colors ${
                            qc.status === 'failed'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-600'
                          }`}
                          title="Fail"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => toggleItemExpanded(item.id)}
                          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Info */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                      {item.imei && (
                        <span>IMEI: {item.imei}</span>
                      )}
                      {item.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Cost: ${item.cost_price}
                      </span>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {item.mac_address && (
                            <div>
                              <span className="text-gray-600">MAC Address:</span>
                              <span className="ml-2 font-medium">{item.mac_address}</span>
                            </div>
                          )}
                          {item.barcode && (
                            <div>
                              <span className="text-gray-600">Barcode:</span>
                              <span className="ml-2 font-medium">{item.barcode}</span>
                            </div>
                          )}
                          {item.warranty_start && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gray-500" />
                              <span className="text-gray-600">Warranty:</span>
                              <span className="ml-2 font-medium">
                                {new Date(item.warranty_start).toLocaleDateString()} - {item.warranty_end ? new Date(item.warranty_end).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          )}
                          {item.selling_price && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3 text-gray-500" />
                              <span className="text-gray-600">Selling Price:</span>
                              <span className="ml-2 font-medium">${item.selling_price}</span>
                            </div>
                          )}
                        </div>

                        {item.notes && (
                          <div className="text-sm">
                            <span className="text-gray-600">Notes:</span>
                            <p className="mt-1 text-gray-900">{item.notes}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* QC Notes */}
                    <div className="mt-3">
                      <textarea
                        value={qc.notes}
                        onChange={(e) => updateQcData(item.id, 'notes', e.target.value)}
                        placeholder="Add quality check notes..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>

                    {/* Save Button */}
                    <div className="mt-3 flex justify-end">
                      <GlassButton
                        size="sm"
                        onClick={() => handleSingleQc(item.id)}
                        disabled={qc.status === 'pending'}
                        className={qc.status === 'passed' ? 'bg-green-600 hover:bg-green-700' : qc.status === 'failed' ? 'bg-red-600 hover:bg-red-700' : ''}
                      >
                        {qc.status === 'passed' ? 'Approve Item' : qc.status === 'failed' ? 'Reject Item' : 'Select Status'}
                      </GlassButton>
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>
    </div>
  );
};

export default QualityCheckTab;

